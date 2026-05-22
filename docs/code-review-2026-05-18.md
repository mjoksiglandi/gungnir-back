# Code Review 2026-05-18

## Scope Reviewed

Focus areas reviewed from the current backend state:

- `src/modules/external-sources/*`
- `src/modules/cop/*`
- `src/modules/map-layers/*`
- `src/infrastructure/database/schema.ts`
- `drizzle/0000_init.sql`
- supporting docs and seed updates

## Findings

### P1 - DGAC sync can erase the last good layer snapshot before the replacement write succeeds

Files:

- [`src/modules/external-sources/external-sources.service.ts:89`](../src/modules/external-sources/external-sources.service.ts#L89)

Why it matters:

The DGAC flow deletes all existing `layer_features` for the source before inserting the refreshed dataset. If the insert fails after the delete, the API leaves the layer empty and also marks the source as failed. That creates an avoidable outage for consumers that would be better served by the previous successful snapshot.

Recommendation:

Wrap delete + insert + layer update in a transaction, or stage the new rows first and swap them only after the write succeeds.

### P1 - Telemetry integrity constraints were removed without a replacement strategy

Files:

- [`src/infrastructure/database/schema.ts:145`](../src/infrastructure/database/schema.ts#L145)
- [`src/infrastructure/database/schema.ts:184`](../src/infrastructure/database/schema.ts#L184)
- [`drizzle/0000_init.sql:135`](../drizzle/0000_init.sql#L135)
- [`drizzle/0000_init.sql:175`](../drizzle/0000_init.sql#L175)

Why it matters:

`telemetry_reports.id` is no longer a primary key and `track_history.telemetry_id` no longer references it. That removes uniqueness and referential integrity for telemetry records, but the application still treats telemetry IDs as durable identifiers in API responses and history rows. If this change was needed for TimescaleDB compatibility, it still needs a replacement design such as a composite key, hypertable-safe uniqueness, or an explicit surrogate key plus indexed query path.

Recommendation:

Document the intended Timescale constraint model and add a replacement uniqueness/integrity strategy before relying on this schema in production.

### P2 - `sync-all` is fail-fast, so one bad source aborts the batch and skips the remaining enabled sources

Files:

- [`src/modules/external-sources/external-sources.service.ts:25`](../src/modules/external-sources/external-sources.service.ts#L25)

Why it matters:

`syncAll()` awaits each source sequentially and rethrows as soon as one source fails. In practice that means operators get a 500 even if some sources already succeeded, and later sources are never attempted. For external integrations this usually creates noisy operations and unnecessary stale layers.

Recommendation:

Return a per-source result set with `success` and `error` fields, keep syncing the rest of the enabled sources, and reserve a full request failure for cases where the batch itself could not run.

### P3 - The compatibility COP payload can emit `[object Object]` as the mission label

Files:

- [`src/modules/cop/cop.service.ts:70`](../src/modules/cop/cop.service.ts#L70)

Why it matters:

`String(asset.metadata?.role ?? 'Operational tasking')` will stringify non-string metadata values using the default object formatter. If `role` is stored as an object or array, the frontend receives a degraded label instead of a meaningful mission description.

Recommendation:

Narrow `role` to a string before returning it, and fall back cleanly when it is not a string.

## Validation Notes

- `npm run typecheck`: passes
- `npm test`: passes
- `npm run lint`: fails

Lint currently reports repository-wide issues, including some in the reviewed paths:

- unsafe `any` projections in GeoJSON mapping code
- `String(...)` coercion warnings in `cop.service.ts` and `external-sources.service.ts`

## Overall Assessment

The backend is moving in a good direction for frontend compatibility and DGAC ingestion, but the current state is not fully production-ready. The biggest concern is data safety during external sync plus the telemetry schema constraint change, which both deserve follow-up before treating this as a stable operational baseline.
