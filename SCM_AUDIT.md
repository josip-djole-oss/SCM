# SCM engineering audit

Audit and remediation completed locally on 2026-09-21. Production data was not connected, changed or deleted. Validation used isolated temporary data directories, upload directories, browser profiles and test accounts.

## System inventory

SCM is an Express server with an ordered-script browser application. Authentication uses server sessions, HttpOnly cookies and CSRF protection. `server/storage/index.js` provides versioned JSON and PostgreSQL document backends. Browser storage is now treated as a cache and preferences layer; it does not authorize access or establish that a server mutation succeeded.

Feature modules are Planner, Sompturnor (`bins`), Tidplan, Store (`workwear`), Chat, Warehouse, Toolroom, Reports, Notifications and Surveys. The stable mapping between IDs, routes, views, permission keys and state keys is defined in `public/js/core/moduleRegistry.js`.

## Findings and completed remediation

| ID | Severity | Finding | Resolution and evidence |
| --- | --- | --- | --- |
| SCM-001 | Critical | Project modules were hidden inconsistently and their APIs remained reachable. | Added authoritative per-project module configuration, Super Admin versioned management API, frontend navigation/action guards, backend route and aggregate-state guards, realtime invalidation and polling recovery. Integration tests prove isolation, direct API denial and data preservation across disable/enable and restart. |
| SCM-002 | High | A project switch could paint cached data and accept a late response/save from the previous context. | Added synchronization gating, request generations, immutable queued-save context and stale-response rejection. Browser test observes zero stale-data flashes while switching projects. |
| SCM-003 | Critical | Selecting numeric Level 6 could implicitly grant Super Admin. | Numeric level and explicit Super Admin status are separate. Only a true Super Admin can grant or revoke that role. HTTP tests cover Level 6 demotion and session refresh. |
| SCM-004 | High | Permission-change detection depended on JSON key order and cached login state. | Effective permissions are canonicalized and compared against the active server session. Login and reconnect no longer create false notifications. |
| SCM-005 | Critical | JSON writes truncated files in place and lock cleanup could produce rejected lock tails. | Added temporary-file write, fsync and atomic replace with serialized, rejection-safe mutation queues. Concurrency and injected-failure tests preserve valid JSON and versions. |
| SCM-006 | Critical | Upload files could use ephemeral storage; authorization and path validation were incomplete. | Added persistent path resolution/fail-fast Railway checks, persisted metadata, site/module authorization, MIME limits, traversal rejection and restart tests. |
| SCM-007 | High | Notification upload failures could become successful empty URLs. | Upload errors now reject the operation. Multi-project sends retain failed targets and carry exact project/module context. |
| SCM-008 | High | Store, warehouse and Sompturnor mutations could report success before the server acknowledged them. | Critical writes flush queued state and display success only after acknowledgement. Failed drafts remain available for retry. Store order creation and status changes are server-authoritative. |
| SCM-009 | High | Report and notification writes updated browser cache before the backend and could swallow conflicts. | Cache updates follow successful versioned writes. Backend enforces create/edit/delete permissions and module access. |
| SCM-010 | High | Password change relied on cached plaintext credentials. | Added authenticated bcrypt password change, minimum-strength validation and revocation of other sessions. Generated temporary passwords are not exposed by state reads. |
| SCM-011 | High | Store and survey network failures silently returned stale cached business state. | Load failures now reject, preserve the visible synchronization state and respect the current request generation. |
| SCM-012 | Medium | The global error UI inserted exception text into HTML and replaced the application DOM. | Replaced it with a recoverable text-only error surface. |
| SCM-013 | High | Project names containing spaces could be sanitized twice and map to an invalid report/notification path. | Storage path construction now performs one collision-safe mapping from the original project key. Module-scoped API tests cover the corrected path. |
| SCM-014 | High | Browser PDF/XLSX dependencies loaded from third-party CDNs at runtime. | Pinned dependencies are copied from `node_modules` into `public/vendor` by `npm run build`; the page loads local assets only. |

## Verification record

`npm run check` passed: production asset build, 43 Node tests and `npm audit` with 0 vulnerabilities. The Node suites cover frontend context synchronization and persistence, atomic storage, Unicode project-key collisions, upload authorization/restart behavior, dependency pinning, module configuration, API guards, Super Admin separation, password persistence and session revocation.

`npm run test:browser` passed against a temporary live server and headless Chrome. It verified project A/B switching with no stale flash, disabled Store API returning 403, live module revocation redirecting the open view, disabled routes remaining closed, session reload and reconnect without false permission notifications.

Additional regression suites passed:

- release stability checklist, including backup/restore identity, conflict handling and Planner/Tidplan import-export paths;
- module-scoped saves and site-chat authorization;
- permission matrix, admin-role functions and Admin Panel flows;
- Store module, checkout, categories, bulk processing and 38 server API checks;
- Tidplan fullscreen/Gantt behavior;
- Warehouse delegated bindings and mutation flows, with zero inline event handlers;
- notification/account separation.

`git diff --check` reports no whitespace errors. CRLF conversion notices are repository working-tree notices and do not represent content failures.

## Data compatibility

No destructive migration was added. Existing projects default to enabled modules unless an explicit legacy setting exists. Disabling a module changes access only; its stored data remains intact. Existing JSON documents, backups and upload files are preserved. JSON and PostgreSQL continue to store the same versioned document model.

## Production boundaries

Local verification cannot prove Railway volume retention across a real redeploy, managed PostgreSQL failover, backup restoration from production data, or behavior under multiple application replicas. The current SSE subscriber list and default session store are process-local, so production should run one application replica until shared session and event infrastructure is introduced. Deployment variables, persistent-volume requirements, health checks and rollback steps are documented in `RAILWAY_DEPLOYMENT.md`.

## Railway production validation — in progress

Validation started 2026-09-21 against Railway project `hospitable-wisdom`, environment `production`, service `SCM`.

- **PASS:** the service has exactly one running replica.
- **PASS:** production uses PostgreSQL; two read-only connections succeeded from inside the SCM container. PostgreSQL 18.6 is primary, all ten expected tables exist and the runtime role has schema usage/create rights.
- **PASS:** a production backup was created through the authenticated Super Admin API before infrastructure changes. No restore was run against production.
- **PASS:** a dedicated 5 GB `scm-volume` is attached to SCM at `/data`.
- **REMEDIATION PENDING DEPLOY:** the previously deployed commit wrote uploads to ephemeral `/app/uploads` and had no Railway health-check path. The pending release uses `/data/uploads` and returns HTTP 503 until storage is ready.
- **NOT VERIFIED:** upload persistence through restart and the application feature matrix remain pending until the audited release is deployed.

Production results are not inferred from local tests. The final status table will record each executed Railway check and any blocked item after deployment.

## Owner decisions

No code-level decision is blocked. Before production release, the owner must choose and provision the Railway persistent volume/database described in `RAILWAY_DEPLOYMENT.md`, then perform the documented staging backup/restore and restart checks.
