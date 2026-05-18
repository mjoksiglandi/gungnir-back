import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

const geographyPoint = customType<{ data: unknown }>({
  dataType() {
    return 'geography(Point,4326)';
  },
});

const geometryShape = customType<{ data: unknown }>({
  dataType() {
    return 'geometry(Geometry,4326)';
  },
});

export const userStatusEnum = pgEnum('user_status', ['active', 'disabled', 'invited']);
export const unitStatusEnum = pgEnum('unit_status', ['active', 'inactive', 'deployed']);
export const assetStatusEnum = pgEnum('asset_status', ['nominal', 'degraded', 'lost', 'maintenance']);
export const deviceStatusEnum = pgEnum('device_status', ['online', 'offline', 'degraded', 'retired']);
export const commandStatusEnum = pgEnum('command_status', [
  'pending',
  'sent',
  'accepted',
  'rejected',
  'timeout',
  'failed',
  'completed',
  'cancelled',
]);
export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'low', 'medium', 'high', 'critical']);
export const alertStatusEnum = pgEnum('alert_status', ['open', 'acknowledged', 'resolved']);
export const incidentStatusEnum = pgEnum('incident_status', ['open', 'contained', 'resolved']);
export const mapLayerSourceEnum = pgEnum('map_layer_source_type', [
  'internal',
  'external',
  'fire-intel',
  'air-traffic',
  'notams',
  'weather',
]);

export const organizations = pgTable('organizations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  parentOrganizationId: varchar('parent_organization_id', { length: 64 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 160 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 160 }).notNull(),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const roles = pgTable('roles', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex('roles_name_idx').on(table.name),
}));

export const permissions = pgTable('permissions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  key: varchar('key', { length: 160 }).notNull(),
  description: text('description'),
}, (table) => ({
  keyIdx: uniqueIndex('permissions_key_idx').on(table.key),
}));

export const rolePermissions = pgTable('role_permissions', {
  roleId: varchar('role_id', { length: 64 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: varchar('permission_id', { length: 64 }).notNull().references(() => permissions.id, { onDelete: 'cascade' }),
});

export const userRoles = pgTable('user_roles', {
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: varchar('role_id', { length: 64 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
});

export const organizationRoles = pgTable('organization_roles', {
  organizationId: varchar('organization_id', { length: 64 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  roleId: varchar('role_id', { length: 64 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
});

export const units = pgTable('units', {
  id: varchar('id', { length: 64 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 64 }).notNull().references(() => organizations.id),
  callsign: varchar('callsign', { length: 80 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  status: unitStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable('assets', {
  id: varchar('id', { length: 64 }).primaryKey(),
  unitId: varchar('unit_id', { length: 64 }).references(() => units.id),
  name: varchar('name', { length: 160 }).notNull(),
  assetType: varchar('asset_type', { length: 80 }).notNull(),
  platformType: varchar('platform_type', { length: 80 }).notNull(),
  status: assetStatusEnum('status').notNull().default('nominal'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const devices = pgTable('devices', {
  id: varchar('id', { length: 64 }).primaryKey(),
  assetId: varchar('asset_id', { length: 64 }).references(() => assets.id),
  deviceType: varchar('device_type', { length: 80 }).notNull(),
  sourceType: varchar('source_type', { length: 80 }).notNull(),
  apiKeyHash: text('api_key_hash'),
  externalId: varchar('external_id', { length: 160 }),
  status: deviceStatusEnum('status').notNull().default('offline'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const telemetryReports = pgTable('telemetry_reports', {
  id: varchar('id', { length: 64 }).primaryKey(),
  deviceId: varchar('device_id', { length: 64 }).notNull().references(() => devices.id),
  assetId: varchar('asset_id', { length: 64 }).references(() => assets.id),
  source: varchar('source', { length: 80 }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  position: geographyPoint('position'),
  lat: integer('lat_scaled').notNull(),
  lon: integer('lon_scaled').notNull(),
  altitudeM: integer('altitude_m'),
  headingDeg: integer('heading_deg'),
  groundSpeedMs: integer('ground_speed_ms'),
  verticalSpeedMs: integer('vertical_speed_ms'),
  batteryPct: integer('battery_pct'),
  signalQuality: integer('signal_quality'),
  mode: varchar('mode', { length: 80 }),
  armed: boolean('armed'),
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  telemetryDeviceTimeIdx: index('telemetry_reports_device_time_idx').on(table.deviceId, table.timestamp),
}));

export const currentTrackStates = pgTable('current_track_states', {
  id: varchar('id', { length: 64 }).primaryKey(),
  assetId: varchar('asset_id', { length: 64 }).notNull().references(() => assets.id),
  deviceId: varchar('device_id', { length: 64 }).notNull().references(() => devices.id),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  lat: integer('lat_scaled').notNull(),
  lon: integer('lon_scaled').notNull(),
  altitudeM: integer('altitude_m'),
  headingDeg: integer('heading_deg'),
  speedMs: integer('speed_ms'),
  status: varchar('status', { length: 64 }).notNull().default('active'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const trackHistory = pgTable('track_history', {
  id: varchar('id', { length: 64 }).primaryKey(),
  assetId: varchar('asset_id', { length: 64 }).notNull().references(() => assets.id),
  deviceId: varchar('device_id', { length: 64 }).notNull().references(() => devices.id),
  telemetryId: varchar('telemetry_id', { length: 64 }).references(() => telemetryReports.id),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  lat: integer('lat_scaled').notNull(),
  lon: integer('lon_scaled').notNull(),
  headingDeg: integer('heading_deg'),
  speedMs: integer('speed_ms'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
}, (table) => ({
  trackHistoryAssetTimeIdx: index('track_history_asset_time_idx').on(table.assetId, table.timestamp),
}));

export const trackSegments = pgTable('track_segments', {
  id: varchar('id', { length: 64 }).primaryKey(),
  assetId: varchar('asset_id', { length: 64 }).notNull().references(() => assets.id),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  status: varchar('status', { length: 64 }).notNull().default('open'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
});

export const trackEvents = pgTable('track_events', {
  id: varchar('id', { length: 64 }).primaryKey(),
  trackSegmentId: varchar('track_segment_id', { length: 64 }).references(() => trackSegments.id),
  type: varchar('type', { length: 80 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
});

export const commands = pgTable('commands', {
  id: varchar('id', { length: 64 }).primaryKey(),
  commandId: varchar('command_id', { length: 128 }).notNull(),
  assetId: varchar('asset_id', { length: 64 }).references(() => assets.id),
  deviceId: varchar('device_id', { length: 64 }).references(() => devices.id),
  type: varchar('type', { length: 80 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  status: commandStatusEnum('status').notNull().default('pending'),
  priority: integer('priority').notNull().default(5),
  issuedByUserId: varchar('issued_by_user_id', { length: 64 }).references(() => users.id),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ackAt: timestamp('ack_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  correlationData: jsonb('correlation_data').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  rawResponse: jsonb('raw_response').$type<Record<string, unknown>>(),
}, (table) => ({
  commandIdIdx: uniqueIndex('commands_command_id_idx').on(table.commandId),
}));

export const missions = pgTable('missions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  missionType: varchar('mission_type', { length: 80 }).notNull(),
  geometry: geometryShape('geometry'),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  assignedUnits: jsonb('assigned_units').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const geofences = pgTable('geofences', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  geometry: geometryShape('geometry').notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  rules: jsonb('rules').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alerts = pgTable('alerts', {
  id: varchar('id', { length: 64 }).primaryKey(),
  type: varchar('type', { length: 80 }).notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  status: alertStatusEnum('status').notNull().default('open'),
  source: varchar('source', { length: 80 }).notNull(),
  assetId: varchar('asset_id', { length: 64 }).references(() => assets.id),
  deviceId: varchar('device_id', { length: 64 }).references(() => devices.id),
  geometry: geometryShape('geometry'),
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

export const incidents = pgTable('incidents', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: varchar('title', { length: 160 }).notNull(),
  description: text('description').notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  status: incidentStatusEnum('status').notNull().default('open'),
  geometry: geometryShape('geometry'),
  createdBy: varchar('created_by', { length: 64 }).references(() => users.id),
  assignedTo: varchar('assigned_to', { length: 64 }).references(() => users.id),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mapLayers = pgTable('map_layers', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  layerType: varchar('layer_type', { length: 80 }).notNull(),
  sourceType: mapLayerSourceEnum('source_type').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  refreshIntervalSec: integer('refresh_interval_sec').notNull().default(300),
  ttlSec: integer('ttl_sec').notNull().default(900),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }),
  confidence: integer('confidence').notNull().default(100),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const layerFeatures = pgTable('layer_features', {
  id: varchar('id', { length: 64 }).primaryKey(),
  layerId: varchar('layer_id', { length: 64 }).notNull().references(() => mapLayers.id, { onDelete: 'cascade' }),
  source: varchar('source', { length: 80 }).notNull(),
  externalId: varchar('external_id', { length: 160 }),
  geometry: geometryShape('geometry').notNull(),
  properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const externalSources = pgTable('external_sources', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  sourceType: varchar('source_type', { length: 80 }).notNull(),
  providerConfig: jsonb('provider_config').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  refreshIntervalSec: integer('refresh_interval_sec').notNull().default(300),
  ttlSec: integer('ttl_sec').notNull().default(900),
  confidence: integer('confidence').notNull().default(75),
  bbox: jsonb('bbox').$type<number[] | null>(),
  lastSuccessfulSync: timestamp('last_successful_sync', { withTimezone: true }),
  lastError: text('last_error'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).references(() => users.id),
  action: varchar('action', { length: 160 }).notNull(),
  resourceType: varchar('resource_type', { length: 80 }).notNull(),
  resourceId: varchar('resource_id', { length: 64 }).notNull(),
  ip: varchar('ip', { length: 80 }),
  userAgent: text('user_agent'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  jti: varchar('jti', { length: 128 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  refreshJtiIdx: uniqueIndex('refresh_tokens_jti_idx').on(table.jti),
}));

export type DatabaseSchema = typeof import('./schema');
