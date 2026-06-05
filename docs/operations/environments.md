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
