import 'dotenv/config';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashSync } from 'bcryptjs';
import {
  externalSources,
  mapLayers,
  organizations,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
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

  await client.unsafe(`
    DELETE FROM user_roles ur
    USING user_roles dup
    WHERE ur.ctid < dup.ctid
      AND ur.user_id = dup.user_id
      AND ur.role_id = dup.role_id
  `);

  await client.unsafe(`
    DELETE FROM role_permissions rp
    USING role_permissions dup
    WHERE rp.ctid < dup.ctid
      AND rp.role_id = dup.role_id
      AND rp.permission_id = dup.permission_id
  `);

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
  const obsoleteDummyAssetIds = ['asset-uav-001'];
  const obsoleteDummyDeviceIds = ['device-uav-001'];
  const obsoleteDummyAlertIds = ['alert-001'];
  const obsoleteDummyTelemetryIds = ['telemetry-seed-001'];

  await db.delete(externalSources).where(inArray(externalSources.id, obsoleteDgacSourceIds));
  await db.delete(mapLayers).where(inArray(mapLayers.id, obsoleteDgacLayerIds));
  await client.unsafe(`DELETE FROM telemetry_reports WHERE id IN (${obsoleteDummyTelemetryIds.map((id) => `'${id}'`).join(', ')})`);
  await client.unsafe(`DELETE FROM telemetry_reports WHERE asset_id IN (${obsoleteDummyAssetIds.map((id) => `'${id}'`).join(', ')}) OR device_id IN (${obsoleteDummyDeviceIds.map((id) => `'${id}'`).join(', ')})`);
  await client.unsafe(`DELETE FROM alerts WHERE id IN (${obsoleteDummyAlertIds.map((id) => `'${id}'`).join(', ')}) OR asset_id IN (${obsoleteDummyAssetIds.map((id) => `'${id}'`).join(', ')}) OR device_id IN (${obsoleteDummyDeviceIds.map((id) => `'${id}'`).join(', ')})`);
  await client.unsafe(`DELETE FROM devices WHERE id IN (${obsoleteDummyDeviceIds.map((id) => `'${id}'`).join(', ')}) OR asset_id IN (${obsoleteDummyAssetIds.map((id) => `'${id}'`).join(', ')})`);
  await client.unsafe(`DELETE FROM assets WHERE id IN (${obsoleteDummyAssetIds.map((id) => `'${id}'`).join(', ')})`);

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

  const adminRoleExists = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, 'user-admin'), eq(userRoles.roleId, 'role-admin')))
    .limit(1);

  if (adminRoleExists.length === 0) {
    await db.insert(userRoles).values({
      userId: 'user-admin',
      roleId: 'role-admin',
    });
  }

  for (const permission of permissionRows) {
    const rolePermissionExists = await db
      .select({ roleId: rolePermissions.roleId })
      .from(rolePermissions)
      .where(and(eq(rolePermissions.roleId, 'role-admin'), eq(rolePermissions.permissionId, permission.id)))
      .limit(1);

    if (rolePermissionExists.length === 0) {
      await db.insert(rolePermissions).values({
        roleId: 'role-admin',
        permissionId: permission.id,
      });
    }
  }

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

  await db.delete(refreshTokens);

  console.log('Seed completed. Admin user: admin@gungnir.local / admin12345');
  await client.end();
}

void main();
