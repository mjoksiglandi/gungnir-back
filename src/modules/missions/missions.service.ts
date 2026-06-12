import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { devices, missionDevices, missions } from '@/infrastructure/database/schema';
import type { MissionDto } from './dto/mission.schemas';

@Injectable()
export class MissionsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async getAssignedDevices(missionIds: string[]) {
    if (missionIds.length === 0) {
      return new Map<
        string,
        Array<{
          deviceId: string;
          callsign: string;
          platformType: string;
          metadata: Record<string, unknown>;
        }>
      >();
    }

    const rows = await this.db
      .select({
        missionId: missionDevices.missionId,
        deviceId: missionDevices.deviceId,
        callsign: missionDevices.callsign,
        metadata: missionDevices.metadata,
        platformType: devices.platformType,
      })
      .from(missionDevices)
      .innerJoin(devices, eq(devices.id, missionDevices.deviceId))
      .where(inArray(missionDevices.missionId, missionIds));

    const assignments = new Map<
      string,
      Array<{
        deviceId: string;
        callsign: string;
        platformType: string;
        metadata: Record<string, unknown>;
      }>
    >();

    for (const row of rows) {
      const bucket = assignments.get(row.missionId) ?? [];
      bucket.push({
        deviceId: row.deviceId,
        callsign: row.callsign,
        platformType: row.platformType,
        metadata: row.metadata,
      });
      assignments.set(row.missionId, bucket);
    }

    return assignments;
  }

  private async syncAssignedDevices(
    missionId: string,
    assignedDevices: MissionDto['assignedDevices'],
  ) {
    await this.db
      .delete(missionDevices)
      .where(eq(missionDevices.missionId, missionId));

    if (assignedDevices.length === 0) {
      return;
    }

    await this.db.insert(missionDevices).values(
      assignedDevices.map((device) => ({
        missionId,
        deviceId: device.deviceId,
        callsign: device.callsign,
        metadata: device.metadata,
      })),
    );
  }

  async list() {
    const missionRows = await this.db
      .select()
      .from(missions)
      .orderBy(desc(missions.createdAt));
    const assignments = await this.getAssignedDevices(
      missionRows.map((mission) => mission.id),
    );

    return missionRows.map((mission) => ({
      ...mission,
      assignedDevices: assignments.get(mission.id) ?? [],
    }));
  }

  async get(id: string) {
    const [mission] = await this.db.select().from(missions).where(eq(missions.id, id)).limit(1);
    if (!mission) throw new NotFoundException(`Mission '${id}' was not found.`);

    const assignments = await this.getAssignedDevices([mission.id]);
    return {
      ...mission,
      assignedDevices: assignments.get(mission.id) ?? [],
    };
  }

  async create(input: MissionDto) {
    const id = `mission-${randomUUID().slice(0, 8)}`;
    if (input.geometry) {
      await this.sqlClient.unsafe(
        `INSERT INTO missions (id, name, status, mission_type, geometry, start_time, end_time, assigned_units, metadata)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), $6, $7, $8::jsonb, $9::jsonb)`,
        [id, input.name, input.status, input.missionType, JSON.stringify(input.geometry), input.startTime ?? null, input.endTime ?? null, JSON.stringify(input.assignedUnits), JSON.stringify(input.metadata)],
      );
    } else {
      await this.db.insert(missions).values({
        id,
        name: input.name,
        status: input.status,
        missionType: input.missionType,
        startTime: input.startTime ? new Date(input.startTime) : null,
        endTime: input.endTime ? new Date(input.endTime) : null,
        assignedUnits: input.assignedUnits,
        metadata: input.metadata,
      });
    }

    await this.syncAssignedDevices(id, input.assignedDevices);
    this.eventEmitter.emit(DOMAIN_EVENTS.missionUpdated, { missionId: id, status: input.status });
    return this.get(id);
  }

  async update(id: string, input: MissionDto) {
    await this.get(id);
    await this.db.update(missions).set({
      name: input.name,
      status: input.status,
      missionType: input.missionType,
      startTime: input.startTime ? new Date(input.startTime) : null,
      endTime: input.endTime ? new Date(input.endTime) : null,
      assignedUnits: input.assignedUnits,
      metadata: input.metadata,
      updatedAt: new Date(),
    }).where(eq(missions.id, id));

    await this.syncAssignedDevices(id, input.assignedDevices);
    this.eventEmitter.emit(DOMAIN_EVENTS.missionUpdated, { missionId: id, status: input.status });
    return this.get(id);
  }

  async remove(id: string) {
    await this.get(id);
    await this.db.delete(missions).where(eq(missions.id, id));
    return { success: true };
  }
}
