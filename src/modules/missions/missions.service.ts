import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { missions } from '@/infrastructure/database/schema';
import type { MissionDto } from './dto/mission.schemas';

@Injectable()
export class MissionsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  list() {
    return this.db.select().from(missions).orderBy(desc(missions.createdAt));
  }

  async get(id: string) {
    const [mission] = await this.db.select().from(missions).where(eq(missions.id, id)).limit(1);
    if (!mission) throw new NotFoundException(`Mission '${id}' was not found.`);
    return mission;
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
    this.eventEmitter.emit(DOMAIN_EVENTS.missionUpdated, { missionId: id, status: input.status });
    return this.get(id);
  }

  async remove(id: string) {
    await this.get(id);
    await this.db.delete(missions).where(eq(missions.id, id));
    return { success: true };
  }
}
