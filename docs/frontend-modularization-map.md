# Frontend modularization map

This is the phase-1 map used for the safe split of `public/script.js`.

## Original structure

`public/script.js` mixed these responsibilities in one global file:

- i18n: `TRANSLATIONS`, `t`, `tFormat`, language buttons, DOM translation pass.
- Core config and helpers: storage keys, site key sanitizing, natural sorting, date edit locks.
- Runtime state: current view, current site, polling intervals, sync flags, server version, optimistic conflict markers.
- Permissions: default admin/guest permissions, role levels, permission normalization, permission editors.
- App state: planner data, resources, warehouse defaults, site templates, admin/user normalization.
- Bootstrap/auth/UI shell: `initApp`, login/logout, loading overlay, main app visibility, global event listeners.
- Backend communication and sync: `/api/state`, reports, notifications, metadata polling, presence, save queue, conflict merge handling.
- Feature UI: planner, bins, warehouse, tidplan, notifications, reports, admin, import/export, site switcher.
- Utilities: HTML escaping, date normalization, dialogs, toast notifications, tooltips, print/export helpers.

## Global state found

Important global variables that remain intentionally global in this safe phase:

- Site scope: `currentSite`, `sites`, `STORAGE_KEY`, `REPORTS_KEY`, `BINS_KEY`, `NOTIFICATIONS_KEY`.
- Main app state: `appState`, `tidplanData`, `tidplanZones`, `availablePlans`, `availableMoments`, `availableKarne`, `warehouseData`.
- Sync/versioning: `serverStateVersion`, `serverSyncTimeout`, `serverSyncInFlight`, `lastServerStateSnapshot`, `lastAppliedRemoteStateKey`, `ignoredRemoteStateKey`, `localEditKeys`.
- Polling/presence: `autoSaveInterval`, `presenceHeartbeatInterval`, `presenceRefreshInterval`, `reportsRefreshInterval`, `notificationsRefreshInterval`, `permissionRefreshInterval`, `siteMetaRefreshInterval`, `sharedDataRefreshTimer`.
- Admin/session: `pendingAdminPermsByEmail`, `pendingAdminLevelSelections`, `adminRemovalHandled`.

## Safe first split

Low-risk parts to split first:

- Pure i18n and translation functions.
- Utility UI helpers: dialogs, tooltips, loading/toast helpers.
- Existing standalone scripts: API client, permissions, routing, conflict UI, audit, backups, surveys.
- Feature chunks where function bodies can move unchanged and load order is preserved.

## Risky areas

These areas should not be behavior-refactored until tests/browser coverage are stronger:

- `buildServerStateSnapshot`, `applyServerStateSnapshot`, `syncServerState`, and version conflict handling.
- `switchSiteFromLocal`, scoped storage keys, and `syncSiteMetadata`.
- Merge helpers for planner/tidplan/notifications state.
- Warehouse persistence and site-specific catalog/log filtering.
- Admin permission level clamping and site access editors.

## Current module map

- `public/js/i18n/i18n.js`: translations and language application.
- `public/js/core/config.js`: storage keys, site key helpers, date edit locks.
- `public/js/core/state.js`: runtime globals, permission defaults, role level definitions.
- `public/js/core/appState.js`: `appState`, site templates, warehouse defaults, normalization helpers, permission editor helpers.
- `public/js/core/apiClient.js`: CSRF/session-aware `fetch` patch.
- `public/js/core/permissions.js`: permission access helpers.
- `public/js/core/routing.js`: view-to-route mapping and route restore.
- `public/js/core/init.js`: `initApp`.
- `public/js/core/auth.js`: login, logout, auth check, loading shell, permission visibility.
- `public/js/core/events.js`: base DOM event listener registration.
- `public/js/core/presence.js`: presence view labels, heartbeat/render helpers.
- `public/js/core/sync.js`: remote refresh/conflict merge helpers and polling timers.
- `public/js/core/dataSync.js`: data load/save, site-scoped local storage, server snapshot build/apply, save queue.
- `public/js/core/conflicts.js`: server sync response parsing and conflict notices.
- `public/js/core/theme.js`: dark/theme controls and bin permission toggles.
- `public/js/utils/storage.js`: early storage JSON parser needed by state initialization.
- `public/js/utils/tooltips.js`: custom tooltip bootstrap.
- `public/js/utils/dialogs.js`: alert/confirm/prompt/toast helpers.
- `public/js/planner/resourceManagement.js`: manage panel, resource add/remove, notification badge helpers.
- `public/js/planner/planner.js`: planner rendering and planner table edits.
- `public/js/bins/bins.js`: bins data/render/edit logic.
- `public/js/warehouse/warehouse.js`: warehouse inventory, issue rows, logs, graph rendering and mutations.
- `public/js/importExport/importExport.js`: planner/tidplan/warehouse import-export, print, PDF/Excel/Word helpers.
- `public/js/sites/sites.js`: site selector, add/remove site, site title updates.
- `public/js/tidplan/tidplanState.js`: tidplan resources/zones/state load-save helpers.
- `public/js/tidplan/tidplanRender.js`: tidplan view, filters, timeline/table rendering, print.
- `public/js/tidplan/tidplanEvents.js`: tidplan resizer, panel and fullscreen controls.
- `public/js/admin/adminStorage.js`: local admin/report storage helpers.
- `public/js/admin/admin.js`: admin panel, permissions UI, user management.
- `public/js/admin/audit.js`: audit log loading/rendering.
- `public/js/admin/backups.js`: backup controls.
- `public/js/reports/reports.js`: report modal, list, review/delete.
- `public/js/notifications/notifications.js`: notifications composer/list/printing/viewer.
- `public/js/surveys/surveys.js`: surveys API/UI.
- `public/script.js`: bootstrap only: `window.onload` and `popstate`.

## Safety notes

- Function bodies were moved without business logic edits.
- Script execution order in `index.html` preserves the original global dependency order.
- Top-level globals in split classic scripts use `var` so older inline handlers and cross-file global functions keep the same browser visibility they had inside the monolith.
- Multi-site state and scoped storage logic stayed in the same functions, now under `core/dataSync.js` and `sites/sites.js`.
- Backend remains source of truth through the existing `/api/state` load/save flow.
- Optimistic concurrency/versioning functions stayed intact.
