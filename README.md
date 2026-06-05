# Gungnir Back

Backend NestJS para la plataforma Gungnir C4 / Common Operational Picture.

La documentacion del proyecto fue reorganizada como un sitio Material for MkDocs para separar contratos vivos, operacion y roadmap de notas historicas que ya no reflejaban el estado real del repo.

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

## Credenciales seed

- usuario: `admin@gungnir.local`
- password: `admin12345`

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
