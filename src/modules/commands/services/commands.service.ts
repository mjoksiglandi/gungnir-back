import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';
import { MqttService } from '@/infrastructure/mqtt/mqtt.service';
import type { CommandCreateDto } from '../dto/command.schemas';
import { CommandsRepository } from '../repositories/commands.repository';

@Injectable()
export class CommandsService {
  constructor(
    private readonly commandsRepository: CommandsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly mqttService: MqttService,
  ) {}

  async create(input: CommandCreateDto, issuedByUserId?: string) {
    const { id, commandId } = this.commandsRepository.buildIdentifiers();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 60_000);

    await this.commandsRepository.create(input, id, commandId, issuedByUserId ?? null, expiresAt);

    this.mqttService.publishJson(`cmd/${input.deviceId}/request`, {
      commandId,
      type: input.type,
      payload: input.payload,
      expiresAt: expiresAt.toISOString(),
    });

    await this.commandsRepository.markSent(id);
    this.eventEmitter.emit(DOMAIN_EVENTS.commandIssued, {
      commandId,
      deviceId: input.deviceId,
      assetId: input.assetId ?? null,
    });
    return this.get(id);
  }

  list() {
    return this.commandsRepository.list();
  }

  get(id: string) {
    return this.commandsRepository.get(id);
  }

  async cancel(id: string) {
    await this.commandsRepository.get(id);
    await this.commandsRepository.cancel(id);
    return this.get(id);
  }

  @OnEvent('mqtt.command.response')
  async handleCommandResponse(payload: { commandId: string; status: string; response?: Record<string, unknown> }) {
    const nextStatus = await this.commandsRepository.updateFromResponse(payload);

    this.eventEmitter.emit(DOMAIN_EVENTS.commandAcknowledged, {
      commandId: payload.commandId,
      status: nextStatus,
      deviceId: '',
    });
  }
}
