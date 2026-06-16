# Gungnir Back

Backend NestJS para una plataforma C4 / Common Operational Picture centrada en telemetria, command and control, capas geoespaciales, integraciones externas y compatibilidad con el frontend actual.

## Que cubre esta documentacion

- como levantar el backend en local, WSL y homelab
- que modulos estan operativos y cuales siguen en modo foundation
- contratos HTTP, eventos internos, WebSocket y mensajeria MQTT
- integracion Guardian E2E uplink y capas externas
- roadmap tecnico cercano para cerrar validacion y endurecer despliegue

## Vista rapida del sistema

- API REST principal bajo `/api`
- API de compatibilidad COP bajo `/api/v1`
- Swagger/OpenAPI en `/api/docs`
- Socket.IO bajo `/realtime`
- PostgreSQL + TimescaleDB + PostGIS como persistencia principal
- Redis + BullMQ para colas
- MQTT 5 para ingestion y command transport

## Estructura de codigo

El repo se organiza en tres zonas base:

- `src/common` para piezas transversales como guards, pipes, decorators, interceptors y constantes
- `src/config` para configuracion tipada y validada por entorno
- `src/infrastructure` para adaptadores de base de datos, MQTT y colas

La logica de negocio vive en `src/modules`. En los modulos ya normalizados, cada feature separa:

- `controllers` para la superficie HTTP
- `services` para coordinacion de dominio y eventos
- `repositories` para acceso a datos con Drizzle o SQL
- `dto` para validacion y contratos del borde
- `types` o `entities` para tipos internos del modulo

## Estado actual

!!! info "Lo que ya esta conectado"
    `auth`, `devices`, `telemetry`, `tracking`, `commands`, `missions`, `geofences`, `alerts`, `map-layers`, `external-sources`, `realtime`, `system-health` y la capa COP bajo `/api/v1`.

!!! warning "Lo que aun no debe documentarse como terminado"
    `guardian`, `mavlink`, `atak`, `cot`, `weather`, `air-traffic`, `notams`, `fire-intel`, `tasking`, `incidents`, `organizations`, `units` y `roles` existen en el monolito, pero varios de esos bounded contexts siguen sin una superficie funcional equivalente a los modulos principales.

## Punto de partida recomendado

1. Revisa [Desarrollo local](operations/local-development.md) para levantar el stack.
2. Usa [HTTP API](contracts/http-api.md) para validar endpoints expuestos hoy.
3. Consulta [Eventos y mensajeria](contracts/events-and-messaging.md) si vas a integrar realtime o MQTT.
4. Lee [Guardian E2E uplink](contracts/guardian-e2e-uplink.md) si vas a tocar firmware o ingestion cifrada.
