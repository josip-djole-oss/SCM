var STORAGE_KEY = "cmax_planner_data";
var AUTH_KEY = "cmax_planner_auth";
var ADMINS_KEY = "cmax_planner_admins";
var REPORTS_KEY = "cmax_planner_reports";
var BINS_KEY = "cmax_planner_bins";
var NOTIFICATIONS_KEY = "cmax_planner_notifications";
var LOGS_KEY = "cmax_planner_logs";
var BIN_PERMS_KEY = "cmax_planner_bin_perms";
var DARK_KEY = "cmax_dark";
var THEME_KEY = "cmax_theme";
var SITES_KEY = "cmax_sites";
var CURRENT_SITE_KEY = "cmax_current_site";
var CURRENT_VIEW_KEY = "cmax_current_view";
var NOTIFICATIONS_COUNTER_KEY = "cmax_notifications_counter";
var CSRF_TOKEN_KEY = "cmax_csrf_token";
var SUPER_ADMIN_EMAIL = "admin@cmax.se";
var SUPER_ADMIN_PASSWORD = "cmax2026";

function getStorageKey(module) {
  return module + "_" + currentSite;
}

function sanitizeSiteId(site) {
  return String(site || "").replace(/[^A-Za-z0-9_-]/g, "_");
}

function compareNaturally(a, b) {
  return (a || "").toString().localeCompare((b || "").toString(), "hr", {
    numeric: true,
    sensitivity: "base",
  });
}

function sortNaturally(items) {
  return [...items].sort(compareNaturally);
}

function isPastDate(dateValue) {
  const text = String(dateValue || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${text}T00:00:00`);
  return date < today;
}

function canEditDate(dateValue = appState.currentDate) {
  if (appState.isReadonly) return false;
  if (!isPastDate(dateValue)) return true;
  return canUnlockPastDaysAccess() && unlockedPastDates[normalizeDateOnly(dateValue)] === true;
}

function canUnlockPastDaysAccess() {
  return appState.isSuperAdmin || getCurrentAdminLevel() >= 6 || hasPermission("canUnlockPastDays");
}

function renderPastDayLockNotice(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const existing = container.querySelector(".past-day-lock-notice");
  if (!isPastDate(appState.currentDate)) {
    if (existing) existing.remove();
    return;
  }
  const checked = unlockedPastDates[normalizeDateOnly(appState.currentDate)] === true;
  const toggleText = checked ? t("pastDayRelock") : t("pastDayUnlock");
  const notice = existing || document.createElement("div");
  notice.className = "past-day-lock-notice";
  notice.style.cssText = "margin:8px 0;padding:10px 12px;border:1px solid #f59e0b;background:#fff7ed;color:#7c2d12;border-radius:6px;font-size:14px;";
  notice.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <span>${escapeHtml(t("pastDayLocked"))}</span>
      ${
        canUnlockPastDaysAccess()
          ? `<label style="display:inline-flex;align-items:center;gap:6px;"><input type="checkbox" data-unlock-past-day ${checked ? "checked" : ""}> ${escapeHtml(toggleText)}</label>`
          : ""
      }
    </div>
  `;
  if (!existing) container.insertBefore(notice, container.firstChild);
  const message = notice.querySelector("span");
  if (message) {
    const strongMessage = document.createElement("strong");
    strongMessage.textContent = t("pastDayLocked");
    message.replaceWith(strongMessage);
  }
  const checkbox = notice.querySelector("[data-unlock-past-day]");
  if (checkbox) {
    const label = checkbox.closest("label");
    if (label) {
      label.style.fontWeight = "600";
      label.replaceChildren(checkbox, document.createTextNode(` ${toggleText}`));
    }
    checkbox.onchange = () => {
      unlockedPastDates[normalizeDateOnly(appState.currentDate)] = checkbox.checked;
      renderAll();
      if (currentView === "bins") renderBinsTable();
      if (document.getElementById("tidplan-section")?.style.display === "block") updateTidplan();
      applyPermissionVisibility();
    };
  }
}

function canEditTidplan() {
  return (
    !appState.isReadonly &&
    canEditDate(appState.currentDate) &&
    canAccessTidplanModule() &&
    (appState.isSuperAdmin ||
      (appState.isAdmin && appState.permissions.canManageTidplan !== false))
  );
}

