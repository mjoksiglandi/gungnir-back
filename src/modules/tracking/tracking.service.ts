import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { currentTrackStates, trackHistory } from '@/infrastructure/database/schema';

const SCALE = 1_000_000;

@Injectable()
export class TrackingService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDb) {}

  current() {
    return this.db.select().from(currentTrackStates).orderBy(desc(currentTrackStates.timestamp));
  }

  history() {
    return this.db.select().from(trackHistory).orderBy(desc(trackHistory.timestamp)).limit(500);
  }

  async get(id: string) {
    const [track] = await this.db.select().from(currentTrackStates).where(eq(currentTrackStates.id, id)).limit(1);
    if (!track) {
      throw new NotFoundException(`Track '${id}' was not found.`);
    }
    return track;
  }

  bbox(query: { minLat?: number; minLon?: number; maxLat?: number; maxLon?: number }) {
    const filters = [];
    if (query.minLat != null) filters.push(gte(currentTrackStates.lat, Math.round(query.minLat * SCALE)));
    if (query.maxLat != null) filters.push(lte(currentTrackStates.lat, Math.round(query.maxLat * SCALE)));
    if (query.minLon != null) filters.push(gte(currentTrackStates.lon, Math.round(query.minLon * SCALE)));
    if (query.maxLon != null) filters.push(lte(currentTrackStates.lon, Math.round(query.maxLon * SCALE)));

    if (filters.length === 0) {
      return this.current();
    }

    return this.db.select().from(currentTrackStates).where(and(...filters));
  }
}
