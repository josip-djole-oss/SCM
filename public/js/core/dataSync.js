function loadData(options = {}) {
  const { strict = false } = options;
  if (!BACKEND_ENABLED) {
    const savedData = getCachedStorageValue(STORAGE_KEY, null);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        applyPlannerDataToAppState(parsed);
      } catch (e) {
        console.error("Error loading data:", e);
        applyPlannerDataToAppState(createEmptyPlannerData());
      }
    } else {
      applyPlannerDataToAppState(createEmptyPlannerData());
    }
    collectPlans();
    return Promise.resolve();
  }

  const context = captureAppContext();
  const requestSequence = ++stateLoadSequence;
  return fetch("/api/state", { cache: "no-store" })
    .then((res) => {
      if (res.ok) return res.json();
      throw new Error(`STATE_LOAD_${res.status}`);
    })
    .then((data) => {
      if (!isAppContextCurrent(context) || requestSequence !== stateLoadSequence) throw new Error("STALE_APP_CONTEXT");
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      if (data?.state && applyServerStateSnapshot(data.state)) {
        collectPlans();
        return;
      }
      throw new Error("STATE_EMPTY");
    })
    .catch((error) => {
      if (error?.message !== "STALE_APP_CONTEXT") console.error("Server data load failed:", error);
      throw error;
    });
}

async function loadAllData(options = {}) {
  const { strict = false } = options;
  const token = CMAX_PERF?.begin?.("load-all-data", { strict });
  try {
    await loadData({ strict });
    const context = captureAppContext();
    if (BACKEND_ENABLED && window.CMAX?.projectModules?.load) {
      await CMAX.projectModules.load(currentSite);
    }
    if (!isAppContextCurrent(context)) throw new Error("STALE_APP_CONTEXT");
    CMAX.projectModules?.updateVisibility?.();
    loadBinsData();
    loadTidplanData();
    loadWarehouseData();
    const tasks = [];
    if (hasPermission("canViewReports") && isSiteModuleEnabled("reports")) tasks.push(loadReportsData({ strict }));
    if (canAccessNotificationsModule()) tasks.push(loadNotificationsData(currentSite, { strict }));
    if (hasPermission("canViewSurveys") && isSiteModuleEnabled("surveys")) tasks.push(getSurveysList({ strict }));
    await Promise.all(tasks);
    if (!isAppContextCurrent(context)) throw new Error("STALE_APP_CONTEXT");
    CMAX_PERF?.count?.("loadAllData");
  } finally {
    if (token) CMAX_PERF.end(token);
  }
}

function loadWarehouseData(site = currentSite) {
  warehouseData = normalizeWarehouseData(
    getCachedStorageJson(getSiteStorageKey("cmax_warehouse_data", site), null),
  );
}

function loadCurrentSiteRuntimeFromLocalStorage() {
  const planner = getCachedStorageJson(getSiteStorageKey("cmax_planner_data", currentSite), createEmptyPlannerData());
  applyPlannerDataToAppState(planner || createEmptyPlannerData());
  appState.binsData = getCachedStorageJson(getSiteStorageKey("cmax_planner_bins", currentSite), {}) || {};
  tidplanData = getCachedStorageJson(getSiteStorageKey("tidplan", currentSite), []) || [];
  loadTidplanZones();
  loadWarehouseData(currentSite);
  collectPlans();
}

function updateScopedStorageKeysForCurrentSite() {
  STORAGE_KEY = getStorageKey("cmax_planner_data");
  BINS_KEY = getStorageKey("cmax_planner_bins");
  REPORTS_KEY = getStorageKey("cmax_planner_reports");
  NOTIFICATIONS_KEY = getStorageKey("cmax_planner_notifications");
}

function getSiteDebugSummary(site) {
  const planner = getCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), createEmptyPlannerData()) || {};
  const tidplan = getCachedStorageJson(getSiteStorageKey("tidplan", site), []) || [];
  const warehouse = getCachedStorageJson(getSiteStorageKey("cmax_warehouse_data", site), null) || {};
  return {
    workers: Array.isArray(planner.workers) ? planner.workers.length : 0,
    lifts: Array.isArray(planner.lifts) ? planner.lifts.length : 0,
    moments: Array.isArray(planner.moments) ? planner.moments.length : 0,
    plans: Array.isArray(planner.plans) ? planner.plans.length : 0,
    karnas: Array.isArray(planner.karnas) ? planner.karnas.length : 0,
    tidplan: Array.isArray(tidplan) ? tidplan.length : 0,
    warehouseItems: Array.isArray(warehouse.catalog) ? warehouse.catalog.length : 0,
  };
}

function logSiteScopeDebug(action, details = {}) {
  if (sessionStorage.getItem("cmax_site_scope_debug") !== "true") return;
  console.info("[site-scope]", action, details);
}

function renderCurrentSiteAfterHydrate() {
  renderActiveSharedModule();
  updateNotifBadge();
  updateMainTitle();
}

function renderActiveSharedModule() {
  const token = typeof CMAX_PERF?.begin === "function"
    ? CMAX_PERF.begin("render-active-module", { view: currentView })
    : null;
  if (currentView === "bins") {
    renderAll();
    renderBinsTable();
  } else if (currentView === "warehouse") {
    renderWarehousePage();
  } else if (currentView === "warehouseLogs") {
    renderWarehouseLogsPage();
  } else if (currentView === "warehouseGraph") {
    renderWarehouseGraphPage();
  } else if (currentView === "workwear" && typeof renderWorkwearModule === "function") {
    renderWorkwearModule();
  } else if (currentView === "notifications") {
    renderNotificationSiteOptions();
    renderNotificationsList();
  } else if (currentView === "reports" && typeof renderReportsList === "function") {
    renderReportsList(typeof currentReportFilter === "string" ? currentReportFilter : "all");
  } else if (currentView === "surveys" && typeof renderSurveysList === "function") {
    renderSurveysList();
  } else if (document.getElementById("tidplan-section")?.style.display === "block" || currentView === "tidplan") {
    CMAX.tidplan.update();
  } else {
    renderAll();
  }
  CMAX_PERF?.count?.("renderActiveSharedModule");
  if (token) CMAX_PERF.end(token);
}

async function switchSiteFromLocal(toSite, options = {}) {
  if (!toSite || !getAccessibleSites().includes(toSite)) return false;
  if (toSite === currentSite && freshServerDataLoaded) return true;
  return withLoadingPromise("loadingSiteChange", async () => {
    if (BACKEND_ENABLED && freshServerDataLoaded) {
      const saved = await flushPendingModuleSaves();
      if (!saved) {
        showToast("Promjena gradilista nije moguca dok spremanje nije potvrdjeno.", "error");
        populateSiteSelect();
        return false;
      }
    }
    persistCurrentStateToLocalStorage();
    invalidateAppContext();
    currentSite = toSite;
    setStoredCurrentSitePreference(currentSite);
    updateScopedStorageKeysForCurrentSite();
    document.getElementById("mainContainer").style.display = "none";
    try {
      await loadFreshBackendData();
      freshServerDataLoaded = true;
      appDataLoadError = "";
      populateSiteSelect();
      renderCurrentSiteAfterHydrate();
      showMainApp();
      if (typeof restoreLastView === "function") restoreLastView();
      startAutoSave();
      return true;
    } catch (error) {
      if (error?.message !== "STALE_APP_CONTEXT") showDataLoadError(error?.message);
      return false;
    }
  });
}


function getSiteStorageKey(module, site) {
  return `${module}_${site}`;
}

function safeParseStoredJson(rawValue, fallbackValue = null) {
  if (!rawValue) return fallbackValue;
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return fallbackValue;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeDateOnly(value) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
}

function addDaysToDate(dateValue, days) {
  const date = new Date(`${normalizeDateOnly(dateValue)}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeResourceHistory(history, fallbackSite = currentSite) {
  return Array.isArray(history)
    ? history
        .map((entry) => ({
          type: String(entry?.type || "").trim(),
          resourceId: String(entry?.resourceId || "").trim(),
          siteId: String(entry?.siteId || fallbackSite || "default").trim(),
          activeFrom: normalizeDateOnly(entry?.activeFrom || "1970-01-01"),
          activeTo: entry?.activeTo ? normalizeDateOnly(entry.activeTo) : null,
          changedAt: entry?.changedAt || new Date().toISOString(),
          changedBy: entry?.changedBy || "",
        }))
        .filter((entry) => entry.type && entry.resourceId)
    : [];
}

function seedResourceHistoryForCurrentLists() {
  appState.resourceHistory = normalizeResourceHistory(appState.resourceHistory);
  ["workers", "lifts", "moments", "plans", "karnas"].forEach((type) => {
    (appState[type] || []).forEach((resourceId) => {
      const exists = appState.resourceHistory.some(
        (entry) =>
          entry.type === type &&
          entry.resourceId === resourceId &&
          entry.siteId === currentSite &&
          !entry.activeTo,
      );
      if (!exists) {
        appState.resourceHistory.push({
          type,
          resourceId,
          siteId: currentSite,
          activeFrom: "1970-01-01",
          activeTo: null,
          changedAt: new Date().toISOString(),
          changedBy: appState.currentUser || "",
        });
      }
    });
  });
}

function isResourceActiveOnDate(type, resourceId, dateValue = appState.currentDate, history = appState.resourceHistory) {
  const date = normalizeDateOnly(dateValue);
  return normalizeResourceHistory(history).some((entry) => {
    if (entry.type !== type || entry.resourceId !== resourceId || entry.siteId !== currentSite) return false;
    return entry.activeFrom <= date && (!entry.activeTo || entry.activeTo >= date);
  });
}

function getActiveResourceList(type, dateValue = appState.currentDate) {
  seedResourceHistoryForCurrentLists();
  const names = new Set(Array.isArray(appState[type]) ? appState[type] : []);
  normalizeResourceHistory(appState.resourceHistory)
    .filter((entry) => entry.type === type && entry.siteId === currentSite)
    .forEach((entry) => names.add(entry.resourceId));
  return sortNaturally(
    Array.from(names).filter((resourceId) =>
      isResourceActiveOnDate(type, resourceId, dateValue, appState.resourceHistory),
    ),
  );
}

function recordResourceAdded(type, resourceId, dateValue = appState.currentDate) {
  const activeFrom = normalizeDateOnly(dateValue);
  appState.resourceHistory = normalizeResourceHistory(appState.resourceHistory);
  appState.resourceHistory.push({
    type,
    resourceId,
    siteId: currentSite,
    activeFrom,
    activeTo: null,
    changedAt: new Date().toISOString(),
    changedBy: appState.currentUser || "",
  });
}

function recordResourceRemoved(type, resourceId, dateValue = appState.currentDate) {
  const activeTo = addDaysToDate(dateValue, -1);
  appState.resourceHistory = normalizeResourceHistory(appState.resourceHistory);
  let touched = false;
  appState.resourceHistory = appState.resourceHistory.map((entry) => {
    if (
      entry.type === type &&
      entry.resourceId === resourceId &&
      entry.siteId === currentSite &&
      !entry.activeTo
    ) {
      touched = true;
      return { ...entry, activeTo, changedAt: new Date().toISOString(), changedBy: appState.currentUser || "" };
    }
    return entry;
  });
  if (!touched) {
    appState.resourceHistory.push({
      type,
      resourceId,
      siteId: currentSite,
      activeFrom: "1970-01-01",
      activeTo,
      changedAt: new Date().toISOString(),
      changedBy: appState.currentUser || "",
    });
  }
}

function normalizeDailyDataForSave(dailyData = {}) {
  const source = dailyData && typeof dailyData === "object" ? dailyData : {};
  return Object.entries(source).reduce((result, [date, day]) => {
    const entry = day && typeof day === "object" ? day : {};
    const planningRows = Array.isArray(entry.planningRows)
      ? entry.planningRows.filter((row) => row && Object.values(row).some((value) => String(value ?? "").trim() !== ""))
      : [];
    const workerAttendance = entry.workerAttendance && typeof entry.workerAttendance === "object" ? entry.workerAttendance : {};
    const liftAvailability = entry.liftAvailability && typeof entry.liftAvailability === "object" ? entry.liftAvailability : {};
    const liftPlans = entry.liftPlans && typeof entry.liftPlans === "object" ? entry.liftPlans : {};
    if (
      planningRows.length === 0 &&
      Object.keys(workerAttendance).length === 0 &&
      Object.keys(liftAvailability).length === 0 &&
      Object.keys(liftPlans).length === 0
    ) {
      return result;
    }
    result[date] = {
      ...entry,
      planningRows: planningRows.map((row, index) => ensurePlannerRowIdentity(row, date, index)),
      workerAttendance,
      liftAvailability,
      liftPlans,
    };
    return result;
  }, {});
}

function persistCurrentStateToLocalStorage() {
  seedResourceHistoryForCurrentLists();
  appState.dailyData = normalizeDailyDataForSave(appState.dailyData);
  const plannerPayload = {
    workers: appState.workers,
    lifts: appState.lifts,
    moments: appState.moments,
    plans: appState.plans,
    karnas: appState.karnas,
    dailyData: normalizeDailyDataForSave(appState.dailyData),
    resourceHistory: normalizeResourceHistory(appState.resourceHistory),
  };
  setCachedStorageJson(STORAGE_KEY, plannerPayload);
  setCachedStorageJson(getSiteStorageKey("cmax_planner_data", currentSite), plannerPayload);
  setCachedStorageJson(BINS_KEY, appState.binsData || {});
  setCachedStorageJson(BIN_PERMS_KEY, appState.binPermissions || {});
  setCachedStorageJson(getStorageKey("tidplan"), tidplanData || []);
  setCachedStorageJson(getStorageKey("tidplan_zones"), tidplanZones || []);
  setCachedStorageJson(
    getSiteStorageKey("cmax_warehouse_data", currentSite),
    normalizeWarehouseData(warehouseData),
  );
  setCachedStorageJson(GUEST_PERMISSIONS_KEY, appState.guestPermissions || getGuestPermissions());
  CMAX_PERF?.count?.("persistCurrentStateToLocalStorage");
}

function makeClientEntityId(prefix = "entity") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function ensurePlannerRowIdentity(row, date = appState.currentDate, index = 0) {
  const source = row && typeof row === "object" ? row : {};
  const now = new Date().toISOString();
  const id = source.id || `planner_row_${String(date || "date").replace(/[^a-zA-Z0-9]+/g, "_")}_${index + 1}`;
  return {
    ...source,
    id,
    rowVersion: Math.max(1, Number(source.rowVersion || 1)),
    updatedAt: source.updatedAt || now,
    updatedBy: source.updatedBy || appState.currentUser || "",
    fieldVersions: source.fieldVersions && typeof source.fieldVersions === "object" ? source.fieldVersions : {},
  };
}

function ensureTidplanActivityIdentity(activity, index = 0) {
  const source = activity && typeof activity === "object" ? activity : {};
  const now = new Date().toISOString();
  const id = source.id || `tidplan_activity_${index + 1}`;
  return {
    ...source,
    id,
    activityVersion: Math.max(1, Number(source.activityVersion || 1)),
    updatedAt: source.updatedAt || now,
    updatedBy: source.updatedBy || appState.currentUser || "",
    fieldVersions: source.fieldVersions && typeof source.fieldVersions === "object" ? source.fieldVersions : {},
  };
}

function mergePlannerSnapshot(localPlanner, serverPlanner, site = currentSite) {
  const local = localPlanner && typeof localPlanner === "object" ? localPlanner : {};
  const server = serverPlanner && typeof serverPlanner === "object" ? serverPlanner : {};
  const authoritativeList = (localList, serverList) => {
    if (Array.isArray(localList)) {
      return sortNaturally(Array.from(new Set(localList)));
    }
    return sortNaturally(Array.from(new Set(Array.isArray(serverList) ? serverList : [])));
  };

  const mergeResourceHistorySnapshot = () => {
    const mergedByKey = new Map();
    const put = (entry) => {
      if (!entry) return;
      const key = [
        entry.type,
        entry.siteId || currentSite,
        entry.resourceId,
        entry.activeFrom || "1970-01-01",
      ].join("|");
      mergedByKey.set(key, entry);
    };
    normalizeResourceHistory(server.resourceHistory, site).forEach(put);
    const localHistory = normalizeResourceHistory(local.resourceHistory, site);
    localHistory.forEach(put);
    const merged = Array.from(mergedByKey.values());

    localHistory
      .filter((entry) => entry.activeTo)
      .forEach((removed) => {
        merged.forEach((entry, index) => {
          const sameResource =
            entry.type === removed.type &&
            entry.siteId === removed.siteId &&
            entry.resourceId === removed.resourceId;
          const overlapsRemoval = entry.activeFrom <= removed.activeTo && (!entry.activeTo || entry.activeTo > removed.activeTo);
          if (sameResource && overlapsRemoval) {
            merged[index] = {
              ...entry,
              activeTo: removed.activeTo,
              changedAt: removed.changedAt || entry.changedAt,
              changedBy: removed.changedBy || entry.changedBy,
            };
          }
        });
      });

    return normalizeResourceHistory(merged, site);
  };

  return {
    ...server,
    ...local,
    workers: authoritativeList(local.workers, server.workers),
    lifts: authoritativeList(local.lifts, server.lifts),
    moments: authoritativeList(local.moments, server.moments),
    plans: authoritativeList(local.plans, server.plans),
    karnas: authoritativeList(local.karnas, server.karnas),
    resourceHistory: mergeResourceHistorySnapshot(),
    dailyData:
      local.dailyData && typeof local.dailyData === "object"
        ? local.dailyData
        : server.dailyData || {},
  };
}

function protectCurrentAdminRecordForSync(admins, serverState, options = {}) {
  if (options.includeAdmins !== true || !Array.isArray(admins)) return admins;
  const currentEmail = (appState.currentUser || "").trim().toLowerCase();
  if (!currentEmail) return admins;
  const targetEmail = (options.adminEditTargetEmail || "").trim().toLowerCase();
  if (targetEmail === currentEmail) return admins;

  const serverAdmins = Array.isArray(serverState?.admins) ? serverState.admins : [];
  const serverSelf = serverAdmins.find(
    (admin) => (admin?.email || "").trim().toLowerCase() === currentEmail,
  );
  if (!serverSelf) return admins;

  let foundSelf = false;
  const protectedAdmins = admins.map((admin) => {
    if ((admin?.email || "").trim().toLowerCase() !== currentEmail) return admin;
    foundSelf = true;
    return serverSelf;
  });
  if (!foundSelf) protectedAdmins.push(serverSelf);
  return protectedAdmins;
}

function getCurrentUserAccountNotificationKey() {
  return String(appState.currentUser || "").trim().toLowerCase();
}

function getCurrentUserAccountNotificationBundle() {
  const userKey = getCurrentUserAccountNotificationKey();
  if (!userKey) return null;
  return {
    notifications: getCachedStorageJson(`cmax_account_notifications_${userKey}`, []) || [],
    siteTracker: getCachedStorageJson(`cmax_account_notification_site_tracker_${userKey}`, {}) || {},
    permissionSignature: String(getCachedStorageValue(`cmax_account_notification_perm_${userKey}`, "") || ""),
    workwearTracker: getCachedStorageJson(`cmax_workwear_account_notification_tracker_${userKey}`, {}) || {},
    updatedAt: new Date().toISOString(),
  };
}

function applyCurrentUserAccountNotificationBundle(bundle) {
  const userKey = getCurrentUserAccountNotificationKey();
  if (!userKey || !bundle || typeof bundle !== "object") return;
  setCachedStorageJson(
    `cmax_account_notifications_${userKey}`,
    Array.isArray(bundle.notifications) ? bundle.notifications : [],
  );
  setCachedStorageJson(
    `cmax_account_notification_site_tracker_${userKey}`,
    bundle.siteTracker && typeof bundle.siteTracker === "object" ? bundle.siteTracker : {},
  );
  setCachedStorageJson(
    `cmax_workwear_account_notification_tracker_${userKey}`,
    bundle.workwearTracker && typeof bundle.workwearTracker === "object" ? bundle.workwearTracker : {},
  );
  if (typeof bundle.permissionSignature === "string" && bundle.permissionSignature) {
    setCachedStorageValue(`cmax_account_notification_perm_${userKey}`, bundle.permissionSignature);
  }
}

function buildServerStateSnapshot(baseState = null, options = {}) {
  persistCurrentStateToLocalStorage();
  const serverState = baseState && typeof baseState === "object" ? baseState : {};
  const siteList = Array.isArray(sites) && sites.length ? [...sites] : ["default"];
  const siteData = {};
  const localAdmins = getCachedStorageJson(ADMINS_KEY, []);
  const localGuestPermissions = getCachedStorageJson(GUEST_PERMISSIONS_KEY, appState.guestPermissions);
  const localAdminRemovalNotices = getCachedStorageJson(ADMIN_REMOVAL_NOTICES_KEY, {});
  const localBinPermissions = getCachedStorageJson(BIN_PERMS_KEY, appState.binPermissions);
  const snapshotSites =
    options.includeSites === true
      ? siteList
      : Array.isArray(serverState.sites) && serverState.sites.length
        ? [...serverState.sites]
        : siteList;
  const adminsForSnapshot = protectCurrentAdminRecordForSync(localAdmins, serverState, options);
  const currentSnapshotSite = siteList.includes(currentSite) ? currentSite : siteList[0];
  const currentUserKey = getCurrentUserAccountNotificationKey();
  const localAccountBundle = getCurrentUserAccountNotificationBundle();
  const serverAccountNotifications =
    serverState.accountNotifications && typeof serverState.accountNotifications === "object"
      ? serverState.accountNotifications
      : {};
  const nextAccountNotifications = { ...serverAccountNotifications };
  if (currentUserKey && localAccountBundle) {
    nextAccountNotifications[currentUserKey] = localAccountBundle;
  }
  const siteSnapshotList = options.includeSites === true
    ? siteList
    : currentSnapshotSite
      ? [currentSnapshotSite]
      : siteList.slice(0, 1);

  siteSnapshotList.forEach((site) => {
    const localPlanner = getCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), null);
    const serverPlanner =
      serverState.siteData &&
      serverState.siteData[site] &&
      serverState.siteData[site].planner &&
      typeof serverState.siteData[site].planner === "object"
        ? serverState.siteData[site].planner
        : null;
    const serverNotifications =
      serverState.siteData &&
      serverState.siteData[site] &&
      Array.isArray(serverState.siteData[site].notifications)
        ? serverState.siteData[site].notifications
        : null;
    const localNotifications = getCachedStorageJson(getSiteStorageKey("cmax_planner_notifications", site), null);
    const plannerSnapshot = mergePlannerSnapshot(localPlanner, serverPlanner, site);
    siteData[site] = {
      planner: plannerSnapshot,
      workers: Array.isArray(plannerSnapshot.workers) ? plannerSnapshot.workers : [],
      lifts: Array.isArray(plannerSnapshot.lifts) ? plannerSnapshot.lifts : [],
      moments: Array.isArray(plannerSnapshot.moments) ? plannerSnapshot.moments : [],
      plans: Array.isArray(plannerSnapshot.plans) ? plannerSnapshot.plans : [],
      karnas: Array.isArray(plannerSnapshot.karnas) ? plannerSnapshot.karnas : [],
      bins: getCachedStorageJson(getSiteStorageKey("cmax_planner_bins", site), null),
      tidplan: getCachedStorageJson(getSiteStorageKey("tidplan", site), null),
      tidplanZones: getCachedStorageJson(getSiteStorageKey("tidplan_zones", site), null),
      warehouse: normalizeWarehouseData(
        getCachedStorageJson(getSiteStorageKey("cmax_warehouse_data", site), null),
      ),
      store: getCachedStorageJson(getSiteStorageKey("cmax_workwear_data", site), null),
      siteInfo: getCachedStorageJson(getSiteStorageKey("cmax_site_info", site), serverState.siteData?.[site]?.siteInfo || {}),
      reports: getCachedStorageJson(getSiteStorageKey("cmax_planner_reports", site), []),
      notifications: Array.isArray(localNotifications)
        ? localNotifications
        : Array.isArray(serverNotifications)
          ? serverNotifications
          : [],
    };
  });

  return {
    version: 2,
    savedAt: new Date().toISOString(),
    savedBy: appState.currentUser || null,
    sites: snapshotSites,
    currentSite:
      options.includeSites === true
        ? currentSite
        : serverState.currentSite && snapshotSites.includes(serverState.currentSite)
          ? serverState.currentSite
          : currentSite,
    admins:
      options.includeAdmins === true
        ? adminsForSnapshot
        : Array.isArray(serverState.admins)
          ? serverState.admins
          : undefined,
    guestPermissions:
      options.includeGuestPermissions === true
        ? localGuestPermissions
        : serverState.guestPermissions || localGuestPermissions,
    adminRemovalNotices:
      options.includeAdminRemovalNotices === true
        ? localAdminRemovalNotices
        : serverState.adminRemovalNotices || undefined,
    binPermissions:
      options.includeBinPermissions === true
        ? localBinPermissions
        : serverState.binPermissions || localBinPermissions,
    accountNotifications: nextAccountNotifications,
    siteData,
  };
}

function applyServerStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || snapshot.version !== 2) {
    return false;
  }
  rememberAppliedRemoteState(snapshot, serverStateVersion);
  rememberServerStateBaseline(snapshot);
  setLastEditedMeta(snapshot);
  moduleStateVersions = snapshot.moduleVersions && typeof snapshot.moduleVersions === "object"
    ? JSON.parse(JSON.stringify(snapshot.moduleVersions))
    : {};

  const snapshotSites =
    Array.isArray(snapshot.sites) && snapshot.sites.length
      ? snapshot.sites
      : ["default"];
  sites = [...snapshotSites];
  setCachedStorageJson(SITES_KEY, sites);

  const storedCurrentSite = getStoredCurrentSitePreference();
  const preferredCurrentSite =
    storedCurrentSite && sites.includes(storedCurrentSite)
      ? storedCurrentSite
      : snapshot.currentSite && sites.includes(snapshot.currentSite)
        ? snapshot.currentSite
        : sites[0];
  currentSite = preferredCurrentSite;
  setStoredCurrentSitePreference(currentSite);

  if (Array.isArray(snapshot.admins)) {
    setCachedStorageJson(ADMINS_KEY, snapshot.admins);
  }
  if (snapshot.guestPermissions) {
    setCachedStorageJson(GUEST_PERMISSIONS_KEY, normalizeGuestPermissions(snapshot.guestPermissions));
  }
  if (snapshot.binPermissions) {
    setCachedStorageJson(BIN_PERMS_KEY, snapshot.binPermissions);
  }

  const snapshotSiteData = snapshot.siteData || {};
  const accountNotifications = snapshot.accountNotifications && typeof snapshot.accountNotifications === "object"
    ? snapshot.accountNotifications
    : {};
  const currentUserKey = getCurrentUserAccountNotificationKey();
  if (currentUserKey) {
    applyCurrentUserAccountNotificationBundle(accountNotifications[currentUserKey] || {});
  }
  sites.forEach((site) => {
    const siteEntry = snapshotSiteData[site] || {};
    const planner = siteEntry.planner && typeof siteEntry.planner === "object"
      ? siteEntry.planner
      : {
          workers: siteEntry.workers,
          lifts: siteEntry.lifts,
          moments: siteEntry.moments,
          plans: siteEntry.plans,
          karnas: siteEntry.karnas,
          dailyData: siteEntry.dailyData,
          resourceHistory: siteEntry.resourceHistory,
        };
    setCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), normalizePlannerData(planner, site));
    setCachedStorageJson(
      getSiteStorageKey("cmax_planner_bins", site),
      siteEntry.bins && typeof siteEntry.bins === "object" ? siteEntry.bins : {},
    );
    setCachedStorageJson(getSiteStorageKey("tidplan", site), Array.isArray(siteEntry.tidplan) ? siteEntry.tidplan : []);
    setCachedStorageJson(
      getSiteStorageKey("tidplan_zones", site),
      Array.isArray(siteEntry.tidplanZones) ? siteEntry.tidplanZones : DEFAULT_SITE_TEMPLATE.tidplanZones,
    );
    setCachedStorageJson(
      getSiteStorageKey("cmax_warehouse_data", site),
      normalizeWarehouseData(siteEntry.warehouse),
    );
    setCachedStorageJson(
      getSiteStorageKey("cmax_workwear_data", site),
      siteEntry.store && typeof siteEntry.store === "object" ? siteEntry.store : {},
    );
    setCachedStorageJson(
      getSiteStorageKey("cmax_site_info", site),
      siteEntry.siteInfo && typeof siteEntry.siteInfo === "object" ? siteEntry.siteInfo : {},
    );
    setCachedStorageJson(
      getSiteStorageKey("cmax_planner_reports", site),
      Array.isArray(siteEntry.reports) ? siteEntry.reports : [],
    );
    setCachedStorageJson(
      getSiteStorageKey("cmax_planner_notifications", site),
      Array.isArray(siteEntry.notifications) ? siteEntry.notifications : [],
    );
  });

  updateScopedStorageKeysForCurrentSite();
  const currentPlanner = getCachedStorageJson(STORAGE_KEY, null);
  applyPlannerDataToAppState(currentPlanner || createEmptyPlannerData());
  appState.guestPermissions = getGuestPermissions();
  populateSiteSelect();
  updateMainTitle();
  return true;
}

var serverSyncTimeout = null;
var serverStateVersion = 1;
var serverSyncInFlight = null;
var moduleSyncTimeouts = {};
var moduleSyncInFlight = {};
var pendingModuleSaves = {};
var moduleSaveFailures = {};

function getModuleStateVersion(target, site = currentSite) {
  const versions = moduleStateVersions && typeof moduleStateVersions === "object" ? moduleStateVersions : {};
  if (target === "adminUsers") return Math.max(1, Number(versions.adminUsers || 1));
  const scoped = versions[target] && typeof versions[target] === "object" ? versions[target] : {};
  return Math.max(1, Number(scoped[site] || 1));
}

function setModuleStateVersion(target, version, site = currentSite) {
  const safeVersion = Math.max(1, Number(version || 1));
  if (!moduleStateVersions || typeof moduleStateVersions !== "object") moduleStateVersions = {};
  if (target === "adminUsers") {
    moduleStateVersions.adminUsers = safeVersion;
    return safeVersion;
  }
  if (!moduleStateVersions[target] || typeof moduleStateVersions[target] !== "object") {
    moduleStateVersions[target] = {};
  }
  moduleStateVersions[target][site] = safeVersion;
  return safeVersion;
}

function createModuleStatePayload(target) {
  if (target === "planner") {
    persistCurrentStateToLocalStorage();
    return {
      planner: getCachedStorageJson(getSiteStorageKey("cmax_planner_data", currentSite), createEmptyPlannerData()) || createEmptyPlannerData(),
    };
  }
  if (target === "tidplan") {
    return {
      tidplan: Array.isArray(tidplanData) ? tidplanData : [],
      tidplanZones: Array.isArray(tidplanZones) ? tidplanZones : [],
    };
  }
  if (target === "warehouse") {
    return { warehouse: normalizeWarehouseData(warehouseData) };
  }
  if (target === "bins") {
    return { bins: appState.binsData || {} };
  }
  if (target === "storeCatalog" || target === "storeSettings") {
    return { store: typeof getWorkwearState === "function" ? getWorkwearState(currentSite) : {} };
  }
  if (target === "adminUsers") {
    return {
      admins: getCachedStorageJson(ADMINS_KEY, []) || [],
      guestPermissions: getCachedStorageJson(GUEST_PERMISSIONS_KEY, appState.guestPermissions || {}),
      binPermissions: getCachedStorageJson(BIN_PERMS_KEY, appState.binPermissions || {}),
      adminRemovalNotices: getCachedStorageJson(ADMIN_REMOVAL_NOTICES_KEY, {}),
    };
  }
  return {};
}

async function syncModuleState(target, payload = null, options = {}) {
  if (!BACKEND_ENABLED || appState.isReadonly || !appState.currentUser) return false;
  const siteId = options.siteId || currentSite || "default";
  const context = captureAppContext();
  const requestPayload = JSON.parse(JSON.stringify(payload || createModuleStatePayload(target)));
  const key = target === "adminUsers" ? target : `${target}:${siteId}`;
  if (moduleSyncInFlight[key]) {
    await moduleSyncInFlight[key];
    if (!isAppContextCurrent(context)) return false;
    if (moduleSaveFailures[key]) return false;
    return syncModuleState(target, requestPayload, { ...options, siteId });
  }
  const saveRevision = Number(appState.editRevision) || 0;
  const promise = Promise.resolve().then(async () => {
    try {
      const res = await fetch("/api/state/module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, siteId, baseVersion: options.baseVersion || getModuleStateVersion(target, siteId), payload: requestPayload }),
      });
      const response = await res.json();
      if (!res.ok) {
        const error = new Error(response?.error || "MODULE_STATE_SAVE_FAILED");
        error.status = res.status;
        error.payload = response;
        throw error;
      }
      if (!response || !Number.isFinite(Number(response.moduleVersion)) || Number(response.moduleVersion) < 1) {
        throw new Error("MODULE_SAVE_UNCONFIRMED");
      }
      if (!isAppContextCurrent(context)) return false;
      setModuleStateVersion(target, response.moduleVersion, siteId);
      if (response.version) serverStateVersion = Number(response.version);
      if (response.admins && target === "adminUsers") setCachedStorageJson(ADMINS_KEY, response.admins);
      delete moduleSaveFailures[key];
      if (["planner", "tidplan", "bins"].includes(target) && !pendingModuleSaves[key] && saveRevision === (Number(appState.editRevision) || 0)
          && stableJson(requestPayload) === stableJson(createModuleStatePayload(target))) {
        if (target === "tidplan") tidplanDataChanged = false;
        if (target === "planner" && typeof markClean === "function") markClean();
      }
      CMAX_PERF?.count?.("syncModuleState");
      return true;
    } catch (error) {
      if (!isAppContextCurrent(context)) return false;
      moduleSaveFailures[key] = true;
      if (error?.payload?.error === "MODULE_VERSION_CONFLICT") {
        // Keep the original base version: retrying local data against a new version would overwrite another user's work.
        showServerConflictNotice("Ovaj modul je promijenjen na drugom uredjaju. Usporedite promjene prije ponovnog spremanja.");
      } else {
        console.error("Module sync failed:", target, error);
        showToast("Spremanje na server nije uspjelo. Unosi nisu izgubljeni; pokusajte ponovo.", "error");
      }
      return false;
    } finally {
      if (moduleSyncInFlight[key] === promise) delete moduleSyncInFlight[key];
    }
  });
  moduleSyncInFlight[key] = promise;
  return promise;
}

function renderAfterEntityConflict(moduleName) {
  if (moduleName === "planner") {
    persistCurrentStateToLocalStorage();
    if (typeof renderPlanningTable === "function") renderPlanningTable();
    return;
  }
  if (moduleName === "tidplan") {
    localStorage.setItem(getStorageKey("tidplan"), JSON.stringify((tidplanData || []).map((item, index) => ensureTidplanActivityIdentity(item, index))));
    if (typeof updateTidplan === "function") updateTidplan();
  }
}

function showEntityConflictNotice(errorPayload, context = {}) {
  const conflicts = Array.isArray(errorPayload?.conflicts) ? errorPayload.conflicts : [];
  const first = conflicts[0];
  const serverEntity = errorPayload?.serverEntity || {};
  const moduleName = context.module || (errorPayload?.entityType === "tidplanActivity" ? "tidplan" : "planner");
  const localEntity = context.entity;
  const changedFields = context.changedFields || {};
  const baseFieldVersions = context.baseFieldVersions || {};
  const fallbackMessage = moduleName === "tidplan"
    ? "Tidplan aktivnost je promijenjena na drugom uredjaju."
    : "Planner red je promijenjen na drugom uredjaju.";
  if (typeof showEntityConflictPanel === "function") {
    showEntityConflictPanel({
      module: moduleName,
      moduleLabel: moduleName === "tidplan" ? "Tidplan" : "Planner",
      entityId: errorPayload?.entityId || localEntity?.id,
      rowLabel: moduleName === "planner" ? `Row ${localEntity?.id || errorPayload?.entityId || ""}` : "",
      activityLabel: moduleName === "tidplan" ? (serverEntity.plan || serverEntity.moment || serverEntity.id || errorPayload?.entityId || "") : "",
      conflicts,
      serverEntity,
      changedFields,
      onUseServer: ({ field, serverValue }) => {
        if (localEntity && field) localEntity[field] = serverValue;
        if (localEntity && serverEntity) Object.assign(localEntity, serverEntity);
        renderAfterEntityConflict(moduleName);
      },
      onRefresh: () => {
        if (localEntity && serverEntity) Object.assign(localEntity, serverEntity);
        renderAfterEntityConflict(moduleName);
      },
      onKeepMine: () => {
        if (!localEntity || !first?.field) return;
        const retryVersions = { ...baseFieldVersions, ...(serverEntity.fieldVersions || {}) };
        if (moduleName === "planner") {
          patchPlannerRow(context.date || appState.currentDate, localEntity, changedFields, {
            siteId: context.siteId || currentSite,
            baseFieldVersions: retryVersions,
          }).catch(() => {});
        } else {
          patchTidplanActivity(localEntity, changedFields, {
            siteId: context.siteId || currentSite,
            baseFieldVersions: retryVersions,
          }).catch(() => {});
        }
      },
    });
    return;
  }
  const detail = first ? `${fallbackMessage} Polje: ${first.field}. Server: "${first.serverValue ?? ""}", moje: "${first.clientValue ?? ""}".` : fallbackMessage;
  if (typeof showServerConflictNotice === "function") showServerConflictNotice(detail);
  else if (typeof showToast === "function") showToast(detail, "error");
}

function patchPlannerRow(date, row, changedFields, options = {}) {
  if (!BACKEND_ENABLED || appState.isReadonly || !appState.currentUser || !row?.id) return Promise.resolve(false);
  const siteId = options.siteId || currentSite || "default";
  const context = captureAppContext();
  const body = {
    changedFields,
    baseRowVersion: row.rowVersion || 1,
    baseFieldVersions: options.baseFieldVersions || row.fieldVersions || {},
  };
  return fetch(`/api/planner/${encodeURIComponent(siteId)}/${encodeURIComponent(date)}/rows/${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((res) =>
      res.ok
        ? res.json().catch(() => ({}))
        : res.json().catch(() => ({})).then((payload) => {
            const error = new Error(payload?.error || "PLANNER_ROW_SAVE_FAILED");
            error.status = res.status;
            error.payload = payload;
            throw error;
          }),
    )
    .then((payload) => {
      if (!isAppContextCurrent(context)) return false;
      if (!payload?.row) throw new Error("PLANNER_ROW_SAVE_UNCONFIRMED");
      if (payload?.row) {
        Object.assign(row, payload.row);
        persistCurrentStateToLocalStorage();
      }
      return true;
    })
    .catch((error) => {
      if (!isAppContextCurrent(context)) return false;
      if (error?.payload?.error === "ENTITY_VERSION_CONFLICT") {
        showEntityConflictNotice(error.payload, {
          module: "planner",
          entity: row,
          changedFields,
          baseFieldVersions: body.baseFieldVersions,
          date,
          siteId,
        });
        return false;
      }
      console.error("Planner row save failed:", error);
      showToast("Spremanje nije uspjelo. Promjene nisu potvrdjene na serveru.", "error");
      return false;
    });
}

function patchTidplanActivity(activity, changedFields, options = {}) {
  if (!BACKEND_ENABLED || appState.isReadonly || !appState.currentUser || !activity?.id) return Promise.resolve(false);
  const siteId = options.siteId || currentSite || "default";
  const context = captureAppContext();
  const body = {
    changedFields,
    baseActivityVersion: activity.activityVersion || 1,
    baseFieldVersions: options.baseFieldVersions || activity.fieldVersions || {},
  };
  return fetch(`/api/tidplan/${encodeURIComponent(siteId)}/activities/${encodeURIComponent(activity.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((res) =>
      res.ok
        ? res.json().catch(() => ({}))
        : res.json().catch(() => ({})).then((payload) => {
            const error = new Error(payload?.error || "TIDPLAN_ACTIVITY_SAVE_FAILED");
            error.status = res.status;
            error.payload = payload;
            throw error;
          }),
    )
    .then((payload) => {
      if (!isAppContextCurrent(context)) return false;
      if (!payload?.activity) throw new Error("TIDPLAN_ACTIVITY_SAVE_UNCONFIRMED");
      if (payload?.activity) {
        Object.assign(activity, payload.activity);
        localStorage.setItem(getStorageKey("tidplan"), JSON.stringify((tidplanData || []).map((item, index) => ensureTidplanActivityIdentity(item, index))));
      }
      return true;
    })
    .catch((error) => {
      if (!isAppContextCurrent(context)) return false;
      if (error?.payload?.error === "ENTITY_VERSION_CONFLICT") {
        showEntityConflictNotice(error.payload, {
          module: "tidplan",
          entity: activity,
          changedFields,
          baseFieldVersions: body.baseFieldVersions,
          siteId,
        });
        return false;
      }
      console.error("Tidplan activity save failed:", error);
      showToast("Spremanje nije uspjelo. Promjene nisu potvrdjene na serveru.", "error");
      return false;
    });
}

function scheduleModuleSync(target, delay = 600, payload = null, options = {}) {
  if (!BACKEND_ENABLED || appState.isReadonly || !appState.currentUser) return;
  const siteId = options.siteId || currentSite || "default";
  const context = captureAppContext();
  const key = target === "adminUsers" ? target : `${target}:${siteId}`;
  if (moduleSyncTimeouts[key]) clearTimeout(moduleSyncTimeouts[key]);
  // Capture both scope and content now; resolving either after a switch corrupts the other project.
  pendingModuleSaves[key] = { target, payload: JSON.parse(JSON.stringify(payload || createModuleStatePayload(target))), options: { ...options, siteId }, context };
  moduleSyncTimeouts[key] = setTimeout(() => {
    delete moduleSyncTimeouts[key];
    const queued = pendingModuleSaves[key];
    delete pendingModuleSaves[key];
    if (queued && isAppContextCurrent(queued.context)) syncModuleState(queued.target, queued.payload, queued.options);
  }, delay);
}

async function flushPendingModuleSaves() {
  const saves = Object.values(pendingModuleSaves);
  Object.values(moduleSyncTimeouts).forEach(clearTimeout);
  moduleSyncTimeouts = {};
  pendingModuleSaves = {};
  const jobs = Object.values(moduleSyncInFlight);
  if (serverSyncInFlight) jobs.push(serverSyncInFlight);
  if (serverSyncTimeout) {
    clearTimeout(serverSyncTimeout);
    serverSyncTimeout = null;
    jobs.push(syncServerState({ ...pendingServerSyncOptions }));
  }
  saves.forEach((queued) => {
    if (isAppContextCurrent(queued.context)) jobs.push(syncModuleState(queued.target, queued.payload, queued.options));
  });
  const results = await Promise.all(jobs);
  return results.every((saved) => saved === true) && !Object.keys(moduleSaveFailures).length;
}

function stopServerSync() {
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
  Object.values(moduleSyncTimeouts).forEach(clearTimeout);
  moduleSyncTimeouts = {};
  pendingModuleSaves = {};
  moduleSaveFailures = {};
  moduleSyncInFlight = {};
  serverSyncTimeout = null;
  serverSyncInFlight = null;
  pendingServerSyncOptions = {};
}

function syncServerState(options = {}) {
  const {
    showSuccess = false,
    markAsClean = false,
    keepalive = false,
    includeAdmins = false,
    includeGuestPermissions = false,
    includeBinPermissions = false,
    includeSites = false,
    includeAdminRemovalNotices = false,
    adminEditTargetEmail = "",
    skipLog = false,
  } = options;

  if (!appState.currentUser) {
    return Promise.resolve(false);
  }

  const context = captureAppContext();
  const editRevision = Number(appState.editRevision) || 0;
  persistCurrentStateToLocalStorage();

  if (!BACKEND_ENABLED) {
    if (markAsClean) markClean();
    if (showSuccess) showToast(t("dataSaved"), "success");
    return Promise.resolve(true);
  }
  if (!freshServerDataLoaded) {
    return Promise.resolve(false);
  }
  if (serverSyncInFlight) {
    return serverSyncInFlight.catch(() => false).then(() => isAppContextCurrent(context) ? syncServerState(options) : false);
  }
  const syncOptions = {
    ...options,
    module:
      options.module ||
      (currentView === "tidplan"
        ? "tidplan"
        : currentView === "warehouse"
          ? "warehouse"
          : currentView === "notifications"
            ? "notifications"
            : "planner"),
  };
  const token = CMAX_PERF?.begin?.("sync-server-state", {
    includeAdmins,
    includeSites,
    module: syncOptions.module,
  });

  serverSyncInFlight = fetch("/api/state", { cache: "no-store" })
    .then((res) => {
      if (res.ok) return res.json();
      throw createServerSyncError(`STATE_LOAD_${res.status}`, res.status);
    })
    .then((data) => {
      if (!isAppContextCurrent(context)) throw new Error("STALE_APP_CONTEXT");
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      return postServerStateSnapshot(data?.state || null, serverStateVersion, syncOptions);
    })
    .then((payload) => {
      if (!isAppContextCurrent(context)) return false;
      if (!payload || !Number.isFinite(Number(payload.version))) throw new Error("STATE_SAVE_UNCONFIRMED");
      serverStateVersion = Number(payload?.version) || serverStateVersion || 1;
      setLastEditedMeta({
        by: appState.currentUser || null,
        byName: appState.currentUserName || "",
        at: payload?.updatedAt || new Date().toISOString(),
      });
      renderLastEditedInfo();
      if (markAsClean && editRevision === (Number(appState.editRevision) || 0)) markClean();
      if (!appState.hasUnsavedChanges && !tidplanDataChanged) {
        localEditKeys.clear();
      }
      if (includeAdmins) pendingServerSyncOptions.includeAdmins = false;
      if (includeGuestPermissions) pendingServerSyncOptions.includeGuestPermissions = false;
      if (includeBinPermissions) pendingServerSyncOptions.includeBinPermissions = false;
      if (includeSites) pendingServerSyncOptions.includeSites = false;
      if (includeAdminRemovalNotices) pendingServerSyncOptions.includeAdminRemovalNotices = false;
      if (adminEditTargetEmail) pendingServerSyncOptions.adminEditTargetEmail = "";
      if (showSuccess) showToast(t("dataSaved"), "success");
      CMAX_PERF?.count?.("syncServerState");
      if (token) CMAX_PERF.end(token, { success: true });
      return true;
    })
    .catch((error) => {
      if (!isAppContextCurrent(context) || error?.status === 401 || error?.code === "STATE_LOAD_401") {
        return false;
      }
      if (error?.code === "VERSION_CONFLICT" && typeof showServerConflictNotice === "function") {
        showServerConflictNotice();
      }
      console.error("Server sync failed:", error);
      showToast("Server save failed. Your changes are not saved.", "error");
      if (token) CMAX_PERF.end(token, { success: false, error: error?.code || error?.message || "SYNC_FAILED" });
      return false;
    })
    .finally(() => {
      if (isAppContextCurrent(context)) serverSyncInFlight = null;
    });
  return serverSyncInFlight;
}

function scheduleServerSync(delay = 3000, options = {}) {
  if (!BACKEND_ENABLED || appState.isReadonly || !appState.currentUser) return;
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
  pendingServerSyncOptions.includeAdmins =
    pendingServerSyncOptions.includeAdmins || options.includeAdmins === true;
  pendingServerSyncOptions.includeGuestPermissions =
    pendingServerSyncOptions.includeGuestPermissions ||
    options.includeGuestPermissions === true;
  pendingServerSyncOptions.includeBinPermissions =
    pendingServerSyncOptions.includeBinPermissions ||
    options.includeBinPermissions === true;
  pendingServerSyncOptions.includeSites =
    pendingServerSyncOptions.includeSites || options.includeSites === true;
  pendingServerSyncOptions.includeAdminRemovalNotices =
    pendingServerSyncOptions.includeAdminRemovalNotices ||
    options.includeAdminRemovalNotices === true;
  pendingServerSyncOptions.adminEditTargetEmail =
    options.adminEditTargetEmail || pendingServerSyncOptions.adminEditTargetEmail || "";
  serverSyncTimeout = setTimeout(() => {
    const queuedOptions = { ...pendingServerSyncOptions };
    syncServerState(queuedOptions).catch(() => {});
  }, delay);
}

function saveData() {
  persistCurrentStateToLocalStorage();
  scheduleModuleSync("planner");
}


