function loadData(options = {}) {
  const { strict = false } = options;
  if (!BACKEND_ENABLED) {
    const savedData = localStorage.getItem(STORAGE_KEY);
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

  return fetch("/api/state", { cache: "no-store" })
    .then((res) => {
      if (res.ok) return res.json();
      throw new Error(`STATE_LOAD_${res.status}`);
    })
    .then((data) => {
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      if (data?.state && applyServerStateSnapshot(data.state)) {
        collectPlans();
        return;
      }
      throw new Error("STATE_EMPTY");
    })
    .catch((error) => {
      if (strict) throw error;
      console.error("Server data load failed:", error);
    });
}

function loadAllData(options = {}) {
  const { strict = false } = options;
  return Promise.resolve(loadData({ strict })).then(() => {
    loadBinsData();
    loadTidplanData();
    loadWarehouseData();
    const tasks = [];
    if (hasPermission("canViewReports")) tasks.push(loadReportsData({ strict }));
    if (canAccessNotificationsModule()) tasks.push(loadNotificationsData(currentSite, { strict }));
    if (hasPermission("canViewSurveys")) tasks.push(getSurveysList({ strict }));
    return Promise.all(tasks);
  });
}
function loadWarehouseData(site = currentSite) {
  warehouseData = normalizeWarehouseData(
    safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", site)), null),
  );
}

function loadCurrentSiteRuntimeFromLocalStorage() {
  const planner = safeParseStoredJson(
    localStorage.getItem(getSiteStorageKey("cmax_planner_data", currentSite)),
    createEmptyPlannerData(),
  );
  applyPlannerDataToAppState(planner || createEmptyPlannerData());
  appState.binsData = safeParseStoredJson(
    localStorage.getItem(getSiteStorageKey("cmax_planner_bins", currentSite)),
    {},
  ) || {};
  tidplanData = safeParseStoredJson(
    localStorage.getItem(getSiteStorageKey("tidplan", currentSite)),
    [],
  ) || [];
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
  const planner = safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_planner_data", site)), createEmptyPlannerData()) || {};
  const tidplan = safeParseStoredJson(localStorage.getItem(getSiteStorageKey("tidplan", site)), []) || [];
  const warehouse = safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", site)), null) || {};
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
  renderAll();
  CMAX.tidplan.update();
  if (currentView === "bins") {
    renderBinsTable();
  }
  if (document.getElementById("notifications-section")?.style.display === "block") {
    renderNotificationSiteOptions();
    renderNotificationsList();
  }
  if (currentView === "warehouse") {
    renderWarehousePage();
  }
  if (currentView === "warehouseLogs") {
    renderWarehouseLogsPage();
  }
  if (currentView === "warehouseGraph") {
    renderWarehouseGraphPage();
  }
  updateNotifBadge();
  updateMainTitle();
}

function switchSiteFromLocal(toSite, options = {}) {
  const fromSite = currentSite;
  persistCurrentStateToLocalStorage();
  currentSite = toSite;
  localStorage.setItem(CURRENT_SITE_KEY, currentSite);
  updateScopedStorageKeysForCurrentSite();
  loadCurrentSiteRuntimeFromLocalStorage();
  populateSiteSelect();
  renderCurrentSiteAfterHydrate();
  logSiteScopeDebug("switch", {
    fromSite,
    toSite,
    from: getSiteDebugSummary(fromSite),
    to: getSiteDebugSummary(toSite),
  });
  if (options.syncSites !== false) {
    syncServerState({ includeSites: true, skipLog: true }).catch(() => {});
  }
  sendPresence(true).catch(() => {});
  refreshPresence().catch(() => {});
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
      planningRows,
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerPayload));
  localStorage.setItem(
    getSiteStorageKey("cmax_planner_data", currentSite),
    JSON.stringify(plannerPayload),
  );
  localStorage.setItem(BINS_KEY, JSON.stringify(appState.binsData || {}));
  localStorage.setItem(BIN_PERMS_KEY, JSON.stringify(appState.binPermissions || {}));
  localStorage.setItem(
    getStorageKey("tidplan"),
    JSON.stringify(tidplanData || []),
  );
  localStorage.setItem(
    getStorageKey("tidplan_zones"),
    JSON.stringify(tidplanZones || []),
  );
  localStorage.setItem(
    getSiteStorageKey("cmax_warehouse_data", currentSite),
    JSON.stringify(normalizeWarehouseData(warehouseData)),
  );
  localStorage.setItem(
    GUEST_PERMISSIONS_KEY,
    JSON.stringify(appState.guestPermissions || getGuestPermissions()),
  );
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

function mergeNotificationsSnapshot(localNotifications, serverNotifications) {
  const localList = Array.isArray(localNotifications) ? localNotifications : [];
  const serverList = Array.isArray(serverNotifications) ? serverNotifications : [];
  const mergedById = new Map();

  serverList.forEach((item) => {
    if (!item) return;
    const key = item.id || `${item.createdAt || ""}_${item.authorName || ""}`;
    mergedById.set(key, item);
  });

  localList.forEach((item) => {
    if (!item) return;
    const key = item.id || `${item.createdAt || ""}_${item.authorName || ""}`;
    mergedById.set(key, item);
  });

  return Array.from(mergedById.values()).sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return bTime - aTime;
  });
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

function buildServerStateSnapshot(baseState = null, options = {}) {
  persistCurrentStateToLocalStorage();
  const serverState = baseState && typeof baseState === "object" ? baseState : {};
  const siteList = Array.isArray(sites) && sites.length ? [...sites] : ["default"];
  const siteData = {};
  const localAdmins = safeParseStoredJson(localStorage.getItem(ADMINS_KEY), []);
  const localGuestPermissions = safeParseStoredJson(
    localStorage.getItem(GUEST_PERMISSIONS_KEY),
    appState.guestPermissions,
  );
  const localAdminRemovalNotices = safeParseStoredJson(
    localStorage.getItem(ADMIN_REMOVAL_NOTICES_KEY),
    {},
  );
  const localBinPermissions = safeParseStoredJson(
    localStorage.getItem(BIN_PERMS_KEY),
    appState.binPermissions,
  );
  const snapshotSites =
    options.includeSites === true
      ? siteList
      : Array.isArray(serverState.sites) && serverState.sites.length
        ? [...serverState.sites]
        : siteList;
  const adminsForSnapshot = protectCurrentAdminRecordForSync(localAdmins, serverState, options);
  const currentSnapshotSite = siteList.includes(currentSite) ? currentSite : siteList[0];
  const siteSnapshotList = options.includeSites === true
    ? siteList
    : currentSnapshotSite
      ? [currentSnapshotSite]
      : siteList.slice(0, 1);

  siteSnapshotList.forEach((site) => {
    const localPlanner = safeParseStoredJson(
      localStorage.getItem(getSiteStorageKey("cmax_planner_data", site)),
      null,
    );
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
    const localNotifications = safeParseStoredJson(
      localStorage.getItem(getSiteStorageKey("cmax_planner_notifications", site)),
      null,
    );
    const plannerSnapshot = mergePlannerSnapshot(localPlanner, serverPlanner, site);
    siteData[site] = {
      planner: plannerSnapshot,
      workers: Array.isArray(plannerSnapshot.workers) ? plannerSnapshot.workers : [],
      lifts: Array.isArray(plannerSnapshot.lifts) ? plannerSnapshot.lifts : [],
      moments: Array.isArray(plannerSnapshot.moments) ? plannerSnapshot.moments : [],
      plans: Array.isArray(plannerSnapshot.plans) ? plannerSnapshot.plans : [],
      karnas: Array.isArray(plannerSnapshot.karnas) ? plannerSnapshot.karnas : [],
      bins: safeParseStoredJson(
        localStorage.getItem(getSiteStorageKey("cmax_planner_bins", site)),
        null,
      ),
      tidplan: safeParseStoredJson(
        localStorage.getItem(getSiteStorageKey("tidplan", site)),
        null,
      ),
      tidplanZones: safeParseStoredJson(
        localStorage.getItem(getSiteStorageKey("tidplan_zones", site)),
        null,
      ),
      warehouse: normalizeWarehouseData(
        safeParseStoredJson(
          localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", site)),
          null,
        ),
      ),
      reports: safeParseStoredJson(
        localStorage.getItem(getSiteStorageKey("cmax_planner_reports", site)),
        [],
      ),
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

  const snapshotSites =
    Array.isArray(snapshot.sites) && snapshot.sites.length
      ? snapshot.sites
      : ["default"];
  sites = [...snapshotSites];
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));

  const storedCurrentSite = localStorage.getItem(CURRENT_SITE_KEY);
  const preferredCurrentSite =
    storedCurrentSite && sites.includes(storedCurrentSite)
      ? storedCurrentSite
      : snapshot.currentSite && sites.includes(snapshot.currentSite)
        ? snapshot.currentSite
        : sites[0];
  currentSite = preferredCurrentSite;
  localStorage.setItem(CURRENT_SITE_KEY, currentSite);

  if (Array.isArray(snapshot.admins)) {
    localStorage.setItem(ADMINS_KEY, JSON.stringify(snapshot.admins));
  }
  if (snapshot.guestPermissions) {
    localStorage.setItem(
      GUEST_PERMISSIONS_KEY,
      JSON.stringify(normalizeGuestPermissions(snapshot.guestPermissions)),
    );
  }
  if (snapshot.binPermissions) {
    localStorage.setItem(
      BIN_PERMS_KEY,
      JSON.stringify(snapshot.binPermissions),
    );
  }

  const snapshotSiteData = snapshot.siteData || {};
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
    localStorage.setItem(
      getSiteStorageKey("cmax_planner_data", site),
      JSON.stringify(normalizePlannerData(planner, site)),
    );
    localStorage.setItem(
      getSiteStorageKey("cmax_planner_bins", site),
      JSON.stringify(siteEntry.bins && typeof siteEntry.bins === "object" ? siteEntry.bins : {}),
    );
    localStorage.setItem(
      getSiteStorageKey("tidplan", site),
      JSON.stringify(Array.isArray(siteEntry.tidplan) ? siteEntry.tidplan : []),
    );
    localStorage.setItem(
      getSiteStorageKey("tidplan_zones", site),
      JSON.stringify(Array.isArray(siteEntry.tidplanZones) ? siteEntry.tidplanZones : DEFAULT_SITE_TEMPLATE.tidplanZones),
    );
    localStorage.setItem(
      getSiteStorageKey("cmax_warehouse_data", site),
      JSON.stringify(normalizeWarehouseData(siteEntry.warehouse)),
    );
    localStorage.setItem(
      getSiteStorageKey("cmax_planner_reports", site),
      JSON.stringify(Array.isArray(siteEntry.reports) ? siteEntry.reports : []),
    );
    localStorage.setItem(
      getSiteStorageKey("cmax_planner_notifications", site),
      JSON.stringify(Array.isArray(siteEntry.notifications) ? siteEntry.notifications : []),
    );
  });

  updateScopedStorageKeysForCurrentSite();
  const currentPlanner = safeParseStoredJson(localStorage.getItem(STORAGE_KEY), null);
  applyPlannerDataToAppState(currentPlanner || createEmptyPlannerData());
  appState.guestPermissions = getGuestPermissions();
  populateSiteSelect();
  updateMainTitle();
  return true;
}

var serverSyncTimeout = null;
var serverStateVersion = 1;
var serverSyncInFlight = null;

function stopServerSync() {
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
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
    return serverSyncInFlight.catch(() => false).then(() => syncServerState(options));
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

  serverSyncInFlight = fetch("/api/state", { cache: "no-store" })
    .then((res) => {
      if (res.ok) return res.json();
      throw createServerSyncError(`STATE_LOAD_${res.status}`, res.status);
    })
    .then((data) => {
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      return postServerStateSnapshot(data?.state || null, serverStateVersion, syncOptions);
    })
    .catch((error) => {
      if (error?.code === "VERSION_CONFLICT" && error.latest) {
        const latestVersion = Number(error.latest.version) || serverStateVersion || 1;
        serverStateVersion = latestVersion;
        return postServerStateSnapshot(error.latest.state || null, latestVersion, syncOptions);
      }
      throw error;
    })
    .then((payload) => {
      serverStateVersion = Number(payload?.version) || serverStateVersion || 1;
      setLastEditedMeta({
        by: appState.currentUser || null,
        byName: appState.currentUserName || "",
        at: payload?.updatedAt || new Date().toISOString(),
      });
      renderLastEditedInfo();
      if (markAsClean) markClean();
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
      return true;
    })
    .catch((error) => {
      if (error?.status === 401 || error?.code === "STATE_LOAD_401") {
        return false;
      }
      if (error?.code === "VERSION_CONFLICT" && typeof showServerConflictNotice === "function") {
        showServerConflictNotice();
      }
      console.error("Server sync failed:", error);
      if (showSuccess) showToast("Server save failed.", "error");
      return false;
    })
    .finally(() => {
      serverSyncInFlight = null;
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
  scheduleServerSync();
}

