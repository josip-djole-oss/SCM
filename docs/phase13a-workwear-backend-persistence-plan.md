# Phase 13A — Workwear Data Safety / Backend Persistence Plan

## Scope
Move Workwear data from site-scoped localStorage (`cmax_workwear_data_<site>`) to durable backend persistence with safe fallback and no break to current standalone behavior.

## Data To Persist Server-Side
- `settings`
- `products`
- `orders`
- `workerProfiles`
- `creditLedger`
- `supplierConnections`
- `supplierSyncLog`
- `auditLog` (new recommended field)
- `version` (optimistic concurrency token)

## API Strategy
Recommended: **separate Workwear endpoints**, not direct extension of generic `/api/state`.

Reason:
- lower blast radius for existing sync/version flow
- easier per-module RBAC and auditing
- clearer migration and rollback path
- can still keep `/api/state` as compatibility fallback

Proposed endpoints:
- `GET /api/workwear?site=<site>`
- `POST /api/workwear` (full snapshot save with `lastKnownVersion`)
- `POST /api/workwear/migrate` (optional one-shot local-to-server migration)
- `POST /api/workwear/export` and `POST /api/workwear/import` (optional future)

## Site Isolation
- Every request must include `site`.
- Server must validate user access to `site` from session/admin site scope.
- Storage key/table row must include `site` as required partition key.
- Never read/write without explicit site.

## Prevent Cross-Site Data Leakage
- Enforce `(site, ...)` composite keys server-side.
- Reject payloads that contain mismatched `site` in nested records.
- Sanitize imported payloads by force-setting `site` to request site.
- Add test assertions for Site A/B isolation on read and write.

## Optimistic Versioning
- Keep `version` integer in Workwear record.
- Client sends `lastKnownVersion`.
- Server returns `409` with latest snapshot/version on mismatch.
- Client resolves by:
  1. refresh latest
  2. merge non-conflicting local edits
  3. retry save

## Audit Logging
Add module-local audit stream with normalized events:
- `order_created`
- `order_status_changed`
- `order_rejected`
- `order_cancelled`
- `credit_reserved`
- `credit_released`
- `credit_adjusted`
- `settings_changed`
- `product_created/updated/deactivated`

Each audit item:
- `id`, `site`, `timestamp`, `actor`, `actorName`, `eventType`, `entityId`, `entityType`, `before`, `after`, `metadata`

## Migration Plan (local -> server)
1. On first module load, call `GET /api/workwear?site=...`.
2. If server empty and local exists:
   - show “Migrate Workwear data?” prompt
   - upload local snapshot with `migrationSource=localStorage`
3. Mark migration flag per site (`workwear_migrated_<site>`).
4. Keep local fallback for offline mode.

## Server Unavailable Fallback
- Continue local standalone mode:
  - read/write local `cmax_workwear_data_<site>`
  - queue background sync retry
- show non-blocking warning badge “Local mode / server unavailable”.

## Postgres Model Recommendation
Lowest-risk first step: **single JSONB table per site**, then normalize later.

### Option A (lowest risk)
`workwear_state`
- `site TEXT PRIMARY KEY`
- `version BIGINT NOT NULL`
- `data JSONB NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- `updated_by TEXT`

Pros: fastest, minimal migration complexity, mirrors current client shape.

### Option B (future normalization)
- `workwear_products`
- `workwear_orders`
- `workwear_order_items`
- `workwear_worker_profiles`
- `workwear_credit_ledger`
- `workwear_audit_log`
- `workwear_supplier_connections`
- `workwear_supplier_sync_log`

Use Option A now; normalize later if reporting/perf requires.

## Least-Risk Implementation Path
1. Add backend `workwear_state` storage + version checks.
2. Add read/write API with strict site checks.
3. Keep local fallback path fully active.
4. Add migration prompt + one-click migration.
5. Add conflict UI handling (`409`) reusing existing conflict patterns.
6. Add audit persistence.
7. Add smoke tests for isolation/version/fallback.

## Exact Implementation Order
1. Backend storage contract + API routes (read/write).
2. Client API adapter in `workwearApi.js` with fallback to local.
3. Version token wiring and conflict handling.
4. Migration flow local -> server.
5. Audit log persistence and visibility.
6. Hardening tests: site isolation, version conflict, fallback mode.
