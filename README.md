# Gungnir Back

Backend NestJS para la plataforma Gungnir C4 / Common Operational Picture.

La documentacion del proyecto fue reorganizada como un sitio Material for MkDocs para separar contratos vivos, operacion y roadmap de notas historicas que ya no reflejaban el estado real del repo.

## Estructura actual del backend

El proyecto sigue siendo un monolito modular NestJS, pero ahora con una segmentacion mas clara por capas:

```text
src/
  main.ts
  app.module.ts
  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    constants/
  config/
  contracts/
  infrastructure/
    database/
    mqtt/
    queues/
  modules/
    <feature>/
      <feature>.module.ts
      controllers/
      services/
      repositories/
      dto/
      entities/ | types/
  scripts/
```

Los modulos mas cargados ya siguen este patron, incluyendo `devices`, `commands`, `tracking`, `telemetry`, `cop` y `external-sources`.

## Documentacion

- configuracion del sitio: [`mkdocs.yml`](./mkdocs.yml)
- punto de entrada: [`docs/index.md`](./docs/index.md)
- dependencias de docs: [`requirements-docs.txt`](./requirements-docs.txt)

Secciones principales:

- arquitectura
- operacion local, WSL y homelab
- contratos HTTP, realtime y MQTT
- Guardian E2E uplink
- integraciones de capas externas
- roadmap tecnico

## Stack

- Node.js 22
- TypeScript estricto
- NestJS
- Drizzle ORM
- PostgreSQL + TimescaleDB + PostGIS
- Redis + BullMQ
- MQTT 5
- Socket.IO en `/realtime`
- Swagger en `/api/docs`
- Material for MkDocs para documentacion

## Arranque rapido

```bash
docker compose up -d postgres redis mosquitto
corepack enable
pnpm install
pnpm run db:migrate
pnpm run db:seed
pnpm run start:dev
```

Swagger queda en `http://localhost:4000/api/docs`.

## Modo recomendado en Windows

Si trabajas con frontend en Windows y servicios auxiliares dentro de WSL/Docker, el flujo validado hoy es:

1. Desde `gungnir back`, levanta solo infraestructura:

```bash
docker compose up -d postgres redis mosquitto
```

2. Mantén `.env` apuntando a los puertos publicados en Windows:

```bash
DATABASE_URL=postgres://gungnir:gungnir@127.0.0.1:5433/gungnir
REDIS_URL=redis://127.0.0.1:6380
MQTT_URL=mqtt://127.0.0.1:1884
PORT=4000
```

3. Ejecuta el backend nativo en Windows:

```bash
corepack enable
corepack pnpm install
corepack pnpm run db:migrate
corepack pnpm run db:seed
corepack pnpm run start:dev
```

Checks minimos:

- `http://localhost:4000/api/health`
- `http://localhost:4000/api/docs`

## Credenciales seed

- usuario: `admin@gungnir.local`
- password: `admin12345`

## Calidad y pruebas

Validacion recomendada antes de subir cambios:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

## Sitio de documentacion

Instalacion:

```bash
python -m pip install -r requirements-docs.txt
```

Desarrollo local:

```bash
mkdocs serve
```

Build estatico:

```bash
mkdocs build
```
