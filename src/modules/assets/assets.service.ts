import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { assets } from '@/infrastructure/database/schema';

const LEGACY_DUMMY_ASSET_IDS = new Set(['asset-uav-001']);

@Injectable()
export class AssetsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDb) {}

  async list() {
    const rows = await this.db.select().from(assets);
    return rows.filter((asset) => !LEGACY_DUMMY_ASSET_IDS.has(asset.id));
  }

  async findById(id: string) {
    if (LEGACY_DUMMY_ASSET_IDS.has(id)) {
      return null;
    }
    const [asset] = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return asset ?? null;
  }
}
