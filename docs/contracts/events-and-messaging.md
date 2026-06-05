# Eventos y mensajeria

## Eventos de dominio

Los nombres canonicos estan en `src/contracts/domain-events.ts`.

- `telemetry.received`
- `track.updated`
- `command.issued`
- `command.acknowledged`
- `alert.created`
- `alert.updated`
- `mission.updated`
- `layer.synced`
- `device.status.changed`

## Realtime Socket.IO

Namespace:

- `/realtime`

Eventos emitidos hoy por `RealtimeGateway`:

- `track.updated`
- `telemetry.received`
- `command.status.changed`
- `alert.created`
- `alert.updated`
- `mission.updated`
- `layer.updated`

`command.status.changed` es una proyeccion websocket del evento interno `command.acknowledged`.

## MQTT entrante

Suscripciones actuales del backend:

- `telemetry/+/state`
- `cmd/+/response`
- `device/+/status`
- `dev/+/uplink`

Reglas de ruteo en `MqttService`:

- `telemetry/*` emite `mqtt.telemetry.state`
- `dev/*` con `type = guardian.uplink.e2e` emite `mqtt.guardian.uplink`
- `cmd/*` emite `mqtt.command.response`
- `device/*` emite `mqtt.device.status`

## MQTT saliente

El backend publica payloads JSON via `publishJson(topic, payload)` con `qos: 1`.

Topics de interes documentados por uso o convencion actual:

- `cmd/{deviceId}/request`
- `cmd/{deviceId}/response`
- `device/{deviceId}/status`
- `telemetry/{deviceId}/state`
- `dev/{deviceId}/uplink`

## Consideraciones

- los payloads entrantes se esperan como JSON valido
- el backend descarta mensajes con parseo fallido y registra un warning
- la separacion entre eventos internos y eventos websocket permite cambiar la implementacion de fan-out sin romper contratos de dominio
