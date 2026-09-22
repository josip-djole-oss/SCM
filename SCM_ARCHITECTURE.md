# SCM architecture

This document is being updated alongside the audit. The current production target is one Railway application instance, with PostgreSQL or a persistent JSON volume and a persistent file volume.

## Application layers

- `public/index.html` loads browser scripts explicitly. `public/js/core` coordinates authentication, routing, state, API requests and synchronization. Feature folders implement Planner, Sompturnor (`bins`), Tidplan, Store (`workwear`), Warehouse, Toolroom, Chat, Reports, Notifications and Surveys.
- `server/server.js` hosts Express, authenticated APIs, session/CSRF middleware and business operations. `server/routes` contains extracted import/export and feature routes.
- `server/storage/index.js` is the authoritative document repository. JSON and PostgreSQL implement versioned reads, writes and serialized mutations. Browser storage is a cache/preferences layer and must not authorize access or confirm persistence.

## Project modules

`public/js/core/moduleRegistry.js` is shared by Node and the browser. Stable IDs map legacy screen/permission names to modules. Store and workwear are one module; Sompturnor remains `bins`. Project configuration is stored independently per site. Existing module data remains untouched by configuration changes.

`GET /api/projects/:site/modules` returns the authorized project configuration. `PUT` is restricted to explicit Super Admin and uses a base version to prevent lost updates. The browser resolves configuration before showing navigation. Backend APIs check project availability independently of the browser; aggregate state omits disabled data. Numeric admin level does not imply Super Admin.

Modules do not currently declare hard dependencies on one another. Disabling one module therefore does not cascade to another module. Shared shell, authentication, project selection and Admin Panel services remain available so an authorized Super Admin can restore configuration.

## Data flows

Login validates the session, resolves project access and module configuration, fetches current data, then displays the application. Project switches invalidate the old request context, hide business data behind synchronization UI, and fetch the target project. A late response from the previous project/session must not replace current state.

Mutations validate permissions and module availability, commit authoritative storage, return acknowledgement/version, and only then update confirmed UI state. Unsaved drafts must survive failures. Version conflicts require reconciliation and must not silently overwrite another user's work.

Non-idempotent user intent carries a stable operation ID. For state-backed critical operations, the result receipt is persisted in the same serialized transaction as the business change. A client that loses the response retries the same ID and receives the first authoritative result. Warehouse movement arithmetic runs only on the server against current stock. Whole-document desired-state saves use versions; an exact replay of an already committed value is acknowledged, while different stale content remains a real conflict. The complete contract and endpoint inventory are in `SCM_MUTATION_RELIABILITY.md`.

## Realtime

Authenticated Server-Sent Events carry invalidation signals for project modules, business data and effective permissions. Clients fetch authoritative state in response. Each browser tab supplies a client-instance ID; the server echoes it in mutation invalidations so a tab does not treat its own acknowledgement as an external concurrent edit. Module configuration also uses periodic reconciliation to recover missed signals. Reconnect must resynchronize without replacing the application UI when a pending mutation merely needs a safe retry; event payloads are not authoritative business snapshots. Sessions and event subscribers are currently process-local, so multiple application replicas require shared sessions/event transport before deployment.

## Operations

Railway must supply persistent storage for uploads regardless of database backend. Health checks reflect initialization/storage readiness. Deployment configuration, storage safeguards, test evidence and remaining infrastructure checks are maintained in `SCM_AUDIT.md` and `RAILWAY_DEPLOYMENT.md`.
