# Vision General del Backend

## Resumen

`gungnir-back` es un monolito NestJS organizado por modulos de dominio. Expone:

- una API moderna autenticada bajo `/api`
- una API de compatibilidad COP bajo `/api/v1`
- eventos en tiempo real mediante Socket.IO en `/realtime`
- integraciones operacionales con PostgreSQL, Redis, MQTT y fuentes cartograficas externas

El foco actual es un backend C4 / Common Operational Picture para activos, telemetria, comandos, alertas, misiones, capas geoespaciales y fuentes externas.

## Arquitectura de Ejecucion

### Capa principal de la aplicacion

- `src/main.ts`: levanta Nest, Swagger, middlewares de seguridad, validacion y filtros globales
- `src/app.module.ts`: compone modulos de infraestructura y modulos de dominio
- `src/config/*`: parseo de entorno y configuracion

### Infraestructura

- `src/infrastructure/database/*`: bindings de Drizzle + PostgreSQL y schema
- `src/infrastructure/mqtt/*`: publicacion MQTT y consumo de mensajes
- `src/infrastructure/queues/*`: wiring de colas BullMQ

### Modulos de dominio ya activos

- `auth`: login, refresh, logout y usuario actual
- `users`: consulta de usuarios y datos de soporte para autenticacion
- `devices`: registro de dispositivos y acceso a estado actual
- `telemetry`: ingestion, historial y delegacion MQTT
- `tracking`: vistas de track actual e historico
- `commands`: emision de comandos, manejo de ACK y ciclo de vida de estados
- `missions`: CRUD de misiones y persistencia de geometria
- `geofences`: CRUD de geocercas
- `alerts`: listado de alertas, ack y flujo de resolucion
- `map-layers`: metadatos de capas, features, proyeccion GeoJSON y patching
- `external-sources`: orquestacion de sincronizacion para fuentes externas
- `realtime`: fan-out websocket de eventos de dominio
- `system-health`: superficie de endpoints de salud y metricas
- `cop`: contrato de compatibilidad para el frontend actual bajo `/api/v1`

### Modulos presentes como placeholders o bounded contexts futuros

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

## Puntos Clave del Modelo de Datos

Las tablas principales viven en [`src/infrastructure/database/schema.ts`](../src/infrastructure/database/schema.ts).

- Identidad y acceso: `users`, `roles`, `permissions`, `refresh_tokens`
- Activos operacionales: `organizations`, `units`, `assets`, `devices`
- Telemetria y tracking: `telemetry_reports`, `current_track_states`, `track_history`
- Espacio de mision: `missions`, `geofences`, `incidents`, `alerts`
- Comando y control: `commands`
- Datos cartograficos: `map_layers`, `layer_features`, `external_sources`
- Auditabilidad: `audit_logs`

PostGIS se usa para geometria de capas, misiones, alertas y geocercas. TimescaleDB se usa para `telemetry_reports`.

## Flujo de Requests y Eventos

### Telemetria

1. `POST /api/telemetry/ingest` o un evento MQTT entra a `TelemetryService`.
2. Se inserta una fila en `telemetry_reports`.
3. Se hace upsert sobre `current_track_states`.
4. Se agrega una entrada en `track_history`.
5. Se emiten eventos de dominio `telemetry.received` y `track.updated`.
6. `RealtimeGateway` republica esos eventos hacia clientes websocket.

### Comandos

1. `POST /api/commands` crea una fila de comando.
2. MQTT publica el payload saliente al topic del dispositivo.
3. Los handlers de ACK / response actualizan el estado y emiten eventos asociados al comando.

### Fuentes cartograficas externas

1. `POST /api/external-sources/:id/sync` o `sync-all` dispara `ExternalSourcesService`.
2. Un adapter proveedor normaliza los datos de la fuente hacia registros internos de features.
3. Las features se escriben en `layer_features`.
4. Se refresca `map_layers.lastUpdatedAt`.
5. Se emite `layer.synced` para websocket y consumidores aguas abajo.

## Superficie de API

### API moderna

La API autenticada principal cubre auth, devices, telemetry, tracks, commands, missions, geofences, alerts, map layers, sincronizacion de fuentes externas y health.

Swagger se sirve en `/api/docs`.

### API de compatibilidad COP

La capa de compatibilidad bajo `/api/v1` hoy expone:

- bootstrap y snapshot operacional
- activos y alertas
- incidentes
- capas, incluyendo URLs GeoJSON
- timeline
- feed de hotspots de incendio

Esto mantiene estable el contrato del frontend mientras la API moderna evoluciona por separado.

## Estado de la Integracion DGAC

El backend ya incluye un adapter proveedor DGAC en [`src/modules/external-sources/dgac-source.provider.ts`](../src/modules/external-sources/dgac-source.provider.ts) y definiciones seed de capas/fuentes para:

- aerodromos
- NOTAMs georreferenciados

Las notas de integracion para frontend viven en [`docs/dgac-layers-frontend.md`](./dgac-layers-frontend.md).

## Flujo de Trabajo de Desarrollo

### Arranque local

1. `docker compose up -d postgres redis mosquitto`
2. `npm install`
3. `npm run db:migrate`
4. `npm run db:seed`
5. `npm run start:dev`

### Comandos de calidad

- `npm run typecheck`
- `npm test`
- `npm run lint`

Hoy `typecheck` y las pruebas pasan, mientras que `lint` todavia reporta problemas existentes que conviene limpiar antes de considerar el backend completamente en verde.

## Brechas Actuales

- `lint` todavia no esta limpio en todo el repositorio
- varios modulos existen mas como scaffolding que como integraciones completas
- la sincronizacion de fuentes externas no tiene aun scheduling en background ni un flujo mas rico de retry/reporting
- todavia existe acoplamiento entre las respuestas de compatibilidad y los formatos internos de persistencia
