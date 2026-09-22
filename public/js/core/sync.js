function cloneStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  try {
    return JSON.parse(JSON.stringify(snapshot));
  } catch (error) {
    return null;
  }
}

function rememberServerStateBaseline(snapshot) {
  lastServerStateSnapshot = cloneStateSnapshot(snapshot);
  localEditKeys.clear();
}

function makePlannerEditKey(date, kind, item, field = "") {
  return ["planner", currentSite, normalizeDateOnly(date || appState.currentDate), kind, item, field]
    .map((part) => String(part ?? ""))
    .join(":");
}

function makeTidplanEditKey(activityIndex, field = "") {
  return ["tidplan", currentSite, activityIndex, field].map((part) => String(part ?? "")).join(":");
}

function trackLocalEditKey(key) {
  if (key) localEditKeys.add(key);
}

function stableJson(value) {
  const canonical = (entry) => {
    if (Array.isArray(entry)) return entry.map(canonical);
    if (entry && typeof entry === "object") return Object.fromEntries(Object.keys(entry).sort().map((key) => [key, canonical(entry[key])]));
    return entry === undefined ? null : entry;
  };
  return JSON.stringify(canonical(value));
}

function getSnapshotSiteEntry(snapshot, site = currentSite) {
  return snapshot?.siteData?.[site] || {};
}

function getSnapshotValueForEditKey(snapshot, key) {
  const [module, site, a, b, c, d] = String(key || "").split(":");
  const siteEntry = getSnapshotSiteEntry(snapshot, site);
  if (module === "planner") {
    const day = siteEntry.planner?.dailyData?.[a] || {};
    if (b === "row") return day.planningRows?.[Number(c)]?.[d] ?? "";
    if (b === "rows") return day.planningRows?.length ?? 0;
    if (b === "workerAttendance") return day.workerAttendance?.[c] ?? true;
    if (b === "liftAvailability") return day.liftAvailability?.[c] ?? true;
    if (b === "liftPlan") return day.liftPlans?.[c] ?? "";
    if (b === "day") return day;
  }
  if (module === "tidplan") {
    const activity = Array.isArray(siteEntry.tidplan) ? siteEntry.tidplan[Number(a)] : null;
    if (b === "activity") return activity || null;
    return activity?.[b] ?? "";
  }
  return undefined;
}

function getRemoteConflictInfo(snapshot) {
  if (!snapshot || !lastServerStateSnapshot || localEditKeys.size === 0) {
    return { hasConflict: false, keys: [] };
  }
  const keys = Array.from(localEditKeys).filter((key) => {
    const previous = stableJson(getSnapshotValueForEditKey(lastServerStateSnapshot, key));
    const remote = stableJson(getSnapshotValueForEditKey(snapshot, key));
    return previous !== remote;
  });
  return { hasConflict: keys.length > 0, keys };
}

function remoteValueChanged(baseValue, remoteValue) {
  return stableJson(baseValue) !== stableJson(remoteValue);
}

function applyRemotePlannerDayChanges(baseDay = {}, remoteDay = {}, localDay = {}, date) {
  let changed = false;
  const localRows = Array.isArray(localDay.planningRows) ? localDay.planningRows : [];
  const baseRows = Array.isArray(baseDay.planningRows) ? baseDay.planningRows : [];
  const remoteRows = Array.isArray(remoteDay.planningRows) ? remoteDay.planningRows : [];
  const rowFields = new Set();
  remoteRows.forEach((row) => Object.keys(row || {}).forEach((field) => rowFields.add(field)));
  baseRows.forEach((row) => Object.keys(row || {}).forEach((field) => rowFields.add(field)));

  remoteRows.forEach((remoteRow, rowIndex) => {
    rowFields.forEach((field) => {
      const key = makePlannerEditKey(date, "row", rowIndex, field);
      if (localEditKeys.has(key)) return;
      const baseValue = baseRows[rowIndex]?.[field] ?? "";
      const remoteValue = remoteRow?.[field] ?? "";
      if (!remoteValueChanged(baseValue, remoteValue)) return;
      if (!localRows[rowIndex]) localRows[rowIndex] = {};
      localRows[rowIndex][field] = remoteValue;
      changed = true;
    });
  });

  ["workerAttendance", "liftAvailability", "liftPlans"].forEach((collection) => {
    const baseMap = baseDay[collection] || {};
    const remoteMap = remoteDay[collection] || {};
    const localMap = localDay[collection] || {};
    const kind = collection === "liftPlans" ? "liftPlan" : collection;
    Object.keys(remoteMap).forEach((name) => {
      const key = makePlannerEditKey(date, kind, name);
      if (localEditKeys.has(key)) return;
      if (!remoteValueChanged(baseMap[name], remoteMap[name])) return;
      localMap[name] = remoteMap[name];
      changed = true;
    });
    Object.keys(baseMap).forEach((name) => {
      const key = makePlannerEditKey(date, kind, name);
      if (localEditKeys.has(key) || Object.prototype.hasOwnProperty.call(remoteMap, name)) return;
      delete localMap[name];
      changed = true;
    });
    localDay[collection] = localMap;
  });

  localDay.planningRows = localRows;
  return changed;
}

function applyRemoteTidplanChanges(baseList = [], remoteList = []) {
  let changed = false;
  const localList = Array.isArray(tidplanData) ? tidplanData : [];
  const fieldNames = [
    "plan",
    "zona",
    "karna",
    "moment",
    "resursi",
    "start",
    "end",
    "komentar",
    "active",
    "completionPercent",
    "locked",
    "notes",
    "materialOrder",
    "linkedWorkers",
    "_metaId",
  ];
  remoteList.forEach((remoteActivity, activityIndex) => {
    fieldNames.forEach((field) => {
      const key = makeTidplanEditKey(activityIndex, field);
      if (localEditKeys.has(key)) return;
      const baseValue = baseList[activityIndex]?.[field] ?? "";
      const remoteValue = remoteActivity?.[field] ?? "";
      if (!remoteValueChanged(baseValue, remoteValue)) return;
      if (!localList[activityIndex]) localList[activityIndex] = {};
      localList[activityIndex][field] = remoteValue;
      changed = true;
    });
  });
  return changed;
}

function applyNonConflictingRemoteChanges(snapshot, version) {
  const conflictInfo = getRemoteConflictInfo(snapshot);
  if (conflictInfo.hasConflict || !lastServerStateSnapshot) return false;

  const baseEntry = getSnapshotSiteEntry(lastServerStateSnapshot, currentSite);
  const remoteEntry = getSnapshotSiteEntry(snapshot, currentSite);
  let changed = false;

  const baseDaily = baseEntry.planner?.dailyData || {};
  const remoteDaily = remoteEntry.planner?.dailyData || {};
  Object.keys(remoteDaily).forEach((date) => {
    const localDay = appState.dailyData[date] || {
      planningRows: [],
      workerAttendance: {},
      liftAvailability: {},
      liftPlans: {},
    };
    if (applyRemotePlannerDayChanges(baseDaily[date] || {}, remoteDaily[date] || {}, localDay, date)) {
      appState.dailyData[date] = localDay;
      changed = true;
    }
  });

  if (applyRemoteTidplanChanges(baseEntry.tidplan || [], remoteEntry.tidplan || [])) {
    changed = true;
    localStorage.setItem(getStorageKey("tidplan"), JSON.stringify(tidplanData));
  }

  if (changed) {
    persistCurrentStateToLocalStorage();
    renderAfterSharedDataRefresh();
  }
  rememberAppliedRemoteState(snapshot, version);
  lastServerStateSnapshot = cloneStateSnapshot(snapshot);
  return changed;
}

function getRemoteStateKey(snapshot, version = serverStateVersion) {
  if (!snapshot || typeof snapshot !== "object") return "";
  return [
    Number(version) || 1,
    snapshot.savedAt || "",
    snapshot.savedBy || "",
  ].join("|");
}

function rememberAppliedRemoteState(snapshot, version = serverStateVersion) {
  const key = getRemoteStateKey(snapshot, version);
  if (!key) return;
  lastAppliedRemoteStateKey = key;
  sessionStorage.setItem("cmax_last_remote_state_key", key);
  if (ignoredRemoteStateKey === key) {
    ignoredRemoteStateKey = "";
    sessionStorage.removeItem("cmax_ignored_remote_state_key");
  }
}

function rememberIgnoredRemoteState(key) {
  ignoredRemoteStateKey = key || "";
  if (ignoredRemoteStateKey) {
    sessionStorage.setItem("cmax_ignored_remote_state_key", ignoredRemoteStateKey);
  } else {
    sessionStorage.removeItem("cmax_ignored_remote_state_key");
  }
}

function formatRemoteEditTime(value) {
  const date = new Date(value || 0);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(getCurrentLocale());
}

function getUserDisplayName(email, fallbackName = "") {
  const cleanEmail = String(email || "").trim();
  const cleanFallback = String(fallbackName || "").trim();
  if (cleanFallback && cleanFallback !== cleanEmail) return cleanFallback;
  if (!cleanEmail) return "";
  const admin = getAdmins().find((entry) => entry.email === cleanEmail);
  return admin?.fullName || cleanEmail;
}

function getRemoteEditorName(snapshot) {
  const email = snapshot?.savedBy || "";
  if (!email) return "Netko";
  return getUserDisplayName(email, snapshot?.savedByName);
}

function setLastEditedMeta(meta = {}) {
  appState.lastEdited = {
    by: meta.by || meta.savedBy || meta.updatedBy || "",
    byName: meta.byName || meta.savedByName || meta.updatedByName || "",
    at: meta.at || meta.savedAt || meta.updatedAt || "",
    module: meta.module || meta.section || "",
  };
}

function formatLastEditedText(moduleName = "") {
  const meta = appState.lastEdited || {};
  const at = meta.at ? formatRemoteEditTime(meta.at) : "";
  const name = getUserDisplayName(meta.by, meta.byName);
  if (!name || !at) return "";
  const suffix = moduleName ? ` (${moduleName})` : "";
  return `Zadnji put uredio: ${name}, ${at}${suffix}`;
}

function renderLastEditedInfo() {
  const plannerInfo = document.getElementById("plannerLastEditedInfo");
  if (plannerInfo) plannerInfo.textContent = formatLastEditedText("Planner");
  const tidplanInfo = document.getElementById("tidplanLastEditedInfo");
  if (tidplanInfo) tidplanInfo.textContent = formatLastEditedText("Tidplan");
}

function renderAfterSharedDataRefresh() {
  if (typeof renderActiveSharedModule === "function") {
    renderActiveSharedModule();
  } else {
    renderAll();
  }
  updateNotifBadge();
}

function applySharedDataRefresh(snapshot, version) {
  const context = captureAppContext();
  return loadAllData({ strict: true })
    .then(() => {
      if (!isAppContextCurrent(context)) return false;
      renderAfterSharedDataRefresh();
      return true;
    })
    .catch((error) => {
      if (isAppContextCurrent(context)) showDataLoadError(error?.message);
      return false;
    });
}

function refreshSharedDataIfSafe() {
  if (!BACKEND_ENABLED || !appState.currentUser || !freshServerDataLoaded || appLoadingDepth > 0 || applicationResyncInFlight) return Promise.resolve(false);
  const context = captureAppContext();
  return fetch("/api/state", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((payload) => {
      if (!isAppContextCurrent(context)) return false;
      serverStateVersion = Number(payload?.version) || serverStateVersion || 1;
      const snapshot = payload?.state;
      const remoteKey = getRemoteStateKey(snapshot, serverStateVersion);
      if (!remoteKey || remoteKey === lastAppliedRemoteStateKey || remoteKey === ignoredRemoteStateKey) {
        return false;
      }
      if (serverSyncInFlight || Object.keys(moduleSyncInFlight).length || Object.keys(pendingModuleSaves).length) return false;
      if (snapshot?.savedByClientId && typeof getClientInstanceId === "function" && snapshot.savedByClientId === getClientInstanceId()) {
        rememberAppliedRemoteState(snapshot, serverStateVersion);
        lastServerStateSnapshot = cloneStateSnapshot(snapshot);
        return false;
      }
      if (canRefreshSharedData()) return applySharedDataRefresh(snapshot, serverStateVersion);
      const editor = getRemoteEditorName(snapshot);
      const time = formatRemoteEditTime(snapshot.savedAt);
      const message = `${editor} je uređivao podatke${time ? ` u ${time}` : ""}. Želite li povući najnovije podatke?`;
      if (typeof showRemoteUpdatePrompt === "function") {
        return showRemoteUpdatePrompt({ snapshot, version: serverStateVersion, remoteKey });
      }
      return new Promise((resolve) => {
        showConfirm(
          message,
          "Promjena na serveru",
          "i",
          () => {
            applySharedDataRefresh(snapshot, serverStateVersion).then(resolve);
          },
          () => {
            rememberIgnoredRemoteState(remoteKey);
            resolve(false);
          },
        );
      });
    })
    .catch(() => false);
}

function syncSiteMetadata(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return Promise.resolve(false);

  if (snapshot.adminRemovalNotices) {
    saveAdminRemovalNotices(snapshot.adminRemovalNotices);
  }

  const snapshotSites =
    Array.isArray(snapshot.sites) && snapshot.sites.length
      ? snapshot.sites
      : ["default"];
  const nextSites = [...snapshotSites];
  const currentStillExists = nextSites.includes(currentSite);
  const nextCurrentSite = currentStillExists
    ? currentSite
    : snapshot.currentSite && nextSites.includes(snapshot.currentSite)
      ? snapshot.currentSite
      : nextSites[0];

  const sitesChanged =
    nextSites.length !== sites.length ||
    nextSites.some((site, index) => site !== sites[index]);
  const currentChanged = nextCurrentSite !== currentSite;

  if (
    (sitesChanged || currentChanged) &&
    (serverSyncInFlight || pendingServerSyncOptions.includeSites || Date.now() - lastLocalSiteMutationAt < 30000)
  ) {
    logSiteScopeDebug("metadata-skip-pending-site-save", {
      localSites: sites,
      remoteSites: nextSites,
      currentSite,
      nextCurrentSite,
    });
    return Promise.resolve(false);
  }

  if (
    Array.isArray(snapshot.admins) &&
    appState.currentUser &&
    !appState.isReadonly &&
    !appState.isSuperAdmin
  ) {
    const stillAdmin = snapshot.admins.some(
      (admin) => admin.email === appState.currentUser,
    );
    if (!stillAdmin) {
      handleAdminRemoval(getAdminRemovalNotice(appState.currentUser));
      return Promise.resolve(true);
    }
  }

  if (!sitesChanged && !currentChanged) {
    let metaChanged = false;

    if (Array.isArray(snapshot.admins)) {
      const normalizedAdmins = snapshot.admins.map((admin) => normalizeAdminRecord(admin));
      const currentAdmins = getAdmins();
      if (JSON.stringify(normalizedAdmins) !== JSON.stringify(currentAdmins)) {
        localStorage.setItem(ADMINS_KEY, JSON.stringify(normalizedAdmins));
        metaChanged = true;

        // Session permissions are authoritative. Admin list hydration must never rewrite them.
        refreshCurrentSessionPermissions({ notify: true }).catch(() => false);
      }
    }


    if (snapshot.guestPermissions) {
      const normalizedGuestPermissions = normalizeGuestPermissions(snapshot.guestPermissions);
      if (
        JSON.stringify(normalizedGuestPermissions) !==
        JSON.stringify(getGuestPermissions())
      ) {
        localStorage.setItem(
          GUEST_PERMISSIONS_KEY,
          JSON.stringify(normalizedGuestPermissions),
        );
        appState.guestPermissions = normalizedGuestPermissions;
        metaChanged = true;
        if (appState.isReadonly) {
          applyPermissionVisibility();
        }
      }
    }

    if (snapshot.binPermissions) {
      const currentBinPermissions = appState.binPermissions || {};
      if (JSON.stringify(snapshot.binPermissions) !== JSON.stringify(currentBinPermissions)) {
        localStorage.setItem(BIN_PERMS_KEY, JSON.stringify(snapshot.binPermissions));
        appState.binPermissions = { ...snapshot.binPermissions };
        metaChanged = true;
      }
    }

    return Promise.resolve(metaChanged);
  }

  sites = nextSites;
  currentSite = nextCurrentSite;
  localStorage.setItem(SITES_KEY, JSON.stringify(sites));
  setStoredCurrentSitePreference(currentSite);
  updateScopedStorageKeysForCurrentSite();

  populateSiteSelect();
  updateMainTitle();

  if (currentChanged) {
    invalidateAppContext();
    return resynchronizeApplication({ notifyPermissions: false });
  }

  return Promise.resolve(true);
}

function refreshSiteMetadata() {
  if (!BACKEND_ENABLED || !freshServerDataLoaded || !appState.currentUser || appLoadingDepth > 0) {
    return Promise.resolve(false);
  }

  const context = captureAppContext();
  return fetch("/api/state", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      if (!isAppContextCurrent(context)) return false;
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      return syncSiteMetadata(data?.state);
    })
    .catch(() => false);
}

function startSiteMetaRefresh() {
  stopSiteMetaRefresh();
  refreshSiteMetadata().catch(() => {});
  siteMetaRefreshInterval = setInterval(() => {
    refreshSiteMetadata().catch(() => {});
  }, 15000);
}

function stopSiteMetaRefresh() {
  if (siteMetaRefreshInterval) clearInterval(siteMetaRefreshInterval);
  siteMetaRefreshInterval = null;
}

function effectivePermissionSignature() {
  return stableJson({
    readonly: appState.isReadonly === true,
    superAdmin: appState.isSuperAdmin === true,
    permissions: Object.fromEntries(Object.keys(DEFAULT_PERMISSIONS).sort().map((key) => [key, appState.permissions?.[key] === true])),
    guestPermissions: appState.isReadonly ? appState.guestPermissions : null,
  });
}

function refreshCurrentSessionPermissions({ notify = true } = {}) {
  if (!BACKEND_ENABLED || !appState.currentUser) return Promise.resolve(false);
  if (permissionRefreshInFlight) return permissionRefreshInFlight;
  const context = captureAppContext();
  const before = effectivePermissionSignature();
  const promise = fetch("/api/session", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`SESSION_REFRESH_${res.status}`);
      return res.json();
    })
    .then(async (data) => {
      if (!isAppContextCurrent(context) || !data?.auth?.email) return false;
      if (data.auth.email !== context.user) {
        handleApiUnauthorized();
        return false;
      }
      if (data.csrfToken) setCsrfToken(data.csrfToken);
      applyAuthData({ ...data.auth, timestamp: Date.now() });
      const changed = effectivePermissionSignature() !== before;
      if (!changed) return false;
      applyPermissionVisibility();
      if (notify) {
        showToast(t("permissionsChangedRefresh"), "info");
        if (typeof syncAccountNotifications === "function") syncAccountNotifications();
      } else if (typeof baselineAccountNotificationPermissions === "function") {
        baselineAccountNotificationPermissions();
      }
      return true;
    })
    .finally(() => {
      if (permissionRefreshInFlight === promise) permissionRefreshInFlight = null;
    });
  permissionRefreshInFlight = promise;
  return promise;
}

var applicationResyncInFlight = null;
async function resynchronizeApplication({ notifyPermissions = false } = {}) {
  if (!appState.currentUser || !BACKEND_ENABLED) return false;
  if (applicationResyncInFlight) return applicationResyncInFlight;
  const context = captureAppContext();
  const promise = withLoadingPromise("loadingDefault", async () => {
    try {
      await refreshCurrentSessionPermissions({ notify: notifyPermissions });
      if (!isAppContextCurrent(context)) return false;
      if (appState.hasUnsavedChanges || tidplanDataChanged || Object.keys(pendingModuleSaves).length || Object.keys(moduleSyncInFlight).length) {
        // Preserve pending input and require its persistence before replacing runtime state.
        freshServerDataLoaded = true;
        if (!(await flushPendingModuleSaves())) throw new Error("UNSAVED_CHANGES_SYNC_FAILED");
        if (appState.hasUnsavedChanges || tidplanDataChanged) {
          const target = currentView === "tidplan" ? "tidplan" : currentView === "bins" ? "bins" : "planner";
          if (!(await syncModuleState(target))) throw new Error("UNSAVED_CHANGES_SYNC_FAILED");
        }
      }
      freshServerDataLoaded = false;
      document.getElementById("mainContainer").style.display = "none";
      await loadFreshBackendData();
      if (!isAppContextCurrent(context, false)) return false;
      appState.hasUnsavedChanges = false;
      tidplanDataChanged = false;
      freshServerDataLoaded = true;
      appDataLoadError = "";
      renderCurrentSiteAfterHydrate();
      showMainApp();
      startAutoSave();
      return true;
    } catch (error) {
      if (isAppContextCurrent(context, false)) {
        if (error?.message === "UNSAVED_CHANGES_SYNC_FAILED") {
          showMainApp();
          showToast("Spremanje nije potvrđeno. Podaci su ostali na ekranu; ponovni pokušaj koristi istu operaciju.", "error");
        } else {
          showDataLoadError(error?.message);
        }
      }
      return false;
    }
  });
  applicationResyncInFlight = promise;
  try { return await promise; }
  finally { if (applicationResyncInFlight === promise) applicationResyncInFlight = null; }
}

function installRealtimeSynchronization() {
  if (window.scmRealtimeSynchronizationInstalled) return;
  window.scmRealtimeSynchronizationInstalled = true;
  document.addEventListener("scm:state-changed", (event) => {
    if (event?.detail?.clientInstanceId && typeof getClientInstanceId === "function" && event.detail.clientInstanceId === getClientInstanceId()) return;
    if (freshServerDataLoaded) refreshSharedDataIfSafe().catch(() => false);
  });
  document.addEventListener("scm:permissions-changed", () => {
    resynchronizeApplication({ notifyPermissions: true }).catch(() => false);
  });
  document.addEventListener("scm:reconnected", () => {
    resynchronizeApplication({ notifyPermissions: false }).catch(() => false);
  });
  window.addEventListener("online", () => {
    resynchronizeApplication({ notifyPermissions: false }).catch(() => false);
  });
}

function startPermissionRefresh() {
  stopPermissionRefresh();
  const tick = (notify = true) => {
    if (document.hidden && Date.now() - lastPermissionRefreshAt < 30000) return;
    lastPermissionRefreshAt = Date.now();
    refreshCurrentSessionPermissions({ notify }).catch(() => {});
  };
  tick(false);
  permissionRefreshInterval = setInterval(() => {
    tick(true);
  }, 5000);
}

function stopPermissionRefresh() {
  if (permissionRefreshInterval) clearInterval(permissionRefreshInterval);
  permissionRefreshInterval = null;
}

function getSharedDataRefreshDelay() {
  if (document.hidden) return 30000;
  const recentlyEditing = Date.now() - (lastEditAt || 0) < 2 * 60 * 1000;
  const hasSameSiteActivity = Number(appState.activePresenceCount || 0) > 0;
  if (recentlyEditing || hasSameSiteActivity) return 4000;
  return 10000;
}

function startSharedDataRefresh() {
  stopSharedDataRefresh();
  if (!BACKEND_ENABLED || !appState.currentUser) return;
  const generation = sharedRefreshGeneration;
  const tick = () => {
    if (generation !== sharedRefreshGeneration) return;
    if (!freshServerDataLoaded) {
      sharedDataRefreshTimer = setTimeout(tick, getSharedDataRefreshDelay());
      return;
    }
    if (sharedDataRefreshRunning) {
      sharedDataRefreshTimer = setTimeout(tick, getSharedDataRefreshDelay());
      return;
    }
    sharedDataRefreshRunning = true;
    refreshSharedDataIfSafe()
      .catch(() => false)
      .finally(() => {
        sharedDataRefreshRunning = false;
        if (generation !== sharedRefreshGeneration) return;
        sharedDataRefreshTimer = setTimeout(tick, getSharedDataRefreshDelay());
      });
  };
  sharedDataRefreshTimer = setTimeout(tick, 2500);
}

function stopSharedDataRefresh() {
  sharedRefreshGeneration += 1;
  if (sharedDataRefreshTimer) clearTimeout(sharedDataRefreshTimer);
  sharedDataRefreshTimer = null;
  sharedDataRefreshRunning = false;
}

function sendPresence(active = true, keepalive = false) {
  if (!BACKEND_ENABLED || !appState.currentUser || appState.currentUser === "readonly") {
    return Promise.resolve();
  }

  return fetch("/api/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive,
    body: JSON.stringify({
      sessionId: presenceSessionId,
      email: appState.currentUser,
      displayName: getPresenceDisplayName(appState.currentUser),
      initials: getPresenceInitials(appState.currentUser),
      mode: getPresenceMode(),
      editingArea: lastEditArea || getPresenceView(),
      lastEditAt: lastEditAt || null,
      currentSite,
      currentView: getPresenceView(),
      active,
    }),
  }).catch(() => {});
}

function startPresenceTracking() {
  stopPresenceTracking();
  if (!BACKEND_ENABLED || !appState.currentUser || appState.currentUser === "readonly") {
    return;
  }

  sendPresence(true).catch(() => {});
  refreshPresence().catch(() => {});
  presenceHeartbeatInterval = setInterval(() => {
    sendPresence(true).catch(() => {});
  }, 20000);
  presenceRefreshInterval = setInterval(() => {
    refreshPresence().catch(() => {});
  }, 20000);
}

function stopPresenceTracking() {
  if (presenceHeartbeatInterval) clearInterval(presenceHeartbeatInterval);
  if (presenceRefreshInterval) clearInterval(presenceRefreshInterval);
  presenceHeartbeatInterval = null;
  presenceRefreshInterval = null;
}

function startReportsPolling() {
  stopReportsPolling();
  if (!BACKEND_ENABLED || !hasAdminPermission("canViewReports") || !isSiteModuleEnabled("reports")) return;

  loadReportsData()
    .then(() => {
      updateNotifBadge();
      if (currentView === "reports") {
        renderReportsList(currentReportFilter);
      }
    })
    .catch(() => {});

  reportsRefreshInterval = setInterval(() => {
    loadReportsData()
      .then(() => {
        updateNotifBadge();
        if (currentView === "reports") {
          renderReportsList(currentReportFilter);
        }
      })
      .catch(() => {});
  }, 20000);
}

function stopReportsPolling() {
  if (reportsRefreshInterval) clearInterval(reportsRefreshInterval);
  reportsRefreshInterval = null;
}

function startNotificationsPolling() {
  stopNotificationsPolling();
  if (!BACKEND_ENABLED || !canAccessNotificationsModule()) return;

  loadNotificationsData()
    .then(() => {
      if (currentView === "notifications") {
        renderNotificationsList();
        const currentList = getNotificationsForSite(currentSite);
        markNotificationsRead(currentList);
        updateNotificationsBadge();
      }
    })
    .catch(() => {});

  notificationsRefreshInterval = setInterval(() => {
    loadNotificationsData()
      .then(() => {
        if (currentView === "notifications") {
          renderNotificationsList();
          const currentList = getNotificationsForSite(currentSite);
          markNotificationsRead(currentList);
          updateNotificationsBadge();
        }
      })
      .catch(() => {});
  }, 20000);
}

function stopNotificationsPolling() {
  if (notificationsRefreshInterval) clearInterval(notificationsRefreshInterval);
  notificationsRefreshInterval = null;
}

/* ==================== CUSTOM DIALOG SYSTEM ==================== */

