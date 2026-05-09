var currentView = "main"; // 'main' or 'bins'
var suppressRoutePush = false;
var autoSaveInterval = null;
var presenceHeartbeatInterval = null;
var presenceRefreshInterval = null;
var reportsRefreshInterval = null;
var siteMetaRefreshInterval = null;
var lastLocalSiteMutationAt = 0;
var lastEditAt = 0;
var PRESENCE_EDITING_WINDOW_MS = 2 * 60 * 1000;
var lastPresenceEditPingAt = 0;
var PRESENCE_EDIT_PING_COOLDOWN_MS = 3000;
var adminRemovalHandled = false;
var pendingAdminPermsByEmail = {};
var pendingServerSyncOptions = {
  includeAdmins: false,
  includeGuestPermissions: false,
  includeBinPermissions: false,
  includeSites: false,
  includeAdminRemovalNotices: false,
  adminEditTargetEmail: "",
};
var presenceSessionId =
  sessionStorage.getItem("cmax_presence_session") ||
  `presence_${Math.random().toString(36).slice(2)}_${Date.now()}`;
sessionStorage.setItem("cmax_presence_session", presenceSessionId);
var currentSite = localStorage.getItem(CURRENT_SITE_KEY) || "default";
var sites = safeParseStoredJson(localStorage.getItem(SITES_KEY), ["default"]) || ["default"];
var tidplanData = [];
var tidplanZones = [];
var availablePlans = [];
var availableMoments = ["Moment 1", "Moment 2"];
var availableKarne = ["Karna 1", "Karna 2", "Karna 3", "Karna 4"];
var warehouseData = null;
var logsCache = [];
var logsLoadedOnce = false;
var tidplanDataChanged = false;
var localEditKeys = new Set();
var notificationViewerImages = [];
var notificationViewerIndex = 0;
var notificationsRefreshInterval = null;
var permissionRefreshInterval = null;
var lastPermissionRefreshAt = 0;
var sharedDataRefreshTimer = null;
var sharedDataRefreshRunning = false;
var pendingAdminLevelSelections = {};
var reportsStateVersionBySite = {};
var notificationsStateVersionBySite = {};
var lastEditArea = "";
var lastAppliedRemoteStateKey = sessionStorage.getItem("cmax_last_remote_state_key") || "";
var ignoredRemoteStateKey = sessionStorage.getItem("cmax_ignored_remote_state_key") || "";
var freshServerDataLoaded = false;
var lastServerStateSnapshot = null;
var appDataLoadError = "";
var unlockedPastDates = {};
var WAREHOUSE_SLOTS_PER_ROW = 8;
var BACKEND_ENABLED =
  typeof window !== "undefined" &&
  window.location &&
  window.location.protocol !== "file:";
freshServerDataLoaded = !BACKEND_ENABLED;

var DEFAULT_PERMISSIONS = {
  canAccessPlanner: true,
  canAccessTidplan: true,
  canAccessBins: true,
  canAccessWarehouse: true,
  canViewWarehouse: true,
  canManageWarehouse: true,
  canViewWarehouseLogs: true,
  canViewWarehouseAnalytics: true,
  canViewNotifications: true,
  canManageNotifications: false,
  canDeleteNotifications: false,
  canCreateReports: true,
  canOpenAdminPanel: true,
  canManageAdmins: false,
  canManageSiteAccess: false,
  canViewSettings: true,
  canManageGuestAccess: false,
  canPrint: true,
  canExport: true,
  canExportPlanner: true,
  canImportPlanner: true,
  canExportWarehouse: false,
  canImportWarehouse: false,
  canExportTidplan: true,
  canImportTidplan: true,
  canClear: true,
  canUnlockPastDays: false,
  canViewSurveys: true,
  canCreateSurveys: false,
  canEditSurveys: false,
  canPublishSurveys: false,
  canDeleteSurveys: false,
  canViewSurveyResults: false,
  canViewAnonymousSurveyVoters: false,
  canManageSurveyPermissions: false,
  canManageTidplan: true,
  canAddTidplanActivity: true,
  canDeleteTidplanActivity: true,
  canManageTidplanZones: true,
  canPrintTidplan: true,
  canClearTidplan: true,
  canManageWorkers: true,
  canManageLifts: true,
  canManageMoments: true,
  canManagePlans: true,
  canManageKarnas: true,
  canEditBinsData: true,
  canManageBinsPlans: true,
  canManageBinsPermissions: false,
  canViewReports: true,
  canApproveReports: true,
  canDeleteReports: false,
  canViewLogs: true,
  canClearLogs: true,
  canViewBackups: false,
  canManageBackups: false,
  canRestoreBackups: false,
  canAssignWarehouseToAdmin: false,
  canModifyReadOnly: false,
  canToggleReadOnly: false,
};

var ADMIN_LEVELS = [1, 2, 3, 4, 5, 6];

var ADMIN_LEVEL_PERMISSION_KEYS = {
  1: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canViewNotifications",
    "canViewSurveys",
    "canCreateReports",
  ],
  2: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canViewNotifications",
    "canViewSurveys",
    "canCreateReports",
    "canPrint",
    "canExport",
    "canExportPlanner",
    "canViewReports",
  ],
  3: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canManageWarehouse",
    "canViewNotifications",
    "canViewSurveys",
    "canCreateSurveys",
    "canCreateReports",
    "canPrint",
    "canExport",
    "canViewReports",
    "canOpenAdminPanel",
    "canManageWorkers",
    "canManageLifts",
    "canManageMoments",
    "canManagePlans",
    "canManageKarnas",
    "canManageTidplan",
    "canAddTidplanActivity",
    "canDeleteTidplanActivity",
    "canManageTidplanZones",
    "canPrintTidplan",
    "canClearTidplan",
    "canEditBinsData",
    "canManageBinsPlans",
  ],
  4: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canManageWarehouse",
    "canViewWarehouseLogs",
    "canViewWarehouseAnalytics",
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
    "canViewNotifications",
    "canViewSurveys",
    "canCreateSurveys",
    "canEditSurveys",
    "canPublishSurveys",
    "canViewSurveyResults",
    "canCreateReports",
    "canPrint",
    "canExport",
    "canViewReports",
    "canOpenAdminPanel",
    "canManageWorkers",
    "canManageLifts",
    "canManageMoments",
    "canManagePlans",
    "canManageKarnas",
    "canManageTidplan",
    "canAddTidplanActivity",
    "canDeleteTidplanActivity",
    "canManageTidplanZones",
    "canPrintTidplan",
    "canClearTidplan",
    "canEditBinsData",
    "canManageBinsPlans",
    "canManageBinsPermissions",
    "canManageNotifications",
    "canApproveReports",
    "canViewLogs",
    "canViewSettings",
  ],
  5: [
    "canAccessPlanner",
    "canAccessTidplan",
    "canAccessBins",
    "canAccessWarehouse",
    "canManageWarehouse",
    "canViewWarehouseLogs",
    "canViewWarehouseAnalytics",
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
    "canViewNotifications",
    "canViewSurveys",
    "canCreateSurveys",
    "canEditSurveys",
    "canPublishSurveys",
    "canDeleteSurveys",
    "canViewSurveyResults",
    "canViewAnonymousSurveyVoters",
    "canManageSurveyPermissions",
    "canCreateReports",
    "canPrint",
    "canExport",
    "canViewReports",
    "canOpenAdminPanel",
    "canManageWorkers",
    "canManageLifts",
    "canManageMoments",
    "canManagePlans",
    "canManageKarnas",
    "canManageTidplan",
    "canAddTidplanActivity",
    "canDeleteTidplanActivity",
    "canManageTidplanZones",
    "canPrintTidplan",
    "canClearTidplan",
    "canEditBinsData",
    "canManageBinsPlans",
    "canManageBinsPermissions",
    "canManageNotifications",
    "canDeleteNotifications",
    "canApproveReports",
    "canDeleteReports",
    "canManageAdmins",
    "canManageSiteAccess",
    "canManageGuestAccess",
    "canViewLogs",
    "canClearLogs",
    "canViewSettings",
  ],
  6: Object.keys(DEFAULT_PERMISSIONS),
};

function getLevelTemplate(level) {
  const keys = ADMIN_LEVEL_PERMISSION_KEYS[level] || [];
  const template = {};
  Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
    template[key] = keys.includes(key);
  });
  return template;
}

function getLevelDefaultPermissions(level) {
  return getLevelTemplate(level);
}

function permissionsFitLevel(perms, level) {
  const template = getLevelTemplate(level);
  const normalized = normalizePermissions(perms);
  return Object.keys(DEFAULT_PERMISSIONS).every((key) => {
    if (normalized[key] !== false) {
      return template[key] === true;
    }
    return true;
  });
}

function deriveLevelFromPermissions(perms) {
  for (let i = ADMIN_LEVELS.length - 1; i >= 0; i -= 1) {
    const level = ADMIN_LEVELS[i];
    if (permissionsFitLevel(perms, level)) return level;
  }
  return 1;
}

function clampPermissionsToLevel(perms, level) {
  const template = getLevelTemplate(level);
  const normalized = normalizePermissions(perms);
  const clamped = {};
  Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
    clamped[key] = template[key] === true && normalized[key] !== false;
  });
  return clamped;
}

function getAdminLevel(admin) {
  if (admin?.isSuperAdmin) return 6;
  const raw = Number(admin?.level);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 6) return raw;
  return deriveLevelFromPermissions(admin?.permissions || {});
}

function getCurrentAdminLevel() {
  if (appState.isSuperAdmin) return 6;
  const raw = Number(appState.adminLevel);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 6) return raw;
  return deriveLevelFromPermissions(appState.permissions);
}

function canManageAdminsByLevel() {
  return hasAdminPermission("canManageAdmins") && getCurrentAdminLevel() >= 5;
}

function getMaxGrantableLevel() {
  const currentLevel = getCurrentAdminLevel();
  if (appState.isSuperAdmin) return 6;
  return Math.max(1, currentLevel - 1);
}

function canManageAdminRecord(targetAdmin) {
  if (!canManageAdminsByLevel()) return false;
  if (targetAdmin?.email === appState.currentUser) return false;
  if (targetAdmin?.isSuperAdmin) return false;
  const currentLevel = getCurrentAdminLevel();
  if (currentLevel >= 6) return true;
  const targetLevel = getAdminLevel(targetAdmin);
  return targetLevel < currentLevel;
}

function getPendingAdminLevel(email, fallbackLevel) {
  const stored = pendingAdminLevelSelections[email];
  if (Number.isFinite(stored) && stored >= 1 && stored <= 6) return stored;
  return fallbackLevel;
}

function setPendingAdminLevel(email, level) {
  if (!email) return;
  const value = Number(level);
  if (Number.isFinite(value) && value >= 1 && value <= 6) {
    pendingAdminLevelSelections[email] = value;
  }
}

function clearPendingAdminLevel(email) {
  if (email && pendingAdminLevelSelections[email]) {
    delete pendingAdminLevelSelections[email];
  }
}

function getPendingAdminPerms(email, fallbackPerms) {
  if (!email) return fallbackPerms;
  const stored = pendingAdminPermsByEmail[email];
  if (stored && typeof stored === "object") return stored;
  return fallbackPerms;
}

function setPendingAdminPerms(email, perms) {
  if (!email || !perms) return;
  pendingAdminPermsByEmail[email] = { ...perms };
}

function clearPendingAdminPerms(email) {
  if (email && pendingAdminPermsByEmail[email]) {
    delete pendingAdminPermsByEmail[email];
  }
}

var DEFAULT_GUEST_PERMISSIONS = {
  canAccessPlanner: true,
  canAccessTidplan: true,
  canAccessBins: false,
  canAccessWarehouse: false,
  canViewWarehouseLogs: false,
  canViewWarehouseAnalytics: false,
  canViewNotifications: false,
  canDeleteNotifications: false,
  canCreateReports: true,
  canPrint: false,
  canExport: false,
  canExportWarehouse: false,
  canImportWarehouse: false,
  canExportTidplan: false,
  canImportTidplan: false,
  canUnlockPastDays: false,
  warehouseAccessBySite: {},
};

var GUEST_PERMISSIONS_KEY = "cmax_guest_permissions";
var ADMIN_REMOVAL_NOTICES_KEY = "cmax_admin_removal_notices";

var ADMIN_PERMISSION_SECTIONS = [
  {
    titleKey: "permSectionGeneralTitle",
    noteKey: "permSectionGeneralNote",
    keys: [
      "canAccessPlanner",
      "canPrint",
      "canExport",
      "canExportPlanner",
      "canImportPlanner",
      "canClear",
      "canManageWorkers",
      "canManageLifts",
      "canManageMoments",
      "canManagePlans",
      "canManageKarnas",
    ],
  },
  {
    titleKey: "permSectionExportImportTitle",
    noteKey: "permSectionExportImportNote",
    keys: [
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
      "canExportPlanner",
      "canImportPlanner",
    ],
  },
  {
    titleKey: "permSectionPastDaysTitle",
    noteKey: "permSectionPastDaysNote",
    keys: ["canUnlockPastDays"],
  },
  {
    titleKey: "permSectionTidplanTitle",
    noteKey: "permSectionTidplanNote",
    keys: [
      "canAccessTidplan",
      "canManageTidplan",
      "canAddTidplanActivity",
      "canDeleteTidplanActivity",
      "canManageTidplanZones",
      "canPrintTidplan",
      "canClearTidplan",
    ],
  },
  {
    titleKey: "permSectionBinsTitle",
    noteKey: "permSectionBinsNote",
    keys: [
      "canAccessBins",
      "canEditBinsData",
      "canManageBinsPlans",
      "canManageBinsPermissions",
    ],
  },
  {
    titleKey: "permSectionWarehouseTitle",
    noteKey: "permSectionWarehouseNote",
    keys: [
      "canAccessWarehouse",
      "canViewWarehouse",
      "canManageWarehouse",
      "canViewWarehouseLogs",
      "canViewWarehouseAnalytics",
      "canAssignWarehouseToAdmin",
      "canExportWarehouse",
      "canImportWarehouse",
    ],
  },
  {
    titleKey: "permSectionSurveysTitle",
    noteKey: "permSectionSurveysNote",
    keys: [
      "canViewSurveys",
      "canCreateSurveys",
      "canEditSurveys",
      "canPublishSurveys",
      "canDeleteSurveys",
      "canViewSurveyResults",
      "canViewAnonymousSurveyVoters",
      "canManageSurveyPermissions",
    ],
  },
  {
    titleKey: "permSectionNotificationsTitle",
    noteKey: "permSectionNotificationsNote",
    keys: ["canViewNotifications", "canManageNotifications", "canDeleteNotifications"],
  },
  {
    titleKey: "permSectionReportsTitle",
    noteKey: "permSectionReportsNote",
    keys: [
      "canCreateReports",
      "canViewReports",
      "canApproveReports",
      "canDeleteReports",
    ],
  },
  {
    titleKey: "permSectionAdminTitle",
    noteKey: "permSectionAdminNote",
    keys: [
      "canManageAdmins",
      "canManageSiteAccess",
      "canViewLogs",
      "canClearLogs",
      "canViewSettings",
      "canManageGuestAccess",
      "canModifyReadOnly",
      "canToggleReadOnly",
    ],
  },
  {
    titleKey: "permSectionBackupTitle",
    noteKey: "permSectionBackupNote",
    keys: [
      "canManageBackups",
      "canViewBackups",
      "canRestoreBackups",
    ],
  },
];

var GUEST_PERMISSION_SECTIONS = [
  {
    titleKey: "permSectionGuestTitle",
    noteKey: "permSectionGuestNote",
    keys: [
      "canAccessPlanner",
      "canAccessTidplan",
      "canAccessBins",
      "canAccessWarehouse",
      "canViewWarehouseLogs",
      "canViewWarehouseAnalytics",
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
    "canExportPlanner",
    "canImportPlanner",
      "canViewNotifications",
      "canCreateReports",
      "canPrint",
      "canExport",
      "canExportWarehouse",
      "canImportWarehouse",
      "canExportTidplan",
      "canImportTidplan",
    ],
  },
];

