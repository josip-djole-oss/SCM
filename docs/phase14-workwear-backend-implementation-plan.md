# Phase 14 Plan — Workwear Backend Persistence Implementation

## Goal
Implement backend persistence for Workwear with minimal risk, preserving current standalone behavior as fallback.

## Scope
- Add dedicated Workwear backend API.
- Persist Workwear site-scoped state in Postgres JSONB.
- Add migration path from `cmax_workwear_data_<site>`.
- Add optimistic versioning with `409` conflict handling.
- Add server-side audit log stream.
- Add rollback + deploy safety strategy (Railway).

## 1) API Endpoints

### Read
- `GET /api/workwear?site=<site>`
  - Auth required.
  - Validates site access.
  - Response:
    - `workwear` (JSON object)
    - `version` (number)
    - `updatedAt`

### Save snapshot
- `POST /api/workwear`
  - Body:
    - `site`
    - `workwear` (full snapshot)
    - `lastKnownVersion`
    - `userEmail`
  - Server:
    - validates site scope
    - validates payload shape
    - compares version
  - Responses:
    - `200`: `{ ok: true, version }`
    - `409`: `{ ok: false, error: "VERSION_CONFLICT", latest, version }`

### Migration ingest
- `POST /api/workwear/migrate`
  - Body:
    - `site`
    - `workwear`
    - `source: "localStorage"`
  - Behavior:
    - allowed once per site unless `force=true` by superadmin
    - creates initial state with `version=1`

### Audit fetch
- `GET /api/workwear/audit?site=<site>&limit=...&cursor=...`
  - Returns paginated audit entries.

### Optional operational endpoints (phase 14.2 if needed)
- `POST /api/workwear/export`
- `POST /api/workwear/import`

## 2) Postgres JSONB Structure

## Primary table: `workwear_state`
- `site TEXT PRIMARY KEY`
- `version BIGINT NOT NULL DEFAULT 1`
- `data JSONB NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_by TEXT`

## Audit table: `workwear_audit_log`
- `id BIGSERIAL PRIMARY KEY`
- `site TEXT NOT NULL`
- `event_type TEXT NOT NULL`
- `actor_email TEXT`
- `actor_name TEXT`
- `entity_type TEXT`
- `entity_id TEXT`
- `before_data JSONB`
- `after_data JSONB`
- `metadata JSONB`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

## Suggested indexes
- `CREATE INDEX idx_workwear_audit_site_created ON workwear_audit_log(site, created_at DESC);`
- `CREATE INDEX idx_workwear_audit_site_event ON workwear_audit_log(site, event_type);`

## 3) Migration from `cmax_workwear_data_<site>`

## Client migration trigger
1. App opens Workwear.
2. Calls `GET /api/workwear?site=...`.
3. If server has no state but local has state:
   - prompt user with migrate CTA (admin/purchaser/superadmin only)
   - send local snapshot to `/api/workwear/migrate`.

## Safety guards
- Migration only for currently selected site.
- Server force-sets site context from request.
- Server rejects nested records with foreign site values.
- Store migration marker:
  - server-side flag in state metadata (`meta.migratedFromLocal=true`)
  - local marker `workwear_migrated_<site>=true`.

## 4) Version / 409 Conflict Flow

## Write flow
1. Client sends `lastKnownVersion`.
2. Server compares with row version.
3. If equal:
   - write snapshot
   - increment version atomically.
4. If mismatch:
   - return `409` + latest snapshot + current version.

## Client conflict handling
- Show non-destructive conflict banner.
- Offer:
  - refresh latest server state
  - re-apply local pending changes
  - retry save
- Keep standalone local data untouched until explicit merge/apply.

## 5) Audit Log Strategy

## Server-side canonical audit events
- `workwear_state_migrated`
- `workwear_state_saved`
- `workwear_order_status_changed`
- `workwear_credit_reserved`
- `workwear_credit_released`
- `workwear_credit_adjusted`
- `workwear_product_changed`
- `workwear_settings_changed`
- `workwear_conflict_detected`

## Rules
- Audit written on every successful server mutation.
- Include before/after JSONB diffs when feasible.
- Do not store secrets or unnecessary PII fields.

## 6) Rollback Plan

## Feature flag
- Add backend flag: `WORKWEAR_BACKEND_PERSISTENCE_ENABLED`.
- If `false`: app continues using local standalone mode only.

## Rollback procedure
1. Disable feature flag.
2. Keep API endpoints serving read-only or disabled responses.
3. Client falls back to local mode automatically.
4. Preserve DB data (no destructive rollback).
5. Re-enable after fix and replay migration if needed.

## Data integrity rollback guard
- Never delete local snapshot during migration.
- Keep last successful server snapshot hash in metadata.

## 7) Test Plan

## Unit/contract
- API schema validation tests.
- Version conflict tests (`200` then `409` path).
- Site access authorization tests.
- Audit write tests.

## Integration
- Migration tests:
  - empty server + local present -> migrate success
  - already migrated -> no duplicate overwrite
- Save/read roundtrip with JSONB payload.
- Conflict recovery flow.

## Site isolation
- Assert site A write cannot be read on site B.
- Assert import/migrate cannot cross-write other site.

## Regression
- Run existing SCM suites:
  - inline cleanup
  - site isolation
  - phase8/9/10/11
  - workwear phase12/13 smoke tests.

## 8) Deploy / Railway Risks

## Risks
- Postgres migration lock timing.
- Environment mismatch (`DATABASE_URL`, SSL).
- Cold start and request timeout for large JSON snapshots.
- Concurrent writes increasing 409 frequency.
- Storage growth in audit table.

## Mitigation
- Use additive migrations only (no destructive alters).
- Apply DB migration before enabling feature flag.
- Add payload size guard + compression if needed.
- Add audit retention policy (e.g., 180/365 days or archive).
- Add endpoint health checks and structured logs.
- Canary rollout by enabling feature for one site first.

## 9) Execution Order (Implementation Sequence)
1. Add DB migration (`workwear_state`, `workwear_audit_log`, indexes).
2. Add backend storage adapter methods.
3. Add `/api/workwear` read/save endpoints with version checks.
4. Add `/api/workwear/migrate`.
5. Add audit write path.
6. Wire client API adapter with feature flag + fallback.
7. Add conflict UI handling for `409`.
8. Add migration UX.
9. Run full test gate.
10. Canary deploy on Railway, then full enable.

