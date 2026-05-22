function populateSiteSelect() {
  const select = document.getElementById("siteSelect");
  const accessibleSites = getAccessibleSites();
  if (accessibleSites.length && !accessibleSites.includes(currentSite)) {
    persistCurrentStateToLocalStorage();
    currentSite = accessibleSites[0];
    setStoredCurrentSitePreference(currentSite);
    updateScopedStorageKeysForCurrentSite();
    loadCurrentSiteRuntimeFromLocalStorage();
  }
  if (select) {
    select.innerHTML = "";
    accessibleSites
      .slice()
      .sort((a, b) => a.localeCompare(b, "hr"))
      .forEach((site) => {
        const option = document.createElement("option");
        option.value = site;
        option.textContent = site;
        if (site === currentSite) option.selected = true;
        select.appendChild(option);
      });
    // Add event listener for site selection changes
    select.removeEventListener("change", changeSite);
    select.addEventListener("change", changeSite);
  }
  renderSiteSwitcher();
  renderNotificationSiteOptions();
}

function renderSiteSwitcher() {
  const label = document.getElementById("siteSwitcherLabel");
  if (label)
    label.textContent = `${t("tidplanSiteSelector")} ${currentSite}`;

  const addBtn = document.querySelector(
    "#siteDropdown .site-dropdown-actions button:nth-child(1)",
  );
  if (addBtn) addBtn.textContent = t("tidplanAddSite");
  const removeBtn = document.querySelector(
    "#siteDropdown .site-dropdown-actions button:nth-child(2)",
  );
  if (removeBtn) removeBtn.textContent = t("tidplanRemoveSite");

  const container = document.getElementById("siteListContainer");
  if (!container) return;
  container.innerHTML = "";
  getAccessibleSites()
    .slice()
    .sort((a, b) => a.localeCompare(b, "hr"))
    .forEach((site) => {
      const item = document.createElement("button");
      item.className = "btn btn-small site-option";
      item.style.margin = "2px";
      item.textContent = site;
      item.addEventListener("click", () => {
        withLoadingPromise("loadingSiteChange", () => {
          switchSiteFromLocal(site);
          closeSiteDropdown();
          return Promise.resolve();
        });
      });
      container.appendChild(item);
    });
}

function toggleSiteDropdown() {
  const dropdown = document.getElementById("siteDropdown");
  if (!dropdown) return;
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

function closeSiteDropdown() {
  const dropdown = document.getElementById("siteDropdown");
  if (!dropdown) return;
  dropdown.style.display = "none";
}

window.addEventListener("click", (event) => {
  const switcher = document.querySelector(".site-switcher");
  const dropdown = document.getElementById("siteDropdown");
  if (switcher && dropdown && !event.target.closest(".site-switcher")) {
    dropdown.style.display = "none";
  }

  const plannerExportDropdown = document.getElementById("plannerExportDropdownMenu");
  if (plannerExportDropdown && !event.target.closest("#plannerExportDropdown")) {
    plannerExportDropdown.classList.remove("show");
  }
  const sortGroup = document.querySelector(".tidplan-controls .sort-group");
  if (sortGroup && !sortGroup.contains(event.target)) {
    closeTidplanSortMenu();
  }
});

function promptAddSite() {
  closeSiteDropdown();
  addSite();
}

function confirmRemoveSite() {
  closeSiteDropdown();
  removeSite();
}

function changeSite() {
  const select = document.getElementById("siteSelect");
  if (!select) return;
  withLoadingPromise("loadingSiteChange", () => {
    switchSiteFromLocal(select.value);
    return Promise.resolve();
  });
}

function addSite() {
  showPromptDialog("Unesite ime novog gradilišta:", "🏗️", "", (siteName) => {
    const newSite = (siteName || "").trim();
    if (!newSite) return;
    if (sites.includes(newSite)) {
      showAlert("Gradilište s tim nazivom već postoji.", "⚠️");
      return;
    }

    withLoadingPromise("loadingSiteChange", () => {
      persistCurrentStateToLocalStorage();
      const previousSites = [...sites];
      const previousCurrentSite = currentSite;
      const newSitePlannerKey = getSiteStorageKey("cmax_planner_data", newSite);
      const newSiteBinsKey = getSiteStorageKey("cmax_planner_bins", newSite);
      const newSiteTidplanKey = getSiteStorageKey("tidplan", newSite);
      const newSiteTidplanZonesKey = getSiteStorageKey("tidplan_zones", newSite);
      const newSiteWarehouseKey = getSiteStorageKey("cmax_warehouse_data", newSite);
      const newSiteStoreKey = getSiteStorageKey("cmax_workwear_data", newSite);
      const newSiteReportsKey = getSiteStorageKey("cmax_planner_reports", newSite);
      const newSiteNotificationsKey = getSiteStorageKey("cmax_planner_notifications", newSite);
      sites.push(newSite);
      markLocalSiteMutation();
      localStorage.setItem(SITES_KEY, JSON.stringify(sites));
      initializeSiteStorage(newSite);
      currentSite = newSite;
      setStoredCurrentSitePreference(currentSite);
      populateSiteSelect();
      document.getElementById("siteSelect").value = newSite;
      updateScopedStorageKeysForCurrentSite();
      loadCurrentSiteRuntimeFromLocalStorage();
      renderCurrentSiteAfterHydrate();
      logSiteScopeDebug("add-site", { fromSite: previousCurrentSite, toSite: newSite, to: getSiteDebugSummary(newSite) });
      return syncServerState({ includeSites: true }).then((saved) => {
        if (!saved) {
          sites = previousSites;
          currentSite = previousCurrentSite;
          localStorage.setItem(SITES_KEY, JSON.stringify(sites));
          setStoredCurrentSitePreference(currentSite);
          localStorage.removeItem(newSitePlannerKey);
          localStorage.removeItem(newSiteBinsKey);
          localStorage.removeItem(newSiteTidplanKey);
          localStorage.removeItem(newSiteTidplanZonesKey);
          localStorage.removeItem(newSiteWarehouseKey);
          localStorage.removeItem(newSiteStoreKey);
          localStorage.removeItem(newSiteReportsKey);
          localStorage.removeItem(newSiteNotificationsKey);
          populateSiteSelect();
          updateScopedStorageKeysForCurrentSite();
          loadCurrentSiteRuntimeFromLocalStorage();
          renderCurrentSiteAfterHydrate();
          updateMainTitle();
          showToast("Spremanje gradilišta na server nije uspjelo.", "error");
          return;
        }
        sendPresence(true).catch(() => {});
        refreshPresence().catch(() => {});
        return Promise.resolve();
      });
    });
  });
}

function removeSite() {
  if (sites.length <= 1) {
    showAlert("Ne možete ukloniti jedino gradilište.", "⚠️");
    return;
  }
  const siteToRemove = currentSite;
  showConfirm(
    `Jeste li sigurni da želite ukloniti gradilište "${siteToRemove}"? Svi podaci će biti izgubljeni.`,
    null,
    "⚠️",
    () => {
      withLoadingPromise("loadingSiteChange", () => {
        persistCurrentStateToLocalStorage();
        const previousSites = [...sites];
        const previousCurrentSite = currentSite;
        const removedPlannerData = localStorage.getItem(getSiteStorageKey("cmax_planner_data", siteToRemove));
        const removedTidplanData = localStorage.getItem(getSiteStorageKey("tidplan", siteToRemove));
        const removedBinsData = localStorage.getItem(getSiteStorageKey("cmax_planner_bins", siteToRemove));
        const removedWarehouseData = localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove));
        const removedStoreData = localStorage.getItem(getSiteStorageKey("cmax_workwear_data", siteToRemove));
        const removedReportsData = localStorage.getItem(getSiteStorageKey("cmax_planner_reports", siteToRemove));
        const removedNotificationsData = localStorage.getItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove));
        const removedTidplanZonesData = localStorage.getItem(getSiteStorageKey("tidplan_zones", siteToRemove));
        sites = sites.filter((s) => s !== siteToRemove);
        markLocalSiteMutation();
        localStorage.setItem(SITES_KEY, JSON.stringify(sites));
        localStorage.removeItem(getSiteStorageKey("cmax_planner_data", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("tidplan", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_planner_bins", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_workwear_data", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_planner_reports", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("tidplan_zones", siteToRemove));
        currentSite = sites[0];
        setStoredCurrentSitePreference(currentSite);
        populateSiteSelect();
        updateScopedStorageKeysForCurrentSite();
        loadCurrentSiteRuntimeFromLocalStorage();
        logSiteScopeDebug("delete-site", {
          deletedSite: siteToRemove,
          toSite: currentSite,
          remaining: sites.reduce((summary, site) => {
            summary[site] = getSiteDebugSummary(site);
            return summary;
          }, {}),
        });
        return syncServerState({ includeSites: true }).then((saved) => {
          if (!saved) {
            sites = previousSites;
            currentSite = previousCurrentSite;
            localStorage.setItem(SITES_KEY, JSON.stringify(sites));
            setStoredCurrentSitePreference(currentSite);
            if (removedPlannerData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_data", siteToRemove), removedPlannerData);
            }
            if (removedTidplanData !== null) {
              localStorage.setItem(getSiteStorageKey("tidplan", siteToRemove), removedTidplanData);
            }
            if (removedBinsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_bins", siteToRemove), removedBinsData);
            }
            if (removedWarehouseData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove), removedWarehouseData);
            }
            if (removedStoreData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_workwear_data", siteToRemove), removedStoreData);
            }
            if (removedReportsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_reports", siteToRemove), removedReportsData);
            }
            if (removedNotificationsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove), removedNotificationsData);
            }
            if (removedTidplanZonesData !== null) {
              localStorage.setItem(getSiteStorageKey("tidplan_zones", siteToRemove), removedTidplanZonesData);
            }
            populateSiteSelect();
            updateScopedStorageKeysForCurrentSite();
            loadCurrentSiteRuntimeFromLocalStorage();
            renderCurrentSiteAfterHydrate();
            updateMainTitle();
            showToast("Brisanje gradilišta na serveru nije uspjelo.", "error");
            return;
          }
          renderCurrentSiteAfterHydrate();
          sendPresence(true).catch(() => {});
          refreshPresence().catch(() => {});
          return Promise.resolve();
        });
      });
    }
  );
}

function updateMainTitle() {
  const title = document.getElementById("mainTitle");
  if (title) title.textContent = "CMAX SCM";
}

/* ==================== TIDPLAN FUNCTIONS ==================== */

