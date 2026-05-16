(function () {
  const ACCOUNT_NOTIFICATIONS_PREFIX = "cmax_account_notifications_";
  const ACCOUNT_NOTIFICATION_SITE_TRACKER_PREFIX = "cmax_account_notification_site_tracker_";
  const ACCOUNT_NOTIFICATION_PERM_PREFIX = "cmax_account_notification_perm_";

  function getAccountNotificationUserKey() {
    return String(appState.currentUser || "guest").trim().toLowerCase();
  }

  function getAccountNotificationsStorageKey() {
    return `${ACCOUNT_NOTIFICATIONS_PREFIX}${getAccountNotificationUserKey()}`;
  }

  function getAccountNotificationSiteTrackerKey() {
    return `${ACCOUNT_NOTIFICATION_SITE_TRACKER_PREFIX}${getAccountNotificationUserKey()}`;
  }

  function getAccountNotificationPermissionsKey() {
    return `${ACCOUNT_NOTIFICATION_PERM_PREFIX}${getAccountNotificationUserKey()}`;
  }

  function getAccountNotifications() {
    return safeParseStoredJson(localStorage.getItem(getAccountNotificationsStorageKey()), []) || [];
  }

  function saveAccountNotifications(items) {
    localStorage.setItem(getAccountNotificationsStorageKey(), JSON.stringify(items || []));
  }

  function getAccountNotificationSiteTracker() {
    return safeParseStoredJson(localStorage.getItem(getAccountNotificationSiteTrackerKey()), {}) || {};
  }

  function saveAccountNotificationSiteTracker(value) {
    localStorage.setItem(getAccountNotificationSiteTrackerKey(), JSON.stringify(value || {}));
  }

  function getAccountNotificationPermissionSignature() {
    return JSON.stringify({
      user: appState.currentUser || "",
      readonly: appState.isReadonly === true,
      superAdmin: appState.isSuperAdmin === true,
      level: Number(appState.adminLevel) || 0,
      permissions: appState.permissions || {},
    });
  }

  function formatAccountNotificationPreview(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "";
    return clean.length > 110 ? `${clean.slice(0, 107)}...` : clean;
  }

  function appendAccountNotification(entry) {
    if (!appState.currentUser) return;
    const items = getAccountNotifications();
    const uniqueKey = String(entry.uniqueKey || entry.id || "").trim();
    if (uniqueKey && items.some((item) => item.uniqueKey === uniqueKey)) return;
    items.unshift({
      id: entry.id || `acct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      uniqueKey,
      type: entry.type || "info",
      title: entry.title || "Nova obavijest",
      description: entry.description || "",
      site: entry.site || "",
      targetId: entry.targetId || "",
      targetView: entry.targetView || "home",
      createdAt: entry.createdAt || new Date().toISOString(),
      readAt: entry.readAt || null,
    });
    saveAccountNotifications(items.slice(0, 120));
  }

  function getUnreadAccountNotificationsCount() {
    return getAccountNotifications().filter((item) => !item.readAt).length;
  }

  function updateAccountNotificationsBadge() {
    const badge = document.getElementById("topbarNotificationsBadge");
    const button = document.getElementById("topbarNotificationsBtn");
    if (!badge) return;
    const count = getUnreadAccountNotificationsCount();
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.display = count > 0 ? "inline-flex" : "none";
    if (button) button.classList.toggle("has-badge", count > 0);
  }

  function markAccountNotificationRead(id) {
    const items = getAccountNotifications();
    let changed = false;
    items.forEach((item) => {
      if (item.id === id && !item.readAt) {
        item.readAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) {
      saveAccountNotifications(items);
      updateAccountNotificationsBadge();
    }
  }

  function markAllAccountNotificationsRead() {
    const items = getAccountNotifications();
    const now = new Date().toISOString();
    items.forEach((item) => {
      if (!item.readAt) item.readAt = now;
    });
    saveAccountNotifications(items);
    renderAccountNotificationsPanel();
    updateAccountNotificationsBadge();
  }

  function deleteAccountNotificationItem(itemId, event) {
    if (event?.stopPropagation) event.stopPropagation();
    if (event?.preventDefault) event.preventDefault();
    const items = getAccountNotifications().filter((item) => item.id !== itemId);
    saveAccountNotifications(items);
    renderAccountNotificationsPanel();
    updateAccountNotificationsBadge();
  }

  function renderAccountNotificationsPanel() {
    const list = document.getElementById("accountNotificationsList");
    if (!list) return;
    const items = getAccountNotifications();
    if (!items.length) {
      list.innerHTML = '<div class="account-notification-empty">Nema account obavijesti.</div>';
      updateAccountNotificationsBadge();
      return;
    }
    list.innerHTML = items
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((item) => {
        const unreadClass = item.readAt ? "" : " is-unread";
        const dot = item.readAt ? "" : '<span class="account-notification-dot"></span>';
        const metaParts = [new Date(item.createdAt).toLocaleString(getCurrentLocale())];
        if (item.site) metaParts.push(item.site);
        const args = JSON.stringify([String(item.id || "")]).replace(/"/g, "&quot;");
        const deleteArgs = JSON.stringify([String(item.id || "")]).replace(/"/g, "&quot;");
        return `
          <button
            type="button"
            class="account-notification-item${unreadClass}"
            data-cmax-action="accountNotifications.openItem"
            data-cmax-args="${args}"
          >
            <div class="account-notification-title-row">
              <strong>${escapeHtml(item.title || "Obavijest")}</strong>
              <span class="account-notification-actions">
                ${dot}
                <span
                  class="account-notification-delete"
                  role="button"
                  tabindex="0"
                  title="Obrisi"
                  data-cmax-action="accountNotifications.deleteItem"
                  data-cmax-args="${deleteArgs}"
                  data-cmax-pass-event
                >×</span>
              </span>
            </div>
            <div class="account-notification-meta">${escapeHtml(metaParts.join(" • "))}</div>
            <div class="account-notification-desc">${escapeHtml(item.description || "")}</div>
          </button>
        `;
      })
      .join("");
    updateAccountNotificationsBadge();
  }

  function closeAccountNotificationsPanel() {
    const panel = document.getElementById("accountNotificationsPanel");
    if (panel) panel.style.display = "none";
  }

  function toggleAccountNotificationsPanel() {
    const panel = document.getElementById("accountNotificationsPanel");
    if (!panel) return;
    const shouldOpen = panel.style.display !== "block";
    panel.style.display = shouldOpen ? "block" : "none";
    if (shouldOpen) renderAccountNotificationsPanel();
  }

  function openAccountNotificationItem(itemId) {
    const item = getAccountNotifications().find((entry) => entry.id === itemId);
    if (!item) return;
    markAccountNotificationRead(itemId);
    closeAccountNotificationsPanel();
    if (item.type === "site-notification") {
      window.pendingNotificationFocus = { id: item.targetId, site: item.site };
      window.pendingNotificationFilterSite = item.site || "";
      CMAX.notifications.show();
      return;
    }
    if (item.type === "permissions") {
      if (canOpenAdminPanelAccess()) {
        CMAX.admin.open();
      } else {
        CMAX.core.showHome();
      }
      return;
    }
    if (item.targetView === "reports") {
      CMAX.reports.showCenter();
      return;
    }
    if (item.targetView === "workwear" || item.targetView === "store") {
      CMAX.workwear.show();
      return;
    }
    CMAX.core.showHome();
  }

  function syncPermissionAccountNotifications() {
    if (!appState.currentUser) return;
    const signature = getAccountNotificationPermissionSignature();
    const key = getAccountNotificationPermissionsKey();
    const previous = localStorage.getItem(key);
    if (!previous) {
      localStorage.setItem(key, signature);
      return;
    }
    if (previous === signature) return;
    localStorage.setItem(key, signature);
    appendAccountNotification({
      uniqueKey: `permissions:${signature}`,
      type: "permissions",
      title: "Ovlasti su azurirane",
      description: "Dodijeljene ili promijenjene su vam ovlasti na ovom accountu.",
      targetView: "admin",
    });
  }

  function syncSiteAccountNotifications() {
    if (!appState.currentUser || typeof getAccessibleSites !== "function") return;
    const tracker = getAccountNotificationSiteTracker();
    const nextTracker = { ...tracker };
    getAccessibleSites().forEach((site) => {
      const notifications = typeof getNotificationsForSite === "function" ? getNotificationsForSite(site) : [];
      const ids = notifications.map((note) => String(note?.id || "")).filter(Boolean);
      if (!Array.isArray(tracker[site])) {
        nextTracker[site] = ids;
        return;
      }
      const previousIds = new Set(tracker[site].map((id) => String(id || "")).filter(Boolean));
      notifications.forEach((note) => {
        const noteId = String(note?.id || "").trim();
        if (!noteId || previousIds.has(noteId)) return;
        appendAccountNotification({
          uniqueKey: `site-note:${site}:${noteId}`,
          type: "site-notification",
          title: `Nova obavijest ${typeof formatNotificationId === "function" ? formatNotificationId(note.id) : `#${noteId}`}`,
          description: `${site}: ${formatAccountNotificationPreview(note.message || "Nova objava na gradilistu")}`,
          site,
          targetId: note.id,
          targetView: "notifications",
          createdAt: note.createdAt || new Date().toISOString(),
        });
      });
      nextTracker[site] = ids;
    });
    saveAccountNotificationSiteTracker(nextTracker);
  }

  function syncAccountNotifications() {
    if (!appState.currentUser) {
      updateAccountNotificationsBadge();
      return;
    }
    syncPermissionAccountNotifications();
    if (typeof syncWorkwearAccountNotifications === "function") {
      syncWorkwearAccountNotifications();
    }
    renderAccountNotificationsPanel();
    updateAccountNotificationsBadge();
  }

  function initAccountNotifications() {
    if (document.body?.dataset.accountNotificationsBound === "true") return;
    if (document.body) document.body.dataset.accountNotificationsBound = "true";
    document.addEventListener("click", (event) => {
      const panel = document.getElementById("accountNotificationsPanel");
      const bellWrap = event.target.closest(".topbar-bell-wrap");
      if (!panel || bellWrap) return;
      if (panel.style.display === "block") closeAccountNotificationsPanel();
    });
  }

  window.syncAccountNotifications = syncAccountNotifications;
  window.renderAccountNotificationsPanel = renderAccountNotificationsPanel;
  window.toggleAccountNotificationsPanel = toggleAccountNotificationsPanel;
  window.markAllAccountNotificationsRead = markAllAccountNotificationsRead;
  window.openAccountNotificationItem = openAccountNotificationItem;
  window.deleteAccountNotificationItem = deleteAccountNotificationItem;
  window.closeAccountNotificationsPanel = closeAccountNotificationsPanel;
  window.updateAccountNotificationsBadge = updateAccountNotificationsBadge;
  window.initAccountNotifications = initAccountNotifications;
  window.pushAccountNotification = appendAccountNotification;
})();

