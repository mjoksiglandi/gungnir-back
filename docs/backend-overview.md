# Backend Overview

## Summary

`gungnir-back` is a NestJS monolith organized by domain modules. It exposes:

- a modern authenticated API under `/api`
- a COP compatibility API under `/api/v1`
- realtime events over Socket.IO on `/realtime`
- operational integrations through PostgreSQL, Redis, MQTT, and external map sources

The current focus is a C4 / Common Operational Picture backend for assets, telemetry, commands, alerts, missions, geospatial layers, and external feeds.

## Runtime Architecture

### Application shell

- `src/main.ts`: boots Nest, Swagger, security middleware, validation, and global filters
- `src/app.module.ts`: composes infrastructure modules and domain modules
- `src/config/*`: environment parsing and configuration

### Infrastructure

- `src/infrastructure/database/*`: Drizzle + PostgreSQL bindings and schema
- `src/infrastructure/mqtt/*`: MQTT publishing and message consumption
- `src/infrastructure/queues/*`: BullMQ queue wiring

### Domain modules already active

- `auth`: login, refresh, logout, current user
- `users`: user lookup and supporting auth data
- `devices`: device registry and current state access
- `telemetry`: ingestion, history, and MQTT delegation
- `tracking`: current track and historical track views
- `commands`: command issuance, ACK handling, and status lifecycle
- `missions`: mission CRUD and geometry persistence
- `geofences`: geofence CRUD
- `alerts`: alert listing, ack, and resolve flow
- `map-layers`: layer metadata, features, GeoJSON projection, and patching
- `external-sources`: sync orchestration for external feeds
- `realtime`: websocket fan-out of domain events
- `system-health`: health/metrics endpoint surface
- `cop`: compatibility contract for the current frontend under `/api/v1`

### Modules present as placeholders or future bounded contexts

- `guardian`
- `mavlink`
- `atak`
- `cot`
- `weather`
- `air-traffic`
- `fire-intel`
- `notams`
- `units`
- `organizations`
- `roles`
- `tasking`
- `audit`
- `incidents`

## Data Model Highlights

Core tables live in [`src/infrastructure/database/schema.ts`](/C:/Users/juan.cornejo/Documents/gugnir%20back/src/infrastructure/database/schema.ts).

- Identity and access: `users`, `roles`, `permissions`, `refresh_tokens`
- Operational assets: `organizations`, `units`, `assets`, `devices`
- Telemetry and tracking: `telemetry_reports`, `current_track_states`, `track_history`
- Mission space: `missions`, `geofences`, `incidents`, `alerts`
- Commanding: `commands`
- Map data: `map_layers`, `layer_features`, `external_sources`
- Auditability: `audit_logs`

PostGIS is used for layer, mission, alert, and fence geometry. TimescaleDB is used for `telemetry_reports`.

## Request And Event Flow

### Telemetry

1. `POST /api/telemetry/ingest` or MQTT event enters `TelemetryService`.
2. A row is inserted into `telemetry_reports`.
3. `current_track_states` is upserted.
4. `track_history` is appended.
5. Domain events `telemetry.received` and `track.updated` are emitted.
6. `RealtimeGateway` republishes those events to websocket clients.

### Commands

1. `POST /api/commands` creates a command row.
2. MQTT publishes the outbound payload to the device topic.
3. ACK / response handlers update status and emit command-related events.

### External map sources

1. `POST /api/external-sources/:id/sync` or `sync-all` triggers `ExternalSourcesService`.
2. A provider adapter normalizes source data into internal feature records.
3. Features are written into `layer_features`.
4. `map_layers.lastUpdatedAt` is refreshed.
5. `layer.synced` is emitted for websocket and consumer updates.

## API Surface

### Modern API

The primary authenticated API covers auth, devices, telemetry, tracks, commands, missions, geofences, alerts, map layers, external source sync, and health.

Swagger is served at `/api/docs`.

### COP compatibility API

The compatibility layer under `/api/v1` currently exposes:

- operations bootstrap and snapshot
- assets and alerts
- incidents
- layers, including GeoJSON URLs
- timeline
- fire hotspot feed

This keeps the frontend contract stable while the modern API evolves separately.

## DGAC Integration Status

The backend now includes a DGAC provider adapter at [`src/modules/external-sources/dgac-source.provider.ts`](/C:/Users/juan.cornejo/Documents/gugnir%20back/src/modules/external-sources/dgac-source.provider.ts) and seeded layer/source definitions for:

- aerodromes
- local points
- FIR boundaries
- georeferenced NOTAMs

Frontend integration notes live in [`docs/dgac-layers-frontend.md`](/C:/Users/juan.cornejo/Documents/gugnir%20back/docs/dgac-layers-frontend.md).

## Developer Workflow

### Local startup

1. `docker compose up -d postgres redis emqx`
2. `npm install`
3. `npm run db:migrate`
4. `npm run db:seed`
5. `npm run start:dev`

### Quality commands

- `npm run typecheck`
- `npm test`
- `npm run lint`

At the moment, typecheck and tests pass, while lint still reports existing issues that should be cleaned up before treating the backend as fully green.

## Current Gaps

- lint is not yet clean across the repository
- several modules exist as scaffolding more than full integrations
- external-source sync lacks background scheduling and richer retry/reporting behavior
- there is still coupling between compatibility responses and internal persistence formats
