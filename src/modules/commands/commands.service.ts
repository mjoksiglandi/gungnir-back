import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { DRIZZLE_DB } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { commands } from '@/infrastructure/database/schema';
import { MqttService } from '@/infrastructure/mqtt/mqtt.service';
import type { CommandCreateDto } from './dto/command.schemas';

@Injectable()
export class CommandsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    private readonly eventEmitter: EventEmitter2,
    private readonly mqttService: MqttService,
  ) {}

  async create(input: CommandCreateDto, issuedByUserId?: string) {
    const id = `cmd-${randomUUID().slice(0, 8)}`;
    const commandId = `command-${randomUUID()}`;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 60_000);

    await this.db.insert(commands).values({
      id,
      commandId,
      assetId: input.assetId ?? null,
      deviceId: input.deviceId,
      type: input.type,
      payload: input.payload,
      status: 'pending',
      priority: input.priority,
      issuedByUserId: issuedByUserId ?? null,
      expiresAt,
      correlationData: {
        ttlMs: expiresAt.getTime() - Date.now(),
        retryPolicy: { maxRetries: 3 },
      },
    });

    await this.mqttService.publishJson(`cmd/${input.deviceId}/request`, {
      commandId,
      type: input.type,
      payload: input.payload,
      expiresAt: expiresAt.toISOString(),
    });

    await this.db.update(commands).set({ status: 'sent' }).where(eq(commands.id, id));
    this.eventEmitter.emit(DOMAIN_EVENTS.commandIssued, { commandId, deviceId: input.deviceId, assetId: input.assetId ?? null });
    return this.get(id);
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
    await this.get(id);
    await this.db.update(commands).set({ status: 'cancelled', completedAt: new Date() }).where(eq(commands.id, id));
    return this.get(id);
  }

  @OnEvent('mqtt.command.response')
  async handleCommandResponse(payload: { commandId: string; status: string; response?: Record<string, unknown> }) {
    const nextStatus = payload.status === 'accepted' || payload.status === 'completed' || payload.status === 'rejected'
      ? payload.status
      : 'failed';

    await this.db.update(commands).set({
      status: nextStatus as 'accepted' | 'completed' | 'rejected' | 'failed',
      ackAt: new Date(),
      completedAt: nextStatus === 'completed' ? new Date() : null,
      rawResponse: payload.response ?? {},
    }).where(eq(commands.commandId, payload.commandId));

    this.eventEmitter.emit(DOMAIN_EVENTS.commandAcknowledged, {
      commandId: payload.commandId,
      status: nextStatus,
      deviceId: '',
    });
  }
}
