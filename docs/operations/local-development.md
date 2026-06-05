# Desarrollo local

## Requisitos

- Node.js 22
- `pnpm`
- Docker Desktop o Docker Engine
- PostgreSQL, Redis y Mosquitto levantados por Compose

## Variables de entorno

Parte desde `.env.example` y crea tu `.env` local.

Variables requeridas por `src/config/env.schema.ts`:

- `DATABASE_URL`
- `REDIS_URL`
- `MQTT_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `FRONTEND_URL`

Variables opcionales con defaults en codigo:

- `NODE_ENV`
- `PORT`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `GUARDIAN_E2E_KEY_HEX`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL`

!!! warning "Secretos de ejemplo"
    Usa valores propios para `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `GUARDIAN_E2E_KEY_HEX`. No reutilices los valores de muestra fuera de desarrollo local aislado.

## Arranque rapido

```bash
docker compose up -d postgres redis mosquitto
corepack enable
pnpm install
pnpm run db:migrate
pnpm run db:seed
pnpm run start:dev
```

Swagger queda disponible en `http://localhost:4000/api/docs`.

## Credenciales seed

- usuario: `admin@gungnir.local`
- password: `admin12345`

## Validacion minima recomendada

1. `GET /api/health`
2. `POST /api/auth/login`
3. `GET /api/devices`
4. `GET /api/v1/operations/bootstrap`

## Calidad y pruebas

```bash
pnpm run typecheck
pnpm test
pnpm run lint
```

`typecheck` y `test` tienen cobertura en el repo actual. `lint` todavia debe considerarse una deuda abierta del proyecto y no una build limpia garantizada.
