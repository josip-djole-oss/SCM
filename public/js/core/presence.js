function updateDateDisplay() {
  const date = new Date(appState.currentDate + "T00:00:00");
  const locale =
    { hr: "hr-HR", en: "en-US", sv: "sv-SE" }[currentLang] || "hr-HR";
  const formatted = date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const el = document.getElementById("dateDisplay");
  if (el) el.textContent = formatted.toUpperCase();
  updatePrintDate();
}

function updatePrintDate() {
  const el = document.getElementById("printHeaderDate");
  if (el) {
    const date = new Date(appState.currentDate + "T00:00:00");
    const locale =
      { hr: "hr-HR", en: "en-US", sv: "sv-SE" }[currentLang] || "hr-HR";
    el.textContent =
      "CMAX SCM — " +
      date
        .toLocaleDateString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        .toUpperCase();
  }
}

function getCurrentLocale() {
  return { hr: "hr-HR", en: "en-US", sv: "sv-SE" }[currentLang] || "hr-HR";
}

function canUserPerformEdits() {
  if (appState.isReadonly) return false;
  if (appState.isAdmin) return true;
  if (appState.isSuperAdmin) return true;
  const editKeys = [
    "canManageWorkers",
    "canManageLifts",
    "canManageMoments",
    "canManagePlans",
    "canManageKarnas",
    "canManageTidplan",
    "canAddTidplanActivity",
    "canDeleteTidplanActivity",
    "canManageTidplanZones",
    "canEditBinsData",
    "canManageBinsPlans",
    "canManageBinsPermissions",
    "canManageNotifications",
    "canDeleteNotifications",
    "canCreateReports",
    "canApproveReports",
    "canDeleteReports",
    "canManageAdmins",
    "canManageSiteAccess",
    "canManageGuestAccess",
    "canClear",
    "canClearTidplan",
  ];
  return editKeys.some((key) => hasPermission(key));
}

function trackEditActivity(area = "") {
  if (!canUserPerformEdits()) return;
  lastEditAt = Date.now();
  lastEditArea = area || getPresenceView();
  const now = Date.now();
  if (
    BACKEND_ENABLED &&
    appState.currentUser &&
    appState.currentUser !== "readonly" &&
    now - lastPresenceEditPingAt >= PRESENCE_EDIT_PING_COOLDOWN_MS
  ) {
    lastPresenceEditPingAt = now;
    sendPresence(true).catch(() => {});
  }
}

function getPresenceMode() {
  if (!canUserPerformEdits()) return "viewing";
  return Date.now() - lastEditAt <= PRESENCE_EDITING_WINDOW_MS
    ? "editing"
    : "viewing";
}

function getPresenceView() {
  if (document.getElementById("tidplan-section")?.style.display === "block") {
    return "tidplan";
  }
  if (currentView === "notifications") {
    return "notifications";
  }
  if (currentView === "bins") {
    return "bins";
  }
  if (currentView === "warehouse") {
    return "warehouse";
  }
  if (currentView === "warehouseLogs") {
    return "warehouseLogs";
  }
  if (currentView === "warehouseGraph") {
    return "warehouseGraph";
  }
  if (currentView === "workwear") {
    return "workwear";
  }
  if (currentView === "siteChat") {
    return "siteChat";
  }
  return "planner";
}

function getPresenceAreaLabel(view = "") {
  const labels = {
    planner: "Planner",
    main: "Planner",
    bins: "Bins",
    tidplan: "Tidplan",
    warehouse: "Skladište",
    warehouseLogs: "Skladište logovi",
    warehouseGraph: "Skladište graf",
    workwear: "Store",
    siteChat: "Chat",
    notifications: "Obavijesti",
    surveys: "Ankete",
  };
  return labels[view] || "Planner";
}

function getPresenceInitials(email) {
  const base = getUserDisplayName(email, "").replace(/[^A-Za-z0-9ČĆŽŠĐčćžšđ ]/g, "").trim() || (email || "?").split("@")[0];
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  return (base.slice(0, 2) || "?").toUpperCase();
}

function getPresenceDisplayName(email) {
  return getUserDisplayName(email) || "Unknown";
}

function renderPresence(users = []) {
  const strip = document.getElementById("presenceStrip");
  const list = document.getElementById("presenceList");
  if (!strip || !list) return;

  list.innerHTML = "";
  if (!users.length || !appState.currentUser || appState.currentUser === "readonly") {
    strip.style.display = "none";
    return;
  }

  users.forEach((user) => {
    const avatar = document.createElement("span");
    avatar.className = `presence-avatar ${user.mode === "viewing" ? "is-viewing" : "is-editing"}`;
    const displayName = getUserDisplayName(user.email, user.displayName);
    avatar.textContent = user.initials || getPresenceInitials(user.email);
    const areaLabel = getPresenceAreaLabel(
      user.mode === "viewing" ? user.currentView : user.editingArea || user.currentView,
    );
    const statusLabel =
      user.mode === "viewing"
        ? `${t("presenceViewing")} ${areaLabel}`
        : `${t("presenceEditing")} ${areaLabel}`;
    const timeLabel = user.lastEditAt ? ` - ${new Date(user.lastEditAt).toLocaleTimeString(getCurrentLocale())}` : "";
    avatar.title = `${displayName || "Unknown"} - ${statusLabel}${timeLabel}`;
    list.appendChild(avatar);
  });

  strip.style.display = "inline-flex";
  appState.activePresenceCount = users.length;
}

function refreshPresence() {
  if (!BACKEND_ENABLED || !appState.currentUser || appState.currentUser === "readonly") {
    renderPresence([]);
    return Promise.resolve();
  }

  return fetch(`/api/presence?site=${encodeURIComponent(currentSite)}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      renderPresence(Array.isArray(data.users) ? data.users : []);
    })
    .catch(() => {
      renderPresence([]);
    });
}

function canRefreshSharedData() {
  return !appState.hasUnsavedChanges && !tidplanDataChanged;
}

