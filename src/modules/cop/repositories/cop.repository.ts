import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import {
  alerts,
  assets,
  currentTrackStates,
  deviceCallsignAssignments,
  devices,
  incidents,
  mapLayers,
  telemetryReports,
} from '@/infrastructure/database/schema';
import type postgres from 'postgres';

type LayerFeatureRow = {
  id: string;
  layerId: string;
  source: string;
  externalId: string | null;
  geometry: Record<string, unknown>;
  properties: Record<string, unknown>;
  timestamp: string;
  expiresAt: string | null;
};

type FireHotspotRow = {
  id: string;
  source: string;
  timestamp: string;
  properties: Record<string, unknown>;
  lat: number | string;
  lon: number | string;
};

@Injectable()
export class CopRepository {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
  ) {}

  listAssets() {
    return this.db.select().from(assets);
  }

  listTracks() {
    return this.db.select().from(currentTrackStates);
  }

  listLatestTelemetry(limit = 500) {
    return this.db.select().from(telemetryReports).orderBy(desc(telemetryReports.timestamp)).limit(limit);
  }

  listDeviceAssetLinks() {
    return this.db.select({
      id: devices.id,
      assetId: devices.assetId,
    }).from(devices);
  }

  listCallsignAssignments() {
    return this.db
      .select()
      .from(deviceCallsignAssignments)
      .orderBy(desc(deviceCallsignAssignments.startTime));
  }

  listAlerts() {
    return this.db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  listIncidents() {
    return this.db.select().from(incidents).orderBy(desc(incidents.createdAt));
  }

  listLayers() {
    return this.db.select().from(mapLayers);
  }

  async findLayer(id: string) {
    const [layer] = await this.db.select({ id: mapLayers.id }).from(mapLayers).where(eq(mapLayers.id, id)).limit(1);
    return layer ?? null;
  }

  async getLayerFeatures(id: string) {
    return this.sqlClient.unsafe<LayerFeatureRow[]>(
      `SELECT id, layer_id as "layerId", source, external_id as "externalId",
              ST_AsGeoJSON(geometry)::json as geometry, properties, timestamp, expires_at as "expiresAt"
       FROM layer_features
       WHERE layer_id = $1
       ORDER BY timestamp DESC`,
      [id],
    );
  }

  async getFireHotspots() {
    return this.sqlClient.unsafe<FireHotspotRow[]>(
      `SELECT id, source, timestamp, properties, ST_Y(geometry) AS lat, ST_X(geometry) AS lon
       FROM layer_features
       WHERE layer_id = 'layer-fire-intel'
       ORDER BY timestamp DESC
       LIMIT 50`,
    );
  }
}
