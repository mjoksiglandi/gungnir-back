import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { externalSources, mapLayers } from '@/infrastructure/database/schema';

@Injectable()
export class ExternalSourcesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  list() {
    return this.db.select().from(externalSources);
  }

  async sync(id: string) {
    const [source] = await this.db.select().from(externalSources).where(eq(externalSources.id, id)).limit(1);
    if (!source) throw new NotFoundException(`External source '${id}' was not found.`);

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

    await this.db.update(externalSources).set({
      lastSuccessfulSync: new Date(),
      lastError: null,
      updatedAt: new Date(),
    }).where(eq(externalSources.id, id));

    await this.db.update(mapLayers).set({
      lastUpdatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(mapLayers.id, layerId));

    this.eventEmitter.emit(DOMAIN_EVENTS.layerSynced, { layerId, sourceId: id });
    return { success: true, layerId, sourceId: id };
  }
}
