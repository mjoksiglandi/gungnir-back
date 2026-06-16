import type { DevicePlatformDto } from '../dto/device.schemas';

export type DeviceCallsignAssignmentRecord = {
  id: string;
  deviceId: string;
  assetId: string | null;
  callsign: string;
  startTime: Date;
  endTime: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceUpsertInput = {
  assetId?: string;
  deviceType: string;
  sourceType: string;
  platformType?: DevicePlatformDto;
  externalId?: string;
  status?: 'online' | 'offline' | 'degraded' | 'retired';
  metadata?: Record<string, unknown>;
};
