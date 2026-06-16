# Resumen de arquitectura

`gungnir-back` es un monolito modular NestJS con limites claros entre dominio, infraestructura y contratos compartidos. La estructura actual prioriza navegacion por feature y separacion explicita entre capa HTTP, servicios de dominio y acceso a datos.

## Componentes principales

- `src/main.ts` inicializa Nest, `helmet`, validacion global, filtro de excepciones, interceptores, prefijo `/api` y Swagger en `/api/docs`.
- `src/app.module.ts` compone infraestructura comun y modulos de dominio.
- `src/common` concentra decorators, guards, interceptors, pipes, filtros y constantes reutilizables.
- `src/config` resuelve configuracion tipada desde entorno usando Zod.
- `src/infrastructure/database` conecta Drizzle con PostgreSQL, PostGIS y TimescaleDB.
- `src/infrastructure/mqtt` maneja suscripcion y publicacion MQTT 5.
- `src/contracts/domain-events.ts` centraliza los nombres de eventos de dominio que luego salen a realtime.
- `src/modules/<feature>` agrupa cada bounded context; en los modulos refactorizados ya se separan `controllers`, `services`, `repositories`, `dto` y `types`.

## Estilo arquitectonico

- monolito desplegable unico en la primera etapa
- modulos de dominio separados por bounded context
- separacion interna por capas dentro de cada modulo operativo
- contratos explicitos para API, MQTT y eventos
- preparacion para extraer integraciones de alto trafico mas adelante

## Patron por modulo

La forma recomendada para navegar y extender un modulo es:

```text
src/modules/<feature>/
  <feature>.module.ts
  controllers/
  services/
  repositories/
  dto/
  types/ | entities/
```

Responsabilidades:

- `controllers`: rutas y adaptacion HTTP
- `services`: reglas de negocio, coordinacion y emision de eventos
- `repositories`: consultas Drizzle, SQL directo y persistencia
- `dto`: schemas y tipos del borde
- `types` o `entities`: tipos internos o modelos del modulo

## Flujo principal de telemetria

1. El backend recibe telemetria por `POST /api/telemetry/ingest`, por `telemetry/{deviceId}/state` o por `dev/{deviceId}/uplink`.
2. `TelemetryService` coordina la ingestion y delega persistencia en `TelemetryRepository`.
3. El estado actual se actualiza en `current_track_states`.
4. El historial se refleja en `track_history`.
5. Se emiten `telemetry.received` y `track.updated`.
6. `RealtimeGateway` los publica a clientes Socket.IO.

## Flujo principal de comandos

1. `POST /api/commands` crea un comando.
2. `CommandsService` coordina persistencia y publicacion MQTT.
3. `CommandsRepository` mantiene el lifecycle de estado del comando.
4. Los mensajes `cmd/{deviceId}/response` actualizan el estado.
5. Los cambios relevantes emiten eventos hacia realtime.

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
- Los servicios operativos grandes ya no concentran toda la persistencia en un solo archivo; esa responsabilidad se separo en repositorios por modulo.
