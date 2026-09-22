# SCM mutation, conflict, retry, and user-action reliability audit

Audit date: 2026-09-22

## Scope and evidence rule

This document inventories every HTTP mutation surface registered by the SCM server and the browser code that invokes it. `PASS` means the stated behavior was executed. `CODE REVIEWED` means the complete handler path was inspected but the scenario was not executed in Railway. Railway results are recorded separately after deployment; local results are never presented as Railway results.

## Confirmed production failure mechanisms

The reported symptoms came from a chain of independent defects:

1. A module save could commit on the server while its response was lost. The browser retained the old module version. A retry then sent the old `baseVersion`, and the server returned `MODULE_VERSION_CONFLICT` even though no second user had edited the data.
2. Warehouse stock handlers applied arithmetic to `warehouseData` before server acknowledgement. A failed or unknown response left the locally incremented value in place. Clicking Save again applied the arithmetic a second time, so `+10` could become `+20`.
3. Warehouse issue and stock forms persisted every transient field change as a whole-module snapshot. This created unnecessary version changes and enlarged the race window around the actual stock operation.
4. `flushPendingModuleSaves()` considered every historical module failure, including unrelated old failures. One transient failure could therefore make a later successful save appear failed.
5. Reconnect synchronization hid the main application before pending writes were confirmed. A normal save failure then opened the global “Pokusaj ponovo” state, making a request failure appear to be an application crash.
6. Realtime events did not identify the originating browser instance. The originating browser could interpret its own successful mutation as an external update while it had later local edits.

## Implemented reliability model

- Every browser tab has a stable session-scoped client instance ID. Mutation requests carry it, realtime events echo it, and the originating tab ignores its own event.
- Whole-module and full-state saves retain an operation ID across an unknown outcome. The operation receipt is stored atomically in the same authoritative state transaction as the mutation. Retrying the same operation returns the recorded authoritative version instead of comparing the stale base version again.
- Warehouse stock changes use `/api/warehouse/:siteId/movements`. The server applies the delta to current authoritative stock, writes the stock/log/operation receipt in one transaction, and returns the complete authoritative Warehouse result. The browser performs no optimistic stock arithmetic.
- Store order creation stores its operation receipt, created order ID, budget reservation, and order in the same state transaction.
- Planner and Tidplan entity patches treat a stale retry with the already committed field value as an idempotent acknowledgement. A different stale value still produces a real field conflict.
- Reports and Notifications accept a stale retry only when the submitted collection is byte-equivalent in canonical form to the already committed collection. Different stale data still conflicts.
- Chat uses its existing client message ID as a server-enforced idempotency key.
- Toolroom assignment, return, and transfer store the last operation ID on the item. Fault and service creation derive stable entity IDs from the operation ID. Duplicate notifications and history writes are skipped on retries.
- Survey creation retains an operation ID; the state transaction stores the created survey receipt. A duplicate multipart file created during a retry is deleted.
- General uploads persist an operation ID in file metadata. A retry returns the first persistent file; reuse with different file metadata returns 409. The check is serialized per operation ID.
- Project-module configuration retries succeed without another version increment when the requested configuration already equals the current configuration.
- Pending mutation errors remain local to their form/module. The global load-error screen is reserved for an actual authoritative data-load failure.

Operation receipts are bounded to 500 entries per namespace and 30 days. A reused operation ID with different content returns `IDEMPOTENCY_KEY_REUSED`.

## Backend mutation inventory

| Surface | Endpoints | Duplicate/concurrency behavior | Audit result |
|---|---|---|---|
| Account/auth | `POST /account/password`, login/logout outside authenticated mutation router | Password change is a desired-state write and revokes other sessions. Repeating with the old password fails without a second state mutation. | PASS local: password/session restart suite |
| Project modules | `PUT /projects/:site/modules` | Versioned desired state; an already-committed retry returns the current configuration, while different stale state conflicts. | PASS local |
| Chat | upload, message create/edit/delete, reactions, pin/unpin, read | Message create deduplicates by author + `clientId`; reactions/read/pin are desired-state operations; edit/delete target stable IDs. | PASS local chat suite and lost-response regression |
| Store | order create, order status, password confirmation, link preview | Create is transactionally idempotent with budget/order receipt. Status changes are desired-state transitions; same status does not repeat budget/ledger effects. | PASS local order retry and permission matrix |
| Scoped state | `POST /state/module` | Optimistic module version plus atomic operation receipt. Same-operation retry returns the first module version; different stale edit conflicts. | PASS local one-user retry regression |
| Entity state | Planner row PATCH, Tidplan activity PATCH | Per-field versions. Same-value stale retry is acknowledged without another entity version increment; different stale value returns a real conflict payload. | PASS local Planner regression; Tidplan uses the same merge function |
| Full state | `POST /state` | Versioned merge plus atomic operation receipt. Used for site/admin metadata paths still on the legacy aggregate writer. | PASS local existing state/version/isolation suites; unknown-outcome path covered by shared receipt implementation |
| Admin desired state | readonly toggle/sites and admin payloads | Explicit target values or scoped state receipt; permission and hierarchy checks run server-side. | PASS local permission/admin/session suites |
| Presence | `POST /presence` | Upsert/delete by stable session ID; naturally idempotent. | CODE REVIEWED |
| Files | `POST /upload` and module multipart uploads | Persistent metadata operation ID, serialized lookup, same-file replay returns first file, mismatched replay is rejected. Temporary rejected imports are cleaned. | PASS local multipart, interrupted upload, restart, authorization, and retry regression |
| Reports | `POST /reports` | Versioned collection; equal committed replay succeeds, different stale collection conflicts. | PASS local regression |
| Notifications | `POST /notifications` | Same model as Reports. Multi-site client keeps only failed targets selected. | PASS local regression and persistence tests |
| Surveys | create, vote, delete, pin | Create uses an atomic receipt; vote is one vote per user and change is explicit; delete/pin are stable-ID desired state. | CODE REVIEWED; existing module tests PASS locally |
| Logs | create, clear | Client activity append may duplicate diagnostic entries after an unknown outcome; it does not mutate business state. Clear is desired state. | CODE REVIEWED; noncritical duplicate audit logging accepted |
| Project Warehouse | `POST /warehouse/:siteId/movements`, scoped catalog/settings save | Movement is server-authoritative and transactionally idempotent. Catalog/settings remain versioned desired-state snapshots. | PASS local `+10` lost-response and mismatch regressions |
| Legacy/global Warehouse | item upsert/delete, admin assignment, clear logs | Item create/update is an upsert by required stable item ID; assignment is explicit desired state; delete/clear are stable-target desired state. | CODE REVIEWED |
| Toolroom | assignment, return, transfer, faults, fault status, service, replacement, bulk/items/categories/presets/archive | High-impact movement/create paths carry operation IDs and return their first result on replay. Entity/category/preset writes use stable IDs and entity versions. State transitions validate current status. | PASS local assignment retry; permission and module guards PASS locally |
| Imports | Warehouse/Tidplan/Planner imports | Validated replacement/upsert flows; temporary files are removed on rejection. Repeating the same import may advance a document version but does not apply arithmetic twice. | PASS local import/export and cleanup suites |
| Backup | create, restore dry-run, restore | Restore is an explicit full snapshot replacement; repeated restore converges to the same snapshot. Backup create can create another backup but does not alter business data. | PASS local backup/restore smoke suite |

## Frontend mutation invocation inventory

| Area | Main callers | Controls in place |
|---|---|---|
| Core state/conflicts | `core/dataSync.js`, `core/conflicts.js`, `core/sync.js`, `core/apiClient.js` | Operation retention, authoritative versions, self-event filtering, project/user context guards, local save errors |
| Warehouse | `warehouse/warehouse.js` | Server-authoritative movement, pending-operation reuse, both Save buttons disabled while pending, authoritative response replaces cache |
| Store | `workwear/workwearApi.js`, `workwear/workwearEvents.js` | Checkout busy state and retained order operation ID; server-priced authoritative response |
| Planner/Tidplan/Sompturnor | `core/dataSync.js`, Planner and Tidplan event/render modules, `bins/bins.js` | Field/module versions, same-value replay, scoped snapshots, dirty-state preservation |
| Chat | `siteChat/siteChatApi.js`, `siteChat/siteChatEvents.js` | Optimistic local message keyed by `clientId`; failed draft retains the same ID for retry; server deduplication |
| Reports/Notifications | `admin/adminStorage.js`, `reports/reports.js`, `notifications/notifications.js` | Version acknowledgement before cache commit; equal replay; failed multi-site notification targets retained |
| Surveys | `surveys/surveys.js` | Retained publish operation ID and local failure handling |
| Toolroom | `toolroom/toolroom.js` | Mutation fingerprint/operation retention in the API wrapper; loading state; authoritative reload after mutation |
| Admin/projects/modules | `admin/*.js`, `sites/sites.js`, `core/projectModules.js` | Server permission checks, versions/receipts, project context capture |
| Uploads/imports | `notifications/notifications.js`, chat/survey/import modules | File operation IDs where the same persistent file can be retried; server content validation and cleanup |

## Executed local regression matrix

`PASS`:

- one user: module save commits, response is treated as lost, same operation retries with the old base version, server returns the first authoritative module version, and the next distinct edit saves normally;
- genuine conflict: stale Planner field retry with a different value returns `ENTITY_VERSION_CONFLICT`, while a stale replay of the committed value succeeds without another row-version increment;
- Warehouse: response-lost `+10` replay leaves `current=10`, `totalReceived=10`, and one movement log; same key with `+11` is rejected;
- Store: response-lost order replay returns the original order and the order list contains one record;
- Chat: response-lost message replay returns the original message and the message list contains one `clientId`;
- Reports and Notifications: equal stale replay succeeds; different stale data returns 409;
- Toolroom: response-lost assignment replay returns the first item version and creates one assignment record;
- uploads: response-lost replay returns the first URL, one persistent file remains, and key reuse with a different filename returns 409;
- own realtime event: originating browser does not start a refresh; another browser event does;
- reconnect with a failed pending save: main UI remains visible and the global retry screen is not shown;
- historical failure isolation: an old failure in another module does not poison a successful flush;
- rapid double invocation: Warehouse shares the in-flight promise and sends one operation while pending;
- project isolation, disabled-module API guards, permission matrix, chat, backup/restore, multipart persistence/restart, import/export, and browser freshness suites.

## Railway status

The code in this document must be deployed before Railway behavior can be marked `PASS`. Until the deployment and production-safe test records are exercised, all new mutation/retry cases are `NOT VERIFIED ON RAILWAY`. The application must remain on one Railway replica.

