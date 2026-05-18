import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { commands, currentTrackStates, devices, telemetryReports } from '@/infrastructure/database/schema';

@Injectable()
export class DevicesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDb) {}

  list() {
    return this.db.select().from(devices);
  }

  async get(id: string) {
    const [device] = await this.db.select().from(devices).where(eq(devices.id, id)).limit(1);
    if (!device) {
      throw new NotFoundException(`Device '${id}' was not found.`);
    }
    return device;
  }

  async create(input: {
    assetId?: string;
    deviceType: string;
    sourceType: string;
    externalId?: string;
    status?: 'online' | 'offline' | 'degraded' | 'retired';
    metadata?: Record<string, unknown>;
  }) {
    const id = `device-${randomUUID().slice(0, 8)}`;
    await this.db.insert(devices).values({
      id,
      assetId: input.assetId ?? null,
      deviceType: input.deviceType,
      sourceType: input.sourceType,
      externalId: input.externalId ?? null,
      status: input.status ?? 'offline',
      metadata: input.metadata ?? {},
    });
    return this.get(id);
  }

  async update(id: string, input: {
    assetId?: string;
    deviceType: string;
    sourceType: string;
    externalId?: string;
    status?: 'online' | 'offline' | 'degraded' | 'retired';
    metadata?: Record<string, unknown>;
  }) {
    await this.get(id);
    await this.db.update(devices).set({
      assetId: input.assetId ?? null,
      deviceType: input.deviceType,
      sourceType: input.sourceType,
      externalId: input.externalId ?? null,
      status: input.status ?? 'offline',
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    }).where(eq(devices.id, id));
    return this.get(id);
  }

  async currentState(id: string) {
    await this.get(id);
    const [state] = await this.db
      .select()
      .from(currentTrackStates)
      .where(eq(currentTrackStates.deviceId, id))
      .limit(1);
    return state ?? null;
  }

  telemetry(id: string) {
    return this.db
      .select()
      .from(telemetryReports)
      .where(eq(telemetryReports.deviceId, id))
      .orderBy(desc(telemetryReports.timestamp))
      .limit(200);
  }

  commands(id: string) {
    return this.db
      .select()
      .from(commands)
      .where(eq(commands.deviceId, id))
      .orderBy(desc(commands.issuedAt))
      .limit(100);
  }

  @OnEvent('mqtt.device.status')
  async handleMqttDeviceStatus(payload: { deviceId?: string; status?: 'online' | 'offline' | 'degraded' | 'retired'; lastSeenAt?: string }) {
    if (!payload.deviceId || !payload.status) {
      return;
    }

    await this.db.update(devices).set({
      status: payload.status,
      lastSeenAt: payload.lastSeenAt ? new Date(payload.lastSeenAt) : new Date(),
      updatedAt: new Date(),
    }).where(eq(devices.id, payload.deviceId));
  }
}
