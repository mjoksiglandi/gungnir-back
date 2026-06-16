# Guardian E2E uplink

## Topico soportado

- `dev/{deviceId}/uplink`

El backend mantiene compatibilidad simultanea con la ruta legacy:

- `telemetry/{deviceId}/state`

## Envelope admitido

Schema validado por `guardian-uplink-e2e.schemas.ts`:

```json
{
  "type": "guardian.uplink.e2e",
  "schema": "guardian.e2e.v1",
  "device_id": "device-uav-001",
  "channel": "gsm",
  "sent_at_utc": "2026-06-01T12:34:56Z",
  "e2e": {
    "alg": "AES-256-GCM",
    "version": 1,
    "seq": "0000000000000001",
    "nonce": "00112233445566778899aabb",
    "ciphertext": "aabbccdd",
    "tag": "00112233445566778899aabbccddeeff"
  }
}
```

## Validaciones implementadas

- `type = guardian.uplink.e2e`
- `schema = guardian.e2e.v1`
- `channel in {gsm, iridium}`
- `e2e.alg = AES-256-GCM`
- `e2e.version = 1`
- hex lower-case con longitudes exactas para `seq`, `nonce` y `tag`
- `ciphertext` hex con largo par

## Anti-replay

El backend persiste estado por dispositivo en `guardian_e2e_device_state`.

Politica vigente:

- aceptar solo si `seq > max_seq_accepted`
- rechazar duplicados y retrocesos

## Payload binario V1

El plaintext esperado tiene 32 bytes.

| Offset | Campo | Tipo |
| --- | --- | --- |
| 0 | `payload_version` | `u8` |
| 1 | `report_type` | `u8` |
| 2 | `lat_e5` | `i32 le` |
| 6 | `lon_e5` | `i32 le` |
| 10 | `altitude_m` | `i32 le` |
| 14 | `speed_kn_x10` | `u16 le` |
| 16 | `heading_deg` | `u16 le` |
| 18 | `fix_time_unix` | `u32 le` |
| 22 | `flags` | `u8` |
| 23 | `sat_count` | `u8` |
| 24 | `hdop_x10` | `u16 le` |
| 26 | `battery_mv_div10` | `u16 le` |
| 28 | `reserved` | `u32 le` |

El parser actual solo acepta `payload_version = 1`.

## Clave E2E

La implementacion backend actual usa una sola clave de flota:

- `GUARDIAN_E2E_KEY_HEX`

Debe tener 64 caracteres hex para representar 32 bytes.

## Estado funcional

El backend ya hace:

- validacion de schema
- recomputo de nonce y AAD
- decrypt AES-256-GCM
- parseo de payload V1
- persistencia de anti-replay
- handoff al pipeline normal de `TelemetryService`

## Pendientes razonables

- publicar fixtures compartidos firmware/backend
- probar interoperabilidad con dispositivos reales
- evaluar resolucion de clave por dispositivo si el rollout lo requiere
