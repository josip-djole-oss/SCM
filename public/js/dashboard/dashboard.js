var dashboardRefreshInterval = null;

function dashboardEscapeHtml(value) {
  const text = value == null ? "" : String(value);
  if (typeof escapeHtml === "function") return escapeHtml(text);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dashboardFormatRelativeTime(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h ago`;
  return `${Math.floor(diffSec / 86400)} d ago`;
}

function getDashboardPlannerSummary() {
  const dayData = typeof getCurrentDayData === "function" ? getCurrentDayData() : { planningRows: [] };
  const rows = Array.isArray(dayData?.planningRows) ? dayData.planningRows : [];
  const assignedWorkers = new Set();
  rows.forEach((row) => {
    if (row?.w1) assignedWorkers.add(row.w1);
    if (row?.w2) assignedWorkers.add(row.w2);
    if (row?.w3) assignedWorkers.add(row.w3);
  });
  const workers = typeof getActiveResourceList === "function"
    ? getActiveResourceList("workers", appState.currentDate)
    : (appState.workers || []);
  return {
    rows: rows.length,
    assignedWorkers: assignedWorkers.size,
    availableWorkers: workers.length,
  };
}

function getDashboardNotificationsSummary() {
  const total = typeof getNotificationsForSite === "function"
    ? (getNotificationsForSite(currentSite) || []).length
    : 0;
  const unread = typeof getUnreadNotificationsCount === "function"
    ? getUnreadNotificationsCount()
    : 0;
  return { total, unread };
}

function getDashboardReportsSummary() {
  const reports = typeof getReports === "function" ? getReports() : [];
  const pending = reports.filter((entry) => entry?.status === "pending").length;
  const total = reports.length;
  return { pending, total };
}

function getDashboardSurveySummary() {
  const surveys = Array.isArray(surveysCache) ? surveysCache : [];
  const unread = typeof getUnreadSurveysCount === "function" ? getUnreadSurveysCount() : 0;
  const now = Date.now();
  const active = surveys.filter((survey) => {
    const startAt = new Date(survey?.startAt || "").getTime();
    const endAt = new Date(survey?.endAt || "").getTime();
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) return false;
    return startAt <= now && now <= endAt;
  }).length;
  return { unread, active, total: surveys.length };
}

function getDashboardWarehouseSummary() {
  const alerts = typeof getWarehouseAlerts === "function" ? getWarehouseAlerts() : [];
  const catalog = warehouseData?.catalog || [];
  const logs = (warehouseData?.logs || []).slice().sort((a, b) => {
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });
  return {
    alerts: alerts.length,
    items: catalog.length,
    recentLogs: logs.slice(0, 5),
  };
}

function getDashboardSyncSummary() {
  const pendingQueue = pendingServerSyncOptions || {};
  const hasQueuedSync = Boolean(
    pendingQueue.includeAdmins ||
      pendingQueue.includeGuestPermissions ||
      pendingQueue.includeBinPermissions ||
      pendingQueue.includeSites ||
      pendingQueue.includeAdminRemovalNotices ||
      pendingQueue.adminEditTargetEmail,
  );
  return {
    inProgress: Boolean(serverSyncInFlight),
    queued: hasQueuedSync,
    version: Number(serverStateVersion) || 1,
  };
}

function getDashboardAutosaveSummary() {
  const dirty = Boolean(appState?.hasUnsavedChanges || tidplanDataChanged);
  return {
    enabled: Boolean(autoSaveInterval),
    dirty,
  };
}

function getDashboardRecentActivity() {
  const logs = typeof getLogs === "function" ? getLogs() : [];
  return logs
    .slice()
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 8);
}

function renderDashboardCards() {
  const statsWrap = document.getElementById("dashboardStatsGrid");
  if (!statsWrap) return;
  const siteName = document.getElementById("dashboardSiteName");
  if (siteName) siteName.textContent = currentSite || "current site";

  const planner = getDashboardPlannerSummary();
  const presenceCount = Number(appState?.activePresenceCount) || 0;
  const notifications = getDashboardNotificationsSummary();
  const surveys = getDashboardSurveySummary();
  const warehouse = getDashboardWarehouseSummary();
  const reports = getDashboardReportsSummary();

  statsWrap.innerHTML = `
    <article class="dash-stat-card">
      <div class="dash-stat-label">Planner Today</div>
      <div class="dash-stat-value">${planner.rows}</div>
      <div class="dash-stat-meta">${planner.assignedWorkers}/${planner.availableWorkers} radnika rasporedjeno</div>
    </article>
    <article class="dash-stat-card">
      <div class="dash-stat-label">Resources Ready</div>
      <div class="dash-stat-value">${planner.availableWorkers}</div>
      <div class="dash-stat-meta">${presenceCount} korisnika trenutno online</div>
    </article>
    <article class="dash-stat-card">
      <div class="dash-stat-label">Notifications</div>
      <div class="dash-stat-value">${notifications.unread}</div>
      <div class="dash-stat-meta">${notifications.total} objava ukupno</div>
    </article>
    <article class="dash-stat-card">
      <div class="dash-stat-label">Warehouse Alerts</div>
      <div class="dash-stat-value">${warehouse.alerts}</div>
      <div class="dash-stat-meta">${warehouse.items} artikala, ${surveys.unread} neprocitanih anketa</div>
    </article>
  `;
}

function renderDashboardRecentActivity() {
  const list = document.getElementById("dashboardRecentActivity");
  if (!list) return;
  const logs = getDashboardRecentActivity();
  if (!logs.length) {
    list.innerHTML = `<div class="dashboard-empty">No recent activity yet.</div>`;
    return;
  }

  list.innerHTML = logs
    .map((entry) => {
      const actor = dashboardEscapeHtml(getUserDisplayName(entry.user, entry.userName) || entry.user || "Unknown");
      const action = dashboardEscapeHtml(entry.action || "activity");
      const details = dashboardEscapeHtml(formatLogDetails(entry.details || ""));
      return `
        <div class="dash-activity-item">
          <div class="dash-activity-main">${action}</div>
          <div class="dash-activity-sub">${actor} · ${details || "-"}</div>
          <div class="dash-activity-time">${dashboardFormatRelativeTime(entry.timestamp)}</div>
        </div>
      `;
    })
    .join("");
}

function renderDashboardWarehouseActivity() {
  const list = document.getElementById("dashboardWarehouseActivity");
  if (!list) return;
  const warehouse = getDashboardWarehouseSummary();
  if (!warehouse.recentLogs.length) {
    list.innerHTML = `<div class="dashboard-empty">No warehouse activity available.</div>`;
    return;
  }
  list.innerHTML = warehouse.recentLogs
    .map((entry) => {
      return `
        <div class="dash-activity-item">
          <div class="dash-activity-main">${dashboardEscapeHtml(entry.itemName || entry.type || "Item change")}</div>
          <div class="dash-activity-sub">${dashboardEscapeHtml(entry.direction || "-")} ${Number(entry.quantity) || 0}</div>
          <div class="dash-activity-time">${dashboardFormatRelativeTime(entry.timestamp)}</div>
        </div>
      `;
    })
    .join("");
}

function renderDashboardSystemStatus() {
  const container = document.getElementById("dashboardSystemStatus");
  if (!container) return;

  const sync = getDashboardSyncSummary();
  const autosave = getDashboardAutosaveSummary();
  const permissionsEnabled = Object.values(appState.permissions || {}).filter(Boolean).length;

  const syncStatus = sync.inProgress ? "Sync in progress" : sync.queued ? "Sync queued" : "Synced";
  const autosaveStatus = autosave.enabled ? "Enabled" : "Not running";
  const changeStatus = autosave.dirty ? "Unsaved local changes" : "No pending local edits";
  const userName = dashboardEscapeHtml(appState.currentUserName || appState.currentUser || "Guest");

  container.innerHTML = `
    <div class="dash-status-row">
      <span>Active Site</span>
      <strong>${dashboardEscapeHtml(currentSite)}</strong>
    </div>
    <div class="dash-status-row">
      <span>User</span>
      <strong>${userName}</strong>
    </div>
    <div class="dash-status-row">
      <span>Sync Status</span>
      <strong>${syncStatus}</strong>
    </div>
    <div class="dash-status-row">
      <span>Version</span>
      <strong>v${sync.version}</strong>
    </div>
    <div class="dash-status-row">
      <span>Autosave</span>
      <strong>${autosaveStatus}</strong>
    </div>
    <div class="dash-status-row">
      <span>Change Queue</span>
      <strong>${changeStatus}</strong>
    </div>
    <div class="dash-status-row">
      <span>Permission Flags</span>
      <strong>${permissionsEnabled}</strong>
    </div>
  `;
}

function getHomeModuleDefinitions() {
  return [
    { key: "planner", title: "Planner", desc: "Dnevni staffing board i raspored rada.", icon: "planner", visible: canAccessPlannerModule(), action: () => CMAX.tidplan.showPlanner() },
    { key: "tidplan", title: "Tidplan", desc: "Scheduling cockpit i gantt planiranje.", icon: "tidplan", visible: canAccessTidplanModule(), action: () => CMAX.tidplan.show() },
    { key: "bins", title: "Kante za smece", desc: "Status i operacije za kontejnere i odvoz.", icon: "bins", visible: canAccessBinsModule(), action: () => CMAX.bins.show() },
    { key: "warehouse", title: "Skladiste", desc: "Ulaz, izlaz i stanje materijala.", icon: "warehouse", visible: canAccessWarehouseModule(), action: () => CMAX.warehouse.show() },
    { key: "workwear", title: "Store", desc: "Interna trgovina odjece, PPE i alata.", icon: "warehouse", visible: canAccessWorkwearModule(), action: () => CMAX.workwear.show() },
    { key: "notifications", title: "Obavijesti", desc: "Objave, pinovi i timska komunikacija.", icon: "notifications", visible: canAccessNotificationsModule(), action: () => CMAX.notifications.show() },
    { key: "reports", title: "Report", desc: "Prijave i pregled reporta za korisnike s pristupom.", icon: "planner", visible: canAccessReportsModule(), action: () => CMAX.reports.showCenter() },
    { key: "surveys", title: "Ankete / Pitanja", desc: "Brza pitanja, odgovori i rezultati.", icon: "surveys", visible: hasPermission("canViewSurveys"), action: () => CMAX.surveys.show() },
    { key: "admin", title: "Postavke", desc: "Profil, prava i platformske postavke.", icon: "admin", visible: canOpenAdminPanelAccess(), action: () => CMAX.admin.open() },
  ].filter((item) => item.visible);
}

function createHomeTileIcon(iconKey) {
  return `<span class="home-tile-icon" style="--icon:url('icons/${iconKey}.svg')"><span class="app-nav-icon" style="--icon:url('icons/${iconKey}.svg')"></span></span>`;
}

function renderHomeSiteCards() {
  const container = document.getElementById("homeSiteCards");
  if (!container) return;
  const sites = typeof getAccessibleSites === "function" ? getAccessibleSites() : [currentSite];
  container.innerHTML = sites
    .map((site) => {
      const active = site === currentSite ? " is-active" : "";
      return `
        <button class="home-site-tile${active}" type="button" data-home-site="${dashboardEscapeHtml(site)}">
          ${createHomeTileIcon("site")}
          <span class="home-tile-title">${dashboardEscapeHtml(site)}</span>
          <span class="home-tile-desc">${site === currentSite ? "Aktivno gradiliste za trenutni rad." : "Klik za prebacivanje konteksta gradilista."}</span>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll("[data-home-site]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const site = button.getAttribute("data-home-site");
      if (site && typeof switchSiteFromLocal === "function") {
        switchSiteFromLocal(site);
        renderHomeSiteCards();
        refreshDashboardView();
      }
    });
  });
}

function renderHomeModuleCards() {
  const container = document.getElementById("homeModuleCards");
  if (!container) return;
  const modules = getHomeModuleDefinitions();
  container.innerHTML = modules
    .map((module) => `
      <button class="home-module-tile" type="button" data-home-module="${module.key}">
        ${createHomeTileIcon(module.icon)}
        <span class="home-tile-title">${dashboardEscapeHtml(module.title)}</span>
        <span class="home-tile-desc">${dashboardEscapeHtml(module.desc)}</span>
      </button>
    `)
    .join("");

  container.querySelectorAll("[data-home-module]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-home-module");
      const module = modules.find((item) => item.key === key);
      if (module?.action) module.action();
    });
  });
}

function renderHomeHeroMeta() {
  const today = document.getElementById("homeTodayDate");
  if (today) today.textContent = new Date().toLocaleDateString(getCurrentLocale ? getCurrentLocale() : undefined);
  const site = document.getElementById("dashboardSiteName");
  if (site) site.textContent = currentSite || "-";
}

function refreshHomeLaunchpad() {
  renderHomeHeroMeta();
  renderHomeSiteCards();
  renderHomeModuleCards();
}

function refreshDashboardView() {
  if (document.getElementById("home-section")?.style.display !== "block") return;
  renderDashboardCards();
  renderDashboardRecentActivity();
  renderDashboardWarehouseActivity();
  renderDashboardSystemStatus();
}

function ensureDashboardRefreshLoop() {
  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = null;
  }
  dashboardRefreshInterval = setInterval(() => {
    refreshDashboardView();
  }, 5000);
}

function stopDashboardRefreshLoop() {
  if (!dashboardRefreshInterval) return;
  clearInterval(dashboardRefreshInterval);
  dashboardRefreshInterval = null;
}

function updateShellNavigationState() {
  const items = document.querySelectorAll(".app-nav-item[data-view]");
  let activeView = currentView;
  if (document.getElementById("tidplan-section")?.style.display === "block") activeView = "tidplan";
  if (currentView === "warehouseLogs" || currentView === "warehouseGraph") activeView = "warehouse";
  if (currentView === "workwear") activeView = "workwear";
  items.forEach((item) => {
    item.classList.toggle("is-active", item.getAttribute("data-view") === activeView);
  });
}

function syncSidebarAccessState() {
  const navAdmin = document.getElementById("navAdminBtn");
  const navSurveys = document.getElementById("navSurveysBtn");
  const navNotifications = document.getElementById("navNotificationsBtn");
  const navReports = document.getElementById("navReportsBtn");
  const navWarehouse = document.getElementById("navWarehouseBtn");
  const navTidplan = document.getElementById("navTidplanBtn");
  const navPlanner = document.getElementById("navPlannerBtn");
  const navBins = document.getElementById("navBinsBtn");
  const navWorkwear = document.getElementById("navWorkwearBtn");

  if (navAdmin) navAdmin.style.display = canOpenAdminPanelAccess() ? "flex" : "none";
  if (navSurveys) navSurveys.style.display = hasPermission("canViewSurveys") ? "flex" : "none";
  if (navNotifications) navNotifications.style.display = canAccessNotificationsModule() ? "flex" : "none";
  if (navReports) navReports.style.display = canAccessReportsModule() ? "flex" : "none";
  if (navWarehouse) navWarehouse.style.display = canAccessWarehouseModule() ? "flex" : "none";
  if (navTidplan) navTidplan.style.display = canAccessTidplanModule() ? "flex" : "none";
  if (navPlanner) navPlanner.style.display = canAccessPlannerModule() ? "flex" : "none";
  if (navBins) navBins.style.display = canAccessBinsModule() ? "flex" : "none";
  if (navWorkwear) navWorkwear.style.display = canAccessWorkwearModule() ? "flex" : "none";
}

function setSidebarCollapsed(collapsed) {
  const mainContainer = document.getElementById("mainContainer");
  if (!mainContainer) return;
  mainContainer.classList.toggle("sidebar-collapsed", collapsed);
  localStorage.setItem("cmax_sidebar_collapsed", collapsed ? "true" : "false");
}

function toggleSidebarCollapse() {
  const mainContainer = document.getElementById("mainContainer");
  if (!mainContainer) return;
  setSidebarCollapsed(!mainContainer.classList.contains("sidebar-collapsed"));
}

function toggleSidebarOverlay(forceOpen) {
  const mainContainer = document.getElementById("mainContainer");
  if (!mainContainer) return;
  if (window.innerWidth > 1024) {
    mainContainer.classList.remove("sidebar-overlay-open");
    document.body.classList.remove("sidebar-overlay-open");
    return;
  }
  const shouldOpen = typeof forceOpen === "boolean"
    ? forceOpen
    : !mainContainer.classList.contains("sidebar-overlay-open");
  mainContainer.classList.toggle("sidebar-overlay-open", shouldOpen);
  document.body.classList.toggle("sidebar-overlay-open", shouldOpen);
}

function initializeAppShell() {
  const stored = localStorage.getItem("cmax_sidebar_collapsed") === "true";
  setSidebarCollapsed(stored);
  syncSidebarAccessState();
  updateShellNavigationState();
  const sidebarBackdrop = document.getElementById("appSidebarBackdrop");
  if (sidebarBackdrop && !sidebarBackdrop.dataset.cmaxBound) {
    sidebarBackdrop.dataset.cmaxBound = "true";
    sidebarBackdrop.addEventListener("click", () => toggleSidebarOverlay(false));
  }
  document.querySelectorAll(".app-nav-item").forEach((item) => {
    if (item.dataset.shellNavBound) return;
    item.dataset.shellNavBound = "true";
    item.addEventListener("click", closeSidebarOnMobile);
  });
  if (!document.body.dataset.cmaxSidebarEscBound) {
    document.body.dataset.cmaxSidebarEscBound = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        toggleSidebarOverlay(false);
      }
    });
  }
}

function notifyDashboardViewChanged() {
  const dashboardSection = document.getElementById("home-section");
  if (!dashboardSection) return;
  const shouldShow = currentView === "home";
  dashboardSection.style.display = shouldShow ? "block" : "none";
  if (!shouldShow) stopDashboardRefreshLoop();
  updateShellNavigationState();
}

function showHomeDashboard() {
  const runView = () => {
    const plannerSection = document.getElementById("planner-section");
    const tidplanSection = document.getElementById("tidplan-section");
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");
    const warehouseLogsSection = document.getElementById("warehouse-logs-section");
    const warehouseGraphSection = document.getElementById("warehouse-graph-section");
    const reportsSection = document.getElementById("reports-section");
    const settingsSection = document.getElementById("settings-section");
    const homeSection = document.getElementById("home-section");
    if (typeof hideWorkwearSection === "function") hideWorkwearSection();
    const binsSection = document.getElementById("binsSection");
    const listsContainer = document.querySelector(".lists-container");

    if (homeSection) homeSection.style.display = "block";
    if (tidplanSection) tidplanSection.style.display = "none";
    if (plannerSection) plannerSection.style.display = "none";
    if (notificationsSection) notificationsSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (binsSection) binsSection.classList.remove("active");
    if (listsContainer) listsContainer.classList.add("hidden");

    currentView = "home";
    saveCurrentView("home");
    pushRouteForView("home");

    syncSidebarAccessState();
    notifyDashboardViewChanged();
    refreshHomeLaunchpad();
    refreshDashboardView();
    ensureDashboardRefreshLoop();
    if (typeof updateShellForView === "function") updateShellForView("home");
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  };

  return loadFreshDataForView("loadingDefault", runView);
}

function showHome() {
  return showHomeDashboard();
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 1024) {
    toggleSidebarOverlay(false);
  }
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) {
    toggleSidebarOverlay(false);
  }
});

