import { z } from 'zod';

export const devicePlatformSchema = z.enum([
  'air',
  'sea',
  'land',
  'manpack',
  'vehicle',
  'unknown',
]);

export const deviceUpsertSchema = z
  .object({
    assetId: z.string().optional(),
    deviceType: z.string().min(1),
    sourceType: z.string().min(1),
    platformType: devicePlatformSchema.optional(),
    P: devicePlatformSchema.optional(),
    externalId: z.string().optional(),
    status: z.enum(['online', 'offline', 'degraded', 'retired']).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .transform(({ P, ...value }) => ({
    ...value,
    platformType: value.platformType ?? P,
  }));

export type DeviceUpsertDto = z.output<typeof deviceUpsertSchema>;
export type DevicePlatformDto = z.infer<typeof devicePlatformSchema>;
