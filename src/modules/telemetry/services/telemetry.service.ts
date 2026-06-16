import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { createHash } from 'node:crypto';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { telemetryIngestSchema, type TelemetryIngestDto } from '../dto/telemetry.schemas';
import { TelemetryRepository } from '../repositories/telemetry.repository';

@Injectable()
export class TelemetryService {
  constructor(
    private readonly telemetryRepository: TelemetryRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private buildAutoCreatedAssetId(deviceId: string) {
    const fingerprint = createHash('sha1').update(deviceId).digest('hex').slice(0, 16);
    return `asset-auto-${fingerprint}`;
  }

  private async ensureDeviceExists(input: TelemetryIngestDto) {
    const existingDevice = await this.telemetryRepository.findDevice(input.deviceId);
    if (existingDevice) {
      return existingDevice;
    }

    const assetId = this.buildAutoCreatedAssetId(input.deviceId);
    return this.telemetryRepository.createAutoProvisionedDevice(input, assetId);
  }

  async ingest(input: TelemetryIngestDto) {
    const device = await this.ensureDeviceExists(input);
    const assetId = input.assetId ?? device.assetId;
    const result = await this.telemetryRepository.ingest(input, assetId);

    this.eventEmitter.emit(DOMAIN_EVENTS.telemetryReceived, {
      deviceId: input.deviceId,
      assetId,
      timestamp: result.timestamp,
    });

    if (assetId) {
      this.eventEmitter.emit(DOMAIN_EVENTS.trackUpdated, {
        assetId,
        deviceId: input.deviceId,
        timestamp: result.timestamp,
        lat: input.lat,
        lon: input.lon,
      });
    }

    return {
      id: result.id,
      assetId,
      deviceId: input.deviceId,
      status: 'ingested',
    };
  }

  list() {
    return this.telemetryRepository.list();
  }

  byDevice(deviceId: string) {
    return this.telemetryRepository.byDevice(deviceId);
  }

  @OnEvent('mqtt.telemetry.state')
  async handleMqttTelemetry(payload: Record<string, unknown>) {
    const parsed = telemetryIngestSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }

    await this.ingest(parsed.data);
  }
}
