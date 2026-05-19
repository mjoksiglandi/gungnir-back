import { Injectable, Logger } from '@nestjs/common';

type GeoJsonGeometry = {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
  coordinates: unknown;
};

type NormalizedFeature = {
  externalId: string;
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
};

type DgacProviderConfig = {
  provider: 'dgac';
  dataset: 'aerodrome' | 'notams';
};

type DgacAerodrome = {
  Id: number;
  DesignadorOaci: string;
  DesignadorIata: string;
  Aerodromo: string;
  Latitud: number;
  Longitud: number;
  Publico: boolean;
  AerodromoTipoId: number;
  Fir: string;
  HorasOperacion: string;
  Elevacion: string;
  Observaciones: string;
  AipLink: string;
  AipLinkNombre: string;
  Slug: string;
  UpdatedAt: string | null;
  [key: string]: unknown;
};

type DgacNotam = {
  Id: number;
  Serie: string;
  Fir: string;
  Codigo: string;
  Coordenadas: string;
  CasillaA: string;
  CasillaB: string;
  CasillaC: string;
  CasillaD: string;
  CasillaE: string;
  CasillaF: string;
  CasillaG: string;
  Texto: string;
  FechaMensaje: string;
  UpdatedAt: string | null;
  [key: string]: unknown;
};

@Injectable()
export class DgacSourceProvider {
  private readonly logger = new Logger(DgacSourceProvider.name);
  private readonly baseUrl = 'https://aipchile.dgac.gob.cl';

  async fetch(providerConfig: Record<string, unknown>) {
    const config = this.parseConfig(providerConfig);

    switch (config.dataset) {
      case 'aerodrome':
        return this.fetchAerodromes();
      case 'notams':
        return this.fetchNotams();
      default:
        throw new Error(`Unsupported DGAC dataset '${String((config as { dataset?: unknown }).dataset)}'.`);
    }
  }

  private parseConfig(providerConfig: Record<string, unknown>): DgacProviderConfig {
    if (providerConfig.provider !== 'dgac') {
      throw new Error(`Unsupported provider '${String(providerConfig.provider)}'.`);
    }

    const dataset = providerConfig.dataset;
    if (
      dataset !== 'aerodrome' &&
      dataset !== 'notams'
    ) {
      throw new Error(`Unsupported DGAC dataset '${String(dataset)}'.`);
    }

    return {
      provider: 'dgac',
      dataset,
    };
  }

  private async fetchAerodromes(): Promise<NormalizedFeature[]> {
    const payload = await this.fetchJson<DgacAerodrome[]>('/api/aerodrome');
    return payload
      .filter((row) => Number.isFinite(row.Latitud) && Number.isFinite(row.Longitud))
      .map((row) => ({
        externalId: `aerodrome-${row.Id}`,
        geometry: {
          type: 'Point',
          coordinates: [row.Longitud, row.Latitud],
        },
        properties: {
          category: 'aerodrome',
          codeOaci: row.DesignadorOaci,
          codeIata: row.DesignadorIata,
          name: row.Aerodromo,
          fir: row.Fir,
          isPublic: row.Publico,
          aerodromeTypeId: row.AerodromoTipoId,
          elevation: row.Elevacion,
          operationHours: row.HorasOperacion,
          aipLink: row.AipLink,
          aipLinkName: row.AipLinkNombre,
          slug: row.Slug,
          observations: row.Observaciones,
          dgacUpdatedAt: row.UpdatedAt,
        },
      }));
  }

  private async fetchNotams(): Promise<NormalizedFeature[]> {
    const payload = await this.fetchJson<Record<string, DgacNotam[]>>('/api/notamByGeom');
    const rows = Object.values(payload).flat();

    return rows.flatMap((row) => {
      const center = this.parseNotamCenter(row);
      if (!center) {
        this.logger.warn(`Skipping NOTAM ${row.Serie} because a geometry center could not be parsed.`);
        return [];
      }

      return [{
        externalId: row.Serie || `notam-${row.Id}`,
        geometry: {
          type: 'Point',
          coordinates: [center.lon, center.lat],
        },
        properties: {
          category: 'notam',
          isRpa: this.isRpaNotam(row),
          notamId: row.Id,
          series: row.Serie,
          fir: row.Fir,
          code: row.Codigo,
          aerodrome: row.CasillaA,
          validFrom: row.CasillaB,
          validTo: row.CasillaC,
          schedule: row.CasillaD,
          detail: row.CasillaE,
          lowerLimit: row.CasillaF,
          upperLimit: row.CasillaG,
          text: row.Texto,
          radiusNm: center.radiusNm,
          dgacUpdatedAt: row.UpdatedAt,
          publishedAt: row.FechaMensaje,
        },
      }];
    });
  }

  private isRpaNotam(row: DgacNotam) {
    const searchable = `${row.Serie ?? ''}\n${row.Codigo ?? ''}\n${row.CasillaE ?? ''}\n${row.Texto ?? ''}`;
    return /\bRPAS?\b|\bDRONE\b/i.test(searchable);
  }

  private parseNotamCenter(row: DgacNotam) {
    const textMatch = row.CasillaE.match(/(\d{2})(\d{2})(\d{2})([NS])\s*\/\s*(\d{3})(\d{2})(\d{2})([EW])/i);
    if (textMatch) {
      return {
        lat: this.dmsToDecimal(textMatch[1], textMatch[2], textMatch[3], textMatch[4]),
        lon: this.dmsToDecimal(textMatch[5], textMatch[6], textMatch[7], textMatch[8]),
        radiusNm: this.parseRadiusNm(row.Coordenadas),
      };
    }

    const compact = row.Coordenadas.match(/^(\d{2})(\d{2})([NS])(\d{3})(\d{2})([EW])(\d{3})?$/i);
    if (!compact) return null;

    return {
      lat: this.dmToDecimal(compact[1], compact[2], compact[3]),
      lon: this.dmToDecimal(compact[4], compact[5], compact[6]),
      radiusNm: compact[7] ? Number.parseInt(compact[7], 10) : null,
    };
  }

  private parseRadiusNm(rawCoordinates: string) {
    const compact = rawCoordinates.match(/\d{3}$/);
    return compact ? Number.parseInt(compact[0], 10) : null;
  }

  private dmToDecimal(degrees: string, minutes: string, hemisphere: string) {
    const sign = hemisphere.toUpperCase() === 'S' || hemisphere.toUpperCase() === 'W' ? -1 : 1;
    return sign * (Number.parseInt(degrees, 10) + Number.parseInt(minutes, 10) / 60);
  }

  private dmsToDecimal(degrees: string, minutes: string, seconds: string, hemisphere: string) {
    const sign = hemisphere.toUpperCase() === 'S' || hemisphere.toUpperCase() === 'W' ? -1 : 1;
    return sign * (
      Number.parseInt(degrees, 10) +
      Number.parseInt(minutes, 10) / 60 +
      Number.parseInt(seconds, 10) / 3600
    );
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`DGAC request failed for ${path} with status ${response.status}.`);
    }
    return response.json() as Promise<T>;
  }
}
