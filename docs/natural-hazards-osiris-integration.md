# Natural Hazards Integration

## Osiris Reference

The `simplifaisoul/osiris` repository uses Next.js API routes as thin normalizers over public hazard feeds:

- `src/app/api/fires/route.ts`: NASA FIRMS active fire CSV feeds, with VIIRS S-NPP first and MODIS fallback.
- `src/app/api/earthquakes/route.ts`: USGS `2.5_day.geojson`.
- `src/app/api/weather/route.ts`: NASA EONET open events plus NOAA/NWS active alerts.
- `src/components/OsirisMap.tsx`: MapLibre GeoJSON sources with separate visual layers for earthquakes, fires, severe weather, and day/night.

## Backend Shape

Gungnir keeps the existing `map_layers` and `layer_features` model. Natural hazard feeds are now represented as external source adapters that write normalized GeoJSON features into layer storage:

- `layer-fire-intel` / `source-fire-hotspots`: NASA FIRMS active fires.
- `layer-earthquakes` / `source-usgs-earthquakes`: USGS M2.5+ earthquakes from the last 24 hours.
- `layer-weather-hazards` / `source-weather-hazards`: NASA EONET severe storms, volcanoes, sea ice, and NOAA/NWS active weather alerts.

## Seeded Map Sources

`pnpm run db:seed` creates six enabled rows in `external_sources`:

| Source ID | Name | Provider | Dataset/feed | Layer |
| --- | --- | --- | --- | --- |
| `source-fire-hotspots` | NASA FIRMS Active Fires | `natural-hazards` | `fires` | `layer-fire-intel` |
| `source-usgs-earthquakes` | USGS Earthquakes M2.5+ 24h | `natural-hazards` | `earthquakes` | `layer-earthquakes` |
| `source-weather-hazards` | NASA EONET + NOAA/NWS Hazards | `natural-hazards` | `weather` | `layer-weather-hazards` |
| `source-air-traffic` | Mock Air Traffic | `mock` | `adsb` | `layer-air-traffic` |
| `source-dgac-aerodromes` | DGAC Aerodromes | `dgac` | `aerodrome` | `layer-dgac-aerodromes` |
| `source-dgac-notams` | DGAC Georeferenced NOTAMs | `dgac` | `notams` | `layer-dgac-notams` |

Run:

```bash
pnpm run db:seed
```

Then trigger refreshes with an authenticated operator token:

```bash
POST /api/external-sources/source-fire-hotspots/sync
POST /api/external-sources/source-usgs-earthquakes/sync
POST /api/external-sources/source-weather-hazards/sync
```

Or refresh all enabled sources:

```bash
POST /api/external-sources/sync-all
```

Read GeoJSON for map rendering:

```bash
GET /api/map-layers/layer-fire-intel/geojson
GET /api/map-layers/layer-earthquakes/geojson
GET /api/map-layers/layer-weather-hazards/geojson
```

## Normalized Properties

Fire feature properties include:

- `category: "fire"`
- `provider`
- `brightness`
- `confidence`
- `frp`
- `satellite`
- `instrument`
- `observedAt`
- `sourceUrl`

Earthquake feature properties include:

- `category: "earthquake"`
- `provider: "USGS"`
- `magnitude`
- `place`
- `depthKm`
- `observedAt`
- `url`
- `tsunami`
- `felt`
- `alert`

Weather feature properties include:

- `category`
- `provider: "NASA EONET" | "NOAA/NWS"`
- `title`
- `type`
- `icon`
- `severity`
- `observedAt`
- `expiresAt`
- `area`
- `sourceUrl`

## Front Prompt

Use this as the implementation prompt for `gungnir-front`:

```text
Implement an Osiris-style Natural Hazards map layer set using the Gungnir backend.

Backend endpoints:
- GET /api/map-layers/layer-fire-intel/geojson
- GET /api/map-layers/layer-earthquakes/geojson
- GET /api/map-layers/layer-weather-hazards/geojson
- Optional metadata: GET /api/map-layers

All calls require the same Bearer token used by the authenticated app.

Create a Natural Hazards group in the layer panel with:
- Active Fires, color #ff6b00, fire icon, count from GeoJSON feature count.
- Earthquakes, color #ff9500, activity/seismic icon, count from GeoJSON feature count.
- Weather Hazards, color #e040fb, cloud-lightning icon, count from GeoJSON feature count.
- Optional Day/Night Cycle, color #448aff, computed client-side.

Use MapLibre GL GeoJSON sources:
- gungnir-fires
- gungnir-earthquakes
- gungnir-weather-hazards
- gungnir-day-night

Rendering:
- Fires: circle layer with orange glow, radius interpolated by zoom, popup showing provider, brightness, confidence, FRP, observedAt, and sourceUrl.
- Earthquakes: circle layer with radius/color interpolated by magnitude, labels for magnitude >= 4.5, popup showing magnitude, place, depthKm, observedAt, tsunami, felt, and USGS url.
- Weather: glow + dot + label layers, color by severity/icon, popup showing title, type, provider, area, observedAt/expiresAt, and sourceUrl.
- Day/Night: client-side polygon terminator like Osiris; update every 5 minutes.

Behavior:
- Fetch each GeoJSON endpoint only when its layer is first enabled.
- Cache results in memory and refresh every 5-15 minutes while the layer remains active.
- Keep rendering GPU-native through MapLibre sources/layers, not DOM markers.
- Preserve existing COP layers; add these as an additional Natural Hazards group.
- On feature click, use the existing app detail panel/popup style, no marketing copy.

Acceptance:
- Layers can be toggled independently.
- Counts update after data loads.
- Empty/error states do not break the map.
- Works at the shared URL style: ?lat=-36.8251&lon=0&zoom=7.20&layers=news_intel,earthquakes,fires,weather,day_night
```

## Source Notes

- USGS GeoJSON feeds are programmatic earthquake feed interfaces.
- NASA EONET v3 exposes curated, near-real-time natural event metadata and supports `status` and `category` filtering.
- NASA FIRMS publishes active fire products from MODIS, VIIRS, and Landsat in near-real-time formats, including CSV/text downloads and APIs.
- NOAA/NWS exposes active weather alerts as GeoJSON through `api.weather.gov`.
