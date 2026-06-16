# Entornos y despliegue

## Docker local

El archivo `docker-compose.yml` levanta backend, PostgreSQL, Redis, Mosquitto y un perfil opcional para NATS.

Puntos relevantes del estado actual:

- el backend corre en modo desarrollo
- se ejecutan `db:migrate` y `db:seed` al arrancar
- se espera a PostgreSQL con `docker/wait-for-postgres.js`
- Mosquitto esta expuesto en `1883`

## WSL para backend + frontend

`docker-compose.wsl.yml` sirve para validar `gungnir-back` junto con el frontend desde WSL.

Comando base:

```bash
docker compose -f docker-compose.wsl.yml up -d --build
```

Defaults observables en el repo:

- frontend en `http://localhost:3000`
- backend en `http://localhost:4000`
- Mosquitto en `localhost:1884`

Si el repo hermano del frontend no vive en la ruta esperada, sobreescribe `FRONTEND_DIR`.

## Windows nativo + servicios en WSL/Docker

Para desarrollo diario en Windows, hoy conviene tratar este esquema como baseline:

- `gungnir-back` corriendo nativo en Windows sobre `http://localhost:4000`
- frontend `Next.js` corriendo nativo en Windows sobre `http://localhost:3000`
- PostgreSQL expuesto en `localhost:5433`
- Redis expuesto en `localhost:6380`
- Mosquitto expuesto en `localhost:1884`

Motivo principal:

- evita depender del reenvio `Windows -> WSL -> contenedor` para el puerto `4000`
- conserva Compose para los servicios de infraestructura
- simplifica el debugging de `Next.js` y `NestJS` desde el host

Smoke test recomendado:

1. `docker compose up -d postgres redis mosquitto`
2. `corepack pnpm run start:dev` en `gungnir-back`
3. `corepack pnpm dev` en `gugnir v2`
4. validar `http://localhost:4000/api/health`
5. validar `http://localhost:4000/api/docs`
6. validar `http://localhost:3000`

## Homelab PoC

`docker-compose.homelab.yml` empaqueta frontend, backend, PostgreSQL, Redis, Mosquitto y un perfil opcional con Cloudflare Tunnel.

Supuestos del compose:

- el frontend se construye desde un repo hermano apuntado por `FRONTEND_DIR`
- `BACKEND_API_URL` sirve para SSR interno
- `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL` son las URLs que consume el navegador
- el backend espera `.env.homelab`

## Riesgos operativos a tener presentes

- hoy hay defaults sensibles visibles en archivos versionados de ejemplo y Compose
- `allow_anonymous true` en Mosquitto sigue siendo valido para PoC interna, no para exposicion abierta
- la estrategia de secretos aun no esta separada por ambiente con el nivel de rigor que pediria un shared environment
