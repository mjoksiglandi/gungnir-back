import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import type postgres from 'postgres';
import { guardianUplinkE2eSchema } from './guardian-uplink-e2e.schemas';
import { TelemetryService } from './telemetry.service';
import {
  DRIZZLE_DB,
  POSTGRES_CONNECTION,
} from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import {
  buildAadV1,
  buildNonceV1,
  decryptAes256Gcm,
  hexToBuffer,
} from './guardian-uplink-e2e.crypto';
import {
  knotsX10ToMetersPerSecond,
  parseGuardianPayloadV1,
} from './guardian-uplink-e2e.payload-v1';

@Injectable()
export class GuardianUplinkE2eService {
  private readonly logger = new Logger(GuardianUplinkE2eService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
    private readonly configService: ConfigService,
    private readonly telemetryService: TelemetryService,
  ) {}

  @OnEvent('mqtt.guardian.uplink')
  async handleGuardianUplink(payload: Record<string, unknown>) {
    const envelope = guardianUplinkE2eSchema.safeParse(payload);
    if (!envelope.success) {
      this.logger.warn(
        `Rejected guardian uplink: schema validation failed (${envelope.error.issues[0]?.message ?? 'unknown'})`,
      );
      return;
    }

    const keyHex = this.configService.get<string>('app.GUARDIAN_E2E_KEY_HEX');
    if (!keyHex) {
      this.logger.warn(
        `Rejected guardian uplink for ${envelope.data.device_id}: GUARDIAN_E2E_KEY_HEX is not configured`,
      );
      return;
    }

    const seq = BigInt(`0x${envelope.data.e2e.seq}`);
    const expectedNonce = buildNonceV1(envelope.data.device_id, seq);
    const receivedNonce = hexToBuffer(envelope.data.e2e.nonce);
    if (!receivedNonce.equals(expectedNonce)) {
      this.logger.warn(
        `Rejected guardian uplink for ${envelope.data.device_id}: nonce mismatch`,
      );
      return;
    }

    const aad = buildAadV1(
      envelope.data.e2e.version,
      envelope.data.channel,
      envelope.data.device_id,
      seq,
    );

    let plaintext: Buffer;
    try {
      plaintext = decryptAes256Gcm({
        aad,
        ciphertext: hexToBuffer(envelope.data.e2e.ciphertext),
        key: hexToBuffer(keyHex),
        nonce: receivedNonce,
        tag: hexToBuffer(envelope.data.e2e.tag),
      });
    } catch (error) {
      this.logger.warn(
        `Rejected guardian uplink for ${envelope.data.device_id}: decrypt failed (${String(error)})`,
      );
      return;
    }

    let parsedPayload;
    try {
      parsedPayload = parseGuardianPayloadV1(plaintext);
    } catch (error) {
      this.logger.warn(
        `Rejected guardian uplink for ${envelope.data.device_id}: invalid payload (${String(error)})`,
      );
      return;
    }

    const accepted = await this.claimSequence(envelope.data.device_id, seq, {
      channel: envelope.data.channel,
      payloadVersion: parsedPayload.payloadVersion,
      schema: envelope.data.schema,
    });

    if (!accepted) {
      this.logger.warn(
        `Rejected guardian uplink for ${envelope.data.device_id}: replay seq=${envelope.data.e2e.seq}`,
      );
      return;
    }

    await this.telemetryService.ingest({
      deviceId: envelope.data.device_id,
      source: `guardian-e2e:${envelope.data.channel}`,
      timestamp: new Date(parsedPayload.fixTimeUnix * 1000).toISOString(),
      lat: parsedPayload.lat,
      lon: parsedPayload.lon,
      altitudeM: parsedPayload.altitudeM,
      headingDeg: parsedPayload.headingDeg,
      groundSpeedMs: knotsX10ToMetersPerSecond(parsedPayload.speedKnX10),
      rawPayload: {
        envelope: envelope.data,
        decoded: {
          ...parsedPayload,
          seq: envelope.data.e2e.seq,
          aad,
          gpsValid: (parsedPayload.flags & 0b0000_0001) !== 0,
          sosActive: (parsedPayload.flags & 0b0000_0010) !== 0,
          fallbackPosition: (parsedPayload.flags & 0b0000_0100) !== 0,
          lowBattery: (parsedPayload.flags & 0b0000_1000) !== 0,
        },
      },
    });
  }

  private async claimSequence(
    deviceId: string,
    seq: bigint,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    const result = await this.sqlClient`
      INSERT INTO guardian_e2e_device_state (
        device_id,
        max_seq_accepted,
        last_valid_received_at,
        metadata
      )
      VALUES (
        ${deviceId},
        ${seq.toString()}::bigint,
        NOW(),
        ${JSON.stringify(metadata)}::jsonb
      )
      ON CONFLICT (device_id) DO UPDATE
      SET
        max_seq_accepted = EXCLUDED.max_seq_accepted,
        last_valid_received_at = NOW(),
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      WHERE guardian_e2e_device_state.max_seq_accepted < EXCLUDED.max_seq_accepted
      RETURNING device_id
    `;

    return result.length > 0;
  }
}
