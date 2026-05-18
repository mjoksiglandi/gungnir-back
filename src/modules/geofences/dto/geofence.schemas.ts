import { z } from 'zod';

export const geofenceSchema = z.object({
  name: z.string().min(1),
  geometry: z.record(z.string(), z.unknown()),
  type: z.string().min(1),
  status: z.string().min(1),
  rules: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type GeofenceDto = z.infer<typeof geofenceSchema>;
