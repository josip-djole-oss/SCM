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
  return JSON.stringify(value === undefined ? null : value);
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
  const fieldNames = ["plan", "zona", "karna", "moment", "resursi", "start", "end", "komentar", "active"];
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
  renderAll();
  if (currentView === "bins") {
    renderBinsTable();
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
  if (document.getElementById("tidplan-section")?.style.display === "block") {
    updateTidplan();
  }
  if (currentView === "notifications") {
    renderNotificationsList();
  }
  updateNotifBadge();
}

function applySharedDataRefresh(snapshot, version) {
  rememberAppliedRemoteState(snapshot, version);
  return loadAllData()
    .then(() => {
      renderAfterSharedDataRefresh();
      return true;
    })
    .catch(() => false);
}

function refreshSharedDataIfSafe() {
  if (!BACKEND_ENABLED) {
    return Promise.resolve(false);
  }

  return fetch("/api/state", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((payload) => {
      serverStateVersion = Number(payload?.version) || serverStateVersion || 1;
      const snapshot = payload?.state;
      const remoteKey = getRemoteStateKey(snapshot, serverStateVersion);
      if (!remoteKey || remoteKey === lastAppliedRemoteStateKey || remoteKey === ignoredRemoteStateKey) {
        return false;
      }
      if (!snapshot?.savedBy || snapshot.savedBy === appState.currentUser) {
        rememberAppliedRemoteState(snapshot, serverStateVersion);
        return false;
      }
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

        if (appState.currentUser && !appState.isReadonly) {
          const currentAdmin = normalizedAdmins.find(
            (admin) => admin.email === appState.currentUser,
          );
          if (currentAdmin) {
            const currentLevel = getAdminLevel(currentAdmin);
            appState.adminLevel = currentLevel;
            appState.permissions = currentAdmin.isSuperAdmin
              ? { ...DEFAULT_PERMISSIONS }
              : clampPermissionsToLevel(currentAdmin.permissions || {}, currentLevel);
            appState.currentUserName = currentAdmin.fullName || appState.currentUserName;

            const authData = safeParseStoredJson(localStorage.getItem(AUTH_KEY), null);
            if (authData) {
              authData.permissions = appState.permissions;
              authData.fullName = currentAdmin.fullName || authData.fullName || "";
              authData.isSuperAdmin = !!currentAdmin.isSuperAdmin;
              authData.level = currentLevel;
              localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
            }

            applyPermissionVisibility();
            if (document.getElementById("adminModal")?.style.display === "flex") {
              openAdminPanel();
            }
          } else if (!appState.isSuperAdmin && !appState.isReadonly) {
            handleAdminRemoval(getAdminRemovalNotice(appState.currentUser));
          }
        }
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
  localStorage.setItem(CURRENT_SITE_KEY, currentSite);
  updateScopedStorageKeysForCurrentSite();

  populateSiteSelect();
  updateMainTitle();

  if (currentChanged) {
    loadCurrentSiteRuntimeFromLocalStorage();
    renderCurrentSiteAfterHydrate();
    syncServerState({ includeSites: true, skipLog: true }).catch(() => {});
  }

  return Promise.resolve(true);
}

function refreshSiteMetadata() {
  if (!BACKEND_ENABLED) {
    return Promise.resolve(false);
  }

  return fetch("/api/state", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      serverStateVersion = Number(data?.version) || serverStateVersion || 1;
      return syncSiteMetadata(data?.state);
    })
    .then((changed) =>
      loadNotificationsData()
        .then(() => {
          if (currentView === "notifications") {
            renderNotificationsList();
          }
          return changed;
        })
        .catch(() => changed),
    )
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

function refreshCurrentSessionPermissions({ notify = true } = {}) {
  if (!BACKEND_ENABLED || !appState.currentUser || appState.currentUser === "readonly") {
    return Promise.resolve(false);
  }
  const before = stableJson({
    permissions: appState.permissions || {},
    level: appState.adminLevel || 1,
    isSuperAdmin: appState.isSuperAdmin,
    isReadonly: appState.isReadonly,
  });
  return fetch("/api/session", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      if (data?.csrfToken) setCsrfToken(data.csrfToken);
      if (!data?.auth) return false;
      const auth = data.auth;
      const level = Number(auth.level) || deriveLevelFromPermissions(auth.permissions || {});
      const nextPermissions = auth.isSuperAdmin
        ? { ...DEFAULT_PERMISSIONS }
        : clampPermissionsToLevel(auth.permissions || {}, level);
      const after = stableJson({
        permissions: nextPermissions,
        level,
        isSuperAdmin: auth.isSuperAdmin,
        isReadonly: auth.isReadonly,
      });
      if (after === before) return false;

      appState.permissions = nextPermissions;
      appState.adminLevel = level;
      appState.isSuperAdmin = !!auth.isSuperAdmin;
      appState.isReadonly = !!auth.isReadonly;
      appState.currentUserName = auth.fullName || appState.currentUserName;
      const authData = safeParseStoredJson(localStorage.getItem(AUTH_KEY), {}) || {};
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
          ...authData,
          ...auth,
          permissions: nextPermissions,
          level,
          timestamp: Date.now(),
        }),
      );
      if (notify) showToast(t("permissionsChangedRefresh"), "info");
      return loadAllData({ strict: true }).then(() => {
        applyPermissionVisibility();
        renderAll();
        if (currentView === "surveys" && hasPermission("canViewSurveys")) {
          return getSurveysList({ strict: true }).then(() => {
            renderSurveysList();
            return true;
          });
        }
        return true;
      });
    })
    .catch(() => false);
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
  if (!BACKEND_ENABLED || !appState.currentUser || appState.currentUser === "readonly") return;
  const tick = () => {
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
        sharedDataRefreshTimer = setTimeout(tick, getSharedDataRefreshDelay());
      });
  };
  sharedDataRefreshTimer = setTimeout(tick, 2500);
}

function stopSharedDataRefresh() {
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
  if (!BACKEND_ENABLED || !hasAdminPermission("canViewReports")) return;

  loadReportsData()
    .then(() => {
      updateNotifBadge();
      if (document.getElementById("tabReports")?.classList.contains("active")) {
        renderReportsList(currentReportFilter);
      }
    })
    .catch(() => {});

  reportsRefreshInterval = setInterval(() => {
    loadReportsData()
      .then(() => {
        updateNotifBadge();
        if (document.getElementById("tabReports")?.classList.contains("active")) {
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
