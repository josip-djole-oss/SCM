(function (root, factory) {
  const registry = factory();
  if (typeof module === 'object' && module.exports) module.exports = registry;
  else root.SCMModuleRegistry = registry;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const definitions = [
    { id: 'planner', label: 'Planer', screens: ['planner', 'main'], permissions: ['canAccessPlanner', 'canViewPlanner', 'canExportPlanner', 'canImportPlanner', 'canManageWorkers', 'canManageLifts', 'canManageMoments', 'canManagePlans', 'canManageKarnas', 'canClear', 'canPrint', 'canExport'], accessPermissions: ['canAccessPlanner', 'canViewPlanner'], stateKeys: ['planner', 'dailyData'] },
    { id: 'tidplan', label: 'Tidplan', screens: ['tidplan'], permissions: ['canAccessTidplan', 'canViewTidplan', 'canManageTidplan', 'canAddTidplanActivity', 'canDeleteTidplanActivity', 'canManageTidplanZones', 'canPrintTidplan', 'canClearTidplan', 'canExportTidplan', 'canImportTidplan'], accessPermissions: ['canAccessTidplan', 'canViewTidplan'], stateKeys: ['tidplan', 'tidplanZones'] },
    { id: 'bins', label: 'Sompturnor', screens: ['bins', 'kante', 'sompturnor'], permissions: ['canAccessBins', 'canViewBins', 'canEditBinsData', 'canManageBinsPlans', 'canManageBinsPermissions'], accessPermissions: ['canAccessBins', 'canViewBins'], stateKeys: ['bins', 'binsData', 'binPermissions'] },
    { id: 'store', label: 'Store', screens: ['store', 'workwear'], permissions: ['canAccessStore', 'canManageStore', 'canViewStoreTeamOrders', 'canManageStoreBudgets', 'canManageStoreRules', 'canViewStoreManagerDashboard', 'canExportStore', 'canAccessWorkwear', 'canManageWorkwear', 'canManageWorkwearCredits', 'canManageWorkwearSettings', 'canViewWorkwearAnalytics'], accessPermissions: ['canAccessStore', 'canAccessWorkwear'], stateKeys: ['store', 'workwear'] },
    { id: 'chat', label: 'Chat', screens: ['chat', 'site-chat', 'siteChat'], permissions: ['canAccessSiteChat', 'canModerateSiteChat'], accessPermissions: ['canAccessSiteChat'], stateKeys: ['chat', 'siteChat'] },
    { id: 'warehouse', label: 'Warehouse', screens: ['warehouse', 'warehouse-logs', 'warehouseLogs', 'warehouseGraph'], permissions: ['canAccessWarehouse', 'canViewWarehouse', 'canManageWarehouse', 'canManageWarehouseStock', 'canManageWarehouseIssue', 'canExportWarehouse', 'canImportWarehouse', 'canAssignWarehouseToAdmin', 'canViewWarehouseLogs', 'canViewWarehouseAnalytics'], accessPermissions: ['canAccessWarehouse', 'canViewWarehouse'], stateKeys: ['warehouse', 'warehouseData', 'warehouseLogs'] },
    { id: 'toolroom', label: 'Toolroom', screens: ['toolroom'], permissions: ['canAccessToolroom', 'canManageToolroom', 'canEditToolPresets', 'canViewToolHistory', 'canAssignTools', 'canReturnTools', 'canViewMyTools', 'canReportToolFault', 'canHandleToolService', 'canWriteOffTools', 'canExportToolroom'], stateKeys: ['toolroom'] },
    { id: 'reports', label: 'Reports', screens: ['reports'], permissions: ['canCreateReports', 'canViewReports', 'canApproveReports', 'canDeleteReports'], accessPermissions: ['canViewReports', 'canCreateReports'], stateKeys: ['reports'] },
    { id: 'notifications', label: 'Notifications', screens: ['notifications'], permissions: ['canViewNotifications', 'canManageNotifications', 'canDeleteNotifications'], accessPermissions: ['canViewNotifications'], stateKeys: ['notifications'] },
    { id: 'surveys', label: 'Surveys', screens: ['surveys'], permissions: ['canViewSurveys', 'canCreateSurveys', 'canEditSurveys', 'canDeleteSurveys', 'canPublishSurveys', 'canViewSurveyResults'], accessPermissions: ['canViewSurveys'], stateKeys: ['surveys'] },
  ];
  const list = Object.freeze(definitions.map((definition) => Object.freeze({
    ...definition, name: definition.label,
    accessPermissions: Object.freeze(definition.accessPermissions || definition.permissions.slice()),
    permissions: Object.freeze(definition.permissions), screens: Object.freeze(definition.screens),
    stateKeys: Object.freeze(definition.stateKeys), dependencies: Object.freeze([]),
    routes: Object.freeze(definition.screens.map((screen) => '/' + screen)),
    navSelectors: Object.freeze(definition.screens.map((screen) => '[data-view="' + screen + '"]')),
  })));
  function get(id) { return list.find((item) => item.id === id || item.screens.includes(id)) || null; }
  function forScreen(screen) { return get(String(screen || '').replace(/^\//, '').split(/[/?#]/)[0]); }
  function forPermission(key) { return list.find((item) => item.permissions.includes(key)) || null; }
  function normalize(config) {
    const source = config && typeof config === 'object' ? (config.modules || config) : {};
    return Object.fromEntries(list.map((item) => [item.id, source[item.id] !== false]));
  }
  function isEnabled(config, id) {
    const definition = get(id);
    if (!definition) return false;
    const modules = normalize(config);
    return modules[definition.id] && definition.dependencies.every((dependency) => modules[dependency]);
  }
  return Object.freeze({ list, get, forScreen, forPermission, normalize, isEnabled });
});
