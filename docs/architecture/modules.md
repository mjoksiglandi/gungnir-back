# Modulos

## Modulos activos en la API o en flujos reales

| Modulo | Rol actual | Superficie visible |
| --- | --- | --- |
| `auth` | login, refresh, logout, usuario actual | `/api/auth/*` |
| `devices` | catalogo de dispositivos y estado actual | `/api/devices/*` |
| `telemetry` | ingestion, historial y puente MQTT | `/api/telemetry/*` |
| `tracking` | vistas de track actual e historico | `/api/tracks/*` |
| `commands` | emision y lifecycle de comandos | `/api/commands/*` |
| `missions` | CRUD de misiones | `/api/missions/*` |
| `geofences` | CRUD de geocercas | `/api/geofences/*` |
| `alerts` | listado, ack y resolve | `/api/alerts/*` |
| `map-layers` | metadatos de capas y GeoJSON | `/api/map-layers/*` |
| `external-sources` | sincronizacion manual de proveedores | `/api/external-sources/*` |
| `realtime` | fan-out WebSocket | `/realtime` |
| `system-health` | salud y metricas | `/api/health`, `/api/metrics` |
| `cop` | compatibilidad con frontend actual | `/api/v1/*` |

## Modulos presentes pero no cerrados como producto

Estos modulos se importan en `AppModule`, pero hoy no deben venderse como capacidades completas por si solos:

- `guardian`
- `mavlink`
- `atak`
- `cot`
- `weather`
- `air-traffic`
- `notams`
- `fire-intel`
- `tasking`
- `incidents`
- `organizations`
- `units`
- `roles`
- `audit`

## Criterio de documentacion

Para esta base documental solo se describen como contratos vivos los modulos que cumplen al menos una de estas condiciones:

- tienen controlador expuesto
- intervienen en un flujo de mensajeria activo
- sostienen compatibilidad requerida por otro sistema

El resto queda tratado como capacidad en construccion hasta que tenga endpoints, jobs o contratos observables equivalentes.
