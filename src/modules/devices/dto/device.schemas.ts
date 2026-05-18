import { z } from 'zod';

export const deviceUpsertSchema = z.object({
  assetId: z.string().optional(),
  deviceType: z.string().min(1),
  sourceType: z.string().min(1),
  externalId: z.string().optional(),
  status: z.enum(['online', 'offline', 'degraded', 'retired']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DeviceUpsertDto = z.infer<typeof deviceUpsertSchema>;
