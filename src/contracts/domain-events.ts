export const DOMAIN_EVENTS = {
  telemetryReceived: 'telemetry.received',
  trackUpdated: 'track.updated',
  commandIssued: 'command.issued',
  commandAcknowledged: 'command.acknowledged',
  alertCreated: 'alert.created',
  alertUpdated: 'alert.updated',
  missionUpdated: 'mission.updated',
  layerSynced: 'layer.synced',
  deviceStatusChanged: 'device.status.changed',
} as const;

export interface TelemetryReceivedEvent {
  deviceId: string;
  assetId?: string | null;
  timestamp: string;
}

export interface TrackUpdatedEvent {
  assetId: string;
  deviceId: string;
  timestamp: string;
  lat: number;
  lon: number;
}

export interface CommandIssuedEvent {
  commandId: string;
  deviceId: string;
  assetId?: string | null;
}

export interface CommandStatusChangedEvent {
  commandId: string;
  status: string;
  deviceId: string;
}

export interface AlertLifecycleEvent {
  alertId: string;
  status: string;
}
