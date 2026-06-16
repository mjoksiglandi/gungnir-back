import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { externalSources, mapLayers } from '@/infrastructure/database/schema';
import type postgres from 'postgres';

@Injectable()
export class ExternalSourcesRepository {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
  ) {}

  list() {
    return this.db.select().from(externalSources);
  }

  async listEnabled() {
    const sources = await this.list();
    return sources.filter((source) => source.enabled);
  }

  async get(id: string) {
    const [source] = await this.db.select().from(externalSources).where(eq(externalSources.id, id)).limit(1);
    if (!source) {
      throw new NotFoundException(`External source '${id}' was not found.`);
    }
    return source;
  }

  async markSuccessfulSync(id: string) {
    await this.db.update(externalSources).set({
      lastSuccessfulSync: new Date(),
      lastError: null,
      updatedAt: new Date(),
    }).where(eq(externalSources.id, id));
  }

  async markFailedSync(id: string, error: unknown) {
    await this.db.update(externalSources).set({
      lastError: error instanceof Error ? error.message : 'Unknown sync error',
      updatedAt: new Date(),
    }).where(eq(externalSources.id, id));
  }

  async replaceLayerFeatures(
    layerId: string,
    sourceId: string,
    fetchedAt: Date,
    expiresAt: Date,
    rows: Array<{
      id: string;
      external_id: string;
      geometry: string;
      properties: Record<string, unknown>;
    }>,
  ) {
    await this.sqlClient.begin(async (transaction) => {
      await transaction.unsafe(
        `DELETE FROM layer_features
         WHERE layer_id = $1 AND source = $2`,
        [layerId, sourceId],
      );

      if (rows.length > 0) {
        await transaction.unsafe(
          `INSERT INTO layer_features (id, layer_id, source, external_id, geometry, properties, timestamp, expires_at)
           SELECT
             item.id,
             $1,
             $2,
             item.external_id,
             ST_SetSRID(ST_GeomFromGeoJSON(item.geometry), 4326),
             item.properties::jsonb,
             $3::timestamptz,
             $4::timestamptz
           FROM jsonb_to_recordset($5::jsonb) AS item(id text, external_id text, geometry text, properties jsonb)`,
          [layerId, sourceId, fetchedAt.toISOString(), expiresAt.toISOString(), JSON.stringify(rows)],
        );
      }

      await transaction.unsafe(
        `UPDATE map_layers
         SET last_updated_at = $2::timestamptz, updated_at = $2::timestamptz
         WHERE id = $1`,
        [layerId, fetchedAt.toISOString()],
      );
    });
  }

  async insertMockFeature(
    layerId: string,
    sourceType: string,
    featureId: string,
    point: { type: string; coordinates: [number, number] },
    sourceName: string,
    ttlSec: number,
  ) {
    await this.sqlClient.unsafe(
      `INSERT INTO layer_features (id, layer_id, source, external_id, geometry, properties, timestamp, expires_at)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), $6::jsonb, now(), now() + (($7 || ' seconds')::interval))`,
      [featureId, layerId, sourceType, `ext-${featureId}`, JSON.stringify(point), JSON.stringify({ provider: sourceName }), ttlSec],
    );

    await this.db.update(mapLayers).set({
      lastUpdatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(mapLayers.id, layerId));
  }
}
