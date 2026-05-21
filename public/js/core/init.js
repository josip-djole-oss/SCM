async function initApp() {
  const perfToken = CMAX_PERF?.begin?.("init-app");
  showLoading("loadingDefault");
  const loadingText = document.getElementById("loadingText");
  if (loadingText) loadingText.textContent = "Loading latest data...";
  document.getElementById("mainContainer").style.display = "none";
  // Apply saved theme/dark mode
  const savedTheme = localStorage.getItem(THEME_KEY) || "blue";
  const savedDark = localStorage.getItem(DARK_KEY) === "true";
  document.documentElement.setAttribute("data-theme", savedTheme);
  document.documentElement.setAttribute(
    "data-dark",
    savedDark ? "true" : "false",
  );
  updateThemeBtns(savedTheme);

  CMAX.utils.setLanguage(currentLang);
  initTooltips();
  updateScopedStorageKeysForCurrentSite();
  populateSiteSelect();
  updateMainTitle();
  initAdmins();
  appState.guestPermissions = getGuestPermissions();
  setupEventListeners();
  const authenticated = await checkAuth({ deferShow: true });
  if (!authenticated) {
    hideLoading();
    if (perfToken) CMAX_PERF.end(perfToken, { authenticated: false, freshServerDataLoaded: false });
    return;
  }
  try {
    await loadFreshBackendData();
    freshServerDataLoaded = true;
    appDataLoadError = "";
    populateSiteSelect();
    updateMainTitle();
    renderAll();
    updateNotifBadge();
    showMainApp();
    if (typeof showHomeDashboard === "function") {
      showHomeDashboard({ fresh: false, replaceRoute: true });
    } else {
      restoreLastView();
    }
    startAutoSave();
    CMAX_PERF?.count?.("initApp");
  } catch (error) {
    freshServerDataLoaded = false;
    appDataLoadError = error?.message || "DATA_LOAD_FAILED";
    console.error("Initial data load failed:", error);
    showDataLoadError(appDataLoadError);
  } finally {
    hideLoading();
    if (perfToken) CMAX_PERF.end(perfToken, { authenticated: true, freshServerDataLoaded });
  }
  window.addEventListener("focus", () => {
    if (!freshServerDataLoaded) return;
    refreshSiteMetadata()
      .then(() => refreshSharedDataIfSafe())
      .catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      if (!freshServerDataLoaded) return;
      refreshSiteMetadata()
        .then(() => refreshSharedDataIfSafe())
        .catch(() => {});
    }
  });
  window.addEventListener("beforeunload", () => {
    if (!appState.isReadonly && freshServerDataLoaded) {
      persistCurrentStateToLocalStorage();
    }
    sendPresence(false, true).catch(() => {});
  });
}

