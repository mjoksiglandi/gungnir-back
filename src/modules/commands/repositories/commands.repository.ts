import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { commands } from '@/infrastructure/database/schema';
import type { CommandCreateDto } from '../dto/command.schemas';

@Injectable()
export class CommandsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDb) {}

  buildIdentifiers() {
    return {
      id: `cmd-${randomUUID().slice(0, 8)}`,
      commandId: `command-${randomUUID()}`,
    };
  }

  async create(input: CommandCreateDto, id: string, commandId: string, issuedByUserId: string | null, expiresAt: Date) {
    await this.db.insert(commands).values({
      id,
      commandId,
      assetId: input.assetId ?? null,
      deviceId: input.deviceId,
      type: input.type,
      payload: input.payload,
      status: 'pending',
      priority: input.priority,
      issuedByUserId,
      expiresAt,
      correlationData: {
        ttlMs: expiresAt.getTime() - Date.now(),
        retryPolicy: { maxRetries: 3 },
      },
    });
  }

  async markSent(id: string) {
    await this.db.update(commands).set({ status: 'sent' }).where(eq(commands.id, id));
  }

  list() {
    return this.db.select().from(commands).orderBy(desc(commands.issuedAt)).limit(200);
  }

  async get(id: string) {
    const [command] = await this.db.select().from(commands).where(eq(commands.id, id)).limit(1);
    if (!command) {
      throw new NotFoundException(`Command '${id}' was not found.`);
    }
    return command;
  }

  async cancel(id: string) {
    await this.db.update(commands).set({ status: 'cancelled', completedAt: new Date() }).where(eq(commands.id, id));
  }

  async updateFromResponse(payload: { commandId: string; status: string; response?: Record<string, unknown> }) {
    const nextStatus = payload.status === 'accepted' || payload.status === 'completed' || payload.status === 'rejected'
      ? payload.status
      : 'failed';

    await this.db.update(commands).set({
      status: nextStatus,
      ackAt: new Date(),
      completedAt: nextStatus === 'completed' ? new Date() : null,
      rawResponse: payload.response ?? {},
    }).where(eq(commands.commandId, payload.commandId));

    return nextStatus;
  }
}
