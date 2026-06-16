import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { GEO_COORDINATE_SCALE } from '@/common/constants/geo.constants';
import { DRIZZLE_DB, POSTGRES_CONNECTION } from '@/infrastructure/database/database.tokens';
import type { AppDb } from '@/infrastructure/database/database.types';
import { assets, currentTrackStates, devices, telemetryReports, trackHistory } from '@/infrastructure/database/schema';
import type postgres from 'postgres';
import type { TelemetryIngestDto } from '../dto/telemetry.schemas';

@Injectable()
export class TelemetryRepository {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDb,
    @Inject(POSTGRES_CONNECTION) private readonly sqlClient: postgres.Sql,
  ) {}

  async findDevice(deviceId: string) {
    const [existingDevice] = await this.db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    return existingDevice ?? null;
  }

  async createAutoProvisionedDevice(input: TelemetryIngestDto, assetId: string) {
    await this.db.insert(assets).values({
      id: assetId,
      name: `Auto ${input.deviceId}`,
      assetType: 'autonomous',
      platformType: 'generic',
      status: 'nominal',
      metadata: {
        autoCreated: true,
        autoCreatedFrom: 'telemetry',
        sourceType: input.source,
        deviceId: input.deviceId,
      },
    }).onConflictDoNothing();

    await this.db.insert(devices).values({
      id: input.deviceId,
      assetId,
      deviceType: 'telemetry-endpoint',
      sourceType: input.source,
      platformType: 'unknown',
      externalId: input.deviceId,
      status: 'online',
      lastSeenAt: new Date(input.timestamp),
      metadata: {
        autoCreated: true,
        autoCreatedFrom: 'telemetry',
      },
    }).onConflictDoNothing();

    const createdDevice = await this.findDevice(input.deviceId);
    if (!createdDevice) {
      throw new NotFoundException(`Device '${input.deviceId}' could not be created.`);
    }

    return createdDevice;
  }

  async ingest(input: TelemetryIngestDto, assetId: string | null) {
    const telemetryId = `telemetry-${randomUUID().slice(0, 8)}`;
    const trackId = `track-${input.deviceId}`;
    const historyId = `track-history-${randomUUID().slice(0, 8)}`;
    const latScaled = Math.round(input.lat * GEO_COORDINATE_SCALE);
    const lonScaled = Math.round(input.lon * GEO_COORDINATE_SCALE);
    const timestamp = new Date(input.timestamp);
    const altitudeM = input.altitudeM != null ? Math.round(input.altitudeM) : null;
    const headingDeg = input.headingDeg != null ? Math.round(input.headingDeg) : null;
    const groundSpeedMs = input.groundSpeedMs != null ? Math.round(input.groundSpeedMs) : null;
    const verticalSpeedMs = input.verticalSpeedMs != null ? Math.round(input.verticalSpeedMs) : null;
    const batteryPct = input.batteryPct != null ? Math.round(input.batteryPct) : null;
    const signalQuality = input.signalQuality != null ? Math.round(input.signalQuality) : null;

    await this.sqlClient.unsafe(
      `
        INSERT INTO telemetry_reports (
          id, device_id, asset_id, source, timestamp, position, lat_scaled, lon_scaled,
          altitude_m, heading_deg, ground_speed_ms, vertical_speed_ms, battery_pct,
          signal_quality, mode, armed, raw_payload
        )
        VALUES (
          $1, $2, $3, $4, $5,
          ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
          $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb
        )
      `,
      [
        telemetryId,
        input.deviceId,
        assetId ?? null,
        input.source,
        timestamp.toISOString(),
        input.lon,
        input.lat,
        latScaled,
        lonScaled,
        altitudeM,
        headingDeg,
        groundSpeedMs,
        verticalSpeedMs,
        batteryPct,
        signalQuality,
        input.mode ?? null,
        input.armed ?? null,
        JSON.stringify(input.rawPayload ?? {}),
      ],
    );

    if (assetId) {
      await this.db
        .insert(currentTrackStates)
        .values({
          id: trackId,
          assetId,
          deviceId: input.deviceId,
          timestamp,
          lat: latScaled,
          lon: lonScaled,
          altitudeM,
          headingDeg,
          speedMs: groundSpeedMs,
          status: 'active',
          metadata: { source: input.source },
        })
        .onConflictDoUpdate({
          target: currentTrackStates.id,
          set: {
            timestamp,
            lat: latScaled,
            lon: lonScaled,
            altitudeM,
            headingDeg,
            speedMs: groundSpeedMs,
            updatedAt: new Date(),
          },
        });

      await this.db.insert(trackHistory).values({
        id: historyId,
        assetId,
        deviceId: input.deviceId,
        telemetryId,
        timestamp,
        lat: latScaled,
        lon: lonScaled,
        headingDeg,
        speedMs: groundSpeedMs,
        metadata: { source: input.source },
      });
    }

    await this.db.update(devices).set({
      lastSeenAt: timestamp,
      status: 'online',
      updatedAt: new Date(),
    }).where(eq(devices.id, input.deviceId));

    return {
      id: telemetryId,
      assetId,
      deviceId: input.deviceId,
      timestamp: timestamp.toISOString(),
    };
  }

  list() {
    return this.db.select().from(telemetryReports).orderBy(desc(telemetryReports.timestamp)).limit(500);
  }

  byDevice(deviceId: string) {
    return this.db
      .select()
      .from(telemetryReports)
      .where(eq(telemetryReports.deviceId, deviceId))
      .orderBy(desc(telemetryReports.timestamp))
      .limit(200);
  }
}
