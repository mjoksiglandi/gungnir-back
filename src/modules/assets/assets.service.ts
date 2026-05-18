import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { assets } from '@/infrastructure/database/schema';

@Injectable()
export class AssetsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDb) {}

  list() {
    return this.db.select().from(assets);
  }

  async findById(id: string) {
    const [asset] = await this.db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return asset ?? null;
  }
}
