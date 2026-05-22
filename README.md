# Gungnir Back

Backend NestJS para una plataforma C4 / Common Operational Picture orientada a operaciones con Guardian devices, UAV/UGV telemetry, companion gateways MAVLink, integraciones ATAK/CoT, capas externas, comandos, alertas y situational awareness en tiempo real.

## Documentacion

- vision tecnica: [`docs/backend-overview.md`](./docs/backend-overview.md)
- integracion DGAC para frontend: [`docs/dgac-layers-frontend.md`](./docs/dgac-layers-frontend.md)
- code review del estado actual: [`docs/code-review-2026-05-18.md`](./docs/code-review-2026-05-18.md)
- despliegue homelab / PoC: [`docs/homelab-poc.md`](./docs/homelab-poc.md)
- E2E uplink Guardian V1: [`docs/guardian-e2e-uplink.md`](./docs/guardian-e2e-uplink.md)

## Stack

- Node.js 22 LTS
- TypeScript estricto
- NestJS
- Drizzle ORM + drizzle-kit
- PostgreSQL + TimescaleDB + PostGIS
- Redis + BullMQ
- MQTT 5
- Socket.IO WebSocket Gateway bajo `/realtime`
- Swagger/OpenAPI en `/api/docs`
- Docker Compose

## Arquitectura

El backend corre como un monolito modular con fronteras claras por dominio y con comunicación interna orientada a eventos.

### Principios

- una sola app NestJS desplegable en la primera versión
- separación fuerte entre dominios, infraestructura y contratos
- simplicidad operacional primero
- preparación explícita para extracción futura

### Módulos críticos ya conectados

- `auth`
- `users`
- `assets`
- `devices`
- `telemetry`
- `tracking`
- `commands`
- `missions`
- `geofences`
- `alerts`
- `map-layers`
- `external-sources`
- `realtime`
- `audit`
- `system-health`
- `cop` para compatibilidad con el frontend actual bajo `/api/v1`

### Módulos preparados para extracción futura

- `telemetry`
- `realtime`
- `guardian`
- `mavlink`
- `atak`
- `cot`
- `external-sources`
- `alerts`
- `commands`

### Estrategia de extracción

Las futuras extracciones conservan:

- DTOs y contratos
- eventos internos
- interfaces de transporte
- servicios por dominio
- repositorios y queries

La API pública puede mantenerse mientras los módulos cambian de ejecución in-process a ejecución distribuida.

## Endpoints

### API moderna

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/devices`
- `GET /api/devices/:id`
- `POST /api/devices`
- `PATCH /api/devices/:id`
- `GET /api/devices/:id/current-state`
- `GET /api/devices/:id/telemetry`
- `GET /api/devices/:id/commands`
- `POST /api/telemetry/ingest`
- `GET /api/telemetry`
- `GET /api/telemetry/:deviceId`
- `GET /api/tracks/current`
- `GET /api/tracks/history`
- `GET /api/tracks/:id`
- `GET /api/tracks/bbox`
- `POST /api/commands`
- `GET /api/commands`
- `GET /api/commands/:id`
- `POST /api/commands/:id/cancel`
- `GET /api/missions`
- `POST /api/missions`
- `GET /api/missions/:id`
- `PATCH /api/missions/:id`
- `DELETE /api/missions/:id`
- `GET /api/geofences`
- `POST /api/geofences`
- `GET /api/geofences/:id`
- `PATCH /api/geofences/:id`
- `DELETE /api/geofences/:id`
- `GET /api/alerts`
- `POST /api/alerts/:id/ack`
- `POST /api/alerts/:id/resolve`
- `GET /api/map-layers`
- `GET /api/map-layers/:id`
- `GET /api/map-layers/:id/features`
- `GET /api/map-layers/:id/geojson`
- `PATCH /api/map-layers/:id`
- `GET /api/external-sources`
- `POST /api/external-sources/sync-all`
- `POST /api/external-sources/:id/sync`
- `GET /api/health`
- `GET /api/metrics`

### Compatibilidad con `gungnir-front`

El controlador `cop` expone los contratos existentes del frontend bajo `/api/v1`:

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

## Eventos internos

Eventos principales emitidos por el backend:

- `telemetry.received`
- `track.updated`
- `command.issued`
- `command.acknowledged`
- `alert.created`
- `alert.updated`
- `mission.updated`
- `layer.synced`
- `device.status.changed`

El gateway realtime retransmite estos eventos como:

- `track.updated`
- `telemetry.received`
- `command.status.changed`
- `alert.created`
- `alert.updated`
- `mission.updated`
- `layer.updated`

## MQTT

Topics soportados:

- `telemetry/{deviceId}/state`
- `telemetry/{deviceId}/event`
- `dev/{deviceId}/uplink`
- `cmd/{deviceId}/request`
- `cmd/{deviceId}/response`
- `device/{deviceId}/status`
- `device/{deviceId}/config`

La primera versión:

- publica comandos por MQTT
- consume ACKs y respuestas de comandos
- consume estado de dispositivos
- consume telemetría normalizada
- consume uplinks `guardian.uplink.e2e` cifrados con AES-256-GCM

El backend no habla MAVLink directo. La expectativa es:

`flight controller -> companion-agent (PyMAVLink) -> MQTT 5 -> Gungnir backend`

## Desarrollo local

1. Levantar infraestructura:

```bash
docker compose up -d postgres redis mosquitto
```

2. Instalar dependencias:

```bash
npm install
```

3. Configurar clave E2E de flota si se va a probar el uplink Guardian cifrado:

```bash
GUARDIAN_E2E_KEY_HEX=<64 hex chars>
```

4. Migrar y seed:

```bash
npm run db:migrate
npm run db:seed
```

5. Levantar backend:

```bash
npm run start:dev
```

Swagger queda en [http://localhost:4000/api/docs](http://localhost:4000/api/docs).

## Credenciales seed

- usuario: `admin@gungnir.local`
- password: `admin12345`

Device seed:

- `device-uav-001`
- API key hash cargada para ejemplo

## Pruebas

```bash
npm test
npm run test:e2e
```

Incluye pruebas base de:

- auth token flow
- command ACK handling
- MQTT telemetry delegation
- guardian E2E decrypt y payload parsing
- health endpoint

## Notas

- `telemetry_reports` se crea como hypertable de TimescaleDB.
- El proyecto usa PostGIS para geometrías en misiones, geofences, alertas y features de capas.
- Algunas integraciones especializadas como `guardian`, `mavlink`, `atak` y `cot` están preparadas como bounded contexts para la siguiente iteración, pero todavía no tienen adapters de producción completos.
## Publicacion de imagenes

El repositorio incluye el workflow [`publish-image.yml`](./.github/workflows/publish-image.yml) para construir y publicar la imagen Docker en `GHCR`.

- imagen: `ghcr.io/<github-owner>/gungnir-back`
- triggers: cada `push`, tags `v*` y ejecucion manual
- tags publicados: nombre de rama, SHA del commit y `latest` solo en la rama por defecto

No requiere secrets adicionales para publicar en `GHCR`; usa `GITHUB_TOKEN` con permiso `packages: write`.

La parte de despliegue remoto al homelab todavia no esta conectada. El siguiente paso deberia consumir esta imagen desde `GHCR` usando `image:` en lugar de `build:`.
