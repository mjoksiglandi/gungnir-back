import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import type postgres from 'postgres';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { mapLayers } from '@/infrastructure/database/schema';

@Injectable()
export class MapLayersService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  list() {
    return this.db.select().from(mapLayers);
  }

  async get(id: string) {
    const [layer] = await this.db.select().from(mapLayers).where(eq(mapLayers.id, id)).limit(1);
    if (!layer) throw new NotFoundException(`Map layer '${id}' was not found.`);
    return layer;
  }

  async patch(id: string, input: Partial<{ enabled: boolean; refreshIntervalSec: number; ttlSec: number; confidence: number; metadata: Record<string, unknown> }>) {
    await this.get(id);
    await this.db.update(mapLayers).set({
      enabled: input.enabled,
      refreshIntervalSec: input.refreshIntervalSec,
      ttlSec: input.ttlSec,
      confidence: input.confidence,
      metadata: input.metadata,
      updatedAt: new Date(),
    }).where(eq(mapLayers.id, id));
    this.eventEmitter.emit(DOMAIN_EVENTS.layerSynced, { layerId: id });
    return this.get(id);
  }

  async features(id: string) {
    await this.get(id);
    return this.sqlClient.unsafe(
      `SELECT id, layer_id as "layerId", source, external_id as "externalId",
              ST_AsGeoJSON(geometry)::json as geometry, properties, timestamp, expires_at as "expiresAt"
       FROM layer_features
       WHERE layer_id = $1
       ORDER BY timestamp DESC`,
      [id],
    );
  }

  async geojson(id: string) {
    const features = await this.features(id);
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
}
