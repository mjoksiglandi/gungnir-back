import { z } from 'zod';

export const bboxQuerySchema = z.object({
  minLat: z.coerce.number().optional(),
  minLon: z.coerce.number().optional(),
  maxLat: z.coerce.number().optional(),
  maxLon: z.coerce.number().optional(),
});

export type BboxQueryDto = z.infer<typeof bboxQuerySchema>;
