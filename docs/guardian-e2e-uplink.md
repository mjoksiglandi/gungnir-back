# Guardian E2E Uplink V1

## Estado

El backend ya acepta uplinks `guardian.uplink.e2e` publicados por MQTT en:

- `dev/{deviceId}/uplink`

La ruta legacy de telemetría normalizada en `telemetry/{deviceId}/state` sigue activa.

## Contrato soportado

Se soporta el envelope definido por el RFC V1:

- `type = guardian.uplink.e2e`
- `schema = guardian.e2e.v1`
- `channel = gsm | iridium`
- `e2e.alg = AES-256-GCM`
- `e2e.version = 1`

El backend valida:

- schema externo
- versión criptográfica
- nonce recomputado desde `device_id` y `seq`
- AAD exacto
- tag GCM
- payload binario V1 de 32 bytes
- anti-replay por `device_id`

## Clave E2E

La implementación actual usa una sola key de flota en backend:

- `GUARDIAN_E2E_KEY_HEX`

Formato:

- 64 caracteres hex
- 32 bytes efectivos para AES-256-GCM

La clave no debe commitearse en archivos tracked. Para desarrollo local puede quedar en `.env`.

## Anti-replay

El estado anti-replay se persiste en:

- `guardian_e2e_device_state`

Campos principales:

- `device_id`
- `max_seq_accepted`
- `last_valid_received_at`

La política implementada hoy es:

- aceptar solo si `seq > max_seq_accepted`
- rechazar repeticiones o retrocesos

## Payload V1

El parser backend espera un plaintext fijo de 32 bytes con:

- `payload_version`
- `report_type`
- `lat_e5`
- `lon_e5`
- `alt_m`
- `speed_kn_x10`
- `heading_deg`
- `fix_time_unix`
- `flags`
- `sat_count`
- `hdop_x10`
- `battery_mv_div10`
- `reserved`

## Firmware

Para un build privado del firmware sin subir secretos al repo, se puede usar un archivo local de PlatformIO fuera de git con:

- `GUARDIAN_E2E_ENABLE=1`
- `GUARDIAN_E2E_KEY_HEX="<64 hex chars>"`

## Validación

Checks agregados en backend:

- typecheck TypeScript
- tests unitarios de crypto
- tests unitarios de payload parser
- test de servicio para uplink RFC válido

## Limitaciones actuales

- la resolución de key es por flota, no por dispositivo
- el backend ya consume el RFC V1, pero el firmware todavía debe completar la migración total al payload packed definitivo del RFC
- el fallback satelital requiere validación final de transporte una vez se cierre el formato definitivo en firmware
