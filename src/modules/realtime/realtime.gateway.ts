import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { DOMAIN_EVENTS } from '@/contracts/domain-events';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Realtime client connected: ${client.id}`);
  }

  @OnEvent(DOMAIN_EVENTS.trackUpdated)
  handleTrackUpdated(payload: Record<string, unknown>) {
    this.server.emit('track.updated', payload);
  }

  @OnEvent(DOMAIN_EVENTS.telemetryReceived)
  handleTelemetryReceived(payload: Record<string, unknown>) {
    this.server.emit('telemetry.received', payload);
  }

  @OnEvent(DOMAIN_EVENTS.commandAcknowledged)
  handleCommandStatusChanged(payload: Record<string, unknown>) {
    this.server.emit('command.status.changed', payload);
  }

  @OnEvent(DOMAIN_EVENTS.alertCreated)
  handleAlertCreated(payload: Record<string, unknown>) {
    this.server.emit('alert.created', payload);
  }

  @OnEvent(DOMAIN_EVENTS.alertUpdated)
  handleAlertUpdated(payload: Record<string, unknown>) {
    this.server.emit('alert.updated', payload);
  }

  @OnEvent(DOMAIN_EVENTS.missionUpdated)
  handleMissionUpdated(payload: Record<string, unknown>) {
    this.server.emit('mission.updated', payload);
  }

  @OnEvent(DOMAIN_EVENTS.layerSynced)
  handleLayerUpdated(payload: Record<string, unknown>) {
    this.server.emit('layer.updated', payload);
  }
}
