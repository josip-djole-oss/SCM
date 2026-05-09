# Phase 8 Inline Handler Audit

Date: 2026-05-09

Scope: remaining inline `on*` attributes in `public/index.html` after Phase 7. This map intentionally excludes JavaScript property handlers such as `element.onclick = ...` and global lifecycle handlers such as `window.onload`.

## Summary

- Remaining inline HTML handlers: 33
- Highest-risk boundary areas: site add/remove, `saveAllData`, warehouse state/log/import/stock/catalog, Tidplan clear/save, Planner/Bins clear.
- Compatibility wrappers remain in `public/js/core/namespace.js`.
- Phase 8 is audit and test coverage only. No application behavior was intentionally changed.

## Handler Map

| # | File:line | Inline handler | Module | Touches site | Touches warehouse | Touches save queue | Touches sync/versioning | Touches row state | Touches permissions | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `public/index.html:1045` | `toggleSiteDropdown()` | sites | Yes, site UI only | No | No | No | No | No | MEDIUM |
| 2 | `public/index.html:1056` | `promptAddSite()` | sites | Yes, add site | Yes, initializes scoped warehouse storage | Yes, persists current state | Yes, `syncServerState({ includeSites: true })` | No | Indirect site access | DO NOT TOUCH YET |
| 3 | `public/index.html:1061` | `confirmRemoveSite()` | sites | Yes, remove site | Yes, deletes scoped warehouse storage for removed site | Yes, persists current state | Yes, `syncServerState({ includeSites: true })` | No | Indirect site access | DO NOT TOUCH YET |
| 4 | `public/index.html:1177` | `clearAllTable()` | planner/bins | No | No | Yes, `saveData()` or `saveBinsData()` | Yes, schedules sync | Yes, planner rows or bins rows | Checks `canClear` | HIGH |
| 5 | `public/index.html:1186` | `toggleBinsView()` | bins | No | No | No | Indirect fresh-load/presence | Bins view state | Checks bins access | MEDIUM |
| 6 | `public/index.html:1189` | `showWarehouse()` | warehouse | Reads current site | Yes, renders site-scoped warehouse | No | Indirect fresh-load/presence | No | Checks warehouse access | HIGH |
| 7 | `public/index.html:1217` | `saveAllData()` | importExport/core save | Yes, persists current scoped site | Yes, saves bins and current site state | Yes, direct save queue boundary | Yes, `syncServerState({ markAsClean: true })` | Yes, normalized planner/bins state | No | DO NOT TOUCH YET |
| 8 | `public/index.html:1719` | `showWarehouseLogs()` | warehouse | Reads current site | Yes, warehouse logs view | No | No | No | Checks log access | HIGH |
| 9 | `public/index.html:1726` | `showWarehouseGraph()` | warehouse | Reads current site | Yes, warehouse analytics view | No | No | No | Checks analytics access | HIGH |
| 10 | `public/index.html:1733` | `printWarehouseInventory()` | warehouse/importExport | Reads current site | Yes, read-only inventory export | No | No | No | Checks print/export permission | MEDIUM |
| 11 | `public/index.html:1740` | `exportWarehouseInventoryToPDF()` | warehouse/importExport | Reads current site | Yes, read-only inventory export | No | Backend export request | No | Checks export permission | MEDIUM |
| 12 | `public/index.html:1747` | `toggleWarehouseExportImportDropdown()` | warehouse/importExport | No | Warehouse UI only | No | No | No | No | MEDIUM |
| 13 | `public/index.html:1760` | `handleWarehouseExportExcel(); toggleWarehouseExportImportDropdown();` | warehouse/importExport | Uses current site in request | Yes, read-only export | No | Backend export request | No | Checks export permission | HIGH |
| 14 | `public/index.html:1770` | `handleModuleExport('warehouse', 'pdf'); toggleWarehouseExportImportDropdown();` | warehouse/importExport | Uses current site in request | Yes, read-only export | No | Backend export request | No | Checks export permission | HIGH |
| 15 | `public/index.html:1780` | `openModuleImportModal('warehouse', 'excel'); toggleWarehouseExportImportDropdown();` | warehouse/importExport | Uses current site during later upload | Yes, import flow entry | Later upload mutates data | Later upload reloads data/sync boundary | No | Checks import permission | DO NOT TOUCH YET |
| 16 | `public/index.html:1790` | `openModuleImportModal('warehouse', 'pdf'); toggleWarehouseExportImportDropdown();` | warehouse/importExport | Uses current site during later upload | Yes, import flow entry | Later upload mutates data | Later upload reloads data/sync boundary | No | Checks import permission | DO NOT TOUCH YET |
| 17 | `public/index.html:1861` | `updateWarehouseStockForm('itemId', this.value)` | warehouse | Current site scoped storage | Yes, `warehouseData.stockForm` | Yes, `persistWarehouseData()` | Yes, schedules server sync | No | Requires warehouse editability through UI state | DO NOT TOUCH YET |
| 18 | `public/index.html:1872` | `updateWarehouseStockForm('direction', this.value)` | warehouse | Current site scoped storage | Yes, `warehouseData.stockForm` | Yes, `persistWarehouseData()` | Yes, schedules server sync | No | Requires warehouse editability through UI state | DO NOT TOUCH YET |
| 19 | `public/index.html:1893` | `updateWarehouseStockForm('quantity', Number(this.value) || 1)` | warehouse | Current site scoped storage | Yes, `warehouseData.stockForm` | Yes, `persistWarehouseData()` | Yes, schedules server sync | No | Requires warehouse editability through UI state | DO NOT TOUCH YET |
| 20 | `public/index.html:1911` | `updateWarehouseStockForm('comment', this.value)` | warehouse | Current site scoped storage | Yes, `warehouseData.stockForm` | Yes, `persistWarehouseData()` | Yes, schedules server sync | No | Requires warehouse editability through UI state | DO NOT TOUCH YET |
| 21 | `public/index.html:1918` | `saveWarehouseStockAdjustment()` | warehouse | Current site scoped storage | Yes, stock and logs | Yes, `persistWarehouseData()` | Yes, schedules server sync | No | Requires warehouse editability | DO NOT TOUCH YET |
| 22 | `public/index.html:1973` | `addWarehouseCatalogItem()` | warehouse | Current site scoped storage | Yes, catalog and stock | Yes, `persistWarehouseData()` | Yes, schedules server sync | No | Requires warehouse editability | DO NOT TOUCH YET |
| 23 | `public/index.html:1991` | `showWarehouse()` | warehouse | Reads current site | Yes, warehouse view | No | Indirect fresh-load/presence | No | Checks warehouse access | HIGH |
| 24 | `public/index.html:1998` | `showWarehouseGraph()` | warehouse | Reads current site | Yes, analytics view | No | No | No | Checks analytics access | HIGH |
| 25 | `public/index.html:2002` | `showPlanner()` | tidplan/planner navigation | No | Hides warehouse/log views | No | Presence/route only | No | Checks planner route indirectly | MEDIUM |
| 26 | `public/index.html:2095` | `applyWarehouseLogFilters()` | warehouse | Reads current site logs | Yes, log UI state | No | No | No | No | HIGH |
| 27 | `public/index.html:2102` | `resetWarehouseLogFilters()` | warehouse | Reads current site logs | Yes, log UI state | No | No | No | No | HIGH |
| 28 | `public/index.html:2109` | `clearAllWarehouseLogs()` | warehouse | Current site scoped storage | Yes, deletes logs | Yes, `persistWarehouseData()` | Yes, schedules server sync | No | Superadmin only | DO NOT TOUCH YET |
| 29 | `public/index.html:2146` | `showWarehouse()` | warehouse | Reads current site | Yes, warehouse view | No | Indirect fresh-load/presence | No | Checks warehouse access | HIGH |
| 30 | `public/index.html:2153` | `showWarehouseLogs()` | warehouse | Reads current site logs | Yes, logs view | No | No | No | Checks log access | HIGH |
| 31 | `public/index.html:2157` | `showPlanner()` | tidplan/planner navigation | No | Hides warehouse graph/log views | No | Presence/route only | No | No | MEDIUM |
| 32 | `public/index.html:2280` | `clearTidplan()` | tidplan | Current site scoped storage | No | Yes, via `saveTidplanData()` | Yes, `syncServerState()` | Yes, deletes all Tidplan activities | Checks `canClearTidplan` | DO NOT TOUCH YET |
| 33 | `public/index.html:2288` | `saveTidplanData()` | tidplan | Current site scoped storage | No | Yes, writes Tidplan local storage | Yes, `syncServerState()` | Yes, syncs table rows to state | Checks `canEditTidplan` | DO NOT TOUCH YET |

## Risk Groups

### LOW

None. At this point, the easy UI-only handlers have already been converted.

### MEDIUM

- `toggleSiteDropdown()`
- `toggleBinsView()`
- `printWarehouseInventory()`
- `exportWarehouseInventoryToPDF()`
- `toggleWarehouseExportImportDropdown()`
- `showPlanner()` from warehouse logs/graph

These are mostly view/navigation or read-only export paths, but they still sit close to site or warehouse UI boundaries.

### HIGH

- `clearAllTable()`
- `showWarehouse()`
- `showWarehouseLogs()`
- `showWarehouseGraph()`
- Warehouse export actions
- `applyWarehouseLogFilters()`
- `resetWarehouseLogFilters()`

These should be converted only after smoke coverage is green because they cross warehouse view routing, current-site assumptions, or row/table state.

### DO NOT TOUCH YET

- `promptAddSite()`
- `confirmRemoveSite()`
- `saveAllData()`
- Warehouse import entrypoints
- `updateWarehouseStockForm(...)`
- `saveWarehouseStockAdjustment()`
- `addWarehouseCatalogItem()`
- `clearAllWarehouseLogs()`
- `clearTidplan()`
- `saveTidplanData()`

These touch site lifecycle, warehouse scoped data/logs/import, save queue, sync/versioning, or Tidplan row-state persistence.

## Recommended Order

1. Convert `toggleSiteDropdown()` only, with a site dropdown open/close smoke test. Do not convert site add/remove in the same change.
2. Convert low-mutation warehouse navigation/read-only actions: warehouse view/log/graph navigation, print/export dropdown toggle, and `showPlanner()` back links.
3. Convert warehouse log filter apply/reset after confirming log rendering and filter state tests.
4. Convert `toggleBinsView()` and `clearAllTable()` only after Planner and Bins row smoke tests are stable in CI/headless.
5. Convert warehouse stock form and stock adjustment as a separate warehouse-state phase.
6. Convert warehouse catalog and log deletion as a separate destructive warehouse phase.
7. Convert `saveAllData()` only after a dedicated save/version conflict test is mandatory in the workflow.
8. Convert Tidplan `clearTidplan()` and `saveTidplanData()` after Tidplan row-state and sync callback tests are mandatory.
9. Convert site add/remove last, with site deletion rollback and warehouse preservation tests.

## Do Not Touch Without Dedicated Tests

- Site add/remove: requires A/B/C site isolation, deletion rollback, and warehouse preservation tests.
- Warehouse stock/catalog/log mutation: requires per-site warehouse stock/log tests.
- `saveAllData()`: requires version conflict/retry smoke.
- Tidplan save/clear: requires row-state and sync callback tests.
- Planner/Bins cell changes and clear: requires row/cell smoke with save/sync observation.

