function getAllAdminPermissionKeys() {
  return ADMIN_PERMISSION_SECTIONS.flatMap((section) => section.keys);
}

function getAllGuestPermissionKeys() {
  return GUEST_PERMISSION_SECTIONS.flatMap((section) => section.keys);
}

function getAdminRemovalNotices() {
  return safeParseStoredJson(localStorage.getItem(ADMIN_REMOVAL_NOTICES_KEY), {}) || {};
}

function saveAdminRemovalNotices(notices) {
  localStorage.setItem(ADMIN_REMOVAL_NOTICES_KEY, JSON.stringify(notices || {}));
}

function getAdminRemovalNotice(email) {
  if (!email) return null;
  const notices = getAdminRemovalNotices();
  return notices[email] || null;
}

function setAdminRemovalNotice(email, notice) {
  if (!email) return;
  const notices = getAdminRemovalNotices();
  notices[email] = notice;
  saveAdminRemovalNotices(notices);
}

function formatAdminRemovalMessage(notice) {
  const removedBy =
    notice?.removedByName || notice?.removedBy || t("unknownUser");
  const reason = notice?.reason || t("adminRemoveReasonUnknown");
  const site = notice?.site || currentSite || "";
  return `${t("adminRemovedMessage")} ${removedBy}. ${t("adminRemovedReasonLabel")} ${reason}.${site ? ` ${t("adminRemovedSiteLabel")} ${site}.` : ""}`;
}

function forceLogoutAndReload() {
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
  setTimeout(() => {
    window.location.reload();
  }, 300);
}

function handleAdminRemoval(notice) {
  if (adminRemovalHandled) return;
  adminRemovalHandled = true;
  const message = formatAdminRemovalMessage(notice);
  showAlert(message, "!", () => {
    forceLogoutAndReload();
  });
}

function buildAdminLevelOptions(selectEl, options = {}) {
  if (!selectEl) return;
  const { maxLevel = 6, selectedLevel = 1, disable = false } = options;
  selectEl.innerHTML = "";
  ADMIN_LEVELS.filter((lvl) => lvl <= maxLevel).forEach((lvl) => {
    const opt = document.createElement("option");
    opt.value = String(lvl);
    opt.textContent = `${t("adminLevelShort")} ${lvl}`;
    selectEl.appendChild(opt);
  });
  selectEl.value = String(selectedLevel);
  selectEl.disabled = disable;
}

function getSelectedNewAdminLevel() {
  const el = document.getElementById("newAdminLevel");
  const level = Number(el?.value);
  if (Number.isFinite(level) && level >= 1 && level <= 6) return level;
  return 1;
}

function renderNewAdminLevelSelector() {
  const levelSelect = document.getElementById("newAdminLevel");
  if (!levelSelect) return;
  const maxLevel = getMaxGrantableLevel();
  const selectedLevel = Math.min(getSelectedNewAdminLevel(), maxLevel);
  const disable = !canManageAdminsByLevel();
  buildAdminLevelOptions(levelSelect, {
    maxLevel,
    selectedLevel,
    disable,
  });
}

function renderNewAdminPermissionsPanel() {
  const level = getSelectedNewAdminLevel();
  renderPermissionEditor(
    "newAdminPermsPanel",
    "np_",
    getLevelDefaultPermissions(level),
    ADMIN_PERMISSION_SECTIONS,
  );
  const template = getLevelTemplate(level);
  getAllAdminPermissionKeys().forEach((key) => {
    const cb = document.getElementById(`np_${key}`);
    if (!cb) return;
    const canGrantKey = appState.isSuperAdmin || hasAdminPermission(key);
    if (!template[key]) {
      cb.checked = false;
      cb.disabled = true;
      return;
    }
    if (!canManageAdminsByLevel() || !canGrantKey) {
      cb.disabled = true;
    }
  });
}

function renderSiteAccessEditor(containerTarget, prefix, selectedSites, options = {}) {
  const { disableAll = false, allowedGrantSites = null } = options;
  const container =
    typeof containerTarget === "string"
      ? document.getElementById(containerTarget)
      : containerTarget;
  if (!container) return;
  container.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "permission-section-grid";
  const sortedSites = (sites || []).slice().sort((a, b) => a.localeCompare(b, "hr"));
  sortedSites.forEach((site) => {
    const label = document.createElement("label");
    label.className = "perm-label";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.site = site;
    cb.id = `${prefix}${sanitizeSiteId(site)}`;
    const hasSelection = Array.isArray(selectedSites);
    cb.checked = !hasSelection || selectedSites.includes(site);
    const canGrantSite =
      appState.isSuperAdmin ||
      allowedGrantSites === null ||
      allowedGrantSites.includes(site);
    if (disableAll || !canGrantSite) cb.disabled = true;
    const span = document.createElement("span");
    span.textContent = site;
    label.appendChild(cb);
    label.appendChild(span);
    grid.appendChild(label);
  });

  container.appendChild(grid);
}

function readSiteAccessEditor(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const selected = [];
  container.querySelectorAll("input[type='checkbox'][data-site]").forEach((cb) => {
    if (cb.checked) selected.push(cb.dataset.site);
  });
  return selected;
}

function renderNewAdminSitesPanel() {
  if (!canManageSiteAccess()) {
    renderSiteAccessEditor("newAdminSitesPanel", "ns_", null, { disableAll: true });
    return;
  }
  const allowedGrantSites = getCurrentAdminAllowedSites();
  renderSiteAccessEditor("newAdminSitesPanel", "ns_", allowedGrantSites, {
    allowedGrantSites,
  });
}

function getGlobalFunctionOptions() {
  if (typeof getStoreRoleOptions === "function") return getStoreRoleOptions();
  return [
    { key: "radnik", label: "Radnik" },
    { key: "grupovodja", label: "Grupovođa" },
    { key: "poslovodja", label: "Poslovođa" },
    { key: "projektledare", label: "Projektledare" },
    { key: "kontor", label: "Kontor" },
    { key: "store_manager", label: "Store Manager" },
    { key: "admin", label: "Admin" },
    { key: "superadmin", label: "Superadmin" },
  ];
}

function normalizeGlobalFunctionKeys(list) {
  if (typeof normalizeStoreRoleList === "function") return normalizeStoreRoleList(list || []);
  const keys = Array.isArray(list) ? list : [];
  return Array.from(new Set(keys.map((key) => String(key || "").trim().toLowerCase()).filter(Boolean)));
}

function renderFunctionRoleEditor(containerTarget, prefix, selectedRoles = [], options = {}) {
  const { disableAll = false } = options;
  const container =
    typeof containerTarget === "string"
      ? document.getElementById(containerTarget)
      : containerTarget;
  if (!container) return;
  container.innerHTML = "";
  const selected = new Set(normalizeGlobalFunctionKeys(selectedRoles));
  const grid = document.createElement("div");
  grid.className = "permission-section-grid";
  getGlobalFunctionOptions().forEach((role) => {
    const label = document.createElement("label");
    label.className = "perm-label";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `${prefix}${role.key}`;
    cb.dataset.role = role.key;
    cb.checked = selected.has(role.key);
    cb.disabled = disableAll;
    const span = document.createElement("span");
    span.textContent = role.label;
    label.appendChild(cb);
    label.appendChild(span);
    grid.appendChild(label);
  });
  container.appendChild(grid);
}

function readFunctionRoleEditor(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return normalizeGlobalFunctionKeys(
    Array.from(container.querySelectorAll("input[type='checkbox'][data-role]:checked"))
      .map((cb) => cb.dataset.role),
  );
}

function renderNewAdminRolePanel() {
  renderFunctionRoleEditor("newAdminRolePanel", "nr_", ["radnik"], {
    disableAll: !canManageAdminsByLevel(),
  });
}

function renderAdminLevelQuickPicks() {
  const levelSelect = document.getElementById("newAdminLevel");
  if (!levelSelect) return;
  let quickPicks = document.getElementById("adminLevelQuickPicks");
  if (!quickPicks) {
    quickPicks = document.createElement("div");
    quickPicks.id = "adminLevelQuickPicks";
    quickPicks.className = "admin-level-quick-picks";
    levelSelect.parentElement?.appendChild(quickPicks);
  }
  quickPicks.innerHTML = "";
  Array.from(levelSelect.options || []).forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-ghost btn-small admin-level-chip${levelSelect.value === option.value ? " is-active" : ""}`;
    button.textContent = option.textContent || option.value;
    button.addEventListener("click", () => {
      levelSelect.value = option.value;
      renderNewAdminPermissionsPanel();
      renderAdminLevelQuickPicks();
      enhanceAdminComposerLayout();
    });
    quickPicks.appendChild(button);
  });
}

function enhanceAdminComposerLayout() {
  const tabAdmins = document.getElementById("tabAdmins");
  if (!tabAdmins) return;

  if (!tabAdmins.querySelector(".admin-compose-intro")) {
    const intro = document.createElement("div");
    intro.className = "admin-compose-intro";
    intro.innerHTML = `
      <div class="admin-compose-eyebrow">Account Management</div>
      <h3>Dodaj admina</h3>
    `;
    tabAdmins.insertBefore(intro, tabAdmins.firstElementChild);
  }

  const formGrid = tabAdmins.querySelector(".admin-form-grid");
  if (formGrid) formGrid.classList.add("admin-compose-card", "admin-compose-card-basic");

  const permsPanel = document.getElementById("newAdminPermsPanel");
  const permsWrap = permsPanel?.parentElement;
  if (permsWrap) {
    permsWrap.classList.add("admin-compose-card", "admin-compose-card-perms");
    if (!permsWrap.querySelector(".admin-compose-section-kicker")) {
      const kicker = document.createElement("div");
      kicker.className = "admin-compose-section-kicker";
      kicker.textContent = "Napredne ovlasti";
      permsWrap.insertBefore(kicker, permsWrap.firstElementChild);
    }
  }

  const sitesPanel = document.getElementById("newAdminSitesPanel");
  const sitesWrap = sitesPanel?.parentElement;
  if (sitesWrap) {
    sitesWrap.classList.add("admin-compose-card", "admin-compose-card-sites");
    if (!sitesWrap.querySelector(".admin-compose-section-kicker")) {
      const kicker = document.createElement("div");
      kicker.className = "admin-compose-section-kicker";
      kicker.textContent = "Pristup gradilistima";
      sitesWrap.insertBefore(kicker, sitesWrap.firstElementChild);
    }
  }

  const addButton = document.getElementById("btnAddAdminEl");
  if (addButton) {
    let actionBar = document.getElementById("adminComposeActionBar");
    if (!actionBar) {
      actionBar = document.createElement("div");
      actionBar.id = "adminComposeActionBar";
      actionBar.className = "admin-compose-action-bar";
      addButton.parentElement?.insertBefore(actionBar, addButton);
      actionBar.appendChild(addButton);
    }
  }

  const adminListBlock = document.getElementById("adminList")?.parentElement;
  if (adminListBlock) adminListBlock.classList.add("admin-compose-card", "admin-compose-card-list");

  renderAdminLevelQuickPicks();
}

function renderGuestAccessPanel() {
  if (!(appState.isSuperAdmin || hasAdminPermission("canManageGuestAccess"))) return;

  renderPermissionEditor(
    "guestAccessPermsPanel",
    "gp_",
    appState.guestPermissions,
    GUEST_PERMISSION_SECTIONS,
  );

  const accessPanel = document.getElementById("guestWarehouseAccessPanel");
  if (!accessPanel) return;
  accessPanel.innerHTML = "";

  const section = document.createElement("div");
  section.className = "permission-section";
  section.innerHTML = `
    <div class="permission-section-header">
      <div class="permission-section-title">${t("guestWarehouseScopeTitle")}</div>
      <div class="permission-section-note">${t("guestWarehouseScopeNote")}</div>
    </div>
  `;

  const itemsSection = document.createElement("div");
  itemsSection.className = "permission-section";
  itemsSection.innerHTML = `
    <div class="permission-section-header">
      <div class="permission-section-title">${t("guestWarehouseItemsTitle")}</div>
      <div class="permission-section-note">${t("guestWarehouseItemsNote")} ${escapeHtml(currentSite || "-")}</div>
    </div>
  `;

  const itemsGrid = document.createElement("div");
  itemsGrid.className = "permission-section-grid";
  const siteWarehouse = normalizeWarehouseData(
    safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", currentSite)), null),
  );
  const allowedItemIds = new Set(getGuestWarehouseSiteAccess(currentSite).allowedItemIds);
  const visibleItems = (siteWarehouse.catalog || []).slice().sort((a, b) => compareNaturally(a.name, b.name));

  if (!visibleItems.length) {
    const empty = document.createElement("div");
    empty.className = "admin-section-note";
    empty.textContent = t("guestWarehouseNoItems");
    itemsSection.appendChild(empty);
  } else {
    visibleItems.forEach((item) => {
      const label = document.createElement("label");
      label.className = "perm-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.guestWarehouseItem = item.id;
      checkbox.checked = allowedItemIds.has(item.id);
      const span = document.createElement("span");
      span.textContent = `${item.name} (${item.unit || "kom"})`;
      label.appendChild(checkbox);
      label.appendChild(span);
      itemsGrid.appendChild(label);
    });
    itemsSection.appendChild(itemsGrid);
  }

  accessPanel.appendChild(section);
  accessPanel.appendChild(itemsSection);
}

function saveGuestAccessSettings() {
  if (!(appState.isSuperAdmin || hasAdminPermission("canManageGuestAccess"))) return;
  let permissions = readPermissionEditor(
    "gp_",
    getAllGuestPermissionKeys(),
    DEFAULT_GUEST_PERMISSIONS,
  );
  const accessPanel = document.getElementById("guestWarehouseAccessPanel");
  const selectedItemIds = accessPanel
    ? Array.from(accessPanel.querySelectorAll("input[data-guest-warehouse-item]:checked")).map(
        (el) => el.dataset.guestWarehouseItem,
      )
    : [];
  permissions = setGuestWarehouseSiteAccess(permissions, currentSite, {
    allowedItemIds: selectedItemIds,
  });
  saveGuestPermissions(permissions);
  if (appState.isReadonly) {
    applyPermissionVisibility();
  }
  showToast(t("successPermsSaved"), "success");
}

function resetTidplanLayoutSettings() {
  localStorage.removeItem("tidplanLeftPanelWidth");
  localStorage.removeItem("tidplanPanelMode");
  localStorage.removeItem("tidplanFullscreen");
  showToast(t("resetTidplanLayoutSuccess"), "success");
}

function resetThemeSettings() {
  localStorage.setItem(THEME_KEY, "blue");
  localStorage.setItem(DARK_KEY, "false");
  document.documentElement.setAttribute("data-theme", "blue");
  document.documentElement.setAttribute("data-dark", "false");
  updateThemeBtns("blue");
  showToast(t("resetThemeSuccess"), "success");
}

function getAdminSummaryLabels(permissions) {
  const labels = [];
  if (permissions.canAccessPlanner !== false) labels.push("Planner");
  if (permissions.canAccessTidplan !== false) labels.push("Tidplan");
  if (permissions.canAccessBins !== false) labels.push("Bins");
  if (permissions.canAccessWarehouse !== false) labels.push(t("btnWarehouse"));
  if (permissions.canAccessSiteChat !== false) labels.push("Chat");
  if (permissions.canViewNotifications !== false) labels.push("Obavijesti");
  if (permissions.canCreateReports !== false) labels.push("Prijave");
  return labels;
}

function ensureSettingsPageMount() {
  const settingsSection = document.getElementById("settings-section");
  const adminModal = document.getElementById("adminModal");
  if (!settingsSection || !adminModal || settingsSection.dataset.mounted === "true") return;
  const modalBox = adminModal.querySelector(".modal-box");
  if (!modalBox) return;
  settingsSection.innerHTML = "";
  settingsSection.appendChild(modalBox);
  settingsSection.dataset.mounted = "true";
  adminModal.style.display = "none";
  const title = document.getElementById("adminModalTitle");
  if (title) title.textContent = "Postavke i upravljanje";
}

function openAdminPanel() {
  if (!canOpenAdminPanelAccess()) return;
  withLoading("loadingAdminPanel", () => {
    ensureSettingsPageMount();
    const settingsSection = document.getElementById("settings-section");
    const homeSection = document.getElementById("home-section");
    const reportsSection = document.getElementById("reports-section");
    const plannerSection = document.getElementById("planner-section");
    const tidplanSection = document.getElementById("tidplan-section");
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");
    const warehouseLogsSection = document.getElementById("warehouse-logs-section");
    const warehouseGraphSection = document.getElementById("warehouse-graph-section");
    const binsSection = document.getElementById("binsSection");
    const listsContainer = document.querySelector(".lists-container");

    if (homeSection) homeSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (plannerSection) plannerSection.style.display = "none";
    if (tidplanSection) tidplanSection.style.display = "none";
    if (notificationsSection) notificationsSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "block";
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");

    currentView = "admin";
    saveCurrentView("admin");
    pushRouteForView("admin");
    if (typeof updateShellForView === "function") updateShellForView("admin");

    const canManageAdmins = canManageAdminsByLevel();
    const canManageGuest = appState.isSuperAdmin || hasAdminPermission("canManageGuestAccess");
    const canViewLogs = hasAdminPermission("canViewLogs");
    const canViewSettings = Boolean(appState.currentUser);
    const canViewBackupsAccess = canViewBackups();


    setVisibility("tabBtnAdmins", canManageAdmins);
    document.getElementById("tabAdmins").style.display = canManageAdmins ? "" : "none";
    setVisibility("tabBtnGuest", canManageGuest);
    document.getElementById("tabGuest").style.display = canManageGuest ? "" : "none";
    setVisibility("tabBtnLogs", canViewLogs);
    document.getElementById("tabLogs").style.display = canViewLogs ? "" : "none";
    setVisibility("tabBtnSettings", canViewSettings);
    document.getElementById("tabSettings").style.display = canViewSettings ? "" : "none";
    setVisibility("tabBtnBackup", canViewBackupsAccess);
    const backupTab = document.getElementById("tabBackup");
    if (backupTab) backupTab.style.display = canViewBackupsAccess ? "" : "none";

    renderNewAdminLevelSelector();
    renderNewAdminRolePanel();
    renderNewAdminPermissionsPanel();
    renderNewAdminSitesPanel();
    enhanceAdminComposerLayout();
    renderGuestAccessPanel();

    if (canManageAdmins) {
      renderAdminList();
    }
    if (canViewSettings) {
      initBinPermissionsUI();
    }

    const firstTab =
      (canViewSettings && "tabSettings") ||
      (canManageAdmins && "tabAdmins") ||
      (canManageGuest && "tabGuest") ||
      (canViewLogs && "tabLogs") ||
      (canViewBackupsAccess && "tabBackup");

    if (!firstTab) {
      if (settingsSection) settingsSection.style.display = "none";
      showToast(t("adminNoTabs"), "error");
      return;
    }

    switchTab(firstTab);
    updateNotifBadge();
  });
}

function closeAdminPanel() {
  const settingsSection = document.getElementById("settings-section");
  if (settingsSection) settingsSection.style.display = "none";
  document.getElementById("newAdminEmail").value = "";
  document.getElementById("newAdminPassword").value = "";
  if (typeof showHomeDashboard === "function") {
    showHomeDashboard();
  } else if (typeof updateShellForView === "function") {
    updateShellForView(currentView);
  }
}

function switchTab(tabId) {
  if (
    (tabId === "tabAdmins" && !canManageAdminsByLevel()) ||
    (tabId === "tabGuest" &&
      !(appState.isSuperAdmin || hasAdminPermission("canManageGuestAccess"))) ||
    (tabId === "tabLogs" && !hasAdminPermission("canViewLogs")) ||
    (tabId === "tabSettings" && !appState.currentUser) ||
    (tabId === "tabBackup" && !canViewBackups())
  ) {
    return;
  }
  if (tabId === "tabBackup" && typeof ensureBackupTabContent === "function") {
    ensureBackupTabContent();
  }
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  const btnMap = {
    tabAdmins: "tabBtnAdmins",
    tabGuest: "tabBtnGuest",
    tabLogs: "tabBtnLogs",
    tabSettings: "tabBtnSettings",
    tabBackup: "tabBtnBackup",
  };
  if (btnMap[tabId])
    document.getElementById(btnMap[tabId]).classList.add("active");
  if (tabId === "tabLogs") {
    renderLogs();
  }
  if (tabId === "tabGuest") {
    renderGuestAccessPanel();
  }
  if (tabId === "tabBackup") {
    CMAX.admin.listBackups();
    CMAX.admin.showBackupInfo();
  }
}

function renderAdminList() {
  if (!canManageAdminsByLevel()) return;
  const admins = getAdmins();
  const listEl = document.getElementById("adminList");
  listEl.innerHTML = "";
  const allowedGrantSites = getCurrentAdminAllowedSites();

  admins.forEach((admin, idx) => {
    const level = getAdminLevel(admin);
    const effectiveLevel = getPendingAdminLevel(admin.email, level);
    const div = document.createElement("div");
    div.className =
      `admin-item admin-level-${level}` + (admin.isSuperAdmin ? " super-admin" : "");
    const isSelf = admin.email === appState.currentUser;
    const canManageThisAdmin = canManageAdminRecord(admin);
    const canEditThisAdmin =
      canManageThisAdmin &&
      (!isSelf || appState.isSuperAdmin || getCurrentAdminLevel() >= 6);

    const header = document.createElement("div");
    header.className = "admin-item-header";

    const infoDiv = document.createElement("div");
    infoDiv.className = "admin-info";
    const displayName = getUserDisplayName(admin.email, admin.fullName);
    const nameDiv = document.createElement("div");
    nameDiv.className = "admin-email";
    nameDiv.textContent = displayName;
    infoDiv.appendChild(nameDiv);
    const roleDiv = document.createElement("div");
    roleDiv.className = "admin-role";
    roleDiv.textContent = admin.isSuperAdmin
      ? t("superAdmin")
      : `${t("admin")} - ${t("adminLevelShort")} ${level}`;
    infoDiv.appendChild(roleDiv);

    const levelBadge = document.createElement("span");
    levelBadge.className = `admin-level-badge level-${level}`;
    levelBadge.textContent = `${t("adminLevelShort")} ${level}`;
    infoDiv.appendChild(levelBadge);
    const functionRoles = normalizeGlobalFunctionKeys(admin.storeRoles || []);
    if (functionRoles.length) {
      const roleBadgeWrap = document.createElement("div");
      roleBadgeWrap.className = "admin-role-badge-wrap";
      functionRoles.forEach((roleKey) => {
        const roleLabel = typeof getStoreRoleLabel === "function" ? getStoreRoleLabel(roleKey) : roleKey;
        const badge = document.createElement("span");
        badge.className = "admin-function-badge";
        badge.textContent = roleLabel;
        roleBadgeWrap.appendChild(badge);
      });
      infoDiv.appendChild(roleBadgeWrap);
    }
    header.appendChild(infoDiv);

    const btnGroup = document.createElement("div");
    btnGroup.style.cssText = "display:flex; gap:6px;";

    if (!admin.isSuperAdmin) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-small";
      editBtn.textContent = "Postavke";
      editBtn.title = t("editPermsTitle") + " " + displayName;
      if (canEditThisAdmin) {
        editBtn.dataset.cmaxAction = "admin.togglePerms";
        editBtn.dataset.cmaxArgs = JSON.stringify([idx]);
        btnGroup.appendChild(editBtn);
      }

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-small btn-danger";
      removeBtn.textContent = "Obrisi";
      if (canManageThisAdmin && !isSelf) {
        removeBtn.dataset.cmaxAction = "admin.removeAction";
        removeBtn.dataset.cmaxArgs = JSON.stringify([admin.email]);
        btnGroup.appendChild(removeBtn);
      }
    }

    header.appendChild(btnGroup);
    div.appendChild(header);

    if (!admin.isSuperAdmin) {
      const summary = document.createElement("div");
      summary.className = "admin-item-summary";
      getAdminSummaryLabels(admin.permissions || normalizePermissions({})).forEach(
        (labelText) => {
          const chip = document.createElement("span");
          chip.className = "admin-summary-chip";
          chip.textContent = labelText;
          summary.appendChild(chip);
        },
      );
      div.appendChild(summary);
    }

    if (!admin.isSuperAdmin) {
      const permsDiv = document.createElement("div");
      permsDiv.className = "admin-permissions";
      permsDiv.id = `perms_${idx}`;
    const basePerms = normalizePermissions(admin.permissions);
    const perms = normalizePermissions(getPendingAdminPerms(admin.email, basePerms));
    const levelTemplate = getLevelTemplate(effectiveLevel);

      const levelSection = document.createElement("div");
      levelSection.className = "permission-section";
      const levelHeader = document.createElement("div");
      levelHeader.className = "permission-section-header";
      levelHeader.innerHTML = `<div class="permission-section-title">${t("labelAdminLevel")}</div>`;
      levelSection.appendChild(levelHeader);
      const levelRow = document.createElement("div");
      levelRow.className = "admin-level-row";
      const levelSelect = document.createElement("select");
      levelSelect.id = `level_${idx}`;
      const maxLevel = canEditThisAdmin ? getMaxGrantableLevel() : 6;
      buildAdminLevelOptions(levelSelect, {
        maxLevel,
        selectedLevel: Math.min(effectiveLevel, maxLevel),
        disable: !canEditThisAdmin,
      });
      levelSelect.dataset.cmaxAction = "admin.stageLevelChange";
      levelSelect.dataset.cmaxEvent = "change";
      levelSelect.dataset.cmaxArgs = JSON.stringify([admin.email, idx, effectiveLevel]);
      levelRow.appendChild(levelSelect);
      levelSection.appendChild(levelRow);
      permsDiv.appendChild(levelSection);

      ADMIN_PERMISSION_SECTIONS.forEach((section) => {
        const sectionEl = document.createElement("div");
        sectionEl.className = "permission-section";
        const headerEl = document.createElement("div");
        headerEl.className = "permission-section-header";
        headerEl.innerHTML = `<div class="permission-section-title">${t(section.titleKey)}</div>${section.noteKey ? `<div class="permission-section-note">${t(section.noteKey)}</div>` : ""}`;
        sectionEl.appendChild(headerEl);

        const grid = document.createElement("div");
        grid.className = "permission-section-grid";
        section.keys.forEach((key) => {
          const canGrantKey =
            appState.isSuperAdmin || hasAdminPermission(key);
          const label = document.createElement("label");
          label.className = "perm-label";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.id = `perm_${idx}_${key}`;
          cb.checked = levelTemplate[key] === true && perms[key] !== false;
          if (!levelTemplate[key]) cb.checked = false;
          if (!canEditThisAdmin || !canGrantKey || !levelTemplate[key]) cb.disabled = true;
          cb.dataset.cmaxAction = "admin.stagePermissionChange";
          cb.dataset.cmaxEvent = "change";
          cb.dataset.cmaxArgs = JSON.stringify([admin.email, idx, effectiveLevel]);
          const span = document.createElement("span");
          span.textContent = getPermissionLabel(key);
          label.appendChild(cb);
          label.appendChild(span);
          grid.appendChild(label);
        });
        sectionEl.appendChild(grid);
        permsDiv.appendChild(sectionEl);
      });

      const sitesSection = document.createElement("div");
      sitesSection.className = "permission-section";
      const sitesHeader = document.createElement("div");
      sitesHeader.className = "permission-section-header";
      sitesHeader.innerHTML = `<div class="permission-section-title">${t("labelAdminSites")}</div>`;
      sitesSection.appendChild(sitesHeader);
      const sitesContainer = document.createElement("div");
      sitesContainer.id = `sites_${idx}`;
      sitesSection.appendChild(sitesContainer);
      renderSiteAccessEditor(sitesContainer, `site_${idx}_`, admin.allowedSites || null, {
        disableAll: !canEditThisAdmin || !canManageSiteAccess(),
        allowedGrantSites,
      });
      permsDiv.appendChild(sitesSection);

      const rolesSection = document.createElement("div");
      rolesSection.className = "permission-section";
      const rolesHeader = document.createElement("div");
      rolesHeader.className = "permission-section-header";
      rolesHeader.innerHTML = `<div class="permission-section-title">Funkcija</div><div class="permission-section-note">Globalna funkcija korisnika u SCM-u.</div>`;
      rolesSection.appendChild(rolesHeader);
      const rolesContainer = document.createElement("div");
      rolesContainer.id = `roles_${idx}`;
      rolesSection.appendChild(rolesContainer);
      renderFunctionRoleEditor(rolesContainer, `role_${idx}_`, admin.storeRoles || [], {
        disableAll: !canEditThisAdmin,
      });
      permsDiv.appendChild(rolesSection);

      if (canEditThisAdmin) {
        const saveBtn = document.createElement("button");
        saveBtn.className = "btn btn-small btn-success";
        saveBtn.textContent = t("btnSavePerms");
        saveBtn.dataset.cmaxAction = "admin.savePerms";
        saveBtn.dataset.cmaxServerAction = "true";
        saveBtn.dataset.cmaxLoadingKey = "loadingAdminSave";
        saveBtn.dataset.cmaxArgs = JSON.stringify([admin.email, idx]);
        permsDiv.appendChild(saveBtn);
      }
      div.appendChild(permsDiv);
    } else {
      // For Super Admin, just display info
      const permsDiv = document.createElement("div");
      permsDiv.className = "admin-permissions";
      permsDiv.style.display = "block"; // Always show for Super Admin
      permsDiv.innerHTML = `
        <div class="permission-section">
          <div class="permission-section-header">
            <div class="permission-section-title">Super Admin</div>
            <div class="permission-section-note">This user has all permissions.</div>
          </div>
        </div>`;
      div.appendChild(permsDiv);
    }

    listEl.appendChild(div);
  });
}

function toggleAdminPerms(divOrIdx, maybeIdx) {
  const idx = Number.isFinite(Number(maybeIdx)) ? Number(maybeIdx) : Number(divOrIdx);
  const pd = document.getElementById(`perms_${idx}`);
  if (pd) pd.classList.toggle("open");
}

function stageAdminLevelChange(email, idx, effectiveLevel) {
  const levelSelect = document.getElementById(`level_${idx}`);
  const nextLevel = Number(levelSelect?.value) || effectiveLevel;
  setPendingAdminLevel(email, nextLevel);
  const targetAdmin = getAdmins().find((admin) => admin.email === email);
  const basePerms = normalizePermissions(targetAdmin?.permissions || {});
  const perms = normalizePermissions(getPendingAdminPerms(email, basePerms));
  const nextPerms =
    nextLevel >= 6
      ? getLevelDefaultPermissions(6)
      : clampPermissionsToLevel(perms, nextLevel);
  setPendingAdminPerms(email, nextPerms);
  renderAdminList();
}

function stageAdminPermissionChange(email, idx, effectiveLevel) {
  const nextPerms = readPermissionEditor(
    `perm_${idx}_`,
    getAllAdminPermissionKeys(),
    getLevelDefaultPermissions(effectiveLevel),
  );
  setPendingAdminPerms(email, nextPerms);
}

function saveAdminPerms(email, idx) {
  if (!canManageAdminsByLevel()) return;
  if (email === appState.currentUser) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  const admins = getAdmins();
  const adminIndex = admins.findIndex((a) => a.email === email);
  if (adminIndex === -1) return;
  const targetAdmin = admins[adminIndex];
  if (!canManageAdminRecord(targetAdmin)) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  const currentLevel = getCurrentAdminLevel();
  const maxLevel = getMaxGrantableLevel();
  const requestedLevel = Number(document.getElementById(`level_${idx}`)?.value);
  const safeRequested =
    Number.isFinite(requestedLevel) && requestedLevel >= 1 && requestedLevel <= 6
      ? requestedLevel
      : getAdminLevel(targetAdmin);
  const nextLevel = currentLevel >= 6 ? safeRequested : Math.min(safeRequested, maxLevel);

  const newPerms = readPermissionEditor(
    `perm_${idx}_`,
    getAllAdminPermissionKeys(),
    getLevelDefaultPermissions(nextLevel),
  );
  const selectedSites = readSiteAccessEditor(`sites_${idx}`);
  const filteredSites = canManageSiteAccess()
    ? selectedSites
    : getCurrentAdminAllowedSites();
  const guardedPerms = clampPermissionsToLevel(newPerms, nextLevel);
  if (!appState.isSuperAdmin) {
    Object.keys(guardedPerms).forEach((key) => {
      if (!hasAdminPermission(key)) {
        guardedPerms[key] = false;
      }
    });
  }
  if (!canManageSiteAccess()) {
    admins[adminIndex].allowedSites = admins[adminIndex].allowedSites || null;
  }
  admins[adminIndex].level = nextLevel;
  admins[adminIndex].permissions = normalizePermissions(guardedPerms);
  if (canManageSiteAccess() && Array.isArray(filteredSites)) {
    const allSitesSelected = filteredSites.length === (sites || []).length;
    admins[adminIndex].allowedSites = allSitesSelected ? null : filteredSites;
  }
  admins[adminIndex].storeRoles = readFunctionRoleEditor(`roles_${idx}`);
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  clearPendingAdminLevel(email);
  clearPendingAdminPerms(email);
  trackEditActivity();
  if (appState.currentUser === email) {
    appState.adminLevel = nextLevel;
    appState.permissions = normalizePermissions(guardedPerms);
    const authData = safeParseStoredJson(localStorage.getItem(AUTH_KEY), {}) || {};
    authData.permissions = appState.permissions;
    authData.level = nextLevel;
    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    applyPermissionVisibility();
  }
  return syncServerState({ includeAdmins: true, adminEditTargetEmail: email })
    .catch(() => {})
    .finally(() => {
      addLog("Admin account updated", { email, level: nextLevel, storeRoles: admins[adminIndex].storeRoles || [] });
      renderAdminList();
      populateSiteSelect();
      updateNotificationsBadge();
      showToast(t("successPermsSaved"), "success");
    });
}

function addNewAdmin() {
  if (!canManageAdminsByLevel()) return;
  if (!canManageAdminsByLevel()) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  const firstName = document.getElementById("newAdminFirstName").value.trim();
  const lastName = document.getElementById("newAdminLastName").value.trim();
  const email = document.getElementById("newAdminEmail").value.trim();
  const password = document.getElementById("newAdminPassword").value;
  if (!firstName || !lastName || !email || !password) {
    showToast(t("errAdminEmailPassword"), "error");
    return;
  }
  if (!email.includes("@")) {
    showToast(t("errInvalidEmail"), "error");
    return;
  }
  const admins = getAdmins();
  if (admins.some((a) => a.email === email)) {
    showToast(t("errAdminExists"), "error");
    return;
  }
  const requestedLevel = getSelectedNewAdminLevel();
  const maxLevel = getMaxGrantableLevel();
  const level = getCurrentAdminLevel() >= 6 ? requestedLevel : Math.min(requestedLevel, maxLevel);
  const functionRoles = readFunctionRoleEditor("newAdminRolePanel");
  if (!functionRoles.length) {
    showToast("Odaberite barem jednu funkciju.", "error");
    return;
  }
  const perms = readPermissionEditor(
    "np_",
    getAllAdminPermissionKeys(),
    getLevelDefaultPermissions(level),
  );
  const guardedPerms = clampPermissionsToLevel(perms, level);
  if (!appState.isSuperAdmin) {
    Object.keys(guardedPerms).forEach((key) => {
      if (!hasAdminPermission(key)) {
        guardedPerms[key] = false;
      }
    });
  }
  const selectedSites = readSiteAccessEditor("newAdminSitesPanel");
  const filteredSites = canManageSiteAccess()
    ? selectedSites
    : getCurrentAdminAllowedSites();
  admins.push({
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email,
    password,
    isSuperAdmin: false,
    level,
    permissions: normalizePermissions(guardedPerms),
    storeRoles: functionRoles,
    allowedSites:
      canManageSiteAccess() && Array.isArray(filteredSites)
        ? filteredSites.length === (sites || []).length
          ? null
          : filteredSites
        : filteredSites,
  });
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  trackEditActivity();
  return syncServerState({ includeAdmins: true, adminEditTargetEmail: email })
    .catch(() => {})
    .finally(() => {
      addLog("Admin account created", { email, level, storeRoles: functionRoles });
      document.getElementById("newAdminFirstName").value = "";
      document.getElementById("newAdminLastName").value = "";
      document.getElementById("newAdminEmail").value = "";
      document.getElementById("newAdminPassword").value = "";
      renderNewAdminLevelSelector();
      renderNewAdminRolePanel();
      renderNewAdminPermissionsPanel();
      renderAdminList();
      showToast(t("successAdminAdded"), "success");
    });
}

function removeAdminAction(email) {
  if (!canManageAdminsByLevel()) return;
  const targetAdmin = getAdmins().find((a) => a.email === email);
  if (!targetAdmin || !canManageAdminRecord(targetAdmin)) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  showPromptDialog(t("promptRemoveAdminReason"), "!", "", (reason) => {
    const trimmed = (reason || "").trim();
    if (!trimmed) {
      showToast(t("adminRemoveReasonRequired"), "error");
      return;
    }
    showConfirm(
      `${t("confirmRemoveAdmin")} "${getUserDisplayName(email, targetAdmin.fullName)}"?\n${t("adminRemovedReasonLabel")} ${trimmed}`,
      null,
      "!",
      () => {
        let admins = getAdmins();
        admins = admins.filter((a) => a.email !== email);
        localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));

        const removedByName = appState.currentUserName || appState.currentUser || "";
        setAdminRemovalNotice(email, {
          removedEmail: email,
          removedBy: appState.currentUser || "",
          removedByName,
          reason: trimmed,
          site: currentSite,
          at: new Date().toISOString(),
        });
        syncServerState({
          includeAdmins: true,
          includeAdminRemovalNotices: true,
          adminEditTargetEmail: email,
        }).catch(() => {});
        trackEditActivity();
        renderAdminList();
        showToast(t("successAdminRemoved"), "success");
      },
    );
  });
}

/* ==================== REPORTS ==================== */
