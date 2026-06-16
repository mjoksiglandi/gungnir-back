import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, ilike, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import {
  commands,
  currentTrackStates,
  deviceCallsignAssignments,
  devices,
  telemetryReports,
} from '@/infrastructure/database/schema';
import type {
  DeviceCallsignAssignmentsReplaceDto,
  DeviceListQueryDto,
  DevicePlatformDto,
} from '../dto/device.schemas';
import type { DeviceCallsignAssignmentRecord, DeviceUpsertInput } from '../types/device.types';

@Injectable()
export class DevicesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDb) {}

  async getRecord(id: string) {
    const [device] = await this.db.select().from(devices).where(eq(devices.id, id)).limit(1);
    if (!device) {
      throw new NotFoundException(`Device '${id}' was not found.`);
    }
    return device;
  }

  async getCallsignAssignmentsMap(deviceIds: string[]) {
    const callsignMap = new Map<string, DeviceCallsignAssignmentRecord[]>();

    if (deviceIds.length === 0) {
      return callsignMap;
    }

    const rows = await this.db
      .select()
      .from(deviceCallsignAssignments)
      .where(inArray(deviceCallsignAssignments.deviceId, deviceIds))
      .orderBy(desc(deviceCallsignAssignments.startTime));

    for (const row of rows) {
      const bucket = callsignMap.get(row.deviceId) ?? [];
      bucket.push(row);
      callsignMap.set(row.deviceId, bucket);
    }

    return callsignMap;
  }

  async list(query: DeviceListQueryDto = {}) {
    const matchedDeviceIds = query.callsign
      ? await this.db
        .select({ deviceId: deviceCallsignAssignments.deviceId })
        .from(deviceCallsignAssignments)
        .where(ilike(deviceCallsignAssignments.callsign, `%${query.callsign}%`))
      : [];

    if (query.callsign && matchedDeviceIds.length === 0) {
      return [];
    }

    return query.callsign
      ? this.db
        .select()
        .from(devices)
        .where(
          inArray(
            devices.id,
            [...new Set(matchedDeviceIds.map((row) => row.deviceId))],
          ),
        )
      : this.db.select().from(devices);
  }

  async replaceCallsignAssignments(
    id: string,
    input: DeviceCallsignAssignmentsReplaceDto,
    assetId: string | null,
  ) {
    await this.db
      .delete(deviceCallsignAssignments)
      .where(eq(deviceCallsignAssignments.deviceId, id));

    if (input.callsignAssignments.length > 0) {
      await this.db.insert(deviceCallsignAssignments).values(
        input.callsignAssignments.map((assignment) => ({
          id: `dca-${randomUUID().slice(0, 8)}`,
          deviceId: id,
          assetId: assignment.assetId ?? assetId,
          callsign: assignment.callsign,
          startTime: new Date(assignment.startTime),
          endTime: assignment.endTime ? new Date(assignment.endTime) : null,
          metadata: assignment.metadata,
        })),
      );
    }
  }

  async create(input: DeviceUpsertInput) {
    const id = `device-${randomUUID().slice(0, 8)}`;
    await this.db.insert(devices).values({
      id,
      assetId: input.assetId ?? null,
      deviceType: input.deviceType,
      sourceType: input.sourceType,
      platformType: input.platformType ?? 'unknown',
      externalId: input.externalId ?? null,
      status: input.status ?? 'offline',
      metadata: input.metadata ?? {},
    });
    return id;
  }

  async update(id: string, input: DeviceUpsertInput, existingPlatformType: DevicePlatformDto) {
    await this.db.update(devices).set({
      assetId: input.assetId ?? null,
      deviceType: input.deviceType,
      sourceType: input.sourceType,
      platformType: input.platformType ?? existingPlatformType,
      externalId: input.externalId ?? null,
      status: input.status ?? 'offline',
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    }).where(eq(devices.id, id));
  }

  async findCurrentStateByDeviceId(deviceId: string) {
    const [state] = await this.db
      .select()
      .from(currentTrackStates)
      .where(eq(currentTrackStates.deviceId, deviceId))
      .limit(1);
    return state ?? null;
  }

  findTelemetryByDeviceId(deviceId: string) {
    return this.db
      .select()
      .from(telemetryReports)
      .where(eq(telemetryReports.deviceId, deviceId))
      .orderBy(desc(telemetryReports.timestamp))
      .limit(200);
  }

  findCommandsByDeviceId(deviceId: string) {
    return this.db
      .select()
      .from(commands)
      .where(eq(commands.deviceId, deviceId))
      .orderBy(desc(commands.issuedAt))
      .limit(100);
  }

  async updateStatus(payload: { deviceId: string; status: 'online' | 'offline' | 'degraded' | 'retired'; lastSeenAt?: string }) {
    await this.db.update(devices).set({
      status: payload.status,
      lastSeenAt: payload.lastSeenAt ? new Date(payload.lastSeenAt) : new Date(),
      updatedAt: new Date(),
    }).where(eq(devices.id, payload.deviceId));
  }
}
