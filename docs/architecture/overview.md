# Resumen de arquitectura

`gungnir-back` es un monolito modular NestJS con limites claros entre dominio, infraestructura y contratos compartidos.

## Componentes principales

- `src/main.ts` inicializa Nest, `helmet`, validacion global, filtro de excepciones, interceptores, prefijo `/api` y Swagger en `/api/docs`.
- `src/app.module.ts` compone infraestructura comun y modulos de dominio.
- `src/config` resuelve configuracion tipada desde entorno usando Zod.
- `src/infrastructure/database` conecta Drizzle con PostgreSQL, PostGIS y TimescaleDB.
- `src/infrastructure/mqtt` maneja suscripcion y publicacion MQTT 5.
- `src/contracts/domain-events.ts` centraliza los nombres de eventos de dominio que luego salen a realtime.

## Estilo arquitectonico

- monolito desplegable unico en la primera etapa
- modulos de dominio separados por bounded context
- contratos explicitos para API, MQTT y eventos
- preparacion para extraer integraciones de alto trafico mas adelante

## Flujo principal de telemetria

1. El backend recibe telemetria por `POST /api/telemetry/ingest`, por `telemetry/{deviceId}/state` o por `dev/{deviceId}/uplink`.
2. `TelemetryService` persiste el reporte en `telemetry_reports`.
3. El estado actual se actualiza en `current_track_states`.
4. El historial se refleja en `track_history`.
5. Se emiten `telemetry.received` y `track.updated`.
6. `RealtimeGateway` los publica a clientes Socket.IO.

## Flujo principal de comandos

1. `POST /api/commands` crea un comando.
2. El backend publica el payload por MQTT.
3. Los mensajes `cmd/{deviceId}/response` actualizan el estado.
4. Los cambios relevantes emiten eventos hacia realtime.

## Persistencia

Las tablas base estan definidas en `src/infrastructure/database/schema.ts`.

- identidad y acceso: `users`, `roles`, `permissions`, `refresh_tokens`
- estructura operativa: `organizations`, `units`, `assets`, `devices`
- observacion y tracking: `telemetry_reports`, `current_track_states`, `track_history`
- C2 y operaciones: `commands`, `missions`, `geofences`, `alerts`, `incidents`
- espacio geoespacial: `map_layers`, `layer_features`, `external_sources`
- soporte E2E Guardian: `guardian_e2e_device_state`

## Decisiones visibles en codigo

- CORS esta abierto a `origin: true`; la restriccion fina todavia no se aplica desde `CORS_ORIGIN`.
- Los secretos y TTLs se validan por entorno, pero algunos archivos de ejemplo hoy incluyen valores no aptos para compartir entre ambientes.
- La API moderna y la API COP conviven para permitir evolucion interna sin romper el frontend actual.
