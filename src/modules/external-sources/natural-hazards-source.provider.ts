import { Injectable } from '@nestjs/common';

type GeoJsonGeometry = {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
  coordinates: unknown;
};

export type NormalizedHazardFeature = {
  externalId: string;
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
};

type NaturalHazardsProviderConfig = {
  provider: 'natural-hazards';
  dataset: 'fires' | 'earthquakes' | 'weather';
  limit?: number;
};

type UsgsFeature = {
  id?: string;
  geometry?: {
    coordinates?: [number, number, number?];
  };
  properties?: {
    mag?: number;
    place?: string;
    time?: number;
    url?: string;
    tsunami?: number;
    type?: string;
    felt?: number;
    alert?: string | null;
  };
};

type UsgsResponse = {
  features?: UsgsFeature[];
};

type EonetEvent = {
  id: string;
  title: string;
  categories?: Array<{ id?: string; title?: string }>;
  geometry?: Array<{ type?: string; coordinates?: number[]; date?: string }>;
  sources?: Array<{ url?: string }>;
};

type EonetResponse = {
  events?: EonetEvent[];
};

type NwsGeometry =
  | { type: 'Point'; coordinates?: number[] }
  | { type: 'Polygon'; coordinates?: number[][][] }
  | { type: 'MultiPolygon'; coordinates?: number[][][][] };

type NwsFeature = {
  geometry?: NwsGeometry | null;
  properties?: {
    '@id'?: string;
    id?: string;
    headline?: string;
    event?: string;
    severity?: string;
    effective?: string;
    sent?: string;
    expires?: string;
    areaDesc?: string;
  };
};

type NwsResponse = {
  features?: NwsFeature[];
};

@Injectable()
export class NaturalHazardsSourceProvider {
  async fetch(providerConfig: Record<string, unknown>): Promise<NormalizedHazardFeature[]> {
    const config = this.parseConfig(providerConfig);

    switch (config.dataset) {
      case 'fires':
        return this.fetchFires(config.limit ?? 2000);
      case 'earthquakes':
        return this.fetchEarthquakes(config.limit ?? 1000);
      case 'weather':
        return this.fetchWeather(config.limit ?? 300);
      default:
        throw new Error(`Unsupported natural hazards dataset '${String((config as { dataset?: unknown }).dataset)}'.`);
    }
  }

  private parseConfig(providerConfig: Record<string, unknown>): NaturalHazardsProviderConfig {
    if (providerConfig.provider !== 'natural-hazards') {
      throw new Error(`Unsupported provider '${String(providerConfig.provider)}'.`);
    }

    const dataset = providerConfig.dataset;
    if (dataset !== 'fires' && dataset !== 'earthquakes' && dataset !== 'weather') {
      throw new Error(`Unsupported natural hazards dataset '${String(dataset)}'.`);
    }

    const limit = typeof providerConfig.limit === 'number' && Number.isFinite(providerConfig.limit)
      ? Math.max(1, Math.floor(providerConfig.limit))
      : undefined;

    return { provider: 'natural-hazards', dataset, limit };
  }

  private async fetchFires(limit: number): Promise<NormalizedHazardFeature[]> {
    const sources = [
      {
        label: 'NASA-FIRMS VIIRS S-NPP',
        url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv',
      },
      {
        label: 'NASA-FIRMS MODIS',
        url: 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv',
      },
    ];

    for (const source of sources) {
      const response = await fetch(source.url, {
        headers: { 'User-Agent': 'Gungnir-Backend/0.2 natural-hazards' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) continue;

      const text = await response.text();
      const features = this.parseFirmsCsv(text, source.label, source.url, limit);
      if (features.length > 0) return features;
    }

    return [];
  }

  private async fetchEarthquakes(limit: number): Promise<NormalizedHazardFeature[]> {
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`USGS earthquake feed failed with status ${response.status}.`);
    }

    const payload = await response.json() as UsgsResponse;
    return (payload.features ?? []).slice(0, limit).flatMap((feature) => {
      const coords = feature.geometry?.coordinates;
      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return [];

      const props = feature.properties ?? {};
      const eventTime = typeof props.time === 'number' ? new Date(props.time).toISOString() : undefined;
      return [{
        externalId: feature.id ? `usgs-${feature.id}` : `usgs-${coords[0]}-${coords[1]}-${props.time ?? 'unknown'}`,
        geometry: {
          type: 'Point',
          coordinates: [coords[0], coords[1]],
        },
        properties: {
          category: 'earthquake',
          provider: 'USGS',
          magnitude: props.mag,
          place: props.place,
          depthKm: coords[2] ?? null,
          observedAt: eventTime,
          url: props.url,
          tsunami: props.tsunami,
          eventType: props.type,
          felt: props.felt,
          alert: props.alert,
        },
      }];
    });
  }

  private async fetchWeather(limit: number): Promise<NormalizedHazardFeature[]> {
    const [eonetResult, nwsResult] = await Promise.allSettled([
      this.fetchEonetWeather(Math.ceil(limit / 2)),
      this.fetchNwsAlerts(Math.ceil(limit / 2)),
    ]);

    const features = [
      ...(eonetResult.status === 'fulfilled' ? eonetResult.value : []),
      ...(nwsResult.status === 'fulfilled' ? nwsResult.value : []),
    ];

    if (features.length === 0 && eonetResult.status === 'rejected' && nwsResult.status === 'rejected') {
      throw new Error('Natural hazards weather providers failed.');
    }

    return features.slice(0, limit);
  }

  private async fetchEonetWeather(limit: number): Promise<NormalizedHazardFeature[]> {
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100', {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`NASA EONET feed failed with status ${response.status}.`);
    }

    const payload = await response.json() as EonetResponse;
    return (payload.events ?? []).flatMap((event) => {
      const geometry = event.geometry?.at(-1);
      if (!geometry || geometry.type !== 'Point' || !geometry.coordinates) return [];

      const category = event.categories?.[0]?.id ?? 'unknown';
      if (category === 'wildfires' || category === 'earthquakes') return [];

      const [lon, lat] = geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

      const type = this.eonetTypeLabel(category, event.categories?.[0]?.title);
      return [{
        externalId: `eonet-${event.id}`,
        geometry: {
          type: 'Point' as const,
          coordinates: [lon, lat],
        },
        properties: {
          category,
          provider: 'NASA EONET',
          title: event.title,
          type,
          icon: this.eonetIcon(category),
          severity: this.eonetSeverity(category),
          observedAt: geometry.date,
          sourceUrl: event.sources?.[0]?.url,
        },
      }];
    }).slice(0, limit);
  }

  private async fetchNwsAlerts(limit: number): Promise<NormalizedHazardFeature[]> {
    const response = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
      headers: {
        Accept: 'application/geo+json',
        'User-Agent': 'Gungnir Backend natural hazards layer',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`NOAA/NWS alerts feed failed with status ${response.status}.`);
    }

    const payload = await response.json() as NwsResponse;
    return (payload.features ?? []).flatMap((feature) => {
      const point = this.getRepresentativePoint(feature.geometry);
      if (!point) return [];

      const props = feature.properties ?? {};
      const id = props.id ?? props['@id'] ?? `${props.event ?? 'nws'}-${point.lat}-${point.lng}`;
      return [{
        externalId: `nws-${this.stableId(id)}`,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.lng, point.lat],
        },
        properties: {
          category: 'weatherAlerts',
          provider: 'NOAA/NWS',
          title: props.headline ?? props.event ?? 'NWS Weather Alert',
          type: props.event ?? 'Weather Alert',
          icon: 'weather',
          severity: this.nwsSeverity(props.severity),
          observedAt: props.effective ?? props.sent,
          expiresAt: props.expires,
          area: props.areaDesc,
          sourceUrl: props['@id'],
        },
      }];
    }).slice(0, limit);
  }

  private parseFirmsCsv(csv: string, source: string, sourceUrl: string, limit: number): NormalizedHazardFeature[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const header = lines[0].split(',');
    const latIdx = header.indexOf('latitude');
    const lonIdx = header.indexOf('longitude');
    const brightnessIdx = header.includes('bright_ti4') ? header.indexOf('bright_ti4') : header.indexOf('brightness');
    const confidenceIdx = header.indexOf('confidence');
    const dateIdx = header.indexOf('acq_date');
    const timeIdx = header.indexOf('acq_time');
    const frpIdx = header.indexOf('frp');
    const satelliteIdx = header.indexOf('satellite');
    const instrumentIdx = header.indexOf('instrument');

    if (latIdx < 0 || lonIdx < 0) return [];

    const step = lines.length > limit ? Math.ceil(lines.length / limit) : 1;
    const features: NormalizedHazardFeature[] = [];

    for (let index = 1; index < lines.length && features.length < limit; index += step) {
      const columns = lines[index].split(',');
      const lat = Number.parseFloat(columns[latIdx]);
      const lon = Number.parseFloat(columns[lonIdx]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const acquiredAt = this.formatAcquiredAt(columns[dateIdx], columns[timeIdx]);
      features.push({
        externalId: `firms-${this.stableId(`${source}:${lat}:${lon}:${acquiredAt ?? index}`)}`,
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          category: 'fire',
          provider: source,
          brightness: this.numberOrNull(columns[brightnessIdx]),
          confidence: columns[confidenceIdx] ?? 'unknown',
          frp: this.numberOrNull(columns[frpIdx]),
          satellite: columns[satelliteIdx] ?? null,
          instrument: columns[instrumentIdx] ?? null,
          observedAt: acquiredAt,
          sourceUrl,
          type: 'fire',
        },
      });
    }

    return features;
  }

  private getRepresentativePoint(geometry?: NwsGeometry | null) {
    if (!geometry) return null;

    if (geometry.type === 'Point' && geometry.coordinates) {
      const [lng, lat] = geometry.coordinates;
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }

    if (geometry.type === 'Polygon') {
      return this.averageCoordinates(geometry.coordinates?.[0]);
    }

    if (geometry.type === 'MultiPolygon') {
      return this.averageCoordinates(geometry.coordinates?.[0]?.[0]);
    }

    return null;
  }

  private averageCoordinates(coords?: number[][]) {
    if (!coords || coords.length === 0) return null;

    const totals = coords.reduce(
      (acc, coord) => ({
        lng: acc.lng + coord[0],
        lat: acc.lat + coord[1],
      }),
      { lat: 0, lng: 0 },
    );

    return {
      lat: totals.lat / coords.length,
      lng: totals.lng / coords.length,
    };
  }

  private eonetTypeLabel(category: string, fallback?: string) {
    if (category === 'severeStorms') return 'Severe Storm';
    if (category === 'volcanoes') return 'Volcano';
    if (category === 'seaIce') return 'Sea Ice';
    return fallback ?? 'Natural Hazard';
  }

  private eonetIcon(category: string) {
    if (category === 'severeStorms') return 'cyclone';
    if (category === 'volcanoes') return 'volcano';
    if (category === 'seaIce') return 'ice';
    return 'alert';
  }

  private eonetSeverity(category: string) {
    if (category === 'severeStorms' || category === 'volcanoes') return 'high';
    if (category === 'seaIce') return 'medium';
    return 'low';
  }

  private nwsSeverity(severity?: string) {
    if (severity === 'Extreme' || severity === 'Severe') return 'high';
    if (severity === 'Moderate') return 'medium';
    return 'low';
  }

  private formatAcquiredAt(date?: string, time?: string) {
    if (!date) return undefined;
    const normalizedTime = time ? time.padStart(4, '0') : '0000';
    return `${date}T${normalizedTime.slice(0, 2)}:${normalizedTime.slice(2, 4)}:00Z`;
  }

  private numberOrNull(value?: string) {
    if (value === undefined) return null;
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : null;
  }

  private stableId(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(36);
  }
}
