function canAccessWorkwearModule() {
  return hasPermission("canAccessStore") || hasPermission("canAccessWorkwear");
}

function canManageWorkwearModule() {
  return !appState.isReadonly && (hasPermission("canManageStore") || hasPermission("canManageWorkwear"));
}

function canViewWorkwearAnalyticsModule() {
  return (
    !appState.isReadonly &&
    (appState.isSuperAdmin ||
      hasPermission("canManageStore") ||
      hasPermission("canViewStoreManagerDashboard") ||
      hasPermission("canViewWorkwearAnalytics"))
  );
}

function canManageWorkwearCredits() {
  return !appState.isReadonly && (hasPermission("canManageStoreBudgets") || hasPermission("canManageWorkwearCredits") || hasPermission("canManageStore"));
}

function canManageWorkwearSettings() {
  return !appState.isReadonly && (hasPermission("canManageStoreRules") || hasPermission("canManageWorkwearSettings") || hasPermission("canManageStore"));
}
