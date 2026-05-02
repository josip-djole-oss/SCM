function hasPermission(key) {
  if (appState.isSuperAdmin) return true;
  if (appState.isReadonly) {
    return appState.guestPermissions[key] !== false;
  }
  return appState.permissions[key] !== false;
}

function hasAdminPermission(key) {
  return appState.isSuperAdmin || (!appState.isReadonly && appState.permissions[key] !== false);
}

function canAccessPlannerModule() {
  return hasPermission("canAccessPlanner");
}

function canExportPlanner() { return hasPermission("canExportPlanner"); }
function canImportPlanner() { return hasPermission("canImportPlanner"); }

function canAccessTidplanModule() {
  return appState.isReadonly
    ? hasPermission("canAccessTidplan")
    : appState.isSuperAdmin || appState.permissions.canAccessTidplan !== false;
}

function canAccessBinsModule() {
  return hasPermission("canAccessBins");
}

function canExportTidplan() { return hasPermission("canExportTidplan"); }
function canImportTidplan() { return hasPermission("canImportTidplan"); }

function canAccessWarehouseModule() {
  if (!hasPermission("canAccessWarehouse")) return false;
  if (!appState.isReadonly) return true;
  return getGuestWarehouseSiteAccess().allowedItemIds.length > 0;
}

function canExportWarehouse() { return hasPermission("canExportWarehouse"); }
function canImportWarehouse() { return hasPermission("canImportWarehouse"); }

function canEditWarehouse() {
  return !appState.isReadonly && hasPermission("canManageWarehouse");
}

function canViewWarehouseLogsSection() {
  if (!hasPermission("canViewWarehouseLogs")) return false;
  if (!appState.isReadonly) return true;
  return getGuestWarehouseSiteAccess().allowedItemIds.length > 0;
}

function canViewWarehouseAnalyticsSection() {
  if (!hasPermission("canViewWarehouseAnalytics")) return false;
  if (!appState.isReadonly) return true;
  return getGuestWarehouseSiteAccess().allowedItemIds.length > 0;
}

function canAccessNotificationsModule() {
  return hasPermission("canViewNotifications");
}

function canManageNotificationsAccess() {
  return !appState.isReadonly && hasPermission("canManageNotifications");
}

function canDeleteNotificationsAccess() {
  return !appState.isReadonly && hasPermission("canDeleteNotifications");
}

function canManageSiteAccess() {
  return appState.isSuperAdmin || hasAdminPermission("canManageSiteAccess");
}

function canManageBackups() { return !appState.isReadonly && hasAdminPermission("canManageBackups"); }
function canViewBackups() { return hasAdminPermission("canViewBackups"); }

function getCurrentAdminAllowedSites() {
  if (appState.isSuperAdmin) return null;
  if (!canManageSiteAccess()) return null;
  if (!appState.currentUser) return null;
  const admin = getAdmins().find((a) => a.email === appState.currentUser);
  if (admin && Array.isArray(admin.allowedSites)) {
    return admin.allowedSites;
  }
  return null;
}

function getAccessibleSites() {
  const allowed = getCurrentAdminAllowedSites();
  if (allowed === null) return (sites || []).slice();
  return (sites || []).filter((site) => allowed.includes(site));
}

function canCreateReportsAccess() {
  return hasPermission("canCreateReports");
}

function canEditBinsDataAccess() {
  return !appState.isReadonly && canEditDate(appState.currentDate) && hasPermission("canEditBinsData");
}

function canOpenAdminPanelAccess() {
  return !appState.isReadonly && appState.isAdmin && hasPermission("canOpenAdminPanel");
}
