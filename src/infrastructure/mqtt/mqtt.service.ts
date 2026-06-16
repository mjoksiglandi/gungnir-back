import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import mqtt, { type MqttClient } from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    const url = this.configService.getOrThrow<string>('app.MQTT_URL');
    this.client = mqtt.connect(url, {
      username: this.configService.get<string>('app.MQTT_USERNAME'),
      password: this.configService.get<string>('app.MQTT_PASSWORD'),
      protocolVersion: 5,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker ${url}`);
      void this.client?.subscribe([
        'telemetry/+/state',
        'cmd/+/response',
        'device/+/status',
        'dev/+/uplink',
      ]);
    });

    this.client.on('message', (topic, payloadBuffer) => {
      try {
        const payload = JSON.parse(payloadBuffer.toString()) as Record<
          string,
          unknown
        >;

        if (topic.startsWith('telemetry/')) {
          this.eventEmitter.emit('mqtt.telemetry.state', payload);
          return;
        }

        if (
          topic.startsWith('dev/') &&
          payload.type === 'guardian.uplink.e2e'
        ) {
          this.eventEmitter.emit('mqtt.guardian.uplink', payload);
          return;
        }

        if (topic.startsWith('cmd/')) {
          this.eventEmitter.emit('mqtt.command.response', payload);
          return;
        }

        if (topic.startsWith('device/')) {
          this.eventEmitter.emit('mqtt.device.status', payload);
        }
      } catch (error) {
        this.logger.warn(
          `Invalid MQTT payload for topic ${topic}: ${String(error)}`,
        );
      }
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT error: ${error.message}`);
    });
  }

  publishJson(topic: string, payload: Record<string, unknown>) {
    if (!this.client) {
      this.logger.warn(`MQTT client unavailable; skipping publish to ${topic}`);
      return;
    }

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
  }

  onModuleDestroy() {
    this.client?.end(true);
  }
}
