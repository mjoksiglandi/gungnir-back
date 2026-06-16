# Fuentes externas y capas

## Objetivo

El modulo `external-sources` sincroniza datasets externos y los normaliza a `layer_features` para que el frontend los consuma como capas operativas.

## Proveedores visibles hoy

### Natural hazards

Segun seeds y proveedores presentes, el backend ya contempla:

- incendios activos tipo NASA FIRMS
- sismos tipo USGS
- hazards meteorologicos y naturales via EONET/NWS

### DGAC

Las semillas actuales tambien dejan configuradas capas para:

- aerodromos DGAC
- NOTAMs georreferenciados DGAC

En el seed ambas capas quedan `enabled: false`, lo que refleja una integracion presente pero no activada por defecto.

## Flujo de sincronizacion

1. `POST /api/external-sources/sync-all` o `POST /api/external-sources/:id/sync`
2. el proveedor descarga y normaliza el dataset
3. el backend actualiza `layer_features`
4. `map_layers.lastUpdatedAt` refleja el refresh
5. se emite `layer.synced`

## Limitaciones del estado actual

- la sincronizacion sigue siendo disparada por endpoint, no por scheduler maduro
- faltan retries, politicas de backoff y reporting operacional mas rico
- la activacion por defecto de capas DGAC sigue siendo conservadora

## Contrato hacia frontend

La informacion de capas sale por:

- `GET /api/map-layers`
- `GET /api/map-layers/:id/features`
- `GET /api/map-layers/:id/geojson`
- `GET /api/v1/layers`
- `GET /api/v1/layers/:id/geojson`
