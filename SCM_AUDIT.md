# SCM engineering audit

Audit and remediation completed locally on 2026-09-21. Production data was not connected, changed or deleted. Validation used isolated temporary data directories, upload directories, browser profiles and test accounts.

## 2026-09-22 mutation/conflict/retry reliability continuation

The exhaustive user-action audit is recorded in [SCM_MUTATION_RELIABILITY.md](SCM_MUTATION_RELIABILITY.md). It supersedes earlier assumptions that a successful functional suite alone proved safe retry behavior.

Confirmed root causes were stale client module versions after a committed response was lost, optimistic Warehouse arithmetic before acknowledgement, transient Warehouse form fields being saved as whole-module mutations, historical failure flags poisoning unrelated flushes, reconnect turning a pending-save error into the global retry screen, and missing browser-instance identity on realtime events.

Implemented fixes include atomic operation receipts for state/module, Warehouse movements, Store orders, full-state saves and survey creation; server-authoritative Warehouse arithmetic; idempotent same-value entity retries; equivalent-snapshot retries for Reports and Notifications; operation IDs for Chat, Toolroom and uploads; self-event filtering; and local handling of expected save failures.

Local evidence is `PASS` for both reported regressions and the expanded mutation matrix. New Railway evidence remains `NOT VERIFIED` until the updated commit is deployed and exercised with dedicated production-safe records. Railway must remain at one replica.

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

`npm run check` passed: production asset build, 47 Node tests and `npm audit` with 0 vulnerabilities. The Node suites cover frontend context synchronization and persistence, atomic storage, Unicode project-key collisions, upload authorization/restart behavior, dependency pinning, module configuration, API guards, Super Admin separation, password persistence and session revocation.

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

The original local audit could not prove Railway volume retention, managed PostgreSQL behavior or live restart behavior. The production results below now cover normal deployment and restart paths. Forced database failover, live restore and multiple application replicas remain outside the validated boundary. The current SSE subscriber list and default session store are process-local, so production must remain on one application replica until shared session and event infrastructure is introduced.

## Railway production validation — 2026-09-21

Validation was executed against Railway project `hospitable-wisdom`, environment `production`, service `SCM`, at `https://scm-production-f9fc.up.railway.app`. Records were confined to projects and accounts prefixed `SCM-VALIDATION`. Existing production records were not edited or deleted.

| Production item | Status | Executed evidence |
| --- | --- | --- |
| Build and startup | **PASS** | The audited release and final validation commit `eadee5b` built with `npm ci && npm run build`, started with `npm start`, passed Railway health checks, and reached `SUCCESS`. Build reported 71 checked JavaScript files, six copied browser assets and zero npm vulnerabilities. |
| Variables and replica count | **PASS** | The final runtime configuration check passed with no errors or warnings for production/PostgreSQL, HTTPS CORS, session and request limits, bcrypt cost, and upload limits. Bootstrap variables were removed after the existing Super Admin was confirmed; a fresh deployment and login then passed. Exactly one SCM replica was running in `europe-west4-drams3a`; it was not increased. |
| PostgreSQL and migrations | **PASS** | PostgreSQL 18.6 accepted two fresh read-only connections from the SCM container. It was primary, all ten required tables existed, schema privileges were valid, and repeated application starts completed storage initialization on attempt 1 without losing existing records. |
| Persistent upload volume | **PASS** | `scm-volume` is a ready 5 GB Railway volume mounted at `/data`. Runtime logs confirmed `/data/data` and `/data/uploads`. |
| Health check | **PASS** | Railway uses `/api/health` with a 120 second window. It returned 503 while storage initialized, then 200 with `ok`, `storageReady` and database connectivity true. Internal error text is excluded from the response. |
| Login and session | **PASS** | Super Admin and dedicated users logged in through the production API and UI. Cookie-only browser restart retained the active session. UI logout returned 200 and revoked the server session; UI re-login succeeded. Application restart invalidated process-local sessions as designed, after which fresh login restored authoritative state. |
| Project switching and stale-data protection | **PASS** | Headless Chrome switched between dedicated A/B projects and rendered authoritative state. Injected stale local data was rejected after reload, browser-context restart, and explicit logout/login; the previously saved marker remained present. |
| Project module ON/OFF protection | **PASS** | Store was ON for A and OFF for B. B hid and blocked the frontend view, direct `/store` did not open Store, and `/api/store/orders?site=B` returned `403 MODULE_DISABLED`. Cross-project and missing-permission API requests also returned 403. |
| Realtime module changes | **PASS** | An API SSE subscriber and a second isolated authenticated Chrome session received `project-modules-changed`. Disabling Store while open redirected the second session away; re-enabling restored access. |
| Planner / Tidplan / Sompturnor / Warehouse | **PASS** | Dedicated markers were saved through their production APIs, confirmed in authoritative state, reloaded, and remained present after the Railway restart and fresh login. |
| Store | **PASS** | A dedicated catalog item and server-priced order were created for A, read by the authorized user, reloaded, and remained present after restart. B remained protected while Store was disabled. |
| Chat | **PASS** | A dedicated message was accepted, returned by the authoritative chat API, and remained present after restart. |
| Reports and Notifications | **PASS** | Versioned dedicated records were created, reloaded from their independent PostgreSQL documents, and remained present after restart. |
| Permission matrix / Super Admin | **PASS** | Only the explicit Super Admin could change project modules and create test accounts. A site-limited user was denied project A, a permission-limited user was denied Reports, and a non-Super Admin was denied module configuration. |
| Upload/download authorization and persistence | **PASS** | A 68-byte text file completed the full chain: server accepted it; `/data/uploads/...` contained the file; hashed metadata existed under `/data/uploads/.metadata`; uploader and authorized second session retrieved identical bytes; site-unauthorized user received 403; anonymous access received 401; after Railway restart the metadata, bytes and authorization results were unchanged. |
| Backup procedure | **PASS** | Authenticated Super Admin creation produced PostgreSQL backup ID `301`; listing succeeded and restore dry-run returned a short-lived token and module diff. |
| Restore execution | **NOT VERIFIED / BLOCKED** | An actual restore was intentionally not executed against the only production environment because it would replace real production state. No isolated Railway staging environment was available. Local restore/integrity regression tests pass. |
| PostgreSQL reconnect | **PASS** | Fresh connections, multiple application restarts, health transitions, and post-restart state reads all succeeded. |
| PostgreSQL forced outage/failover | **NOT VERIFIED / BLOCKED** | Deliberately disconnecting or restarting the only production PostgreSQL service could affect real users and data; there was no staging database on which to inject this failure. Local unavailable-database tests prove 503 health and retry behavior. |
| Application restart | **PASS** | The only SCM replica was restarted through Railway. Health recovered after storage initialization; PostgreSQL module data, reports, notifications, chat, Store order, upload metadata and upload bytes remained available. Old process-local sessions were invalid and re-login succeeded. |

Railway logs were inspected after the frontend/API run and after restart. No unexplained application 5xx was found. The observed 503 entries occurred only during controlled restart/storage initialization. Expected authorization denials were functionally correct; their stack traces exposed noisy error-level logging, which was corrected so handled 4xx responses no longer obscure real server errors.

## Remaining production boundary

The live validation establishes the current single-replica architecture. Sessions and SSE subscribers remain process-local, so SCM must stay at one replica until both use shared infrastructure. Production restore and destructive PostgreSQL failure injection remain blocked until an isolated Railway staging environment is provisioned.
