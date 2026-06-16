# Desarrollo local

## Requisitos

- Node.js 22
- `pnpm`
- Docker Engine en WSL o Docker Desktop
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

## Modo hibrido Windows + WSL recomendado

Cuando el frontend corre nativo en Windows, el camino mas estable hoy es:

1. Levantar solo `postgres`, `redis` y `mosquitto` con Compose dentro de WSL.
2. Exponer esos puertos hacia Windows en los defaults del repo:
   `5433`, `6380` y `1884`.
3. Ejecutar `gungnir-back` nativo en Windows con el `.env` actual:

```bash
DATABASE_URL=postgres://gungnir:gungnir@127.0.0.1:5433/gungnir
REDIS_URL=redis://127.0.0.1:6380
MQTT_URL=mqtt://127.0.0.1:1884
PORT=4000
```

4. Validar desde Windows:
   `http://localhost:4000/api/health`
   `http://localhost:4000/api/docs`

Este modo evita depender de que `localhost:4000` quede correctamente reenviado desde un backend corriendo enteramente dentro de WSL/Docker.

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
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

En el estado actual del repo, `lint`, `typecheck`, `test`, `test:e2e` y `build` deben pasar en local con la configuracion del proyecto.
