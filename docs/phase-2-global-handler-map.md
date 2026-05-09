# Phase 2 Global Handler Map

Inventory taken before the compatibility layer was added.

- Static inline attributes in `public/index.html`: 154
- Unique global handler functions referenced by static inline attributes: 90
- Unique global handler functions referenced by static plus generated inline HTML: 96
- Compatibility-routed handlers after this step: 96
- Inline handlers removed in this step: 6 `setLanguage(...)` button handlers

## Facade Routing

| Namespace | Handler functions routed through it |
| --- | --- |
| `CMAX.core` | `handleLogin`, `enterReadonlyMode`, `switchToLogin`, `logout` |
| `CMAX.sites` | `toggleSiteDropdown`, `promptAddSite`, `confirmRemoveSite` |
| `CMAX.planner` | `addPlanningRow`, `removePlanningRow`, `clearAllTable`, `toggleList`, `openManagePanel`, `closeManagePanel`, `manageSelectCategory`, `manageGoBack`, `manageGoAdd`, `manageGoRemove`, `manageDoAdd` |
| `CMAX.tidplan` | `showTidplan`, `showPlanner`, `updateTidplan`, `saveTidplanData`, `clearTidplan`, `printTidplan`, `addTidplanActivity`, `toggleTidplanSortMenu`, `applyTidplanSort`, `toggleZoneManager`, `addTidplanZoneFromInputs`, `clearAllTidplanZones`, `addPlan`, `addMoment`, `addKarna` |
| `CMAX.warehouse` | `showWarehouse`, `showWarehouseLogs`, `showWarehouseGraph`, `updateWarehouseStockForm`, `saveWarehouseStockAdjustment`, `addWarehouseCatalogItem`, `applyWarehouseLogFilters`, `resetWarehouseLogFilters`, `deleteWarehouseLog`, `clearAllWarehouseLogs`, `printWarehouseInventory`, `exportWarehouseInventoryToPDF` |
| `CMAX.surveys` | `showSurveys`, `submitSurvey`, `addSurveyAnswerField` |
| `CMAX.admin` | `openAdminPanel`, `closeAdminPanel`, `switchTab`, `addNewAdmin`, `saveGuestAccessSettings`, `clearLogs`, `resetTidplanLayoutSettings`, `resetThemeSettings`, `runManualBackup`, `openBackupRestorePanel`, `loadBackupRestoreOptions`, `restoreSelectedBackup` |
| `CMAX.reports` | `openReportModal`, `closeReportModal`, `submitReport`, `filterReports`, `openChangePasswordModal`, `closeChangePasswordModal`, `submitChangePassword` |
| `CMAX.importExport` | `saveAllData`, `handlePrint`, `handleExport`, `exportPlannerToExcel`, `exportPlannerToPDF`, `handleModuleExport`, `openModuleImportModal`, `closeModuleImportModal`, `uploadModuleImport`, `handleTidplanExportPdf`, `handleWarehouseExportExcel`, `togglePlannerExportImportDropdown`, `toggleTidplanExportImportDropdown`, `toggleWarehouseExportImportDropdown` |
| `CMAX.utils` | `setLanguage`, `toggleDarkMode`, `setColorTheme`, `toggleBinPermission` |
| `CMAX.bins` | `toggleBinsView`, `addBinPlan`, `removeBinPlan` |
| `CMAX.notifications` | `showNotifications`, `submitNotification`, `openNotificationPrintChooser`, `closeNotificationPrintChooser`, `printSelectedNotification`, `closeNotificationViewer`, `prevNotificationImage`, `nextNotificationImage` |

## Can Be Hidden Behind Modules Next

These handlers are good immediate candidates because their callers are UI entry points and now already pass through `window.CMAX`:

- Planner/resource management: `addPlanningRow`, `removePlanningRow`, `clearAllTable`, `toggleList`, `openManagePanel`, `manage*`
- Reports/password modals: `openReportModal`, `closeReportModal`, `submitReport`, `filterReports`, `openChangePasswordModal`, `closeChangePasswordModal`, `submitChangePassword`
- Admin panel shell: `openAdminPanel`, `closeAdminPanel`, `switchTab`, `saveGuestAccessSettings`
- Import/export dropdowns and modal shell: `toggle*ExportImportDropdown`, `openModuleImportModal`, `closeModuleImportModal`, `uploadModuleImport`
- Static settings controls: `toggleDarkMode`, `setColorTheme`, `toggleBinPermission`

Higher-risk candidates should stay compatibility-routed until more event delegation is in place:

- Site switching/removal: site isolation and scoped localStorage/server sync depend on this path.
- Warehouse stock/log operations: per-site warehouse state and log history depend on this path.
- Tidplan save/render/sort: versioning, changed tracking, date pickers, and timeline rendering meet here.
- Surveys: target users, read state, and badge counts depend on mixed server/local state.
