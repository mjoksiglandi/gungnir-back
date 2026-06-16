import { Injectable } from '@nestjs/common';
import { GEO_COORDINATE_SCALE } from '@/common/constants/geo.constants';
import { CopRepository } from '../repositories/cop.repository';

const LEGACY_DUMMY_ASSET_IDS = new Set(['asset-uav-001']);
const LEGACY_DUMMY_DEVICE_IDS = new Set(['device-uav-001']);
const LEGACY_DUMMY_ALERT_IDS = new Set(['alert-001']);

@Injectable()
export class CopService {
  constructor(private readonly copRepository: CopRepository) {}

  private normalizeStatus(status: string) {
    if (status === 'degraded' || status === 'lost' || status === 'nominal') {
      return status;
    }
    return 'nominal';
  }

  private normalizeAssetType(assetType: string) {
    if (assetType === 'uav' || assetType === 'air') return 'air';
    if (assetType === 'ugv' || assetType === 'ground') return 'ground';
    if (assetType === 'sensor') return 'sensor';
    return 'autonomous';
  }

  async listAssetsV1() {
    const [rows, tracks, telemetry, deviceRows, callsignRows] = await Promise.all([
      this.copRepository.listAssets(),
      this.copRepository.listTracks(),
      this.copRepository.listLatestTelemetry(),
      this.copRepository.listDeviceAssetLinks(),
      this.copRepository.listCallsignAssignments(),
    ]);
    const filteredRows = rows.filter((asset) => !LEGACY_DUMMY_ASSET_IDS.has(asset.id));
    const now = Date.now();
    const currentCallsignByAssetId = new Map<string, string>();

    for (const assignment of callsignRows) {
      if (
        assignment.startTime.getTime() > now
        || (assignment.endTime != null && assignment.endTime.getTime() < now)
      ) {
        continue;
      }

      const assetId = assignment.assetId
        ?? deviceRows.find((device) => device.id === assignment.deviceId)?.assetId
        ?? null;
      if (!assetId || currentCallsignByAssetId.has(assetId)) {
        continue;
      }

      currentCallsignByAssetId.set(assetId, assignment.callsign);
    }

    return filteredRows.map((asset) => {
      const track = tracks.find((item) => item.assetId === asset.id);
      const latestTelemetry = telemetry.find((item) => item.assetId === asset.id);
      const mission = typeof asset.metadata?.role === 'string'
        ? asset.metadata.role
        : 'Operational tasking';
      return {
        id: asset.id,
        kind: 'asset',
        version: 1,
        updatedAt: asset.updatedAt.toISOString(),
        source: 'gungnir-back',
        name: asset.name,
        callsign: currentCallsignByAssetId.get(asset.id) ?? asset.id.toUpperCase(),
        assetType: this.normalizeAssetType(asset.assetType),
        status: this.normalizeStatus(asset.status),
        affiliation: 'friendly',
        position: {
          lat: track ? track.lat / GEO_COORDINATE_SCALE : -33.4489,
          lon: track ? track.lon / GEO_COORDINATE_SCALE : -70.6693,
          altM: track?.altitudeM ?? undefined,
          headingDeg: track?.headingDeg ?? undefined,
          speedMps: track?.speedMs ?? undefined,
        },
        batteryPct: latestTelemetry?.batteryPct ?? undefined,
        linkQualityPct: latestTelemetry?.signalQuality ?? undefined,
        mission,
      };
    });
  }

  async getAssetV1(id: string) {
    const assetsV1 = await this.listAssetsV1();
    return assetsV1.find((asset) => asset.id === id) ?? null;
  }

  async listAlertsV1() {
    const rows = (await this.copRepository.listAlerts()).filter(
      (alert) =>
        !LEGACY_DUMMY_ALERT_IDS.has(alert.id)
        && !LEGACY_DUMMY_ASSET_IDS.has(alert.assetId ?? '')
        && !LEGACY_DUMMY_DEVICE_IDS.has(alert.deviceId ?? ''),
    );
    return rows.map((alert) => ({
      id: alert.id,
      kind: 'alert',
      version: 1,
      updatedAt: (alert.resolvedAt ?? alert.acknowledgedAt ?? alert.createdAt).toISOString(),
      source: alert.source,
      severity: alert.severity,
      status: alert.status,
      title: alert.type,
      summary: alert.message,
      assetId: alert.assetId ?? undefined,
      observedAt: alert.createdAt.toISOString(),
    }));
  }

  async getAlertV1(id: string) {
    const rows = await this.listAlertsV1();
    return rows.find((item) => item.id === id) ?? null;
  }

  async listIncidentsV1() {
    const rows = await this.copRepository.listIncidents();
    return rows.map((incident) => ({
      id: incident.id,
      kind: 'incident',
      version: 1,
      updatedAt: incident.updatedAt.toISOString(),
      source: 'gungnir-back',
      title: incident.title,
      summary: incident.description,
      priority: incident.severity === 'critical' ? 'urgent' : incident.severity,
      status: incident.status,
      assetIds: [] as string[],
      alertIds: [] as string[],
      owner: incident.assignedTo ?? 'unassigned',
    }));
  }

  async getIncidentV1(id: string) {
    const rows = await this.listIncidentsV1();
    return rows.find((item) => item.id === id) ?? null;
  }

  async listLayersV1() {
    const rows = await this.copRepository.listLayers();
    return rows.map((layer) => ({
      id: layer.id,
      kind: 'geoLayer',
      version: 1,
      updatedAt: layer.updatedAt.toISOString(),
      source: layer.sourceType,
      name: layer.name,
      layerType: layer.layerType === 'route'
        ? 'route'
        : layer.layerType === 'corridor'
          ? 'corridor'
          : layer.layerType === 'point'
            ? 'point'
            : 'zone',
      visibleByDefault: layer.enabled,
      polygon: [] as Array<{ lat: number; lon: number }>,
      featureCollectionUrl: `/api/v1/layers/${layer.id}/geojson`,
      metadata: layer.metadata,
    }));
  }

  async getLayerV1(id: string) {
    const rows = await this.listLayersV1();
    return rows.find((item) => item.id === id) ?? null;
  }

  async getLayerGeoJsonV1(id: string) {
    const layer = await this.copRepository.findLayer(id);
    if (!layer) return null;

    const features = await this.copRepository.getLayerFeatures(id);

    return {
      type: 'FeatureCollection',
      features: features.map((feature) => ({
        type: 'Feature',
        id: feature.id,
        geometry: feature.geometry,
        properties: {
          ...feature.properties,
          source: feature.source,
          externalId: feature.externalId,
          timestamp: feature.timestamp,
          expiresAt: feature.expiresAt,
        },
      })),
    };
  }

  async listTimelineV1() {
    const [alertsV1, telemetry] = await Promise.all([
      this.listAlertsV1(),
      this.copRepository.listLatestTelemetry(25),
    ]);
    const filteredTelemetry = telemetry.filter(
      (row) =>
        !LEGACY_DUMMY_ASSET_IDS.has(row.assetId ?? '')
        && !LEGACY_DUMMY_DEVICE_IDS.has(row.deviceId),
    );
    return [
      ...filteredTelemetry.map((row) => ({
        id: row.id,
        timestamp: row.timestamp.toISOString(),
        label: `Telemetry ${row.deviceId}`,
        detail: `Position ${row.lat / GEO_COORDINATE_SCALE}, ${row.lon / GEO_COORDINATE_SCALE}`,
        category: 'telemetry' as const,
      })),
      ...alertsV1.map((row) => ({
        id: row.id,
        timestamp: row.observedAt,
        label: row.title,
        detail: row.summary,
        category: 'alert' as const,
      })),
    ].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }

  async getTimelineEventV1(id: string) {
    const rows = await this.listTimelineV1();
    return rows.find((item) => item.id === id) ?? null;
  }

  async fireHotspotsV1() {
    const hotspots = await this.copRepository.getFireHotspots();

    return {
      fetchedAt: new Date().toISOString(),
      hotspots: hotspots.map((hotspot) => ({
        id: hotspot.id,
        source: 'arcgis-nasa-modis',
        acquiredAt: hotspot.timestamp,
        brightness: 0,
        confidence: 80,
        frp: 0,
        hoursOld: 1,
        lat: Number(hotspot.lat),
        lon: Number(hotspot.lon),
      })),
      issues: [],
      policy: {
        allowPartialResults: true,
        staleAfterMs: 300000,
        timeoutMs: 15000,
      },
      sourceFeeds: ['arcgis-nasa-modis'],
      status: 'ready',
    };
  }

  async bootstrapV1() {
    return {
      hydratedAt: new Date().toISOString(),
      snapshot: await this.snapshotV1(),
      geospatial: {
        fireHotspots: await this.fireHotspotsV1(),
      },
    };
  }

  async snapshotV1() {
    return {
      assets: await this.listAssetsV1(),
      alerts: await this.listAlertsV1(),
      incidents: await this.listIncidentsV1(),
      layers: await this.listLayersV1(),
      timeline: await this.listTimelineV1(),
    };
  }
}
