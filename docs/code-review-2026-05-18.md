# Revision de Codigo 2026-05-18

## Alcance Revisado

Las areas revisadas sobre el estado actual del backend fueron:

- `src/modules/external-sources/*`
- `src/modules/cop/*`
- `src/modules/map-layers/*`
- `src/infrastructure/database/schema.ts`
- `drizzle/0000_init.sql`
- documentacion de apoyo y cambios en seeds

## Hallazgos

### P1 - La sincronizacion DGAC puede borrar la ultima capa valida antes de que la escritura de reemplazo termine con exito

Archivos:

- [`src/modules/external-sources/external-sources.service.ts:89`](../src/modules/external-sources/external-sources.service.ts#L89)

Por que importa:

El flujo DGAC elimina todas las `layer_features` existentes de la fuente antes de insertar el dataset refrescado. Si la insercion falla despues del delete, la API deja la capa vacia y ademas marca la fuente como fallida. Eso genera una interrupcion evitable para los consumidores, que estarian mejor servidos con el ultimo snapshot exitoso.

Recomendacion:

Encapsular delete + insert + update de capa en una transaccion, o bien staging de las filas nuevas y swap solo cuando la escritura termine correctamente.

### P1 - Se removieron restricciones de integridad de telemetria sin una estrategia de reemplazo

Archivos:

- [`src/infrastructure/database/schema.ts:145`](../src/infrastructure/database/schema.ts#L145)
- [`src/infrastructure/database/schema.ts:184`](../src/infrastructure/database/schema.ts#L184)
- [`drizzle/0000_init.sql:135`](../drizzle/0000_init.sql#L135)
- [`drizzle/0000_init.sql:175`](../drizzle/0000_init.sql#L175)

Por que importa:

`telemetry_reports.id` ya no es primary key y `track_history.telemetry_id` ya no lo referencia. Eso elimina unicidad e integridad referencial para los registros de telemetria, pero la aplicacion sigue tratando los IDs de telemetria como identificadores durables en respuestas API y filas historicas. Si este cambio fue necesario por compatibilidad con TimescaleDB, igual necesita un diseno de reemplazo, por ejemplo una clave compuesta, unicidad compatible con hypertables, o una surrogate key explicita con un camino de consulta indexado.

Recomendacion:

Documentar el modelo de restricciones esperado para Timescale y agregar una estrategia de unicidad/integridad de reemplazo antes de depender de este schema en produccion.

### P2 - `sync-all` falla en modo fail-fast, por lo que una fuente mala aborta el lote y omite las fuentes habilitadas restantes

Archivos:

- [`src/modules/external-sources/external-sources.service.ts:25`](../src/modules/external-sources/external-sources.service.ts#L25)

Por que importa:

`syncAll()` espera cada fuente en secuencia y relanza el error apenas una falla. En la practica eso significa que operaciones recibe un 500 incluso si algunas fuentes ya sincronizaron bien, y las fuentes posteriores ni siquiera se intentan. Para integraciones externas esto suele generar ruido operacional y capas innecesariamente stale.

Recomendacion:

Devolver un resultado por fuente con campos `success` y `error`, seguir sincronizando el resto de las habilitadas y reservar un fallo total solo para casos donde el lote completo no pudo ejecutarse.

### P3 - El payload COP de compatibilidad puede emitir `[object Object]` como etiqueta de mision

Archivos:

- [`src/modules/cop/cop.service.ts:70`](../src/modules/cop/cop.service.ts#L70)

Por que importa:

`String(asset.metadata?.role ?? 'Operational tasking')` convierte valores no string usando el formatter por defecto de objetos. Si `role` se guarda como objeto o array, el frontend recibe una etiqueta degradada en vez de una descripcion de mision util.

Recomendacion:

Acotar `role` a string antes de devolverlo y aplicar un fallback limpio cuando no lo sea.

## Notas de Validacion

- `pnpm run typecheck`: pasa
- `pnpm test`: pasa
- `pnpm run lint`: falla

Hoy `lint` reporta problemas de alcance repositorio, incluyendo algunos en las rutas revisadas:

- proyecciones `any` inseguras en el mapeo GeoJSON
- advertencias por coercion `String(...)` en `cop.service.ts` y `external-sources.service.ts`

## Evaluacion General

El backend va en buena direccion para compatibilidad con frontend e ingestion DGAC, pero el estado actual todavia no es completamente production-ready. La preocupacion mas importante es la seguridad de datos durante la sincronizacion externa, junto con el cambio de restricciones del schema de telemetria; ambos merecen seguimiento antes de tratar esta base como una linea operacional estable.
