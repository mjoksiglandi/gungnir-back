# DGAC Layers Integration Guide

## Summary

The backend now ingests public DGAC AIP map datasets and exposes them as regular Gungnir layers. Frontend clients do not need to talk directly to `aipchile.dgac.gob.cl`; they should consume Gungnir endpoints only.

Implemented datasets:

- `layer-dgac-aerodromes`
- `layer-dgac-notams`

## Recommended Frontend Flow

1. Fetch layer metadata from `GET /api/v1/layers` or `GET /api/map-layers`.
2. Render visible layer toggles from that metadata.
3. When a layer is enabled in the UI, fetch its geometry from:
   - `GET /api/v1/layers/:id/geojson`
   - or `GET /api/map-layers/:id/geojson`
4. Render the `FeatureCollection` according to `layerType` and `metadata.style`.

Use `/api/v1/layers/:id/geojson` if the frontend already lives on the COP compatibility contract. Use `/api/map-layers/:id/geojson` if the frontend already consumes the modern authenticated API.

## Endpoints

### COP compatibility endpoints

- `GET /api/v1/layers`
- `GET /api/v1/layers/:id`
- `GET /api/v1/layers/:id/geojson`

### Modern layer endpoints

- `GET /api/map-layers`
- `GET /api/map-layers/:id`
- `GET /api/map-layers/:id/features`
- `GET /api/map-layers/:id/geojson`

### Admin/source sync endpoints

- `GET /api/external-sources`
- `POST /api/external-sources/:id/sync`
- `POST /api/external-sources/sync-all`

These sync endpoints require the same JWT auth as the rest of the admin API.

## Layer IDs And Render Guidance

### `layer-dgac-aerodromes`

- `layerType`: `point`
- Geometry: `Point`
- Suggested render:
  - airport marker
  - label from `properties.codeOaci` or `properties.name`
- Useful properties:
  - `codeOaci`
  - `codeIata`
  - `name`
  - `fir`
  - `isPublic`
  - `operationHours`
  - `elevation`
  - `aipLink`

### `layer-dgac-notams`

- `layerType`: `point`
- Geometry: `Point`
- Suggested render:
  - warning marker
  - popup or side panel with NOTAM text
  - optional client-side radius visualization using `properties.radiusNm`
- Useful properties:
  - `series`
  - `fir`
  - `code`
  - `aerodrome`
  - `validFrom`
  - `validTo`
  - `schedule`
  - `detail`
  - `lowerLimit`
  - `upperLimit`
  - `text`
  - `radiusNm`

## Example Metadata Response

Example from `GET /api/v1/layers`:

```json
{
  "id": "layer-dgac-aerodromes",
  "kind": "geoLayer",
  "version": 1,
  "updatedAt": "2026-05-18T18:20:00.000Z",
  "source": "external",
  "name": "DGAC Aerodromes",
  "layerType": "point",
  "visibleByDefault": false,
  "polygon": [],
  "featureCollectionUrl": "/api/v1/layers/layer-dgac-aerodromes/geojson",
  "metadata": {
    "provider": "dgac",
    "dataset": "aerodrome",
    "geometryType": "Point",
    "style": {
      "marker": "airport",
      "color": "#0069c2"
    }
  }
}
```

## Example GeoJSON Response

Example from `GET /api/v1/layers/layer-dgac-aerodromes/geojson`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "feature-abc123",
      "geometry": {
        "type": "Point",
        "coordinates": [-71.851944, -44.229444]
      },
      "properties": {
        "category": "aerodrome",
        "codeOaci": "SCVE",
        "codeIata": "",
        "name": "Lago Verde (PUB)",
        "fir": "SCTZ",
        "isPublic": true,
        "operationHours": "HJ",
        "elevation": "311 m / 1020",
        "aipLink": "https://aipchile.dgac.gob.cl/...",
        "source": "source-dgac-aerodromes",
        "externalId": "aerodrome-297",
        "timestamp": "2026-05-18T18:20:00.000Z",
        "expiresAt": "2026-05-25T18:20:00.000Z"
      }
    }
  ]
}
```

## Frontend Notes

- DGAC layer metadata includes a `featureCollectionUrl` field to simplify lazy loading.
- `timestamp` and `expiresAt` come from Gungnir, not directly from DGAC.
- NOTAM geometry is currently represented as a center point. If you want visual circles, derive them client-side from `radiusNm`.
- For point layers with many features, cluster markers when zoomed out.

## Sync Operations

Recommended ops sequence after deployment:

1. `POST /api/external-sources/sync-all`
2. Verify `GET /api/v1/layers`
3. Verify `GET /api/v1/layers/layer-dgac-aerodromes/geojson`
4. Verify `GET /api/v1/layers/layer-dgac-notams/geojson`
