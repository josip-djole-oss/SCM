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
  const moduleEnabled = typeof isSiteModuleEnabled === "function" ? isSiteModuleEnabled : () => true;
  return [
    { key: "planner", moduleKey: "planner", title: "Planner", desc: "Dnevni staffing board i raspored rada.", icon: "planner", visible: canAccessPlannerModule(), action: () => CMAX.tidplan.showPlanner() },
    { key: "tidplan", moduleKey: "tidplan", title: "Tidplan", desc: "Scheduling cockpit i gantt planiranje.", icon: "tidplan", visible: canAccessTidplanModule(), action: () => CMAX.tidplan.show() },
    { key: "bins", moduleKey: "bins", title: "Kante za smece", desc: "Status i operacije za kontejnere i odvoz.", icon: "bins", visible: canAccessBinsModule(), action: () => CMAX.bins.show() },
    { key: "warehouse", moduleKey: "warehouse", title: "Skladiste", desc: "Ulaz, izlaz i stanje materijala.", icon: "warehouse", visible: canAccessWarehouseModule(), action: () => CMAX.warehouse.show() },
    { key: "workwear", moduleKey: "store", title: "Store", desc: "Interna trgovina odjece, PPE i alata.", icon: "warehouse", visible: canAccessWorkwearModule(), action: () => CMAX.workwear.show() },
    { key: "siteChat", moduleKey: "siteChat", title: "Chat", desc: "Brza komunikacija po gradilistu.", icon: "notifications", visible: canAccessSiteChatModule(), action: () => CMAX.siteChat.show() },
    { key: "notifications", moduleKey: "notifications", title: "Obavijesti", desc: "Objave, pinovi i timska komunikacija.", icon: "notifications", visible: canAccessNotificationsModule(), action: () => CMAX.notifications.show() },
    { key: "reports", moduleKey: "reports", title: "Report", desc: "Prijave i pregled reporta za korisnike s pristupom.", icon: "planner", visible: canAccessReportsModule(), action: () => CMAX.reports.showCenter() },
    { key: "surveys", moduleKey: "surveys", title: "Ankete / Pitanja", desc: "Brza pitanja, odgovori i rezultati.", icon: "surveys", visible: hasPermission("canViewSurveys"), action: () => CMAX.surveys.show() },
    { key: "admin", title: "Postavke", desc: "Profil, prava i platformske postavke.", icon: "admin", visible: canOpenAdminPanelAccess(), action: () => CMAX.admin.open() },
  ].filter((item) => item.visible && (!item.moduleKey || moduleEnabled(item.moduleKey)));
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

function renderHomeSiteInfo() {
  const siteCard = document.querySelector(".home-site-card");
  if (!siteCard) return;
  let panel = document.getElementById("homeSiteInfoPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "homeSiteInfoPanel";
    panel.className = "home-site-info-panel";
    siteCard.appendChild(panel);
  }
  const info = typeof getSiteInfoStorage === "function" ? getSiteInfoStorage(currentSite) : {};
  const address = [info.address, info.postalCode, info.city, info.country].filter(Boolean).join(", ");
  const lat = Number(info.latitude);
  const lng = Number(info.longitude);
  const hasExactPin = Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180;
  const navQuery = encodeURIComponent(hasExactPin ? `${lat.toFixed(6)},${lng.toFixed(6)}` : address || currentSite);
  const statusLabel = info.status === "paused" ? "Pauzirano" : info.status === "finished" ? "Zavrseno" : "Aktivno";
  const emergency = info.emergency || {};
  const workHours = info.workHours || {};
  const safetyRules = Array.isArray(info.safetyRules) ? info.safetyRules : [];
  const contacts = Array.isArray(info.contacts) && info.contacts.length ? info.contacts : [];
  const logistics = info.logistics || {};
  const documents = Array.isArray(info.documents) ? info.documents : [];
  const mapFrame = hasExactPin || address
    ? `<iframe title="Mapa gradilista" loading="lazy" src="https://www.google.com/maps?q=${navQuery}&output=embed"></iframe>`
    : `<span class="home-site-map-empty">Mapa nije postavljena.</span>`;
  const apdPlan = String(logistics.apdPlan || "");
  const apdPlanHtml = /^https?:\/\//i.test(apdPlan)
    ? `<a href="${dashboardEscapeHtml(apdPlan)}" target="_blank" rel="noopener">${dashboardEscapeHtml(apdPlan)}</a>`
    : dashboardEscapeHtml(apdPlan || "-");
  const contactCards = contacts
    .filter((contact) => contact.name || contact.phone || contact.email)
    .map((contact) => `
      <article class="home-site-contact-card">
        <strong>${dashboardEscapeHtml(contact.label || contact.role || "Kontakt")}</strong>
        <span>${dashboardEscapeHtml(contact.name || "-")}</span>
        ${contact.phone ? `<a href="tel:${dashboardEscapeHtml(contact.phone)}">${dashboardEscapeHtml(contact.phone)}</a>` : ""}
        ${contact.email ? `<a href="mailto:${dashboardEscapeHtml(contact.email)}">${dashboardEscapeHtml(contact.email)}</a>` : ""}
      </article>
    `).join("");
  panel.innerHTML = `
    <div class="home-site-info-head">
      <div>
        <span class="admin-compose-eyebrow">Baustela - Informacije</span>
        <h3>${dashboardEscapeHtml(info.projectName || currentSite || "-")}</h3>
      </div>
      <span class="home-site-status">${dashboardEscapeHtml(statusLabel)}</span>
    </div>
    <div class="home-site-info-priority">
      <article class="home-site-info-card">
        <strong>Lokacija</strong>
        <span>${dashboardEscapeHtml(info.name || currentSite || "-")}</span>
        <span>${dashboardEscapeHtml(address || "Adresa nije unesena.")}</span>
        <div class="home-site-mini-map">${mapFrame}</div>
        <div class="home-site-info-actions">
          <a class="btn btn-small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${navQuery}">Otvori navigaciju</a>
          <a class="btn btn-small btn-secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${navQuery}">Google Maps</a>
          <a class="btn btn-small btn-secondary" target="_blank" rel="noopener" href="https://maps.apple.com/?q=${navQuery}">Apple Maps</a>
          <a class="btn btn-small btn-secondary" target="_blank" rel="noopener" href="https://waze.com/ul?q=${navQuery}&navigate=yes">Waze</a>
        </div>
      </article>
      <article class="home-site-info-card">
        <strong>Kontakti</strong>
        <span>${dashboardEscapeHtml(info.contactPerson || "Kontakt osoba nije unesena.")}</span>
        ${info.phone ? `<a href="tel:${dashboardEscapeHtml(info.phone)}">${dashboardEscapeHtml(info.phone)}</a>` : ""}
        ${info.email ? `<a href="mailto:${dashboardEscapeHtml(info.email)}">${dashboardEscapeHtml(info.email)}</a>` : ""}
        <div class="home-site-contact-mini-grid">${contactCards || "<span>Nema dodatnih kontakata.</span>"}</div>
      </article>
      <article class="home-site-info-card is-emergency">
        <strong>Hitni podaci</strong>
        <span>Hitni broj: ${dashboardEscapeHtml(emergency.emergencyNumber || "112")}</span>
        <span>Bolnica: ${dashboardEscapeHtml(emergency.hospital || "-")}</span>
        <span>Prva pomoc: ${dashboardEscapeHtml(emergency.firstAid || "-")}</span>
        <span>Vatrogasci: ${dashboardEscapeHtml(emergency.fireDepartment || "-")}</span>
        <span>Okupljanje: ${dashboardEscapeHtml(emergency.meetingPoint || "-")}</span>
        <span>Defibrilator: ${dashboardEscapeHtml(emergency.defibrillator || "-")}</span>
      </article>
    </div>
    <details class="home-site-info-details">
      <summary>Projekt informacije</summary>
      <p>${dashboardEscapeHtml(info.description || "Nema opisa.")}</p>
      <p>Investitor: ${dashboardEscapeHtml(info.investor || "-")} | Glavni izvodac: ${dashboardEscapeHtml(info.mainContractor || "-")}</p>
      <p>Pocetak: ${dashboardEscapeHtml(info.startDate || "-")} | Planirani zavrsetak: ${dashboardEscapeHtml(info.plannedEndDate || "-")} | ${dashboardEscapeHtml(String(info.progress || 0))}%</p>
    </details>
    <details class="home-site-info-details">
      <summary>Radno vrijeme i pravila</summary>
      <p>${dashboardEscapeHtml(workHours.days || "Ponedjeljak-Petak")} ${dashboardEscapeHtml(workHours.hours || "07:00-16:00")}</p>
      <p>Pauze: ${dashboardEscapeHtml(Array.isArray(workHours.breaks) ? workHours.breaks.join(", ") : "-")}</p>
      <ul>${safetyRules.map((rule) => `<li>${dashboardEscapeHtml(rule)}</li>`).join("")}</ul>
    </details>
    <details class="home-site-info-details">
      <summary>Logistika i dokumenti</summary>
      <p>Parking: ${dashboardEscapeHtml(logistics.parking || "-")}</p>
      <p>Skladiste: ${dashboardEscapeHtml(logistics.storage || "-")}</p>
      <p>Zona istovara: ${dashboardEscapeHtml(logistics.unloadingZone || "-")}</p>
      <p>APD plan: ${apdPlanHtml}</p>
      <ul>${documents.map((doc) => `<li>${/^https?:\/\//i.test(doc) ? `<a href="${dashboardEscapeHtml(doc)}" target="_blank" rel="noopener">${dashboardEscapeHtml(doc)}</a>` : dashboardEscapeHtml(doc)}</li>`).join("") || "<li>Nema dokumenata.</li>"}</ul>
    </details>
  `;
}

function refreshHomeLaunchpad() {
  renderHomeHeroMeta();
  renderHomeSiteCards();
  renderHomeModuleCards();
  renderHomeSiteInfo();
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
  if (currentView === "siteChat") activeView = "siteChat";
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
  const navSiteChat = document.getElementById("navSiteChatBtn");

  if (navAdmin) navAdmin.style.display = canOpenAdminPanelAccess() ? "flex" : "none";
  if (navSurveys) navSurveys.style.display = hasPermission("canViewSurveys") ? "flex" : "none";
  if (navNotifications) navNotifications.style.display = canAccessNotificationsModule() ? "flex" : "none";
  if (navReports) navReports.style.display = canAccessReportsModule() ? "flex" : "none";
  if (navWarehouse) navWarehouse.style.display = canAccessWarehouseModule() ? "flex" : "none";
  if (navTidplan) navTidplan.style.display = canAccessTidplanModule() ? "flex" : "none";
  if (navPlanner) navPlanner.style.display = canAccessPlannerModule() ? "flex" : "none";
  if (navBins) navBins.style.display = canAccessBinsModule() ? "flex" : "none";
  if (navWorkwear) navWorkwear.style.display = canAccessWorkwearModule() ? "flex" : "none";
  if (navSiteChat) navSiteChat.style.display = canAccessSiteChatModule() ? "flex" : "none";
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
    sidebarBackdrop.addEventListener("click", closeSidebarOnMobile);
  }
  document.querySelectorAll(".app-nav-item").forEach((item) => {
    if (item.dataset.shellNavBound) return;
    item.dataset.shellNavBound = "true";
    item.addEventListener("click", closeSidebarOnMobile);
  });
  if (!document.body.dataset.cmaxSidebarEscBound) {
    document.body.dataset.cmaxSidebarEscBound = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSidebarOnMobile();
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

function showHomeDashboard(options = {}) {
  const opts = (options && typeof options === "object") ? options : {};
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
    const siteChatSection = document.getElementById("site-chat-section");
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
    if (siteChatSection) siteChatSection.style.display = "none";
    if (binsSection) binsSection.classList.remove("active");
    if (listsContainer) listsContainer.classList.add("hidden");

    currentView = "home";
    saveCurrentView("home");
    pushRouteForView("home", opts.replaceRoute ? { path: "/home", replace: true } : {});

    syncSidebarAccessState();
    notifyDashboardViewChanged();
    refreshHomeLaunchpad();
    refreshDashboardView();
    ensureDashboardRefreshLoop();
    if (typeof updateShellForView === "function") updateShellForView("home");
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  };

  if (opts.fresh === false) {
    runView();
    return true;
  }
  return loadFreshDataForView("loadingDefault", runView);
}

function showHome() {
  return showHomeDashboard();
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 1100) {
    toggleSidebarOverlay(false);
  }
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 1100) {
    toggleSidebarOverlay(false);
  }
});

