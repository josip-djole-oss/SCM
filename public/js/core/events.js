function setupEventListeners() {
  if (document.body?.dataset?.cmaxCoreEventsBound === "true") return;
  if (document.body) document.body.dataset.cmaxCoreEventsBound = "true";

  document
    .getElementById("loginPassword")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") CMAX.core.login();
    });
  document
    .getElementById("loginEmail")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") CMAX.core.login();
    });

  const notificationImagesInput = document.getElementById("notificationImages");
  if (notificationImagesInput) {
    notificationImagesInput.addEventListener("change", () => {
      const files = Array.from(notificationImagesInput.files || []);
      if (files.length > 2) {
        showToast(t("notificationTooManyImages"), "error");
        notificationImagesInput.value = "";
        renderNotificationImagePreview([]);
        return;
      }
      renderNotificationImagePreview(files);
    });
  }

  const notificationFilterSite = document.getElementById("notificationFilterSite");
  if (notificationFilterSite) {
    notificationFilterSite.addEventListener("change", () => {
      if (typeof resetNotificationsRenderLimit === "function") resetNotificationsRenderLimit();
      renderNotificationsList();
    });
  }
  const notificationSearch = document.getElementById("notificationSearch");
  if (notificationSearch) {
    const renderNotificationsSearch = typeof cmaxDebounce === "function"
      ? cmaxDebounce(() => {
          if (typeof resetNotificationsRenderLimit === "function") resetNotificationsRenderLimit();
          renderNotificationsList();
        }, 220)
      : () => {
          if (typeof resetNotificationsRenderLimit === "function") resetNotificationsRenderLimit();
          renderNotificationsList();
        };
    notificationSearch.addEventListener("input", () => {
      renderNotificationsSearch();
    });
  }
  const notificationPinnedOnly = document.getElementById("notificationPinnedOnly");
  if (notificationPinnedOnly) {
    notificationPinnedOnly.addEventListener("change", () => {
      if (typeof resetNotificationsRenderLimit === "function") resetNotificationsRenderLimit();
      renderNotificationsList();
    });
  }

  const newAdminLevel = document.getElementById("newAdminLevel");
  if (newAdminLevel) {
    newAdminLevel.addEventListener("change", () => {
      renderNewAdminPermissionsPanel();
      if (typeof renderAdminLevelQuickPicks === "function") renderAdminLevelQuickPicks();
      if (typeof enhanceAdminComposerLayout === "function") enhanceAdminComposerLayout();
    });
  }
}

/* ==================== DATE DISPLAY ==================== */
