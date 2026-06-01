import 'dotenv/config';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashSync } from 'bcryptjs';
import {
  alerts,
  assets,
  devices,
  externalSources,
  mapLayers,
  organizations,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  telemetryReports,
  units,
  userRoles,
  users,
} from '@/infrastructure/database/schema';

function now() {
  return new Date();
}

async function main() {
  const client = postgres(process.env.DATABASE_URL ?? 'postgres://gungnir:gungnir@localhost:5432/gungnir', {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);

  const obsoleteDgacLayerIds = [
    'layer-dgac-local-points',
    'layer-dgac-firs',
    'layer-dgac-rpa',
  ];
  const obsoleteDgacSourceIds = [
    'source-dgac-local-points',
    'source-dgac-firs',
    'source-dgac-rpa',
  ];

  await db.delete(externalSources).where(inArray(externalSources.id, obsoleteDgacSourceIds));
  await db.delete(mapLayers).where(inArray(mapLayers.id, obsoleteDgacLayerIds));

  await db.insert(organizations).values({
    id: 'org-root',
    name: 'Gungnir Command',
    type: 'command-center',
    metadata: { region: 'CL-RM' },
  }).onConflictDoNothing();

  await db.insert(units).values({
    id: 'unit-alpha',
    organizationId: 'org-root',
    callsign: 'ALPHA',
    name: 'Alpha Response Unit',
    type: 'ops',
    status: 'active',
  }).onConflictDoNothing();

  await db.insert(users).values({
    id: 'user-admin',
    email: 'admin@gungnir.local',
    passwordHash: hashSync('admin12345', 10),
    displayName: 'Admin Operator',
    status: 'active',
  }).onConflictDoNothing();

  await db.insert(roles).values({
    id: 'role-admin',
    name: 'admin',
    description: 'Full platform administration',
  }).onConflictDoNothing();

  const permissionRows = [
    { id: 'perm-devices-read', key: 'devices.read', description: 'Read devices' },
    { id: 'perm-commands-write', key: 'commands.write', description: 'Issue commands' },
    { id: 'perm-alerts-manage', key: 'alerts.manage', description: 'Manage alerts' },
  ];

  for (const permission of permissionRows) {
    await db.insert(permissions).values(permission).onConflictDoNothing();
  }

  await db.insert(userRoles).values({
    userId: 'user-admin',
    roleId: 'role-admin',
  }).onConflictDoNothing();

  for (const permission of permissionRows) {
    await db.insert(rolePermissions).values({
      roleId: 'role-admin',
      permissionId: permission.id,
    }).onConflictDoNothing();
  }

  await db.insert(assets).values({
    id: 'asset-uav-001',
    unitId: 'unit-alpha',
    name: 'Guardian UAV 001',
    assetType: 'uav',
    platformType: 'quadrotor',
    status: 'nominal',
    metadata: { vendor: 'Guardian', role: 'ISR' },
  }).onConflictDoNothing();

  await db.insert(devices).values({
    id: 'device-uav-001',
    assetId: 'asset-uav-001',
    deviceType: 'companion-agent',
    sourceType: 'mqtt',
    apiKeyHash: hashSync('device-secret-001', 10),
    externalId: 'companion-uav-001',
    status: 'online',
    lastSeenAt: now(),
    metadata: { protocol: 'mavlink-companion' },
  }).onConflictDoNothing();

  await db.insert(mapLayers).values([
    {
      id: 'layer-fire-intel',
      name: 'Active Fires - NASA FIRMS',
      layerType: 'point',
      sourceType: 'fire-intel',
      enabled: true,
      refreshIntervalSec: 300,
      ttlSec: 3600,
      confidence: 88,
      metadata: {
        provider: 'natural-hazards',
        dataset: 'fires',
        geometryType: 'Point',
        style: { marker: 'fire', color: '#ff6b00', glow: true },
      },
    },
    {
      id: 'layer-earthquakes',
      name: 'Earthquakes - USGS M2.5+ 24h',
      layerType: 'point',
      sourceType: 'external',
      enabled: true,
      refreshIntervalSec: 300,
      ttlSec: 900,
      confidence: 92,
      metadata: {
        provider: 'natural-hazards',
        dataset: 'earthquakes',
        geometryType: 'Point',
        style: { marker: 'earthquake', color: '#ff9500', scaleBy: 'magnitude' },
      },
    },
    {
      id: 'layer-weather-hazards',
      name: 'Weather & Natural Hazards - EONET/NWS',
      layerType: 'point',
      sourceType: 'weather',
      enabled: true,
      refreshIntervalSec: 600,
      ttlSec: 1800,
      confidence: 80,
      metadata: {
        provider: 'natural-hazards',
        dataset: 'weather',
        geometryType: 'Point',
        style: { marker: 'weather', color: '#e040fb', glow: true },
      },
    },
    {
      id: 'layer-air-traffic',
      name: 'Air Traffic',
      layerType: 'air-traffic',
      sourceType: 'air-traffic',
      enabled: true,
      refreshIntervalSec: 120,
      ttlSec: 300,
      confidence: 74,
      metadata: { color: '#1f92ff' },
    },
    {
      id: 'layer-dgac-aerodromes',
      name: 'DGAC Aerodromes',
      layerType: 'point',
      sourceType: 'external',
      enabled: false,
      refreshIntervalSec: 86400,
      ttlSec: 604800,
      confidence: 90,
      metadata: {
        provider: 'dgac',
        dataset: 'aerodrome',
        geometryType: 'Point',
        style: { marker: 'airport', color: '#0069c2' },
      },
    },
    {
      id: 'layer-dgac-notams',
      name: 'DGAC Georeferenced NOTAMs',
      layerType: 'point',
      sourceType: 'external',
      enabled: false,
      refreshIntervalSec: 300,
      ttlSec: 21600,
      confidence: 86,
      metadata: {
        provider: 'dgac',
        dataset: 'notams',
        geometryType: 'Point',
        style: { marker: 'warning', color: '#d84315' },
      },
    },
  ]).onConflictDoNothing();

  await db.update(mapLayers).set({
    name: 'Active Fires - NASA FIRMS',
    layerType: 'point',
    sourceType: 'fire-intel',
    enabled: true,
    refreshIntervalSec: 300,
    ttlSec: 3600,
    confidence: 88,
    metadata: {
      provider: 'natural-hazards',
      dataset: 'fires',
      geometryType: 'Point',
      style: { marker: 'fire', color: '#ff6b00', glow: true },
    },
    updatedAt: now(),
  }).where(eq(mapLayers.id, 'layer-fire-intel'));

  await db.insert(externalSources).values([
    {
      id: 'source-fire-hotspots',
      name: 'NASA FIRMS Active Fires',
      sourceType: 'fire-intel',
      providerConfig: { provider: 'natural-hazards', dataset: 'fires', layerId: 'layer-fire-intel', limit: 2000 },
      refreshIntervalSec: 300,
      ttlSec: 3600,
      confidence: 88,
      enabled: true,
    },
    {
      id: 'source-usgs-earthquakes',
      name: 'USGS Earthquakes M2.5+ 24h',
      sourceType: 'external',
      providerConfig: { provider: 'natural-hazards', dataset: 'earthquakes', layerId: 'layer-earthquakes', limit: 1000 },
      refreshIntervalSec: 300,
      ttlSec: 900,
      confidence: 92,
      enabled: true,
    },
    {
      id: 'source-weather-hazards',
      name: 'NASA EONET + NOAA/NWS Hazards',
      sourceType: 'weather',
      providerConfig: { provider: 'natural-hazards', dataset: 'weather', layerId: 'layer-weather-hazards', limit: 300 },
      refreshIntervalSec: 600,
      ttlSec: 1800,
      confidence: 80,
      enabled: true,
    },
    {
      id: 'source-air-traffic',
      name: 'Mock Air Traffic',
      sourceType: 'air-traffic',
      providerConfig: { provider: 'mock', feed: 'adsb' },
      refreshIntervalSec: 120,
      ttlSec: 300,
      confidence: 72,
      enabled: true,
    },
    {
      id: 'source-dgac-aerodromes',
      name: 'DGAC Aerodromes',
      sourceType: 'external',
      providerConfig: { provider: 'dgac', dataset: 'aerodrome', layerId: 'layer-dgac-aerodromes' },
      refreshIntervalSec: 86400,
      ttlSec: 604800,
      confidence: 90,
      enabled: true,
    },
    {
      id: 'source-dgac-notams',
      name: 'DGAC Georeferenced NOTAMs',
      sourceType: 'external',
      providerConfig: { provider: 'dgac', dataset: 'notams', layerId: 'layer-dgac-notams' },
      refreshIntervalSec: 300,
      ttlSec: 21600,
      confidence: 86,
      enabled: true,
    },
  ]).onConflictDoNothing();

  await db.update(externalSources).set({
    name: 'NASA FIRMS Active Fires',
    sourceType: 'fire-intel',
    providerConfig: { provider: 'natural-hazards', dataset: 'fires', layerId: 'layer-fire-intel', limit: 2000 },
    refreshIntervalSec: 300,
    ttlSec: 3600,
    confidence: 88,
    enabled: true,
    updatedAt: now(),
  }).where(eq(externalSources.id, 'source-fire-hotspots'));

  await db.insert(alerts).values({
    id: 'alert-001',
    type: 'thermal_spike',
    severity: 'high',
    status: 'open',
    source: 'sensor-net',
    assetId: 'asset-uav-001',
    deviceId: 'device-uav-001',
    message: 'Thermal anomaly detected near sector east.',
    metadata: { sector: 'east-1' },
  }).onConflictDoNothing();

  const telemetryExists = await db.select({ id: telemetryReports.id }).from(telemetryReports).where(eq(telemetryReports.id, 'telemetry-seed-001'));
  if (telemetryExists.length === 0) {
    await client.unsafe(`
      INSERT INTO telemetry_reports (
        id, device_id, asset_id, source, timestamp, position, lat_scaled, lon_scaled,
        altitude_m, heading_deg, ground_speed_ms, vertical_speed_ms, battery_pct, signal_quality,
        mode, armed, raw_payload
      ) VALUES (
        'telemetry-seed-001',
        'device-uav-001',
        'asset-uav-001',
        'guardian',
        NOW(),
        ST_SetSRID(ST_MakePoint(-70.6605, -33.4489), 4326)::geography,
        -33448900,
        -70660500,
        120,
        95,
        18,
        0,
        84,
        91,
        'AUTO',
        true,
        '{}'::jsonb
      )
    `);
  }

  await db.delete(refreshTokens);

  console.log('Seed completed. Admin user: admin@gungnir.local / admin12345');
  await client.end();
}

void main();
