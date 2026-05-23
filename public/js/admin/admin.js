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

var ADMIN_USER_WIZARD_STEPS = [
  { key: "basic", title: "Osnovno" },
  { key: "function", title: "Funkcija" },
  { key: "sites", title: "Gradilista" },
  { key: "permissions", title: "Permissions" },
  { key: "security", title: "Sigurnost" },
  { key: "review", title: "Pregled" },
];

var ADMIN_USER_PERMISSION_GROUPS = [
  { title: "Planner", view: ["canAccessPlanner"], edit: ["canManageWorkers", "canManagePlans", "canManageMoments", "canManageKarnas", "canManageLifts"], manage: ["canClear", "canUnlockPastDays"], export: ["canExportPlanner", "canImportPlanner"] },
  { title: "Tidplan", view: ["canAccessTidplan"], edit: ["canManageTidplan", "canAddTidplanActivity", "canManageTidplanZones"], manage: ["canDeleteTidplanActivity", "canClearTidplan"], export: ["canExportTidplan", "canImportTidplan", "canPrintTidplan"] },
  { title: "Warehouse", view: ["canAccessWarehouse", "canViewWarehouse", "canViewWarehouseLogs", "canViewWarehouseAnalytics"], edit: ["canManageWarehouse"], manage: ["canAssignWarehouseToAdmin"], export: ["canExportWarehouse", "canImportWarehouse"] },
  { title: "Alatnica", view: ["canAccessToolroom", "canViewMyTools", "canViewToolHistory"], edit: ["canManageToolroom", "canAssignTools", "canReturnTools", "canReportToolFault", "canHandleToolService", "canWriteOffTools", "canEditToolPresets"], manage: [], export: [] },
  { title: "Store", view: ["canAccessStore", "canAccessWorkwear", "canViewStoreTeamOrders", "canViewStoreManagerDashboard"], edit: ["canManageStore", "canManageWorkwear", "canManageStoreBudgets", "canManageWorkwearCredits", "canManageStoreRules", "canManageWorkwearSettings"], manage: ["canViewWorkwearAnalytics"], export: ["canExportStore"] },
  { title: "Notifications", view: ["canViewNotifications"], edit: ["canManageNotifications"], manage: ["canDeleteNotifications"], export: [] },
  { title: "Surveys", view: ["canViewSurveys", "canViewSurveyResults", "canViewAnonymousSurveyVoters"], edit: ["canCreateSurveys", "canEditSurveys", "canPublishSurveys"], manage: ["canDeleteSurveys", "canManageSurveyPermissions"], export: [] },
  { title: "Reports", view: ["canViewReports"], edit: ["canCreateReports", "canApproveReports"], manage: ["canDeleteReports"], export: [] },
  { title: "Admin", view: ["canOpenAdminPanel", "canViewSettings", "canViewLogs"], edit: ["canManageAdmins", "canManageSiteAccess", "canManageGuestAccess", "canManageBinsPermissions"], manage: ["canClearLogs", "canModifyReadOnly", "canToggleReadOnly"], export: [] },
  { title: "Backup/Restore", view: ["canViewBackups"], edit: ["canManageBackups"], manage: ["canRestoreBackups"], export: [] },
  { title: "Chat", view: ["canAccessSiteChat"], edit: [], manage: ["canModerateSiteChat"], export: [] },
];

var ADMIN_USER_PRESETS = {
  worker: { label: "Worker preset", level: 1, roles: ["radnik"], enabled: ["canAccessPlanner", "canAccessTidplan", "canAccessBins", "canAccessWarehouse", "canAccessStore", "canAccessWorkwear", "canAccessSiteChat", "canViewNotifications", "canViewSurveys", "canCreateReports"] },
  grupovodja: { label: "Grupovoda preset", level: 2, roles: ["grupovodja"], enabled: ["canAccessPlanner", "canAccessTidplan", "canAccessBins", "canAccessWarehouse", "canAccessStore", "canAccessWorkwear", "canAccessSiteChat", "canViewNotifications", "canViewSurveys", "canCreateReports", "canPrint", "canExport", "canExportPlanner", "canViewReports"] },
  poslovodja: { label: "Poslovoda preset", level: 3, roles: ["poslovodja"], enabled: ["canAccessPlanner", "canAccessTidplan", "canAccessBins", "canAccessWarehouse", "canAccessStore", "canAccessWorkwear", "canManageWorkwear", "canAccessSiteChat", "canViewNotifications", "canManageNotifications", "canViewSurveys", "canCreateReports", "canViewReports", "canApproveReports", "canManageWorkers", "canManagePlans", "canManageTidplan", "canAddTidplanActivity", "canManageWarehouse"] },
  projektledare: { label: "Projektledare preset", level: 4, roles: ["projektledare"], enabled: ["canAccessPlanner", "canAccessTidplan", "canAccessBins", "canAccessWarehouse", "canAccessStore", "canAccessWorkwear", "canAccessSiteChat", "canViewNotifications", "canManageNotifications", "canViewSurveys", "canCreateSurveys", "canEditSurveys", "canPublishSurveys", "canCreateReports", "canViewReports", "canApproveReports", "canManageWorkers", "canManagePlans", "canManageTidplan", "canAddTidplanActivity", "canManageWarehouse", "canExportPlanner", "canExportTidplan", "canExportWarehouse"] },
  store_manager: { label: "Store Manager preset", level: 4, roles: ["store_manager"], enabled: ["canAccessStore", "canAccessWorkwear", "canManageStore", "canManageWorkwear", "canViewStoreTeamOrders", "canManageStoreBudgets", "canManageWorkwearCredits", "canManageStoreRules", "canManageWorkwearSettings", "canViewStoreManagerDashboard", "canViewWorkwearAnalytics", "canExportStore", "canViewNotifications", "canAccessSiteChat"] },
  admin: { label: "Admin preset", level: 5, roles: ["admin"], enabled: ["canAccessPlanner", "canAccessTidplan", "canAccessBins", "canAccessWarehouse", "canAccessStore", "canAccessWorkwear", "canAccessSiteChat", "canViewNotifications", "canManageNotifications", "canViewSurveys", "canCreateSurveys", "canEditSurveys", "canPublishSurveys", "canCreateReports", "canViewReports", "canApproveReports", "canOpenAdminPanel", "canViewSettings", "canManageAdmins", "canManageSiteAccess", "canManageGuestAccess", "canViewLogs", "canExportPlanner", "canExportTidplan", "canExportWarehouse", "canImportPlanner", "canImportTidplan", "canImportWarehouse"] },
  superadmin: { label: "Superadmin preset", level: 6, roles: ["superadmin"], enabled: Object.keys(DEFAULT_PERMISSIONS) },
};

var ADMIN_USER_DANGEROUS_KEYS = new Set([
  "canRestoreBackups",
  "canManageAdmins",
  "canManageSiteAccess",
  "canManageGuestAccess",
  "canDeleteReports",
  "canDeleteNotifications",
  "canDeleteSurveys",
  "canClearLogs",
  "canModifyReadOnly",
  "canToggleReadOnly",
]);

var adminUserWizardState = {
  isOpen: false,
  mode: "create",
  step: 0,
  editEmail: "",
  original: null,
  draft: null,
};

function createAdminWizardDraft(admin) {
  const normalized = admin ? normalizeAdminRecord(admin) : null;
  const fullName = normalized?.fullName || "";
  const nameParts = fullName.split(" ");
  const firstName = normalized?.firstName || nameParts.shift() || "";
  const lastName = normalized?.lastName || nameParts.join(" ") || "";
  const level = normalized ? getAdminLevel(normalized) : 1;
  return {
    firstName,
    lastName,
    email: normalized?.email || "",
    password: "",
    active: normalized?.active !== false,
    isReadonly: Boolean(normalized?.isReadonly),
    level,
    isSuperAdmin: Boolean(normalized?.isSuperAdmin),
    storeRoles: normalized?.storeRoles?.length ? normalizeGlobalFunctionKeys(normalized.storeRoles) : ["radnik"],
    allSites: !Array.isArray(normalized?.allowedSites),
    allowedSites: Array.isArray(normalized?.allowedSites) ? normalized.allowedSites.slice() : (sites || []).slice(),
    permissions: normalized?.isSuperAdmin
      ? { ...DEFAULT_PERMISSIONS }
      : normalizePermissions(normalized?.permissions || getLevelDefaultPermissions(level)),
  };
}

function adminWizardEscape(value) {
  return typeof escapeHtml === "function" ? escapeHtml(value) : String(value || "");
}

function getAdminUserWizardDraft() {
  if (!adminUserWizardState.draft) {
    adminUserWizardState.draft = createAdminWizardDraft(null);
  }
  return adminUserWizardState.draft;
}

function collectAdminUserWizardStep() {
  if (!adminUserWizardState.isOpen) return;
  const draft = getAdminUserWizardDraft();
  const basicMap = {
    firstName: "adminWizardFirstName",
    lastName: "adminWizardLastName",
    email: "adminWizardEmail",
    password: "adminWizardPassword",
  };
  Object.entries(basicMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) draft[key] = el.value;
  });
  const activeEl = document.getElementById("adminWizardActive");
  if (activeEl) draft.active = activeEl.checked;
  const readonlyEl = document.getElementById("adminWizardReadonly");
  if (readonlyEl) draft.isReadonly = readonlyEl.checked;
  const levelEl = document.getElementById("adminWizardLevel");
  if (levelEl) draft.level = Math.max(1, Math.min(6, Number(levelEl.value) || draft.level || 1));
  const roleInputs = document.querySelectorAll("#adminUserWizardBody input[data-wizard-role]");
  if (roleInputs.length) {
    draft.storeRoles = normalizeGlobalFunctionKeys(Array.from(roleInputs).filter((cb) => cb.checked).map((cb) => cb.dataset.wizardRole));
  }
  const allSitesEl = document.getElementById("adminWizardAllSites");
  if (allSitesEl) draft.allSites = allSitesEl.checked;
  const siteInputs = document.querySelectorAll("#adminUserWizardBody input[data-wizard-site]");
  if (siteInputs.length) {
    draft.allowedSites = Array.from(siteInputs).filter((cb) => cb.checked).map((cb) => cb.dataset.wizardSite);
  }
  const permInputs = document.querySelectorAll("#adminUserWizardBody input[data-wizard-permission]");
  if (permInputs.length) {
    const next = normalizePermissions(draft.permissions || {});
    permInputs.forEach((cb) => {
      next[cb.dataset.wizardPermission] = cb.checked;
    });
    draft.permissions = next;
  }
}

function getAdminUserWizardDangerousItems(draft = getAdminUserWizardDraft()) {
  const items = [];
  if (Number(draft.level || 1) >= 5) items.push("Admin level 5+");
  if (Number(draft.level || 1) >= 6 || draft.isSuperAdmin || (draft.storeRoles || []).includes("superadmin")) {
    items.push("Superadmin");
  }
  Object.keys(draft.permissions || {}).forEach((key) => {
    if (draft.permissions[key] === true && ADMIN_USER_DANGEROUS_KEYS.has(key)) {
      items.push(getPermissionLabel(key));
    }
  });
  return Array.from(new Set(items));
}

function adminWizardCanGrantPermission(key, level) {
  const template = getLevelTemplate(level || 1);
  return template[key] === true && (appState.isSuperAdmin || hasAdminPermission(key));
}

function applyAdminUserWizardPreset(presetKey) {
  collectAdminUserWizardStep();
  const preset = ADMIN_USER_PRESETS[presetKey];
  if (!preset) return;
  const draft = getAdminUserWizardDraft();
  const maxLevel = getMaxGrantableLevel();
  draft.level = appState.isSuperAdmin ? preset.level : Math.min(preset.level, maxLevel);
  draft.storeRoles = normalizeGlobalFunctionKeys(preset.roles);
  draft.isSuperAdmin = draft.level >= 6 && presetKey === "superadmin";
  const allowed = new Set(preset.enabled || []);
  const template = getLevelTemplate(draft.level);
  const nextPerms = {};
  Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
    nextPerms[key] = template[key] === true && allowed.has(key) && (appState.isSuperAdmin || hasAdminPermission(key));
  });
  draft.permissions = normalizePermissions(nextPerms);
  renderAdminUserWizard();
}

function generateAdminWizardPassword() {
  collectAdminUserWizardStep();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!?#";
  let password = "";
  for (let i = 0; i < 14; i += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  getAdminUserWizardDraft().password = password;
  renderAdminUserWizard();
  showToast("Generirana lozinka je upisana u wizard. Nece biti logirana.", "success");
}

function openAdminUserWizard(mode = "create", email = "") {
  if (!canManageAdminsByLevel()) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  const admins = getAdmins();
  const target = mode === "edit" ? admins.find((admin) => admin.email === email) : null;
  if (mode === "edit" && (!target || !canManageAdminRecord(target))) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  adminUserWizardState = {
    isOpen: true,
    mode: mode === "edit" ? "edit" : "create",
    step: 0,
    editEmail: target?.email || "",
    original: target ? normalizeAdminRecord(target) : null,
    draft: createAdminWizardDraft(target || null),
  };
  const overlay = document.getElementById("adminUserWizardOverlay");
  if (overlay) {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
  }
  document.body.classList.add("modal-open");
  renderAdminUserWizard();
}

function closeAdminUserWizard() {
  const overlay = document.getElementById("adminUserWizardOverlay");
  if (overlay) {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("modal-open");
  adminUserWizardState.isOpen = false;
}

function adminUserWizardNext() {
  collectAdminUserWizardStep();
  if (!validateAdminUserWizardStep()) return;
  adminUserWizardState.step = Math.min(ADMIN_USER_WIZARD_STEPS.length - 1, adminUserWizardState.step + 1);
  renderAdminUserWizard();
}

function adminUserWizardBack() {
  collectAdminUserWizardStep();
  adminUserWizardState.step = Math.max(0, adminUserWizardState.step - 1);
  renderAdminUserWizard();
}

function validateAdminUserWizardStep() {
  const draft = getAdminUserWizardDraft();
  const key = ADMIN_USER_WIZARD_STEPS[adminUserWizardState.step]?.key;
  if (key === "basic") {
    if (!String(draft.firstName || "").trim() || !String(draft.email || "").trim()) {
      showToast("Unesite ime i email.", "error");
      return false;
    }
    if (!String(draft.email || "").includes("@")) {
      showToast(t("errInvalidEmail"), "error");
      return false;
    }
    if (adminUserWizardState.mode === "create" && !String(draft.password || "").trim()) {
      showToast("Unesite lozinku ili generirajte novu.", "error");
      return false;
    }
  }
  if (key === "function" && !draft.storeRoles.length) {
    showToast("Odaberite barem jednu funkciju osobe.", "error");
    return false;
  }
  if (key === "sites" && !draft.allSites && !draft.allowedSites.length) {
    showToast("Odaberite barem jedno gradiliste ili ukljucite sva gradilista.", "error");
    return false;
  }
  return true;
}

function renderAdminUserWizard() {
  if (!adminUserWizardState.isOpen) return;
  const draft = getAdminUserWizardDraft();
  const title = document.getElementById("adminUserWizardTitle");
  if (title) title.textContent = adminUserWizardState.mode === "edit" ? "Uredi korisnika/admina" : "Dodaj korisnika/admina";
  renderAdminUserWizardStepper();
  const body = document.getElementById("adminUserWizardBody");
  if (!body) return;
  const stepKey = ADMIN_USER_WIZARD_STEPS[adminUserWizardState.step]?.key || "basic";
  if (stepKey === "basic") body.innerHTML = renderAdminWizardBasicStep(draft);
  if (stepKey === "function") body.innerHTML = renderAdminWizardFunctionStep(draft);
  if (stepKey === "sites") body.innerHTML = renderAdminWizardSitesStep(draft);
  if (stepKey === "permissions") body.innerHTML = renderAdminWizardPermissionsStep(draft);
  if (stepKey === "security") body.innerHTML = renderAdminWizardSecurityStep(draft);
  if (stepKey === "review") body.innerHTML = renderAdminWizardReviewStep(draft);
  const backBtn = document.getElementById("adminUserWizardBackBtn");
  const nextBtn = document.getElementById("adminUserWizardNextBtn");
  const saveBtn = document.getElementById("adminUserWizardSaveBtn");
  if (backBtn) backBtn.style.display = adminUserWizardState.step === 0 ? "none" : "";
  if (nextBtn) nextBtn.style.display = adminUserWizardState.step >= ADMIN_USER_WIZARD_STEPS.length - 1 ? "none" : "";
  if (saveBtn) saveBtn.style.display = adminUserWizardState.step >= ADMIN_USER_WIZARD_STEPS.length - 1 ? "" : "none";
}

function renderAdminUserWizardStepper() {
  const stepper = document.getElementById("adminUserWizardStepper");
  if (!stepper) return;
  stepper.innerHTML = ADMIN_USER_WIZARD_STEPS.map((step, index) => `
    <button type="button" class="admin-user-wizard-step ${index === adminUserWizardState.step ? "is-active" : ""} ${index < adminUserWizardState.step ? "is-done" : ""}" data-cmax-action="admin.userWizardGoTo" data-cmax-args='[${index}]'>
      <span>${index + 1}</span>
      ${adminWizardEscape(step.title)}
    </button>
  `).join("");
}

function adminUserWizardGoTo(index) {
  collectAdminUserWizardStep();
  const next = Number(index);
  if (!Number.isFinite(next)) return;
  adminUserWizardState.step = Math.max(0, Math.min(ADMIN_USER_WIZARD_STEPS.length - 1, next));
  renderAdminUserWizard();
}

function renderAdminWizardBasicStep(draft) {
  return `
    <section class="admin-user-wizard-section">
      <h4>Step 1 - Osnovni podaci</h4>
      <p>Unesi podatke accounta. Lozinka se ne prikazuje u audit logu.</p>
      <div class="admin-user-wizard-grid">
        <label>Ime<input id="adminWizardFirstName" type="text" value="${adminWizardEscape(draft.firstName)}" autocomplete="given-name"></label>
        <label>Prezime<input id="adminWizardLastName" type="text" value="${adminWizardEscape(draft.lastName)}" autocomplete="family-name"></label>
        <label>Email<input id="adminWizardEmail" type="email" value="${adminWizardEscape(draft.email)}" ${adminUserWizardState.mode === "edit" ? "readonly" : ""} autocomplete="off"></label>
        <label>Lozinka<input id="adminWizardPassword" type="password" value="${adminWizardEscape(draft.password)}" placeholder="${adminUserWizardState.mode === "edit" ? "Ostavi prazno ako se ne mijenja" : "Nova lozinka"}" autocomplete="new-password"></label>
      </div>
      <div class="admin-user-wizard-actions-inline">
        <button type="button" class="btn btn-ghost" data-cmax-action="admin.generateWizardPassword">Generate password</button>
      </div>
      <div class="admin-user-card-grid">
        <label class="admin-user-toggle-card"><input id="adminWizardActive" type="checkbox" ${draft.active ? "checked" : ""}><span><strong>Aktivan account</strong><small>Korisnik se moze prijaviti dok je aktivan.</small></span></label>
        <label class="admin-user-toggle-card"><input id="adminWizardReadonly" type="checkbox" ${draft.isReadonly ? "checked" : ""}><span><strong>Readonly</strong><small>Korisnik moze gledati, ali ne mijenjati podatke gdje je podrzano.</small></span></label>
      </div>
    </section>
  `;
}

function renderAdminWizardFunctionStep(draft) {
  const roleCards = getGlobalFunctionOptions().map((role) => `
    <label class="admin-user-toggle-card">
      <input type="checkbox" data-wizard-role="${adminWizardEscape(role.key)}" ${draft.storeRoles.includes(role.key) ? "checked" : ""} ${role.key === "superadmin" && !appState.isSuperAdmin ? "disabled" : ""}>
      <span><strong>${adminWizardEscape(role.label)}</strong><small>Poslovna funkcija osobe u firmi.</small></span>
    </label>
  `).join("");
  return `
    <section class="admin-user-wizard-section">
      <h4>Step 2 - Funkcija osobe</h4>
      <div class="admin-user-info-box">
        <strong>Funkcija nije isto sto i permissions.</strong>
        <span>Funkcija opisuje sta je osoba u firmi. Permissions odreduju sta smije raditi u aplikaciji.</span>
      </div>
      <div class="admin-user-card-grid">${roleCards}</div>
      <label class="admin-user-level-select">Admin level
        <select id="adminWizardLevel">
          ${ADMIN_LEVELS.filter((lvl) => lvl <= getMaxGrantableLevel()).map((lvl) => `<option value="${lvl}" ${Number(draft.level) === lvl ? "selected" : ""}>Level ${lvl}</option>`).join("")}
        </select>
      </label>
    </section>
  `;
}

function renderAdminWizardSitesStep(draft) {
  const allowedGrantSites = getCurrentAdminAllowedSites();
  const siteCards = (sites || []).map((site) => {
    const canGrant = appState.isSuperAdmin || allowedGrantSites === null || allowedGrantSites.includes(site);
    return `
      <label class="admin-user-toggle-card ${draft.allSites ? "is-muted" : ""}">
        <input type="checkbox" data-wizard-site="${adminWizardEscape(site)}" ${draft.allSites || draft.allowedSites.includes(site) ? "checked" : ""} ${draft.allSites || !canGrant ? "disabled" : ""}>
        <span><strong>${adminWizardEscape(site)}</strong><small>Pristup podacima ovog gradilista.</small></span>
      </label>
    `;
  }).join("");
  return `
    <section class="admin-user-wizard-section">
      <h4>Step 3 - Gradilista</h4>
      <p>Ako korisnik nema pristup gradilistu, ne smije vidjeti njegove podatke.</p>
      <label class="admin-user-toggle-card admin-user-toggle-card-wide">
        <input id="adminWizardAllSites" type="checkbox" ${draft.allSites ? "checked" : ""} data-cmax-action="admin.toggleWizardAllSites" data-cmax-event="change">
        <span><strong>Dostupna sva gradilista</strong><small>Vrijedi i za nova gradilista koja se dodaju kasnije.</small></span>
      </label>
      <div class="admin-user-card-grid">${siteCards || `<div class="admin-user-empty">Nema gradilista za dodjelu.</div>`}</div>
    </section>
  `;
}

function renderAdminWizardPermissionsStep(draft) {
  const presets = Object.entries(ADMIN_USER_PRESETS).map(([key, preset]) => `
    <button type="button" class="btn btn-ghost btn-small" data-cmax-action="admin.applyWizardPreset" data-cmax-args='["${key}"]'>${adminWizardEscape(preset.label)}</button>
  `).join("");
  const groups = ADMIN_USER_PERMISSION_GROUPS.map((group) => {
    const rows = [
      ["View", group.view],
      ["Create/Edit", group.edit],
      ["Delete/Manage", group.manage],
      ["Export", group.export],
    ].filter(([, keys]) => keys.length).map(([label, keys]) => `
      <div class="admin-user-permission-row">
        <strong>${label}</strong>
        <div>
          ${keys.map((key) => `
            <label class="admin-user-permission-chip">
              <input type="checkbox" data-wizard-permission="${adminWizardEscape(key)}" ${draft.permissions[key] !== false ? "checked" : ""} ${adminWizardCanGrantPermission(key, draft.level) ? "" : "disabled"}>
              <span>${adminWizardEscape(getPermissionLabel(key))}</span>
            </label>
          `).join("")}
        </div>
      </div>
    `).join("");
    return `<div class="admin-user-permission-group"><h5>${adminWizardEscape(group.title)}</h5>${rows}</div>`;
  }).join("");
  return `
    <section class="admin-user-wizard-section">
      <h4>Step 4 - Permissions</h4>
      <p>Preseti samo predloze prava. Poslije ih mozes rucno promijeniti po grupama.</p>
      <div class="admin-user-preset-row">${presets}</div>
      <div class="admin-user-permission-groups">${groups}</div>
    </section>
  `;
}

function renderAdminWizardSecurityStep(draft) {
  const dangerous = getAdminUserWizardDangerousItems(draft);
  return `
    <section class="admin-user-wizard-section">
      <h4>Step 5 - Sigurnost</h4>
      <div class="admin-user-security-grid">
        <div class="admin-user-info-box"><strong>Reset lozinke</strong><span>Zahtjev za reset lozinke ostaje pod Superadmin kontrolom i ne logira plain password.</span></div>
        <div class="admin-user-info-box"><strong>Restore backup</strong><span>Restore je dozvoljen samo Superadminu ili korisniku kojem Superadmin eksplicitno dodijeli pravo.</span></div>
        <div class="admin-user-info-box"><strong>Permission edit</strong><span>Mijenjanje permissions je opasna admin akcija i auditira se na backendu.</span></div>
        <div class="admin-user-info-box"><strong>Store management</strong><span>Store Manager/Admin funkcija i permissions moraju biti dodijeljeni da bi korisnik upravljao Storeom.</span></div>
      </div>
      ${dangerous.length ? `<div class="admin-user-danger-box"><strong>Opasna prava:</strong><ul>${dangerous.map((item) => `<li>${adminWizardEscape(item)}</li>`).join("")}</ul></div>` : `<div class="admin-user-safe-box">Nema detektiranih opasnih prava u ovom prijedlogu.</div>`}
    </section>
  `;
}

function renderAdminWizardReviewStep(draft) {
  const roleLabels = (draft.storeRoles || []).map((role) => {
    const option = getGlobalFunctionOptions().find((item) => item.key === role);
    return option?.label || role;
  });
  const enabledGroups = ADMIN_USER_PERMISSION_GROUPS.map((group) => {
    const keys = [...group.view, ...group.edit, ...group.manage, ...group.export];
    const count = keys.filter((key) => draft.permissions[key] !== false).length;
    return count ? `${group.title} (${count})` : "";
  }).filter(Boolean);
  const dangerous = getAdminUserWizardDangerousItems(draft);
  return `
    <section class="admin-user-wizard-section">
      <h4>Step 6 - Pregled i potvrda</h4>
      <div class="admin-user-review">
        <div><strong>Ime/email</strong><span>${adminWizardEscape(`${draft.firstName || ""} ${draft.lastName || ""}`.trim() || "-")} / ${adminWizardEscape(draft.email || "-")}</span></div>
        <div><strong>Funkcija</strong><span>${roleLabels.map((label) => `<em>${adminWizardEscape(label)}</em>`).join(" ") || "-"}</span></div>
        <div><strong>Gradilista</strong><span>${draft.allSites ? "Sva gradilista" : adminWizardEscape((draft.allowedSites || []).join(", ") || "-")}</span></div>
        <div><strong>Permission groups</strong><span>${adminWizardEscape(enabledGroups.join(", ") || "-")}</span></div>
        <div><strong>Opasna prava</strong><span>${dangerous.length ? adminWizardEscape(dangerous.join(", ")) : "Nema"}</span></div>
        <div><strong>Status</strong><span>${draft.active ? "Active" : "Inactive"}${draft.isReadonly ? " / Readonly" : ""}</span></div>
      </div>
    </section>
  `;
}

function toggleAdminWizardAllSites() {
  collectAdminUserWizardStep();
  const draft = getAdminUserWizardDraft();
  draft.allSites = document.getElementById("adminWizardAllSites")?.checked === true;
  if (draft.allSites) draft.allowedSites = (sites || []).slice();
  renderAdminUserWizard();
}

function buildAdminUserFromWizardDraft(draft, existing) {
  const level = Math.max(1, Math.min(6, Number(draft.level) || 1));
  let guardedPerms = level >= 6 ? { ...DEFAULT_PERMISSIONS } : clampPermissionsToLevel(draft.permissions || {}, level);
  if (!appState.isSuperAdmin) {
    Object.keys(guardedPerms).forEach((key) => {
      if (!hasAdminPermission(key)) guardedPerms[key] = false;
    });
  }
  const selectedSites = draft.allSites ? null : (draft.allowedSites || []).filter((site) => (sites || []).includes(site));
  const next = {
    ...(existing || {}),
    firstName: String(draft.firstName || "").trim(),
    lastName: String(draft.lastName || "").trim(),
    fullName: `${String(draft.firstName || "").trim()} ${String(draft.lastName || "").trim()}`.trim(),
    email: String(draft.email || "").trim().toLowerCase(),
    active: draft.active !== false,
    isReadonly: Boolean(draft.isReadonly),
    isSuperAdmin: appState.isSuperAdmin && (level >= 6 || (draft.storeRoles || []).includes("superadmin")),
    level,
    permissions: normalizePermissions(guardedPerms),
    storeRoles: normalizeGlobalFunctionKeys(draft.storeRoles || []),
    allowedSites: selectedSites,
  };
  if (String(draft.password || "").trim()) next.password = draft.password;
  return next;
}

function adminUserWizardRightsChanged(original, next) {
  if (!original) return true;
  const important = ["level", "isSuperAdmin", "isReadonly", "active"];
  if (important.some((key) => String(original[key]) !== String(next[key]))) return true;
  if (JSON.stringify(normalizeGlobalFunctionKeys(original.storeRoles || [])) !== JSON.stringify(normalizeGlobalFunctionKeys(next.storeRoles || []))) return true;
  if (JSON.stringify(original.allowedSites || null) !== JSON.stringify(next.allowedSites || null)) return true;
  return JSON.stringify(normalizePermissions(original.permissions || {})) !== JSON.stringify(normalizePermissions(next.permissions || {}));
}

function saveAdminUserWizard() {
  collectAdminUserWizardStep();
  if (!validateAdminUserWizardStep()) return;
  const draft = getAdminUserWizardDraft();
  const admins = getAdmins();
  const email = String(draft.email || "").trim().toLowerCase();
  const existingIndex = admins.findIndex((admin) => admin.email === (adminUserWizardState.editEmail || email));
  const existing = existingIndex >= 0 ? admins[existingIndex] : null;
  if (adminUserWizardState.mode === "create" && admins.some((admin) => admin.email === email)) {
    showToast(t("errAdminExists"), "error");
    return;
  }
  const nextAdmin = buildAdminUserFromWizardDraft(draft, existing);
  if (email === appState.currentUser) {
    showToast("Ne mozete mijenjati vlastita opasna prava iz ovog wizarda.", "error");
    return;
  }
  if (!appState.isSuperAdmin && (nextAdmin.isSuperAdmin || (nextAdmin.storeRoles || []).includes("superadmin") || getAdminLevel(nextAdmin) >= getCurrentAdminLevel())) {
    showToast(t("errAdminManageDenied"), "error");
    return;
  }
  const doSave = () => {
    const nextAdmins = admins.slice();
    if (existingIndex >= 0) nextAdmins[existingIndex] = nextAdmin;
    else nextAdmins.push(nextAdmin);
    localStorage.setItem(ADMINS_KEY, JSON.stringify(nextAdmins));
    trackEditActivity();
    return syncModuleState("adminUsers", { admins: nextAdmins })
      .catch(() => {})
      .finally(() => {
        const dangerous = getAdminUserWizardDangerousItems(draft);
        addLog(adminUserWizardState.mode === "edit" ? "Admin account updated" : "Admin account created", {
          email,
          level: nextAdmin.level,
          storeRoles: nextAdmin.storeRoles || [],
          dangerousPermissions: dangerous,
        });
        renderAdminList();
        populateSiteSelect();
        updateNotificationsBadge();
        closeAdminUserWizard();
        showToast(adminUserWizardState.mode === "edit" ? t("successPermsSaved") : t("successAdminAdded"), "success");
      });
  };
  if (adminUserWizardState.mode === "edit" && adminUserWizardRightsChanged(adminUserWizardState.original, nextAdmin)) {
    return showConfirm(
      "Mijenjate prava ili pristup postojeceg korisnika. Nastaviti?",
      null,
      "!",
      doSave,
    );
  }
  return doSave();
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

  if (!tabAdmins.querySelector(".admin-user-wizard-launch") && !tabAdmins.querySelector(".admin-compose-intro")) {
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

  const overlay = document.getElementById("adminUserWizardOverlay");
  if (overlay && !overlay.dataset.boundAdminUserWizard) {
    overlay.dataset.boundAdminUserWizard = "true";
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeAdminUserWizard();
    });
  }
  if (!document.body.dataset.boundAdminUserWizardEscape) {
    document.body.dataset.boundAdminUserWizardEscape = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && adminUserWizardState?.isOpen) {
        closeAdminUserWizard();
      }
    });
  }

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
        editBtn.dataset.cmaxAction = "admin.openUserWizard";
        editBtn.dataset.cmaxArgs = JSON.stringify(["edit", admin.email]);
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
  return syncModuleState("adminUsers", {
    admins,
  })
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
  if (adminUserWizardState?.isOpen !== true) {
    openAdminUserWizard("create");
    return;
  }
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
  return syncModuleState("adminUsers", {
    admins,
  })
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
        syncModuleState("adminUsers", {
          admins,
          adminRemovalNotices: getCachedStorageJson(ADMIN_REMOVAL_NOTICES_KEY, {}),
        }).catch(() => {});
        trackEditActivity();
        renderAdminList();
        showToast(t("successAdminRemoved"), "success");
      },
    );
  });
}

/* ==================== REPORTS ==================== */
