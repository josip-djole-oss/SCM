function setupEventListeners() {
  document
    .getElementById("loginPassword")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  document
    .getElementById("loginEmail")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLogin();
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
      renderNotificationsList();
    });
  }
  const notificationSearch = document.getElementById("notificationSearch");
  if (notificationSearch) {
    notificationSearch.addEventListener("input", () => {
      renderNotificationsList();
    });
  }
  const notificationPinnedOnly = document.getElementById("notificationPinnedOnly");
  if (notificationPinnedOnly) {
    notificationPinnedOnly.addEventListener("change", () => {
      renderNotificationsList();
    });
  }

  const newAdminLevel = document.getElementById("newAdminLevel");
  if (newAdminLevel) {
    newAdminLevel.addEventListener("change", () => {
      renderNewAdminPermissionsPanel();
    });
  }
}

/* ==================== DATE DISPLAY ==================== */
