# HTTP API

La aplicacion configura `app.setGlobalPrefix('api')`, por lo que todos los controladores cuelgan de `/api` excepto Swagger, que se sirve en `/api/docs`.

## API moderna

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Devices

- `GET /api/devices`
- `GET /api/devices/:id`
- `POST /api/devices`
- `PATCH /api/devices/:id`
- `GET /api/devices/:id/current-state`
- `GET /api/devices/:id/telemetry`
- `GET /api/devices/:id/commands`

Campos relevantes de configuracion:

- `platformType` o `P`: `air | sea | land | manpack | vehicle | unknown`
- `callsign` no vive en `devices`; se configura por mision en `assignedDevices`

### Telemetry y tracking

- `POST /api/telemetry/ingest`
- `GET /api/telemetry`
- `GET /api/telemetry/:deviceId`
- `GET /api/tracks/current`
- `GET /api/tracks/history`
- `GET /api/tracks/bbox`
- `GET /api/tracks/:id`

### Command and control

- `POST /api/commands`
- `GET /api/commands`
- `GET /api/commands/:id`
- `POST /api/commands/:id/cancel`
- `GET /api/missions`
- `POST /api/missions`
- `GET /api/missions/:id`
- `PATCH /api/missions/:id`
- `DELETE /api/missions/:id`

Campos relevantes de mision:

- `assignedDevices`: arreglo de `{ deviceId, callsign, metadata }`
- `GET /api/geofences`
- `POST /api/geofences`
- `GET /api/geofences/:id`
- `PATCH /api/geofences/:id`
- `DELETE /api/geofences/:id`
- `GET /api/alerts`
- `POST /api/alerts/:id/ack`
- `POST /api/alerts/:id/resolve`

### Capas e integraciones

- `GET /api/map-layers`
- `GET /api/map-layers/:id`
- `GET /api/map-layers/:id/features`
- `GET /api/map-layers/:id/geojson`
- `PATCH /api/map-layers/:id`
- `GET /api/external-sources`
- `POST /api/external-sources/sync-all`
- `POST /api/external-sources/:id/sync`

### Operacion

- `GET /api/health`
- `GET /api/metrics`

## API de compatibilidad COP

El controlador `cop` mantiene el contrato consumido por el frontend actual bajo `/api/v1`.

- `GET /api/v1/operations/bootstrap`
- `GET /api/v1/operations/snapshot`
- `GET /api/v1/assets`
- `GET /api/v1/assets/:id`
- `GET /api/v1/alerts`
- `GET /api/v1/alerts/:id`
- `GET /api/v1/incidents`
- `GET /api/v1/incidents/:id`
- `GET /api/v1/layers`
- `GET /api/v1/layers/:id`
- `GET /api/v1/layers/:id/geojson`
- `GET /api/v1/timeline`
- `GET /api/v1/timeline/:id`
- `GET /api/v1/geospatial/fire-hotspots`

## Fuente de verdad

Swagger es la referencia ejecutable para DTOs y respuestas. Esta pagina resume la superficie encontrada por inspeccion de controladores y debe mantenerse alineada con `/api/docs`.
