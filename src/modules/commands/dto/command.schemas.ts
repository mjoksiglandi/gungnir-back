import { z } from 'zod';

export const commandCreateSchema = z.object({
  assetId: z.string().optional(),
  deviceId: z.string().min(1),
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  priority: z.number().int().min(1).max(10).default(5),
  expiresAt: z.iso.datetime().optional(),
});

export type CommandCreateDto = z.infer<typeof commandCreateSchema>;
