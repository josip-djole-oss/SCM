function checkAuth(options = {}) {
  const { deferShow = false } = options;
  const authData = localStorage.getItem(AUTH_KEY);
  if (!authData) {
    showLogin();
    return Promise.resolve(false);
  }
  const auth = safeParseStoredJson(authData, null);
  if (!auth) {
    showLogin();
    return Promise.resolve(false);
  }
  const now = new Date().getTime();
  if (now - auth.timestamp > 24 * 60 * 60 * 1000) {
    showLogin();
    return Promise.resolve(false);
  }
  appState.isAdmin = auth.isAdmin;
  appState.isSuperAdmin = auth.isSuperAdmin;
  appState.isReadonly = auth.isReadonly;
  appState.currentUser = auth.email;
  if (!BACKEND_ENABLED && appState.isAdmin && !appState.isReadonly && !appState.isSuperAdmin) {
    const stillExists = getAdmins().some(
      (admin) => admin.email === auth.email,
    );
    if (!stillExists) {
      handleAdminRemoval(getAdminRemovalNotice(auth.email));
      return Promise.resolve(false);
    }
  }
  const matchedAdmin = normalizeAdminRecord(
    getAdmins().find((admin) => admin.email === auth.email) || {},
  );
  const resolvedLevel =
    Number(auth.level) ||
    matchedAdmin.level ||
    deriveLevelFromPermissions(auth.permissions || {});
  appState.adminLevel = resolvedLevel;
  appState.currentUserName =
    auth.fullName || matchedAdmin.fullName || "";
  appState.permissions = auth.isSuperAdmin
    ? { ...DEFAULT_PERMISSIONS }
    : clampPermissionsToLevel(auth.permissions || {}, resolvedLevel);
  appState.guestPermissions = getGuestPermissions();
  if (BACKEND_ENABLED) {
    return fetch("/api/session", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("SESSION_INVALID");
        return res.json();
      })
      .then((data) => {
        if (data?.csrfToken) setCsrfToken(data.csrfToken);
        if (data?.auth) {
          const nextAuth = {
            ...auth,
            ...data.auth,
            permissions: data.auth.permissions || auth.permissions || {},
            level: data.auth.level || auth.level || resolvedLevel,
            timestamp: new Date().getTime(),
          };
          applyAuthData(nextAuth);
        }
        if (!deferShow) showMainApp();
        return true;
      })
      .catch(() => {
        clearAuthSessionLocal();
        showLogin();
        return false;
      });
  }
  if (!deferShow) showMainApp();
  return Promise.resolve(true);
}

function showLogin() {
  pushRouteForView("login", { path: "/login", replace: true });
  document.getElementById("loginOverlay").style.display = "flex";
  document.getElementById("mainContainer").style.display = "none";
  renderPresence([]);
  stopAutoSave();
  stopPresenceTracking();
  stopReportsPolling();
  stopNotificationsPolling();
  stopSiteMetaRefresh();
  stopPermissionRefresh();
  stopSharedDataRefresh();
  updateLangButtons();
}

function showMainApp() {
  if (window.location.pathname === "/login") {
    pushRouteForView("home", { path: "/home", replace: true });
  }
  document.getElementById("loginOverlay").style.display = "none";
  document.getElementById("mainContainer").style.display = "block";
  updateLangButtons();
  if (typeof initializeAppShell === "function") initializeAppShell();
  startPresenceTracking();
  startReportsPolling();
  startNotificationsPolling();
  startSiteMetaRefresh();
  startPermissionRefresh();
  startSharedDataRefresh();
  if (hasPermission("canViewSurveys")) {
    getSurveysList().catch(() => {});
  } else {
    updateSurveysBadge();
  }

  document.getElementById("readonlyBadgeText").style.display = appState.isReadonly
    ? "inline-block"
    : "none";
  document.getElementById("guestLoginBtn").style.display = appState.isReadonly
    ? "inline-flex"
    : "none";

  if (appState.isReadonly) {
    document.getElementById("mainContainer").classList.add("readonly");
    hideEl("btnAddRow");
    hideEl("btnRemoveRow");
  } else {
    document.getElementById("mainContainer").classList.remove("readonly");
  }

  applyPermissionVisibility();

  document.getElementById("datePicker").value = appState.currentDate;
  reinitFlatpickr();
  updateNotifBadge();
  updateTopbarUser();
  if (typeof initAccountNotifications === "function") initAccountNotifications();
  if (typeof syncAccountNotifications === "function") syncAccountNotifications();
  updateShellForView(currentView);
}

function updateTopbarUser() {
  const topbarUser = document.getElementById("topbarUser");
  if (!topbarUser) return;
  const name = (appState.currentUserName || appState.currentUser || "-").toString().trim();
  topbarUser.textContent = name || "-";
  if (canOpenAdminPanelAccess()) {
    topbarUser.setAttribute("data-cmax-action", "admin.open");
    topbarUser.style.cursor = "pointer";
    topbarUser.title = "Otvori postavke";
  } else {
    topbarUser.removeAttribute("data-cmax-action");
    topbarUser.style.cursor = "default";
    topbarUser.title = "";
  }
}

function getModuleLabelForView(view) {
  const labels = {
    home: "Home",
    main: "Planner",
    planner: "Planner",
    tidplan: "Tidplan",
    bins: "Kante za smece",
    warehouse: "Skladiste",
    warehouseLogs: "Skladiste",
    warehouseGraph: "Skladiste",
    workwear: "Store",
    reports: "Report",
    notifications: "Obavijesti",
    surveys: "Ankete / Pitanja",
    admin: "Postavke",
  };
  return labels[view] || "Home";
}

function getModuleIconForView(view) {
  const icons = {
    home: 'url("icons/home.svg")',
    main: 'url("icons/planner.svg")',
    planner: 'url("icons/planner.svg")',
    tidplan: 'url("icons/tidplan.svg")',
    bins: 'url("icons/bins.svg")',
    warehouse: 'url("icons/warehouse.svg")',
    warehouseLogs: 'url("icons/warehouse.svg")',
    warehouseGraph: 'url("icons/warehouse.svg")',
    workwear: 'url("icons/warehouse.svg")',
    reports: 'url("icons/planner.svg")',
    notifications: 'url("icons/notifications.svg")',
    surveys: 'url("icons/surveys.svg")',
    admin: 'url("icons/admin.svg")',
  };
  return icons[view] || icons.home;
}

function updateShellForView(view = currentView) {
  document.body.dataset.currentView = view;
  const workwearSection = document.getElementById("workwear-section");
  if (workwearSection && view !== "workwear") {
    workwearSection.style.display = "none";
    if (typeof workwearCartOverlayOpen !== "undefined") workwearCartOverlayOpen = false;
    if (typeof renderWorkwearCartOverlay === "function") renderWorkwearCartOverlay();
  }
  const moduleLabel = document.getElementById("currentModuleLabel");
  if (moduleLabel) moduleLabel.textContent = getModuleLabelForView(view);
  const moduleIcon = document.querySelector(".module-context-icon");
  if (moduleIcon) moduleIcon.style.setProperty("--icon", getModuleIconForView(view));
  if (typeof updateShellNavigationState === "function") updateShellNavigationState();
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "inline-flex";
}
function hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
function setVisibility(id, v) {
  const el = document.getElementById(id);
  if (el) el.style.display = v ? "inline-flex" : "none";
}
function setElVisibility(id, v) {
  const el = document.getElementById(id);
  if (el) el.style.display = v ? "flex" : "none";
}

function showLoading(messageKey = "loadingDefault") {
  const overlay = document.getElementById("loadingOverlay");
  const text = document.getElementById("loadingText");
  if (text) text.textContent = t(messageKey);
  if (overlay) overlay.style.display = "flex";
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.style.display = "none";
}

function withLoading(messageKey, callback) {
  showLoading(messageKey);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        callback();
      } finally {
        hideLoading();
      }
    });
  });
}

function withLoadingPromise(messageKey, callback) {
  showLoading(messageKey);
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      hideLoading();
    });
}

function loadFreshDataForView(messageKey, callback) {
  const run = () => {
    if (!BACKEND_ENABLED) return Promise.resolve(callback());
    return loadAllData({ strict: true }).then(callback);
  };
  return withLoadingPromise(messageKey || "loadingDefault", run).catch((error) => {
    appDataLoadError = error?.message || "DATA_LOAD_FAILED";
    showDataLoadError(appDataLoadError);
    showToast(t("freshDataLoadFailed"), "error");
    return false;
  });
}

function applyPermissionVisibility() {
  const canPlanner = canAccessPlannerModule();
  const canTidplan = canAccessTidplanModule();
  const canBins = canAccessBinsModule();
  const canWarehouse = canAccessWarehouseModule();
  const canWorkwear = canAccessWorkwearModule();
  const canWarehouseLogs = canViewWarehouseLogsSection();
  const canWarehouseGraph = canViewWarehouseAnalyticsSection();
  const canReports = canAccessReportsModule();
  const canExportWarehouseAccess = canExportWarehouse();
  const canImportWarehouseAccess = canImportWarehouse();
  const canExportTidplanAccess = canExportTidplan();
  const canImportTidplanAccess = canImportTidplan();
  const canAdminPanel = canOpenAdminPanelAccess();
  const canManagePlannerRows = !appState.isReadonly && appState.isAdmin;

  setVisibility("btnPrint", hasPermission("canPrint"));
  setVisibility("btnExport", hasPermission("canExport"));
  setVisibility("btnClear", !appState.isReadonly && hasPermission("canClear") && canEditDate(appState.currentDate));
  setVisibility("btnReport", false);

  setVisibility("btnWarehouseExportExcel", canExportWarehouseAccess);
  setVisibility("btnWarehouseImportExcel", canImportWarehouseAccess);
  setVisibility("btnTidplanExportPdf", canExportTidplanAccess);
  setVisibility("btnTidplanImportPdf", canImportTidplanAccess);
  setVisibility("plannerExportDropdown", canExportPlanner());
  setVisibility("btnPlannerImportExcel", canImportPlanner());
  setVisibility("btnTidplan", canTidplan);
  setVisibility("btnBins", canBins);
  setVisibility("btnWarehouse", canWarehouse);
  setVisibility("btnNotifications", canAccessNotificationsModule());
  setVisibility("topbarNotificationsBtn", Boolean(appState.currentUser));
  setVisibility("btnPrintNotification", canAccessNotificationsModule() && hasPermission("canPrint"));
  setVisibility("btnSurveys", hasPermission("canViewSurveys"));
  setVisibility("adminBtn", canAdminPanel);
  setVisibility("btnLogout", !appState.isReadonly);
  setVisibility("topbarLogoutBtn", !appState.isReadonly);
  setVisibility("btnAddRow", canManagePlannerRows);
  setVisibility("btnRemoveRow", canManagePlannerRows);
  setVisibility("btnUseTidplanScheme", canManagePlannerRows);
  hide("btnSave");

  setElVisibility("workersControls", !appState.isReadonly && hasPermission("canManageWorkers"));
  setElVisibility("liftsControls", !appState.isReadonly && hasPermission("canManageLifts"));
  setElVisibility("momentsControls", !appState.isReadonly && hasPermission("canManageMoments"));
  setElVisibility("plansControls", !appState.isReadonly && hasPermission("canManagePlans"));
  setElVisibility("karnasControls", !appState.isReadonly && hasPermission("canManageKarnas"));

  // Admin panel specific permissions
  setVisibility("tabBtnBackup", canViewBackups());


  const planningSection = document.querySelector(".planning-section");
  const listsContainer = document.querySelector(".lists-container");
  const binsSection = document.getElementById("binsSection");
  const tidplanSection = document.getElementById("tidplan-section");
  const notificationsSection = document.getElementById("notifications-section");
  const reportsSection = document.getElementById("reports-section");
  const settingsSection = document.getElementById("settings-section");
  const surveysSection = document.getElementById("surveys-section");
  const warehouseSection = document.getElementById("warehouse-section");
  const warehouseLogsSection = document.getElementById("warehouse-logs-section");
  const warehouseGraphSection = document.getElementById("warehouse-graph-section");
  const workwearSection = document.getElementById("workwear-section");
  const accessNotice = document.getElementById("accessNotice");
  const canNotifications = canAccessNotificationsModule();

  if (currentView === "bins" && !canBins) {
    currentView = "main";
    if (binsSection) binsSection.classList.remove("active");
    const binsBtn = document.getElementById("btnBins");
    if (binsBtn) binsBtn.classList.remove("btn-success");
  }

  if (currentView === "notifications" && !canNotifications) {
    currentView = "main";
    if (notificationsSection) notificationsSection.style.display = "none";
  }

  if (currentView === "reports" && !canReports) {
    currentView = "main";
    if (reportsSection) reportsSection.style.display = "none";
  }

  if (currentView === "warehouse" && !canWarehouse) {
    currentView = "main";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  }

  if (currentView === "warehouseLogs" && !canWarehouseLogs) {
    currentView = canWarehouse ? "warehouse" : "main";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
  }

  if (currentView === "warehouseGraph" && !canWarehouseGraph) {
    currentView = canWarehouse ? "warehouse" : "main";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  }

  if (currentView === "workwear" && !canWorkwear) {
    currentView = "main";
    if (workwearSection) workwearSection.style.display = "none";
  }

  if (tidplanSection && tidplanSection.style.display === "block" && !canTidplan) {
    CMAX.tidplan.showPlanner();
  }

  if (currentView === "main") {
    if (planningSection) planningSection.classList.toggle("hidden", !canPlanner);
    if (listsContainer) listsContainer.classList.toggle("hidden", !canPlanner);
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (workwearSection) workwearSection.style.display = "none";
  } else if (currentView === "bins") {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.add("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (workwearSection) workwearSection.style.display = "none";
  } else if (currentView === "notifications") {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "block";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (workwearSection) workwearSection.style.display = "none";
  } else if (currentView === "reports") {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "block";
    if (settingsSection) settingsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (workwearSection) workwearSection.style.display = "none";
  } else if (["warehouse", "warehouseLogs", "warehouseGraph"].includes(currentView)) {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = currentView === "warehouse" ? "block" : "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = currentView === "warehouseLogs" ? "block" : "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = currentView === "warehouseGraph" ? "block" : "none";
    if (workwearSection) workwearSection.style.display = "none";
  } else if (currentView === "workwear") {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (workwearSection) workwearSection.style.display = "block";
  } else if (currentView === "admin") {
    if (planningSection) planningSection.classList.add("hidden");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "block";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (workwearSection) workwearSection.style.display = "none";
  }

  if (!canPlanner && currentView === "main") {
    if (canTidplan && (!tidplanSection || tidplanSection.style.display !== "block")) {
      CMAX.tidplan.show();
      return;
    }
    if (canBins) {
      CMAX.bins.show();
      return;
    }
    if (canNotifications) {
      CMAX.notifications.show();
      return;
    }
    if (canWarehouse) {
      CMAX.warehouse.show();
      return;
    }
    if (canWorkwear) {
      CMAX.workwear.show();
      return;
    }
  }

  if (accessNotice) {
    const hasAnyPrimaryModule = canPlanner || canTidplan || canBins || canNotifications || canWarehouse || canWorkwear;
    accessNotice.style.display = hasAnyPrimaryModule ? "none" : "block";
  }

  setElVisibility("warehouseNavLogsBtn", canWarehouseLogs);
  setElVisibility("warehouseNavGraphBtn", canWarehouseGraph);
  setElVisibility("warehouseLogsGraphBtn", canWarehouseGraph);
  setElVisibility("warehouseGraphLogsBtn", canWarehouseLogs);
  setElVisibility("navWorkwearBtn", canWorkwear);
  if (typeof syncSidebarAccessState === "function") syncSidebarAccessState();
  if (typeof syncAccountNotifications === "function") syncAccountNotifications();
  updateShellForView(currentView);
}

/* ==================== FLATPICKR INIT ==================== */
var fpInstance = null;

function reinitFlatpickr() {
  if (typeof flatpickr === "undefined") return;
  if (fpInstance) {
    fpInstance.destroy();
    fpInstance = null;
  }
  const locales = {
    hr: flatpickr.l10ns.hr,
    en: flatpickr.l10ns.default,
    sv: flatpickr.l10ns.sv,
  };
  fpInstance = flatpickr("#datePicker", {
    locale: locales[currentLang] || flatpickr.l10ns.default,
    dateFormat: "Y-m-d",
    defaultDate: appState.currentDate,
    disableMobile: false,
    allowInput: false,
    clickOpens: true,
    onChange: function (selectedDates, dateStr) {
      if (!dateStr) return;
      appState.currentDate = dateStr;
      ensureBinsDataForDate(dateStr);
      updateDateDisplay();
      applyPermissionVisibility();
      renderPlanningTable();
      renderWorkersList();
      renderLiftsList();
      renderMomensList();
      renderPlansList();
      renderKarnasList();
      if (currentView === "bins") renderBinsTable();
      if (document.getElementById("tidplan-section")?.style.display === "block") {
        loadTidplanData();
        CMAX.tidplan.update();
      }
      updatePrintDate();
    },
  });
  const datePickerSection = document.querySelector(".date-picker-section");
  if (datePickerSection && !datePickerSection.dataset.boundOpenPicker) {
    datePickerSection.dataset.boundOpenPicker = "true";
    datePickerSection.addEventListener("click", () => {
      if (fpInstance) fpInstance.open();
    });
  }
}

function showDataLoadError(message) {
  const main = document.getElementById("mainContainer");
  const login = document.getElementById("loginOverlay");
  if (login) login.style.display = "none";
  if (main) {
    main.style.display = "block";
    main.innerHTML = `
      <div style="padding:24px;max-width:760px;margin:40px auto;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;">
        <h2>Ne mogu ucitati najnovije podatke</h2>
        <p>Backend nije vratio svjeze podatke, pa aplikacija nece prikazati stare lokalne podatke.</p>
        <p style="color:var(--text-light);">${escapeHtml(message || "DATA_LOAD_FAILED")}</p>
        <button class="btn" data-cmax-action="utils.reloadPage">Pokusaj ponovo</button>
      </div>
    `;
  }
}

async function fetchBackendHealth() {
  const response = await fetch("/api/health", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "HEALTH_CHECK_FAILED");
  const ready = data.storageReady === true || data.storage?.ready === true;
  if (!ready) throw new Error(data.storage?.lastError || "STORAGE_NOT_READY");
  return data;
}

async function loadFreshBackendData() {
  if (!BACKEND_ENABLED) {
    await loadAllData({ strict: false });
    freshServerDataLoaded = true;
    return true;
  }

  await fetchBackendHealth();
  await loadAllData({ strict: true });
  return true;
}

function initSurveyDateTimePickers() {
  if (typeof flatpickr === "undefined") return;
  if (window.surveyDateTimePickers) {
    window.surveyDateTimePickers.forEach((picker) => picker.destroy());
  }
  window.surveyDateTimePickers = [];

  const locales = {
    hr: flatpickr.l10ns.hr,
    en: flatpickr.l10ns.default,
    sv: flatpickr.l10ns.sv,
  };
  const locale = locales[currentLang] || flatpickr.l10ns.default;

  ["surveyStartDate", "surveyEndDate"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    const picker = flatpickr(input, {
      locale,
      dateFormat: "Y-m-d",
      defaultDate: input.value || null,
      disableMobile: false,
      allowInput: false,
      clickOpens: true,
    });
    window.surveyDateTimePickers.push(picker);
  });

  ["surveyStartTime", "surveyEndTime"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    const picker = flatpickr(input, {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      minuteIncrement: 5,
      defaultDate: input.value || null,
      disableMobile: false,
      allowInput: false,
      clickOpens: true,
    });
    window.surveyDateTimePickers.push(picker);
  });

  document.querySelectorAll(".survey-inline-fields").forEach((wrapper) => {
    if (wrapper.dataset.boundSurveyPickerOpen) return;
    wrapper.dataset.boundSurveyPickerOpen = "true";
    wrapper.addEventListener("click", (event) => {
      const input = event.target.closest("input") || wrapper.querySelector("input");
      if (input && input._flatpickr) input._flatpickr.open();
    });
  });
}

/* ==================== TIDPLAN DATEPICKERS ==================== */
function initTidplanDatePickers() {
  // Destroy existing tidplan datepickers
  if (window.tidplanDatePickers) {
    window.tidplanDatePickers.forEach(picker => picker.destroy());
  }
  window.tidplanDatePickers = [];
  if (typeof flatpickr === "undefined") return;

  const locales = {
    hr: flatpickr.l10ns.hr,
    en: flatpickr.l10ns.default,
    sv: flatpickr.l10ns.sv,
  };

  // Initialize datepickers for all tidplan date inputs
  const dateInputs = document.querySelectorAll('.tidplan-table input[type="date"]');
  dateInputs.forEach(input => {
    const picker = flatpickr(input, {
      locale: locales[currentLang] || flatpickr.l10ns.default,
      dateFormat: "Y-m-d",
      altInput: false,
      altFormat: "Y-m-d",
      defaultDate: input.value || null,
      disableMobile: false,
      allowInput: true,
      clickOpens: true,
      onChange: function(selectedDates, dateStr, instance) {
        // Trigger the original onchange event
        const event = new Event('change', { bubbles: true });
        instance.input.dispatchEvent(event);
      }
    });
    window.tidplanDatePickers.push(picker);
  });
}

/* ==================== AUTH ==================== */
function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) {
    showLoginError(t("errEmailPassword"));
    return;
  }

  // Clear previous error
  clearLoginError();

  // Disable inputs and show spinner
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginBtn = document.getElementById("loginBtnEl");
  const guestBtn = document.getElementById("guestBtnEl");

  loginEmail.disabled = true;
  loginPassword.disabled = true;
  loginBtn.disabled = true;
  guestBtn.disabled = true;

  const btnText = loginBtn.querySelector(".login-btn-text");
  const btnSpinner = loginBtn.querySelector(".login-btn-spinner");
  if (btnText) btnText.style.display = "none";
  if (btnSpinner) btnSpinner.style.display = "inline-block";

  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((res) => {
      if (!res.ok) {
        return res.json()
          .catch(() => ({}))
          .then((payload) => {
            const message = payload?.message || payload?.error || "LOGIN_FAILED";
            throw new Error(message);
          });
      }
      return res.json();
    })
    .then((data) => {
      if (!data || !data.auth) throw new Error("LOGIN_FAILED");
      const auth = data.auth;
      const level = Number(auth.level) || deriveLevelFromPermissions(auth.permissions || {});
      const perms = auth.permissions
        ? auth.isSuperAdmin
          ? { ...DEFAULT_PERMISSIONS }
          : clampPermissionsToLevel(auth.permissions || {}, level)
        : auth.isSuperAdmin
          ? { ...DEFAULT_PERMISSIONS }
          : clampPermissionsToLevel(appState.permissions || {}, level);
      const authData = {
        email: auth.email,
        fullName: auth.fullName || "",
        isAdmin: auth.isAdmin,
        isSuperAdmin: auth.isSuperAdmin,
        isReadonly: auth.isReadonly,
        permissions: perms,
        level,
        timestamp: new Date().getTime(),
      };
      setCsrfToken(data.csrfToken || "");
      applyAuthData(authData);
      addLog("Logged in");
      pushRouteForView("main", { path: "/home", replace: true });
      return loadFreshBackendData().then(() => {
        freshServerDataLoaded = true;
        showMainApp();
        startAutoSave();
      });
    })
    .then(() => {
      renderAll();
    })
    .catch((error) => {
      // Re-enable inputs on error
      loginEmail.disabled = false;
      loginPassword.disabled = false;
      loginBtn.disabled = false;
      guestBtn.disabled = false;

      if (btnText) btnText.style.display = "inline";
      if (btnSpinner) btnSpinner.style.display = "none";

      const message = error?.message && error.message !== "LOGIN_FAILED"
        ? error.message
        : t("errWrongCredentials");
      console.warn("Login failed:", message);
      showLoginError(message);
    });
}

function enterReadonlyMode() {
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginBtn = document.getElementById("loginBtnEl");
  const guestBtn = document.getElementById("guestBtnEl");

  loginEmail.disabled = true;
  loginPassword.disabled = true;
  loginBtn.disabled = true;
  guestBtn.disabled = true;

  const guestBtnText = guestBtn.querySelector(".login-guest-btn-text");
  const guestBtnSpinner = guestBtn.querySelector(".login-guest-btn-spinner");
  if (guestBtnText) guestBtnText.style.display = "none";
  if (guestBtnSpinner) guestBtnSpinner.style.display = "inline-block";

  clearLoginError();

  fetch("/api/login/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => {
      if (!res.ok) throw new Error("READONLY_FAILED");
      return res.json();
    })
    .then((data) => {
      const auth = data.auth || {};
      const authData = {
        email: auth.email || "readonly",
        fullName: auth.fullName || "",
        isAdmin: !!auth.isAdmin,
        isSuperAdmin: !!auth.isSuperAdmin,
        isReadonly: true,
        permissions: auth.permissions || {},
        level: auth.level || 1,
        timestamp: new Date().getTime(),
      };
      setCsrfToken(data.csrfToken || "");
      applyAuthData(authData);
      addLog("Entered read-only mode");
      pushRouteForView("main", { path: "/home", replace: true });
      return loadFreshBackendData().then(() => {
        freshServerDataLoaded = true;
        showMainApp();
        startAutoSave();
      });
    })
    .then(() => {
      renderAll();
    })
    .catch(() => {
      // Re-enable inputs on error
      loginEmail.disabled = false;
      loginPassword.disabled = false;
      loginBtn.disabled = false;
      guestBtn.disabled = false;

      if (guestBtnText) guestBtnText.style.display = "inline";
      if (guestBtnSpinner) guestBtnSpinner.style.display = "none";

      showLoginError(t("errReadonlyFailed") || "Read-only prijava nije uspjela.");
    });
}

function switchToLogin() {
  sendPresence(false, true).catch(() => {});
  document.getElementById("loginOverlay").style.display = "flex";
  document.getElementById("mainContainer").style.display = "none";
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
  clearLoginError();
  updateLangButtons();
}

function logout() {
  showConfirm(t("confirmLogout"), t("confirmLogoutTitle"), "🚪", () => {
    sendPresence(false, true).catch(() => {});
    fetch("/api/logout", { method: "POST" }).catch(() => {});
    clearAuthSessionLocal();
    appState.isAdmin = false;
    appState.isSuperAdmin = false;
    appState.isReadonly = false;
    appState.currentUser = null;
    appState.currentUserName = "";
    appState.adminLevel = 1;
    appState.permissions = normalizePermissions({});
    appState.guestPermissions = getGuestPermissions();
    showLogin();
  });
}

function showLoginError(message) {
  const errorContainer = document.getElementById("loginErrorContainer");
  const errorMessage = document.getElementById("loginErrorMessage");
  if (errorContainer && errorMessage) {
    errorMessage.textContent = message || t("errWrongCredentials");
    errorContainer.style.display = "block";
  }
}

function clearLoginError() {
  const errorContainer = document.getElementById("loginErrorContainer");
  if (errorContainer) {
    errorContainer.style.display = "none";
  }
}

/* ==================== EVENT LISTENERS ==================== */
