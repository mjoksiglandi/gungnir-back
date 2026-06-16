import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomUUID } from 'node:crypto';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { DgacSourceProvider } from '../dgac-source.provider';
import { NaturalHazardsSourceProvider, type NormalizedHazardFeature } from '../natural-hazards-source.provider';
import { ExternalSourcesRepository } from '../repositories/external-sources.repository';

type NormalizedExternalFeature = NormalizedHazardFeature;

@Injectable()
export class ExternalSourcesService implements OnModuleInit {
  private readonly logger = new Logger(ExternalSourcesService.name);

  constructor(
    private readonly externalSourcesRepository: ExternalSourcesRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly dgacSourceProvider: DgacSourceProvider,
    private readonly naturalHazardsSourceProvider: NaturalHazardsSourceProvider,
  ) {}

  list() {
    return this.externalSourcesRepository.list();
  }

  onModuleInit() {
    void this.syncEnabledSourcesOnStartup();
  }

  async syncAll() {
    const enabledSources = await this.externalSourcesRepository.listEnabled();
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
    const source = await this.externalSourcesRepository.get(id);
    return this.syncSource(source);
  }

  private async syncSource(source: Awaited<ReturnType<ExternalSourcesRepository['get']>>) {
    try {
      const result = await this.runSync(source);
      await this.externalSourcesRepository.markSuccessfulSync(source.id);
      return result;
    } catch (error) {
      await this.externalSourcesRepository.markFailedSync(source.id, error);
      throw error;
    }
  }

  private async syncEnabledSourcesOnStartup() {
    try {
      const enabledSources = await this.externalSourcesRepository.listEnabled();

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

  private async runSync(source: Awaited<ReturnType<ExternalSourcesRepository['get']>>) {
    const provider = typeof source.providerConfig.provider === 'string' ? source.providerConfig.provider : 'mock';
    if (provider === 'dgac') {
      return this.syncDgacSource(source);
    }
    if (provider === 'natural-hazards') {
      return this.syncNaturalHazardsSource(source);
    }
    return this.syncMockSource(source);
  }

  private async syncDgacSource(source: Awaited<ReturnType<ExternalSourcesRepository['get']>>) {
    return this.syncNormalizedSource(source, await this.dgacSourceProvider.fetch(source.providerConfig), 'dgac');
  }

  private async syncNaturalHazardsSource(source: Awaited<ReturnType<ExternalSourcesRepository['get']>>) {
    return this.syncNormalizedSource(
      source,
      await this.naturalHazardsSourceProvider.fetch(source.providerConfig),
      'natural-hazards',
    );
  }

  private async syncNormalizedSource(
    source: Awaited<ReturnType<ExternalSourcesRepository['get']>>,
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

    await this.externalSourcesRepository.replaceLayerFeatures(layerId, source.id, fetchedAt, expiresAt, rows);

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

  private async syncMockSource(source: Awaited<ReturnType<ExternalSourcesRepository['get']>>) {
    const layerId = source.sourceType === 'fire-intel' ? 'layer-fire-intel' : 'layer-air-traffic';
    const featureId = `feature-${randomUUID().slice(0, 8)}`;
    const point = source.sourceType === 'fire-intel'
      ? { type: 'Point', coordinates: [-70.6601, -33.4485] as [number, number] }
      : { type: 'Point', coordinates: [-70.7002, -33.4601] as [number, number] };

    await this.externalSourcesRepository.insertMockFeature(
      layerId,
      source.sourceType,
      featureId,
      point,
      source.name,
      source.ttlSec,
    );

    this.eventEmitter.emit(DOMAIN_EVENTS.layerSynced, { layerId, sourceId: source.id });
    return { success: true, layerId, sourceId: source.id, featureCount: 1, provider: 'mock' };
  }

  private resolveLayerId(source: Awaited<ReturnType<ExternalSourcesRepository['get']>>) {
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
