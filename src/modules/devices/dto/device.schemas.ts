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

export const deviceCallsignAssignmentSchema = z.object({
  assetId: z.string().optional(),
  callsign: z.string().min(1).max(80),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const deviceCallsignAssignmentsReplaceSchema = z
  .object({
    callsignAssignments: z.array(deviceCallsignAssignmentSchema).default([]),
  })
  .superRefine((value, ctx) => {
    const assignments = value.callsignAssignments
      .map((assignment, index) => ({
        index,
        startTime: Date.parse(assignment.startTime),
        endTime: assignment.endTime ? Date.parse(assignment.endTime) : Number.POSITIVE_INFINITY,
      }))
      .sort((left, right) => left.startTime - right.startTime);

    for (const assignment of assignments) {
      if (Number.isNaN(assignment.startTime) || Number.isNaN(assignment.endTime)) {
        continue;
      }

      if (assignment.endTime !== Number.POSITIVE_INFINITY && assignment.startTime > assignment.endTime) {
        ctx.addIssue({
          code: 'custom',
          message: 'startTime must be before or equal to endTime.',
          path: ['callsignAssignments', assignment.index, 'startTime'],
        });
      }
    }

    for (let index = 1; index < assignments.length; index += 1) {
      const previous = assignments[index - 1];
      const current = assignments[index];
      if (previous.endTime > current.startTime) {
        ctx.addIssue({
          code: 'custom',
          message: 'Callsign assignment dates cannot overlap for the same device.',
          path: ['callsignAssignments', current.index, 'startTime'],
        });
      }
    }
  });

export const deviceListQuerySchema = z.object({
  callsign: z.string().trim().min(1).optional(),
});

export type DeviceUpsertDto = z.output<typeof deviceUpsertSchema>;
export type DevicePlatformDto = z.infer<typeof devicePlatformSchema>;
export type DeviceCallsignAssignmentsReplaceDto = z.infer<
  typeof deviceCallsignAssignmentsReplaceSchema
>;
export type DeviceListQueryDto = z.infer<typeof deviceListQuerySchema>;
