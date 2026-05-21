var appState = {
  workers: [
    "Aleksandar Antonovic",
    "Alois-Francisc Stojan",
    "Amel Husic",
    "Amir Gholami",
    "Boyan Sazdanovski",
    "Branislav Jovicic",
    "Branislav Madzar",
    "Danijel Sumic",
    "Danijel-Gabrijel Dia",
    "Darko Ivandic",
    "Ergin Makic",
    "Filip Fiolic",
    "Ivan Mijatovic",
    "Josip Ivandic",
    "Jovan Panic",
    "Marius Constantin",
    "Marko Mladenovic",
    "Mohammad Kabir",
    "Nebojsa Stanisic",
    "Radenko Tesanovic",
    "Radomir Mitrovic",
    "Sinan Ayhan",
    "Sinisa Gataric",
    "Tommie Andersson",
    "Venijamin Visekruna",
    "Vicenco Mijic",
    "William Asovic",
    "Yevhenii Marin",
    "Yurii Volkov",
  ],
  lifts: [
    "11788",
    "4865",
    "4820",
    "11698",
    "4451",
    "11513",
    "13286",
    "13441",
    "8468",
    "12113",
    "13444",
    "11685",
    "11684",
    "11945",
    "11114",
    "4883",
    "12095",
    "13879",
    "12090",
    "11484",
    "11521",
    "4328",
    "11857",
    "11676",
    "4739",
    "13859",
    "11442",
    "5227",
    "12101",
    "13315",
    "11495",
    "13776",
    "11755",
    "12094",
    "12044",
  ],
  moments: [
    "IV Utsättning",
    "IV Stomme",
    "IV Enkling",
    "IV Isolering",
    "IV Dubbling",
    "UT Utsättning",
    "UT Stomme",
    "UT Isolering",
    "UT Dubbling",
    "YV Utsättning",
    "YV Stomme",
    "YV Isolering",
    "YV Plastfolie",
    "IZ Stomme",
    "IZ Isolering",
    "IZ Dubbling",
    "Kontor",
    "Mont.fönster",
    "Ometablering",
    "Kortlingar",
    "Transport material",
    "Håltagning",
    "Rivning",
    "Fönsterbänkar",
    "Fönstersmygar",
    "Övrigt",
    "Möte",
    "Städning",
    "Fasad",
  ],
  plans: [],
  karnas: ["Karna 1", "Karna 2", "Karna 3", "Karna 4"],
  dailyData: {},
  binsData: {}, // { date: { planCount: 20, rows: [...] } }
  resourceHistory: [],
  binPermissions: {
    // which columns can guests edit
    totalAvailable: true,
    emptyAvailable: true,
    forEmptying: true,
    additionalRequired: false,
  },
  currentDate: new Date().toISOString().split("T")[0],
  isAdmin: false,
  isSuperAdmin: false,
  isReadonly: false,
  adminLevel: 1,
  currentUser: null,
  currentUserName: "",
  currentUserFunctions: [],
  permissions: { ...DEFAULT_PERMISSIONS },
  guestPermissions: { ...DEFAULT_GUEST_PERMISSIONS },
  hasUnsavedChanges: false, // Track changes for Save button
};

for (let i = 1; i <= 20; i++) appState.plans.push(`Plan ${i}`);

appState.workers = [];
appState.lifts = [];
appState.moments = [];
appState.plans = [];
appState.karnas = [];

var DEFAULT_SITE_TEMPLATE = {
  workers: [],
  lifts: [],
  moments: [],
  plans: [],
  karnas: [],
  dailyData: {},
  binsData: {},
  tidplan: [],
  resourceHistory: [],
  tidplanZones: [
    { name: "Zona A", color: "#8fbc8f" },
    { name: "Zona B", color: "#add8e6" },
    { name: "Zona C", color: "#f4a460" },
  ],
  warehouse: null,
  store: null,
  reports: [],
  notifications: [],
};

function markLocalSiteMutation() {
  lastLocalSiteMutationAt = Date.now();
}

function createEmptyPlannerData() {
  return {
    workers: [],
    lifts: [],
    moments: [],
    plans: [],
    karnas: [],
    dailyData: {},
    resourceHistory: [],
  };
}

function normalizePlannerData(planner = {}, site = currentSite) {
  const source = planner && typeof planner === "object" ? planner : {};
  return {
    workers: Array.isArray(source.workers) ? source.workers : [],
    lifts: Array.isArray(source.lifts) ? source.lifts : [],
    moments: Array.isArray(source.moments) ? source.moments : [],
    plans: Array.isArray(source.plans) ? source.plans : [],
    karnas: Array.isArray(source.karnas) ? source.karnas : [],
    dailyData: source.dailyData && typeof source.dailyData === "object" ? source.dailyData : {},
    resourceHistory: normalizeResourceHistory(source.resourceHistory, site),
  };
}

function applyPlannerDataToAppState(planner = {}) {
  const normalized = normalizePlannerData(planner);
  appState.workers = normalized.workers;
  appState.lifts = normalized.lifts;
  appState.moments = normalized.moments;
  appState.plans = normalized.plans;
  appState.karnas = normalized.karnas;
  appState.dailyData = normalized.dailyData;
  appState.resourceHistory = normalized.resourceHistory;
}

function createWarehouseSlots() {
  return Array.from({ length: WAREHOUSE_SLOTS_PER_ROW }, () => ({
    itemId: "",
    quantity: 1,
  }));
}

function createWarehouseIssueDraft() {
  return {
    worker: "",
    comment: "",
    slots: createWarehouseSlots(),
  };
}

function getDefaultWarehouseCatalog() {
  return [
    { id: "itm_meter", name: "Metar", unit: "kom", minimum: 2, notifyPerson: "" },
    { id: "itm_olovka", name: "Olovka", unit: "kom", minimum: 10, notifyPerson: "" },
    { id: "itm_raspa", name: "Raspa", unit: "kom", minimum: 2, notifyPerson: "" },
    { id: "itm_zaga", name: "Zaga", unit: "kom", minimum: 1, notifyPerson: "" },
    { id: "itm_pistolj", name: "Pistolj za silikon", unit: "kom", minimum: 1, notifyPerson: "" },
    { id: "itm_rukavice", name: "Rukavice", unit: "pari", minimum: 20, notifyPerson: "" },
  ];
}

function createWarehouseLogEntry(overrides = {}) {
  return {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: "adjustment",
    worker: "",
    itemId: "",
    itemName: "",
    quantity: 0,
    direction: "in",
    comment: "",
    performedBy: appState.currentUser || "Guest",
    balanceAfter: 0,
    ...overrides,
  };
}

function getDefaultWarehouseData() {
  const catalog = getDefaultWarehouseCatalog();
  const stock = {};
  catalog.forEach((item) => {
    stock[item.id] = {
      current: 0,
      totalIssued: 0,
      totalReceived: 0,
    };
  });
  return {
    catalog,
    stock,
    procurementUsers: [],
    issueDraft: createWarehouseIssueDraft(),
    stockForm: {
      itemId: catalog[0]?.id || "",
      quantity: 1,
      direction: "in",
      comment: "",
    },
    logs: [],
  };
}

function normalizeWarehouseData(rawWarehouse) {
  const base = getDefaultWarehouseData();
  const raw = rawWarehouse && typeof rawWarehouse === "object" ? rawWarehouse : {};
  const catalog = Array.isArray(raw.catalog) && raw.catalog.length
    ? raw.catalog
        .map((item, index) => ({
          id: item?.id || `itm_${Date.now()}_${index}`,
          name: (item?.name || "").toString().trim(),
          unit: (item?.unit || "kom").toString().trim() || "kom",
          minimum: Math.max(Number(item?.minimum) || 0, 0),
          notifyPerson: (item?.notifyPerson || "").toString().trim(),
        }))
        .filter((item) => item.name)
    : base.catalog;

  const stock = {};
  catalog.forEach((item) => {
    const existing = raw.stock && raw.stock[item.id] ? raw.stock[item.id] : {};
    stock[item.id] = {
      current: Number(existing.current) || 0,
      totalIssued: Number(existing.totalIssued) || 0,
      totalReceived: Number(existing.totalReceived) || 0,
    };
  });

  const draftSlots = Array.isArray(raw.issueDraft?.slots) ? raw.issueDraft.slots : [];
  const normalizedSlots = createWarehouseSlots().map((slot, index) => {
    const source = draftSlots[index] || {};
    return {
      itemId: source.itemId || "",
      quantity: Math.max(Number(source.quantity) || 1, 1),
    };
  });

  const stockFormItemId =
    raw.stockForm?.itemId && stock[raw.stockForm.itemId] ? raw.stockForm.itemId : catalog[0]?.id || "";

  return {
    catalog,
    stock,
    procurementUsers: Array.isArray(raw.procurementUsers)
      ? raw.procurementUsers.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
      : [],
    issueDraft: {
      worker: (raw.issueDraft?.worker || "").toString(),
      comment: (raw.issueDraft?.comment || "").toString(),
      slots: normalizedSlots,
    },
    stockForm: {
      itemId: stockFormItemId,
      quantity: Math.max(Number(raw.stockForm?.quantity) || 1, 1),
      direction: raw.stockForm?.direction === "out" ? "out" : "in",
      comment: (raw.stockForm?.comment || "").toString(),
    },
    logs: Array.isArray(raw.logs)
      ? raw.logs.map((entry) => createWarehouseLogEntry(entry))
      : [],
  };
}

function initializeSiteStorage(siteName) {
  const plannerKey = getSiteStorageKey("cmax_planner_data", siteName);
  const binsKey = getSiteStorageKey("cmax_planner_bins", siteName);
  const tidplanKey = getSiteStorageKey("tidplan", siteName);
  const tidplanZonesKey = getSiteStorageKey("tidplan_zones", siteName);
  const warehouseKey = getSiteStorageKey("cmax_warehouse_data", siteName);
  const storeKey = getSiteStorageKey("cmax_workwear_data", siteName);
  const reportsKey = getSiteStorageKey("cmax_planner_reports", siteName);
  const notificationsKey = getSiteStorageKey("cmax_planner_notifications", siteName);

  localStorage.setItem(
    plannerKey,
    JSON.stringify(createEmptyPlannerData()),
  );
  localStorage.setItem(binsKey, JSON.stringify({}));
  localStorage.setItem(tidplanKey, JSON.stringify([]));
  localStorage.setItem(
    tidplanZonesKey,
    JSON.stringify(DEFAULT_SITE_TEMPLATE.tidplanZones.map((zone) => ({ ...zone }))),
  );
  localStorage.setItem(warehouseKey, JSON.stringify(getDefaultWarehouseData()));
  localStorage.setItem(storeKey, JSON.stringify({}));
  localStorage.setItem(reportsKey, JSON.stringify([]));
  localStorage.setItem(notificationsKey, JSON.stringify([]));
}

function normalizePermissions(permissions) {
  return { ...DEFAULT_PERMISSIONS, ...(permissions || {}) };
}

function normalizeAdminRecord(admin) {
  const firstName = (admin?.firstName || "").trim();
  const lastName = (admin?.lastName || "").trim();
  const fullName =
    (
      admin?.fullName ||
      admin?.name ||
      `${firstName} ${lastName}` ||
      (admin?.email === SUPER_ADMIN_EMAIL ? "Super Admin" : "")
    ).trim();

  const inferredLevel = getAdminLevel(admin);
  const normalizedPerms = admin?.isSuperAdmin
    ? { ...DEFAULT_PERMISSIONS }
    : clampPermissionsToLevel(admin?.permissions || {}, inferredLevel);

  return {
    ...admin,
    firstName,
    lastName,
    fullName,
    level: inferredLevel,
    active: admin?.active !== false,
    storeRoles: Array.isArray(admin?.storeRoles)
      ? admin.storeRoles.map((role) => String(role || "").trim().toLowerCase()).filter(Boolean)
      : [],
    allowedSites: Array.isArray(admin?.allowedSites) ? admin.allowedSites : null,
    permissions: normalizedPerms,
  };
}

function getCurrentReporterName() {
  const cachedName = (appState.currentUserName || "").trim();
  if (cachedName) return cachedName;

  const currentEmail = (appState.currentUser || "").trim().toLowerCase();
  if (!currentEmail || currentEmail === "readonly") return "";

  const authData = safeParseStoredJson(localStorage.getItem(AUTH_KEY), {});
  const authFullName = (authData?.fullName || authData?.name || "").trim();
  if (authFullName) {
    appState.currentUserName = authFullName;
    return authFullName;
  }

  const matchedAdmin = getAdmins().find(
    (admin) => (admin.email || "").trim().toLowerCase() === currentEmail,
  );
  const resolvedName = (matchedAdmin?.fullName || "").trim();
  if (resolvedName) {
    appState.currentUserName = resolvedName;
    const nextAuthData = { ...(authData || {}), fullName: resolvedName };
    localStorage.setItem(AUTH_KEY, JSON.stringify(nextAuthData));
    return resolvedName;
  }

  const localPart = currentEmail.split("@")[0] || "";
  const fallbackName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .trim();

  if (fallbackName) {
    appState.currentUserName = fallbackName;
    const nextAuthData = { ...(authData || {}), fullName: fallbackName };
    localStorage.setItem(AUTH_KEY, JSON.stringify(nextAuthData));
    return fallbackName;
  }

  return "";
}

function getGuestPermissions() {
  const raw = localStorage.getItem(GUEST_PERMISSIONS_KEY);
  return normalizeGuestPermissions(safeParseStoredJson(raw, {}));
}

function normalizeGuestPermissions(permissions) {
  const next = { ...DEFAULT_GUEST_PERMISSIONS, ...(permissions || {}) };
  next.warehouseAccessBySite =
    permissions?.warehouseAccessBySite && typeof permissions.warehouseAccessBySite === "object"
      ? { ...permissions.warehouseAccessBySite }
      : {};
  return next;
}

function saveGuestPermissions(permissions) {
  const normalized = normalizeGuestPermissions(permissions);
  localStorage.setItem(GUEST_PERMISSIONS_KEY, JSON.stringify(normalized));
  appState.guestPermissions = normalized;
  scheduleModuleSync("adminUsers", 600, { guestPermissions: normalized });
}

function getPermissionLabel(key) {
  return t(`perm_${key}`);
}

function getGuestWarehouseSiteAccess(site = currentSite) {
  const map = appState.guestPermissions?.warehouseAccessBySite;
  const rawEntry = map && typeof map === "object" ? map[site] : null;
  return {
    allowedItemIds: Array.isArray(rawEntry?.allowedItemIds)
      ? rawEntry.allowedItemIds.filter(Boolean)
      : [],
  };
}

function setGuestWarehouseSiteAccess(permissions, site, access = {}) {
  const next = normalizeGuestPermissions(permissions);
  next.warehouseAccessBySite = {
    ...(next.warehouseAccessBySite || {}),
    [site]: {
      allowedItemIds: Array.isArray(access.allowedItemIds) ? access.allowedItemIds.filter(Boolean) : [],
    },
  };
  return next;
}

function renderPermissionEditor(containerId, prefix, permissionSource, sections) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  sections.forEach((section) => {
    const sectionEl = document.createElement("div");
    sectionEl.className = "permission-section";

    const header = document.createElement("div");
    header.className = "permission-section-header";
    header.innerHTML = `<div class="permission-section-title">${t(section.titleKey)}</div>${section.noteKey ? `<div class="permission-section-note">${t(section.noteKey)}</div>` : ""}`;
    sectionEl.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "permission-section-grid";

    section.keys.forEach((key) => {
      const label = document.createElement("label");
      label.className = "perm-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `${prefix}${key}`;
      checkbox.checked = permissionSource[key] !== false;
      const span = document.createElement("span");
      span.textContent = getPermissionLabel(key);
      label.appendChild(checkbox);
      label.appendChild(span);
      grid.appendChild(label);
    });

    sectionEl.appendChild(grid);
    container.appendChild(sectionEl);
  });
}

function readPermissionEditor(prefix, keys, defaults) {
  const permissions = { ...defaults };
  keys.forEach((key) => {
    const checkbox = document.getElementById(`${prefix}${key}`);
    permissions[key] = checkbox ? checkbox.checked : defaults[key] !== false;
  });
  return permissions;
}

