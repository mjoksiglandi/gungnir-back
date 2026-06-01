import { Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { externalSources, mapLayers } from '@/infrastructure/database/schema';
import { DgacSourceProvider } from './dgac-source.provider';
import { NaturalHazardsSourceProvider, type NormalizedHazardFeature } from './natural-hazards-source.provider';

type NormalizedExternalFeature = NormalizedHazardFeature;

@Injectable()
export class ExternalSourcesService implements OnModuleInit {
  private readonly logger = new Logger(ExternalSourcesService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
    private readonly eventEmitter: EventEmitter2,
    private readonly dgacSourceProvider: DgacSourceProvider,
    private readonly naturalHazardsSourceProvider: NaturalHazardsSourceProvider,
  ) {}

  list() {
    return this.db.select().from(externalSources);
  }

  onModuleInit() {
    void this.syncEnabledSourcesOnStartup();
  }

  async syncAll() {
    const sources = await this.db.select().from(externalSources);
    const enabledSources = sources.filter((source) => source.enabled);
    const results = [];

    for (const source of enabledSources) {
      results.push(await this.syncSource(source));
    }

    return {
      syncedAt: new Date().toISOString(),
      count: results.length,
      results,
    };
  }

  async sync(id: string) {
    const [source] = await this.db.select().from(externalSources).where(eq(externalSources.id, id)).limit(1);
    if (!source) throw new NotFoundException(`External source '${id}' was not found.`);
    return this.syncSource(source);
  }

  private async syncSource(source: typeof externalSources.$inferSelect) {
    try {
      const result = await this.runSync(source);
      await this.db.update(externalSources).set({
        lastSuccessfulSync: new Date(),
        lastError: null,
        updatedAt: new Date(),
      }).where(eq(externalSources.id, source.id));
      return result;
    } catch (error) {
      await this.db.update(externalSources).set({
        lastError: error instanceof Error ? error.message : 'Unknown sync error',
        updatedAt: new Date(),
      }).where(eq(externalSources.id, source.id));
      throw error;
    }
  }

  private async syncEnabledSourcesOnStartup() {
    try {
      const sources = await this.db.select().from(externalSources);
      const enabledSources = sources.filter((source) => source.enabled);

      for (const source of enabledSources) {
        try {
          const result = await this.syncSource(source);
          this.logger.log(`Startup sync completed for '${source.id}' with ${result.featureCount} features.`);
        } catch (error) {
          this.logger.error(
            `Startup sync failed for '${source.id}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Startup external source bootstrap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async runSync(source: typeof externalSources.$inferSelect) {
    const provider = typeof source.providerConfig.provider === 'string' ? source.providerConfig.provider : 'mock';
    if (provider === 'dgac') {
      return this.syncDgacSource(source);
    }
    if (provider === 'natural-hazards') {
      return this.syncNaturalHazardsSource(source);
    }
    return this.syncMockSource(source);
  }

  private async syncDgacSource(source: typeof externalSources.$inferSelect) {
    return this.syncNormalizedSource(source, await this.dgacSourceProvider.fetch(source.providerConfig), 'dgac');
  }

  private async syncNaturalHazardsSource(source: typeof externalSources.$inferSelect) {
    return this.syncNormalizedSource(
      source,
      await this.naturalHazardsSourceProvider.fetch(source.providerConfig),
      'natural-hazards',
    );
  }

  private async syncNormalizedSource(
    source: typeof externalSources.$inferSelect,
    normalizedFeatures: NormalizedExternalFeature[],
    provider: string,
  ) {
    const layerId = this.resolveLayerId(source);
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + source.ttlSec * 1000);
    const rows = normalizedFeatures.map((feature) => ({
      id: this.buildFeatureId(source.id, feature.externalId),
      external_id: feature.externalId,
      geometry: JSON.stringify(feature.geometry),
      properties: {
        ...feature.properties,
        sourceName: source.name,
        provider,
      },
    }));

    await this.sqlClient.begin(async (transaction) => {
      await transaction.unsafe(
        `DELETE FROM layer_features
         WHERE layer_id = $1 AND source = $2`,
        [layerId, source.id],
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
          [layerId, source.id, fetchedAt.toISOString(), expiresAt.toISOString(), JSON.stringify(rows)],
        );
      }

      await transaction.unsafe(
        `UPDATE map_layers
         SET last_updated_at = $2::timestamptz, updated_at = $2::timestamptz
         WHERE id = $1`,
        [layerId, fetchedAt.toISOString()],
      );
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.layerSynced, { layerId, sourceId: source.id });
    return {
      success: true,
      layerId,
      sourceId: source.id,
      featureCount: rows.length,
      provider,
      syncedAt: fetchedAt.toISOString(),
    };
  }

  private async syncMockSource(source: typeof externalSources.$inferSelect) {
    const layerId = source.sourceType === 'fire-intel' ? 'layer-fire-intel' : 'layer-air-traffic';
    const featureId = `feature-${randomUUID().slice(0, 8)}`;
    const point = source.sourceType === 'fire-intel'
      ? { type: 'Point', coordinates: [-70.6601, -33.4485] }
      : { type: 'Point', coordinates: [-70.7002, -33.4601] };

    await this.sqlClient.unsafe(
      `INSERT INTO layer_features (id, layer_id, source, external_id, geometry, properties, timestamp, expires_at)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), $6::jsonb, now(), now() + (($7 || ' seconds')::interval))`,
      [featureId, layerId, source.sourceType, `ext-${featureId}`, JSON.stringify(point), JSON.stringify({ provider: source.name }), source.ttlSec],
    );

    await this.db.update(mapLayers).set({
      lastUpdatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(mapLayers.id, layerId));

    this.eventEmitter.emit(DOMAIN_EVENTS.layerSynced, { layerId, sourceId: source.id });
    return { success: true, layerId, sourceId: source.id, featureCount: 1, provider: 'mock' };
  }

  private resolveLayerId(source: typeof externalSources.$inferSelect) {
    const layerId = source.providerConfig.layerId;
    if (typeof layerId !== 'string' || layerId.length === 0) {
      throw new Error(`External source '${source.id}' is missing providerConfig.layerId.`);
    }
    return layerId;
  }

  private buildFeatureId(sourceId: string, externalId: string) {
    const hash = createHash('sha1').update(`${sourceId}:${externalId}`).digest('hex').slice(0, 16);
    return `feature-${hash}`;
  }
}
