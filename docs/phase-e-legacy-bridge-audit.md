# Phase E - Legacy Bridge Audit (`legacyMethod -> CMAX.*`)

## Scope

- File audited: `public/js/core/namespace.js`
- Goal: identify all remaining `legacyMethod(...)` bridge bindings and define a safe, staged migration to direct `CMAX.*` implementations without changing feature logic.

## Current State Summary

- `legacyMethod(...)` bindings still active: **130**
- `CMAX.compat` still active and currently required by dispatcher flow.
- Dispatcher entrypoint still routes all `data-cmax-action` calls through namespace actions that mostly call legacy globals via `callLegacy(...)`.
- Wave 1 completed for `utils` and `reports`: namespace entries no longer use `legacyMethod(...)`.
- Baseline recount: pre-Wave-1 there were **156** `legacyMethod(...)` bindings; Wave 1 removed **18**.
- Wave 2 completed for `notifications`: namespace entries no longer use `legacyMethod(...)` (removed 8 more).
- Note: `i18n/language`, `theme`, `dialogs`, `tooltips` already covered through `CMAX.utils` in Wave 1; no separate remaining `legacyMethod(...)` entries for "storage helpers".

## Exact Bridge Inventory (by namespace)

### `CMAX.core` (7)
- `save -> saveAllData`
- `saveData -> saveData`
- `login -> handleLogin`
- `enterReadonlyMode -> enterReadonlyMode`
- `switchToLogin -> switchToLogin`
- `logout -> logout`
- `applyPermissions -> applyPermissionVisibility`

### `CMAX.sites` (11)
- `init -> populateSiteSelect`
- `render -> renderSiteSwitcher`
- `switchSite -> changeSite`
- `switchSiteFromLocal -> switchSiteFromLocal`
- `toggleDropdown -> toggleSiteDropdown`
- `closeDropdown -> closeSiteDropdown`
- `promptAdd -> promptAddSite`
- `confirmRemove -> confirmRemoveSite`
- `add -> addSite`
- `remove -> removeSite`
- `updateTitle -> updateMainTitle`

### `CMAX.planner` (15)
- `init/render -> renderAll`
- `save -> saveData`
- `addRow -> addPlanningRow`
- `removeRow -> removePlanningRow`
- `clear -> clearAllTable`
- `toggleList -> toggleList`
- `openManagePanel -> openManagePanel`
- `closeManagePanel -> closeManagePanel`
- `manageSelectCategory -> manageSelectCategory`
- `manageGoBack -> manageGoBack`
- `manageGoAdd -> manageGoAdd`
- `manageGoRemove -> manageGoRemove`
- `manageDoAdd -> manageDoAdd`
- `manageRemoveItem -> manageRemoveItem`

### `CMAX.tidplan` (20)
- `init -> loadTidplanData`
- `show -> showTidplan`
- `showPlanner -> showPlanner`
- `render/update -> updateTidplan`
- `save -> saveTidplanData`
- `clear -> clearTidplan`
- `print -> printTidplan`
- `addActivity -> addTidplanActivity`
- `toggleSortMenu -> toggleTidplanSortMenu`
- `applySort -> applyTidplanSort`
- `toggleZoneManager -> toggleZoneManager`
- `addZoneFromInputs -> addTidplanZoneFromInputs`
- `clearZones -> clearAllTidplanZones`
- `addPlan -> addPlan`
- `addMoment -> addMoment`
- `addKarna -> addKarna`
- `removePlan -> removePlan`
- `removeMoment -> removeMoment`
- `removeKarna -> removeKarna`

### `CMAX.warehouse` (25)
- `init/render -> renderWarehousePage`
- `show -> showWarehouse`
- `save -> persistWarehouseData`
- `showLogs -> showWarehouseLogs`
- `showGraph -> showWarehouseGraph`
- `updateStockForm -> updateWarehouseStockForm`
- `updateStockFormFromEvent -> updateWarehouseStockFormFromEvent`
- `saveStockAdjustment -> saveWarehouseStockAdjustment`
- `saveIssueRow -> saveWarehouseIssueRow`
- `updateIssueDraftWorker -> updateWarehouseIssueDraftWorker`
- `updateIssueDraftSlotItem -> updateWarehouseIssueDraftSlotItem`
- `updateIssueDraftSlotQuantity -> updateWarehouseIssueDraftSlotQuantity`
- `updateIssueDraftComment -> updateWarehouseIssueDraftComment`
- `toggleProcurementUser -> toggleWarehouseProcurementUser`
- `addCatalogItem -> addWarehouseCatalogItem`
- `removeCatalogItem -> removeWarehouseCatalogItem`
- `setCatalogItemLimit -> setWarehouseCatalogItemLimit`
- `applyLogFilters -> applyWarehouseLogFilters`
- `resetLogFilters -> resetWarehouseLogFilters`
- `deleteLog -> deleteWarehouseLog`
- `clearLogs -> clearAllWarehouseLogs`
- `printInventory -> printWarehouseInventory`
- `exportInventoryToPDF -> exportWarehouseInventoryToPDF`
- `handleImportExcel -> handleWarehouseImportExcel`

### `CMAX.surveys` (8)
- `init -> setupSurveyTargetHandlers`
- `show -> showSurveys`
- `render -> renderSurveysList`
- `submit -> submitSurvey`
- `addAnswerField -> addSurveyAnswerField`
- `vote -> voteSurvey`
- `togglePin -> toggleSurveyPin`
- `delete -> deleteSurvey`

### `CMAX.admin` (22)
- `init -> initAdmins`
- `open -> openAdminPanel`
- `close -> closeAdminPanel`
- `switchTab -> switchTab`
- `addNewAdmin -> addNewAdmin`
- `saveGuestAccessSettings -> saveGuestAccessSettings`
- `togglePerms -> toggleAdminPerms`
- `savePerms -> saveAdminPerms`
- `stageLevelChange -> stageAdminLevelChange`
- `stagePermissionChange -> stageAdminPermissionChange`
- `removeAction -> removeAdminAction`
- `clearLogs -> clearLogs`
- `resetTidplanLayoutSettings -> resetTidplanLayoutSettings`
- `resetThemeSettings -> resetThemeSettings`
- `runManualBackup -> runManualBackup`
- `openBackupRestorePanel -> openBackupRestorePanel`
- `loadBackupRestoreOptions -> loadBackupRestoreOptions`
- `restoreSelectedBackup -> restoreSelectedBackup`
- `confirmRestoreBackup -> confirmRestoreBackup`
- `listBackups -> handleListBackups`
- `showBackupInfo -> handleBackupInfo`
- `selectBackupForRestore -> selectBackupForRestore`

### `CMAX.reports` (0 legacyMethod bindings)
- migrated in Wave 1 to direct namespace methods

### `CMAX.importExport` (16)
- `saveAll -> saveAllData`
- `printPlanner -> handlePrint`
- `exportPlanner -> handleExport`
- `exportPlannerExcel -> exportPlannerToExcel`
- `exportPlannerPDF -> exportPlannerToPDF`
- `exportModule -> handleModuleExport`
- `openImportModal -> openModuleImportModal`
- `closeImportModal -> closeModuleImportModal`
- `handleImportFileChange -> handleModuleImportFileChange`
- `resetImportFile -> resetModuleImportModalFile`
- `uploadImport -> uploadModuleImport`
- `exportTidplanPDF -> handleTidplanExportPdf`
- `exportWarehouseExcel -> handleWarehouseExportExcel`
- `togglePlannerDropdown -> togglePlannerExportImportDropdown`
- `toggleTidplanDropdown -> toggleTidplanExportImportDropdown`
- `toggleWarehouseDropdown -> toggleWarehouseExportImportDropdown`

### `CMAX.utils` (0 legacyMethod bindings)
- migrated in Wave 1 to direct namespace methods

### `CMAX.bins` (5)
- `init -> loadBinsData`
- `show -> toggleBinsView`
- `render -> renderBinsTable`
- `addPlan -> addBinPlan`
- `removePlan -> removeBinPlan`

### `CMAX.notifications` (0 legacyMethod bindings)
- migrated in Wave 2 to direct namespace methods

## Recommended Migration Order (no feature logic changes)

### Wave 1 - Lowest risk (`utils`, `reports`)  
Move wrappers to direct `CMAX.*` methods that call same internals but stop depending on global function lookup.

- Why first: mostly UI orchestration and modal helpers, low coupling to site/versioning.
- Exit criteria:
  - no `legacyMethod(...)` in `utils` and `reports`
  - no runtime `"CMAX legacy handler is missing"` for those actions

### Wave 2 - UI navigation and shell (`core`, `sites`, `notifications`, `bins`)
- Keep same behavior/signatures; only replace legacy bridge mechanism.
- Exit criteria:
  - route/login/logout/site switch/nav smoke stable
  - site-isolation test green

### Wave 3 - Planner/Tidplan surface (`planner`, `tidplan`)
- Replace action bridges first; do not touch state/sync rules.
- Exit criteria:
  - planner/tidplan interaction smoke green
  - no regressions in dirty-state flags or date-lock behavior

### Wave 4 - Warehouse and Import/Export (`warehouse`, `importExport`)
- Highest UI+I/O coupling; migrate late.
- Exit criteria:
  - phase9 and phase10 browser tests green
  - import/export dropdown and action dispatch verified

### Wave 5 - Admin and Surveys (`admin`, `surveys`)
- Large permission and workflow surface; keep last.
- Exit criteria:
  - admin tab/backup/perm flows stable
  - surveys render/submit/vote flows stable

### Wave 6 - Remove bridge internals
- Remove `legacyFns`, `captureLegacy`, `callLegacy`, `legacyMethod`.
- Remove `CMAX.compat` fields that only exist for legacy bridging.
- Keep event dispatcher (`CMAX.events.dispatch`) intact.

## Per-wave implementation pattern

1. For one namespace, replace:
- `foo: legacyMethod("bar")`
with
- `foo: (...args) => bar(...args)` or delegated call to module-owned implementation.

2. Keep method names and arguments unchanged.
3. Commit per namespace (small blast radius).
4. Run tests after each namespace wave.

## Mandatory test gate after each wave

- `node scripts/final-inline-cleanup-test.js`
- `node scripts/site-isolation-browser-test.js`
- `node scripts/phase8-risk-checkpoint-browser-test.js`
- `node scripts/phase9-warehouse-ui-browser-test.js`
- `node scripts/phase10-warehouse-binding-test.js`

## Do-not-touch boundaries

- No backend changes.
- No data schema changes.
- No save/sync/versioning behavior changes.
- No changes to past-day lock rules or permission model semantics.
