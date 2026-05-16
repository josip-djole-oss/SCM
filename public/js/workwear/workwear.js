function fillWorkwearSavedSizesForm() {
  const profile = getCurrentWorkerWorkwearProfile();
  const sizes = profile.savedSizes || {};
  const map = {
    Tshirt: "tshirt",
    Hoodie: "hoodie",
    Jacket: "jacket",
    Pants: "pants",
    Shoes: "shoes",
    Gloves: "gloves",
    Helmet: "helmet",
  };
  Object.keys(map).forEach((key) => {
    const input = document.getElementById(`workwearSize${key}`);
    if (input) input.value = sizes[map[key]] || "";
  });
}

function hideWorkwearSection() {
  const workwearSection = document.getElementById("workwear-section");
  if (workwearSection) workwearSection.style.display = "none";
  if (typeof workwearCartOverlayOpen !== "undefined") workwearCartOverlayOpen = false;
  if (typeof renderWorkwearCartOverlay === "function") renderWorkwearCartOverlay();
}

function showWorkwear() {
  if (!canAccessWorkwearModule()) {
    showToast(t("workwearAccessDenied") || "No access to Workwear module.", "error");
    return;
  }

  const openWorkwearView = () => {
    const plannerSection = document.getElementById("planner-section");
    const listsContainer = document.querySelector(".lists-container");
    const binsSection = document.getElementById("binsSection");
    const tidplanSection = document.getElementById("tidplan-section");
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");
    const warehouseLogsSection = document.getElementById("warehouse-logs-section");
    const warehouseGraphSection = document.getElementById("warehouse-graph-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const reportsSection = document.getElementById("reports-section");
    const settingsSection = document.getElementById("settings-section");
    const workwearSection = document.getElementById("workwear-section");

    if (tidplanSection) tidplanSection.style.display = "none";
    if (plannerSection) plannerSection.style.display = "none";
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (workwearSection) workwearSection.style.display = "block";
    if (typeof workwearCartOverlayOpen !== "undefined") workwearCartOverlayOpen = false;

    currentView = "workwear";
    saveCurrentView("workwear");
    pushRouteForView("workwear");
    if (typeof updateShellForView === "function") updateShellForView("workwear");

    loadWorkwearState(currentSite);
    ensureWorkerWorkwearProfile(appState.currentUser || "guest");
    renderWorkwearModule();
    fillWorkwearSavedSizesForm();

    if (typeof syncSidebarAccessState === "function") syncSidebarAccessState();
    if (typeof notifyDashboardViewChanged === "function") notifyDashboardViewChanged();
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  };

  if (typeof loadFreshDataForView === "function") {
    return loadFreshDataForView("loadingDefault", openWorkwearView).then((ok) => {
      if (ok === false) {
        // Fallback: keep module reachable even when fresh backend pull fails.
        openWorkwearView();
      }
      return ok;
    });
  }

  return withLoading("loadingDefault", openWorkwearView);
}

function refreshWorkwearViewIfOpen() {
  if (currentView !== "workwear") return;
  renderWorkwearModule();
}
