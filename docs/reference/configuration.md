# Configuracion

## Variables de entorno

Estas variables se validan en `src/config/env.schema.ts`.

| Variable | Requerida | Notas |
| --- | --- | --- |
| `NODE_ENV` | no | `development`, `test` o `production` |
| `PORT` | no | default `4000` |
| `DATABASE_URL` | si | PostgreSQL principal |
| `REDIS_URL` | si | Redis para BullMQ |
| `MQTT_URL` | si | broker MQTT 5 |
| `MQTT_USERNAME` | no | default vacio |
| `MQTT_PASSWORD` | no | default vacio |
| `GUARDIAN_E2E_KEY_HEX` | no | 64 hex chars |
| `JWT_ACCESS_SECRET` | si | minimo 16 chars |
| `JWT_REFRESH_SECRET` | si | minimo 16 chars |
| `ACCESS_TOKEN_TTL` | no | default `15m` |
| `REFRESH_TOKEN_TTL` | no | default `30d` |
| `CORS_ORIGIN` | si | requerido por schema |
| `FRONTEND_URL` | si | referencia de app consumidora |

## Configuracion aplicada hoy

Hay una diferencia importante entre "variables validadas" y "variables realmente usadas":

- `PORT`, secretos JWT, MQTT y key E2E si participan del runtime
- `CORS_ORIGIN` y `FRONTEND_URL` se validan, pero `main.ts` hoy usa `origin: true` en CORS, por lo que la restriccion fina aun no esta conectada

## Recomendaciones para endurecer

- mover secretos de muestra fuera de archivos versionados
- separar `.env` por ambiente con reglas explicitas
- alinear `main.ts` con `CORS_ORIGIN` para evitar falsa sensacion de control
