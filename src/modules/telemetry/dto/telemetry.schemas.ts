import { z } from 'zod';

const ISO_COMPACT_UTC_PATTERN = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
const KNOTS_TO_METERS_PER_SECOND = 0.514444;

function normalizeScaledCoordinate(value: number, maxAbsDegrees: number) {
  const abs = Math.abs(value);
  const divisor = abs > maxAbsDegrees * 100_000 ? 1_000_000 : 100_000;
  return value / divisor;
}

function parseCompactUtcTimestamp(value: string) {
  const match = ISO_COMPACT_UTC_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

function normalizeCompactSource(source: string) {
  if (source === 'g') {
    return 'gsm';
  }

  if (source === 'i') {
    return 'iridium';
  }

  return source;
}

const normalizedTelemetryIngestSchema = z.object({
  deviceId: z.string().min(1),
  assetId: z.string().optional(),
  source: z.string().min(1),
  timestamp: z.iso.datetime(),
  lat: z.number().gte(-90).lte(90),
  lon: z.number().gte(-180).lte(180),
  altitudeM: z.number().optional(),
  headingDeg: z.number().optional(),
  groundSpeedMs: z.number().optional(),
  verticalSpeedMs: z.number().optional(),
  batteryPct: z.number().min(0).max(100).optional(),
  signalQuality: z.number().min(0).max(100).optional(),
  mode: z.string().optional(),
  armed: z.boolean().optional(),
  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export const telemetryIngestSchema = z.preprocess((value) => {
  if (
    value
    && typeof value === 'object'
    && 'i' in value
    && 's' in value
    && 'a' in value
    && 'o' in value
    && 'd' in value
  ) {
    const payload = value as Record<string, unknown>;
    const timestamp = typeof payload.d === 'string' ? parseCompactUtcTimestamp(payload.d) : null;

    return {
      deviceId: payload.i,
      source: typeof payload.s === 'string' ? normalizeCompactSource(payload.s) : payload.s,
      timestamp: timestamp ?? payload.d,
      lat: typeof payload.a === 'number' ? normalizeScaledCoordinate(payload.a, 90) : payload.a,
      lon: typeof payload.o === 'number' ? normalizeScaledCoordinate(payload.o, 180) : payload.o,
      altitudeM: payload.h,
      headingDeg: payload.r,
      groundSpeedMs: typeof payload.v === 'number' ? payload.v * KNOTS_TO_METERS_PER_SECOND : payload.v,
      rawPayload: payload,
    };
  }

  return value;
}, normalizedTelemetryIngestSchema);

export type TelemetryIngestDto = z.infer<typeof normalizedTelemetryIngestSchema>;
