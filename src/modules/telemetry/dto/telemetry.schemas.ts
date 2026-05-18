import { z } from 'zod';

export const telemetryIngestSchema = z.object({
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

export type TelemetryIngestDto = z.infer<typeof telemetryIngestSchema>;
