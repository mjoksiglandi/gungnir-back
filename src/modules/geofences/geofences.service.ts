import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { geofences } from '@/infrastructure/database/schema';
import type { GeofenceDto } from './dto/geofence.schemas';

@Injectable()
export class GeofencesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
  ) {}

  list() {
    return this.db.select().from(geofences);
  }

  async get(id: string) {
    const [row] = await this.db.select().from(geofences).where(eq(geofences.id, id)).limit(1);
    if (!row) throw new NotFoundException(`Geofence '${id}' was not found.`);
    return row;
  }

  async create(input: GeofenceDto) {
    const id = `geofence-${randomUUID().slice(0, 8)}`;
    await this.sqlClient.unsafe(
      `INSERT INTO geofences (id, name, geometry, type, status, rules, metadata)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6::jsonb, $7::jsonb)`,
      [id, input.name, JSON.stringify(input.geometry), input.type, input.status, JSON.stringify(input.rules), JSON.stringify(input.metadata)],
    );
    return this.get(id);
  }

  async update(id: string, input: GeofenceDto) {
    await this.get(id);
    await this.sqlClient.unsafe(
      `UPDATE geofences
       SET name = $2, geometry = ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), type = $4, status = $5,
           rules = $6::jsonb, metadata = $7::jsonb, updated_at = now()
       WHERE id = $1`,
      [id, input.name, JSON.stringify(input.geometry), input.type, input.status, JSON.stringify(input.rules), JSON.stringify(input.metadata)],
    );
    return this.get(id);
  }

  async remove(id: string) {
    await this.get(id);
    await this.db.delete(geofences).where(eq(geofences.id, id));
    return { success: true };
  }
}
