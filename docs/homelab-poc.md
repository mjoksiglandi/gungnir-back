# Homelab PoC Deployment

Este despliegue esta pensado para una demo interna con MQTT obligatorio y sin IP publica.

## Servicios

- `frontend`: Next.js empaquetado para produccion
- `backend`: NestJS principal
- `postgres`: base de datos Timescale/Postgres
- `redis`: soporte para colas/cache
- `mosquitto`: broker MQTT liviano
- `cloudflared`: salida opcional por Cloudflare Tunnel

## Arquitectura recomendada

- exponer `frontend` en `app.tudominio.com`
- exponer `backend` en `api.tudominio.com`
- dejar `postgres`, `redis` y `mosquitto` dentro de la red del homelab
- mantener frontend y backend como repos hermanos en el host del homelab

## Variables

Usa [`.env.homelab.example`](../.env.homelab.example) como base para crear `.env.homelab`.

Puntos importantes:

- `FRONTEND_DIR` apunta al repo local del frontend
- `DATABASE_URL` usa el hostname Docker `postgres`
- `REDIS_URL` usa el hostname Docker `redis`
- `MQTT_URL` usa el hostname Docker `mosquitto`
- `BACKEND_API_URL` es la URL interna que usa Next.js server-side
- `NEXT_PUBLIC_API_URL` es la URL publica REST consumida por el navegador
- `NEXT_PUBLIC_WS_URL` es la URL publica de Socket.IO bajo `/realtime`
- `TUNNEL_TOKEN` solo se usa si levantas el perfil `tunnel`

## Layout esperado

El compose vive en el repo backend y espera este layout base:

```text
deploy-root/
  gungnir back/
  gungnir v2/
```

Si tu carpeta del frontend tiene otro nombre o vive en otra ruta, ajusta `FRONTEND_DIR` en `.env.homelab`.

## Arranque

Sin Tunnel:

```bash
docker compose -f docker-compose.homelab.yml up -d --build
```

Con Tunnel:

```bash
docker compose -f docker-compose.homelab.yml --profile tunnel up -d --build
```

## Notas

- `frontend` se construye desde el repo hermano configurado en `FRONTEND_DIR`.
- El frontend usa `BACKEND_API_URL=http://backend:4000/api` para SSR y proxy interno, pero el navegador debe apuntar a `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL` publicos.
- `mosquitto` esta configurado con `allow_anonymous true` para simplificar la PoC. Antes de abrir acceso fuera de la red interna, conviene activar autenticacion.
- Si prefieres no publicar puertos de `postgres` y `redis` al host, puedes quitar esos `ports` y dejar acceso solo entre contenedores.
- Para Cloudflare Tunnel con este stack, crea dos public hostnames en el tunnel: `app.tudominio.com -> http://frontend:3000` y `api.tudominio.com -> http://backend:4000`.
