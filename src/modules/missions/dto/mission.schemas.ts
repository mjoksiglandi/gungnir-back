import { z } from 'zod';

export const missionAssignedDeviceSchema = z.object({
  deviceId: z.string().min(1),
  callsign: z.string().min(1).max(80),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const missionSchema = z.object({
  name: z.string().min(1),
  status: z.string().min(1),
  missionType: z.string().min(1),
  geometry: z.record(z.string(), z.unknown()).optional(),
  startTime: z.iso.datetime().optional(),
  endTime: z.iso.datetime().optional(),
  assignedUnits: z.array(z.string()).default([]),
  assignedDevices: z.array(missionAssignedDeviceSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type MissionDto = z.infer<typeof missionSchema>;
