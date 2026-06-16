import { z } from 'zod';

const hexLower = (length: number) =>
  z
    .string()
    .length(length)
    .regex(/^[0-9a-f]+$/);

export const guardianUplinkE2eSchema = z.object({
  type: z.literal('guardian.uplink.e2e'),
  schema: z.literal('guardian.e2e.v1'),
  device_id: z.string().min(1),
  channel: z.enum(['gsm', 'iridium']),
  sent_at_utc: z.iso.datetime().optional(),
  e2e: z.object({
    alg: z.literal('AES-256-GCM'),
    version: z.literal(1),
    seq: hexLower(16),
    nonce: hexLower(24),
    ciphertext: z
      .string()
      .min(2)
      .regex(/^[0-9a-f]+$/)
      .refine((value) => value.length % 2 === 0),
    tag: hexLower(32),
  }),
});

export type GuardianUplinkE2eDto = z.infer<typeof guardianUplinkE2eSchema>;
