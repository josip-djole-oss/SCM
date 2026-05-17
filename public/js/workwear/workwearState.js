var WORKWEAR_STORAGE_PREFIX = "cmax_workwear_data";
var workwearStateCacheBySite = {};
var STORE_CATEGORIES = {
  "Odjeća": ["Majice", "Dukse", "Jakne", "Hlače", "Prsluci"],
  "Obuća": ["Zaštitne cipele", "Čizme", "Ulošci/dodaci"],
  "PPE / Zaštitna oprema": ["Kacige", "Rukavice", "Naočale", "Zaštita sluha", "Maske"],
  Alati: ["Skalpel", "Metar", "Marker", "Baterije", "Sitni alat"],
  Ostalo: ["Torbe", "Dodaci", "Ostalo"],
};
var STORE_CATEGORY_CATALOG_VERSION = 1;
var STORE_ROLE_OPTIONS = [
  { key: "radnik", label: "Radnik", aliases: ["worker"] },
  { key: "grupovodja", label: "Grupovodja", aliases: ["foreman"] },
  { key: "poslovodja", label: "Poslovodja", aliases: ["supervisor"] },
  { key: "projektledare", label: "Projektledare", aliases: ["project_manager"] },
  { key: "kontor", label: "Kontor", aliases: ["office"] },
  { key: "store_manager", label: "Store Manager", aliases: [] },
  { key: "admin", label: "Admin", aliases: [] },
  { key: "superadmin", label: "Superadmin", aliases: [] },
];
var STORE_ROLE_LABEL_BY_KEY = STORE_ROLE_OPTIONS.reduce((acc, role) => {
  acc[role.key] = role.label;
  return acc;
}, {});
var STORE_ROLE_NORMALIZE_MAP = STORE_ROLE_OPTIONS.reduce((acc, role) => {
  acc[role.key] = role.key;
  role.aliases.forEach((alias) => {
    acc[alias] = role.key;
  });
  return acc;
}, {});
var STORE_USER_MANAGER_PASSWORD_MIN = 8;
var STORE_PASSWORD_RESET_MIN_PASSWORD = 10;
var WORKWEAR_ACCOUNT_NOTIFICATION_TRACKER_PREFIX = "cmax_workwear_account_notification_tracker_";

function getWorkwearStorageKey(site = currentSite) {
  return getSiteStorageKey(WORKWEAR_STORAGE_PREFIX, site);
}

function workwearReadCachedJson(key, fallbackValue = null) {
  if (typeof getCachedStorageJson === "function") {
    return getCachedStorageJson(key, fallbackValue);
  }
  return safeParseStoredJson(localStorage.getItem(key), fallbackValue);
}

function workwearWriteCachedJson(key, value) {
  if (typeof setCachedStorageJson === "function") {
    return setCachedStorageJson(key, value);
  }
  localStorage.setItem(key, JSON.stringify(value));
  return true;
}

function getStoreRoleOptions() {
  return STORE_ROLE_OPTIONS.map((role) => ({ ...role }));
}

function getStoreRoleLabel(roleKey) {
  return STORE_ROLE_LABEL_BY_KEY[normalizeStoreRoleKey(roleKey)] || roleKey || "-";
}

function normalizeStoreRoleKey(roleKey) {
  const value = String(roleKey || "").trim().toLowerCase();
  return STORE_ROLE_NORMALIZE_MAP[value] || "";
}

function normalizeStoreRoleList(list) {
  const source = Array.isArray(list) ? list : [];
  const keys = source
    .map((value) => normalizeStoreRoleKey(value))
    .filter(Boolean);
  return Array.from(new Set(keys));
}

function normalizeStoreSiteList(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const values = list.map((site) => String(site || "").trim()).filter(Boolean);
  if (!values.length) return null;
  const unique = Array.from(new Set(values));
  if (unique.includes("*")) return null;
  const knownSites = Array.isArray(sites) ? sites : [];
  const valid = unique.filter((site) => knownSites.includes(site));
  if (!valid.length) return null;
  if (valid.length === knownSites.length) return null;
  return valid;
}

function listStoreUsers() {
  if (typeof getAdmins !== "function") return [];
  return getAdmins()
    .map((admin) => {
      const email = String(admin?.email || "").trim().toLowerCase();
      if (!email) return null;
      return {
        ...admin,
        email,
        fullName: String(admin?.fullName || "").trim(),
        allowedSites: Array.isArray(admin?.allowedSites) ? admin.allowedSites.slice() : null,
        storeRoles: normalizeStoreRoleList(admin?.storeRoles),
        active: admin?.active !== false,
      };
    })
    .filter(Boolean)
    .sort((a, b) => compareNaturally(a.fullName || a.email, b.fullName || b.email));
}

function getStoreUserByEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return null;
  return listStoreUsers().find((user) => user.email === key) || null;
}

function getStoreAssignableUsers(options = {}) {
  const { onlyActive = true } = options;
  return listStoreUsers().filter((user) => (onlyActive ? user.active !== false : true));
}

function canStoreUserAccessCurrentSite(user) {
  if (!user || user.active === false) return false;
  if (!Array.isArray(user.allowedSites) || !user.allowedSites.length) return true;
  return user.allowedSites.includes(currentSite);
}

function createDefaultWorkwearState() {
  const now = new Date();
  const renewalDate = new Date(now.getTime());
  renewalDate.setMonth(renewalDate.getMonth() + 6);
  return {
    settings: {
      budgetMode: "global",
      budgetEnabled: true,
      autoApproveOrders: false,
      reserveOnPending: true,
      creditRenewalAmount: 2500,
      creditRenewalPeriodMonths: 6,
      defaultCurrency: "SEK",
      freeRulesEnabled: true,
      upgradeRulesEnabled: true,
      freeRulesByCategory: {},
      budgetRulesByCategory: {},
      freeRules: {
        enabled: false,
        mode: "none",
        periodDays: 180,
      },
      categoryCatalog: {},
      categoryCatalogVersion: STORE_CATEGORY_CATALOG_VERSION,
    },
    products: [],
    orders: [],
    carts: {},
    workerProfiles: {},
    creditLedger: [],
    supplierConnections: [
      {
        id: "manual",
        name: "Manual Supplier",
        adapter: "manualSupplierAdapter",
        active: true,
      },
    ],
    supplierSyncLog: [],
    notificationEvents: [],
    passwordResetRequests: [],
    auditLog: [],
    version: 1,
    meta: {
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      renewalDateDefault: renewalDate.toISOString(),
    },
  };
}

function normalizeWorkwearState(raw) {
  const base = createDefaultWorkwearState();
  const next = {
    ...base,
    ...(raw || {}),
  };
  next.settings = {
    ...base.settings,
    ...(raw?.settings || {}),
    freeRules: {
      ...base.settings.freeRules,
      ...(raw?.settings?.freeRules || {}),
    },
  };
  next.settings.categoryCatalog = normalizeStoreCategoryCatalog(next.settings.categoryCatalog);
  next.settings.categoryCatalogVersion = STORE_CATEGORY_CATALOG_VERSION;
  next.products = Array.isArray(raw?.products) ? raw.products : [];
  next.orders = Array.isArray(raw?.orders) ? raw.orders : [];
  next.carts = raw?.carts && typeof raw.carts === "object" ? raw.carts : {};
  next.workerProfiles = raw?.workerProfiles && typeof raw.workerProfiles === "object" ? raw.workerProfiles : {};
  next.creditLedger = Array.isArray(raw?.creditLedger) ? raw.creditLedger : [];
  next.supplierConnections = Array.isArray(raw?.supplierConnections) ? raw.supplierConnections : base.supplierConnections;
  next.supplierSyncLog = Array.isArray(raw?.supplierSyncLog) ? raw.supplierSyncLog : [];
  next.notificationEvents = Array.isArray(raw?.notificationEvents) ? raw.notificationEvents : [];
  next.passwordResetRequests = Array.isArray(raw?.passwordResetRequests) ? raw.passwordResetRequests : [];
  next.auditLog = Array.isArray(raw?.auditLog) ? raw.auditLog : [];
  next.version = Math.max(1, Number(raw?.version || base.version || 1));
  next.meta = {
    ...base.meta,
    ...(raw?.meta || {}),
    updatedAt: new Date().toISOString(),
  };
  next.products = next.products.map((product) => normalizeStoreProduct(product));
  return next;
}

function buildDefaultStoreCategoryCatalog() {
  const catalog = {};
  Object.keys(STORE_CATEGORIES).forEach((category) => {
    catalog[category] = {
      active: true,
      subcategories: (STORE_CATEGORIES[category] || []).reduce((acc, subcategory) => {
        acc[subcategory] = { active: true };
        return acc;
      }, {}),
    };
  });
  return catalog;
}

function normalizeStoreCategoryCatalog(rawCatalog) {
  const base = buildDefaultStoreCategoryCatalog();
  const incoming = rawCatalog && typeof rawCatalog === "object" ? rawCatalog : {};
  const next = { ...base };
  Object.keys(incoming).forEach((category) => {
    const entry = incoming[category];
    if (!entry || typeof entry !== "object") return;
    const key = String(category || "").trim();
    if (!key) return;
    const existing = next[key] || { active: true, subcategories: {} };
    const incomingSub = entry.subcategories && typeof entry.subcategories === "object" ? entry.subcategories : {};
    const mergedSub = { ...(existing.subcategories || {}) };
    Object.keys(incomingSub).forEach((sub) => {
      const subKey = String(sub || "").trim();
      if (!subKey) return;
      const subEntry = incomingSub[sub];
      if (subEntry && typeof subEntry === "object") {
        mergedSub[subKey] = { active: subEntry.active !== false };
      } else if (subEntry === false) {
        mergedSub[subKey] = { active: false };
      } else {
        mergedSub[subKey] = { active: true };
      }
    });
    next[key] = {
      active: entry.active !== false,
      subcategories: mergedSub,
    };
  });
  return next;
}

function getStoreCategoryCatalogState() {
  const state = getWorkwearState();
  const next = normalizeStoreCategoryCatalog(state.settings?.categoryCatalog || {});
  state.settings = state.settings || {};
  state.settings.categoryCatalog = next;
  state.settings.categoryCatalogVersion = STORE_CATEGORY_CATALOG_VERSION;
  return next;
}

function loadWorkwearState(site = currentSite) {
  const key = getWorkwearStorageKey(site);
  const raw = workwearReadCachedJson(key, null);
  const normalized = normalizeWorkwearState(raw);
  workwearStateCacheBySite[site] = normalized;
  if (site === currentSite) {
    ensureWorkwearCreditRenewal();
  }
  return normalized;
}

function getWorkwearState(site = currentSite) {
  if (!workwearStateCacheBySite[site]) {
    return loadWorkwearState(site);
  }
  return workwearStateCacheBySite[site];
}

function saveWorkwearState(site = currentSite, options = {}) {
  const state = getWorkwearState(site);
  state.meta = {
    ...(state.meta || {}),
    updatedAt: new Date().toISOString(),
  };
  state.version = Math.max(1, Number(state.version || 1)) + 1;
  workwearWriteCachedJson(getWorkwearStorageKey(site), state);
  if (site === currentSite) {
    workwearStateCacheBySite[site] = state;
  }
  if (options.track !== false && typeof trackEditActivity === "function") {
    trackEditActivity();
  }
  return state;
}

function pushWorkwearAudit(eventType, payload = {}) {
  const state = getWorkwearState();
  state.auditLog.push({
    id: `ww_audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    site: currentSite,
    timestamp: new Date().toISOString(),
    actor: appState.currentUser || "system",
    actorName: appState.currentUserName || appState.currentUser || "System",
    eventType,
    ...payload,
  });
  if (state.auditLog.length > 2000) {
    state.auditLog = state.auditLog.slice(-2000);
  }
}

function getWorkwearAccountNotificationTrackerKey() {
  const userKey = String(appState.currentUser || "guest").trim().toLowerCase();
  return `${WORKWEAR_ACCOUNT_NOTIFICATION_TRACKER_PREFIX}${userKey}`;
}

function pushWorkwearAccountEvent(eventType, payload = {}) {
  const state = getWorkwearState();
  state.notificationEvents = Array.isArray(state.notificationEvents) ? state.notificationEvents : [];
  const event = {
    id: payload.id || `ww_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    eventType: String(eventType || "store_event").trim(),
    site: String(payload.site || currentSite).trim() || currentSite,
    actor: String(payload.actor || appState.currentUser || "system").trim().toLowerCase(),
    actorName: String(payload.actorName || appState.currentUserName || appState.currentUser || "System").trim(),
    targetUsers: Array.isArray(payload.targetUsers)
      ? payload.targetUsers.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
      : [],
    targetRoles: normalizeStoreRoleList(payload.targetRoles || []),
    title: String(payload.title || "").trim(),
    description: String(payload.description || "").trim(),
    targetView: String(payload.targetView || "workwear").trim(),
    targetId: String(payload.targetId || "").trim(),
    createdAt: payload.createdAt || new Date().toISOString(),
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
  };
  state.notificationEvents.push(event);
  if (state.notificationEvents.length > 1500) {
    state.notificationEvents = state.notificationEvents.slice(-1500);
  }
  pushWorkwearAudit("notification_sent", {
    entityType: "notification",
    entityId: event.id,
    metadata: {
      eventType: event.eventType,
      title: event.title,
      targetRoles: event.targetRoles,
      targetUsers: event.targetUsers,
    },
  });
  return event;
}

function workwearCanReceiveAccountEvent(event, email, roleKeys) {
  if (!event) return false;
  const targetsByUser = Array.isArray(event.targetUsers) ? event.targetUsers : [];
  const targetsByRole = Array.isArray(event.targetRoles) ? event.targetRoles : [];
  if (!targetsByUser.length && !targetsByRole.length) return true;
  if (targetsByUser.includes(email)) return true;
  return roleKeys.some((role) => targetsByRole.includes(role));
}

function syncWorkwearAccountNotifications() {
  if (!appState.currentUser || typeof pushAccountNotification !== "function") return;
  const tracker = workwearReadCachedJson(getWorkwearAccountNotificationTrackerKey(), {}) || {};
  const accessibleSites = typeof getAccessibleSites === "function"
    ? getAccessibleSites()
    : [currentSite];
  const currentEmail = String(appState.currentUser || "").trim().toLowerCase();
  const roleKeys = getCurrentStoreRoleKeys();
  accessibleSites.forEach((site) => {
    const siteKey = String(site || "default");
    const seenIds = new Set(Array.isArray(tracker[siteKey]) ? tracker[siteKey].map((id) => String(id || "")) : []);
    const siteState = getWorkwearState(site);
    (siteState.notificationEvents || []).forEach((event) => {
      const eventId = String(event?.id || "").trim();
      if (!eventId || seenIds.has(eventId)) return;
      if (!workwearCanReceiveAccountEvent({ ...event, site }, currentEmail, roleKeys)) return;
      pushAccountNotification({
        uniqueKey: `store-event:${eventId}:${currentEmail}`,
        type: "store",
        title: event.title || "Store obavijest",
        description: event.description || "",
        site: event.site || site,
        targetId: event.targetId || "",
        targetView: event.targetView || "workwear",
        createdAt: event.createdAt || new Date().toISOString(),
      });
      seenIds.add(eventId);
    });
    tracker[siteKey] = Array.from(seenIds).slice(-1200);
  });
  workwearWriteCachedJson(getWorkwearAccountNotificationTrackerKey(), tracker);
}

function ensureWorkerWorkwearProfile(workerEmail) {
  const email = String(workerEmail || appState.currentUser || "guest").trim().toLowerCase();
  const state = getWorkwearState();
  if (!state.workerProfiles[email]) {
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + Number(state.settings.creditRenewalPeriodMonths || 6));
    state.workerProfiles[email] = {
      workerId: email,
      workerName: getUserDisplayName(email, appState.currentUserName || email),
      creditBalance: Number(state.settings.creditRenewalAmount) || 2500,
      reservedCredit: 0,
      renewalDate: renewalDate.toISOString(),
      renewalPeriodMonths: Number(state.settings.creditRenewalPeriodMonths) || 6,
      orderHistory: [],
      savedSizes: {},
      freeEligibility: {},
      adjustments: [],
    };
    saveWorkwearState(currentSite, { track: false });
  }
  return state.workerProfiles[email];
}

function ensureWorkwearCreditRenewal() {
  const state = getWorkwearState();
  const now = new Date();
  Object.keys(state.workerProfiles || {}).forEach((email) => {
    const profile = state.workerProfiles[email];
    if (!profile) return;
    const renewalDate = new Date(profile.renewalDate || now.toISOString());
    if (Number.isNaN(renewalDate.getTime())) return;
    if (renewalDate <= now) {
      const amount = Number(state.settings.creditRenewalAmount) || 2500;
      profile.creditBalance = Number(profile.creditBalance || 0) + amount;
      const nextRenewal = new Date(now.getTime());
      nextRenewal.setMonth(nextRenewal.getMonth() + Number(profile.renewalPeriodMonths || state.settings.creditRenewalPeriodMonths || 6));
      profile.renewalDate = nextRenewal.toISOString();
      state.creditLedger.push({
        id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        workerId: email,
        delta: amount,
        reason: "credit_renewal",
        date: now.toISOString(),
        changedBy: "system",
      });
    }
  });
  saveWorkwearState(currentSite, { track: false });
}

function getCurrentWorkerWorkwearProfile() {
  return ensureWorkerWorkwearProfile(appState.currentUser || "guest");
}

function getWorkwearCartForCurrentUser() {
  const state = getWorkwearState();
  const email = String(appState.currentUser || "guest").trim().toLowerCase();
  if (!state.carts[email]) {
    state.carts[email] = {
      items: [],
      comment: "",
      urgent: false,
      updatedAt: new Date().toISOString(),
    };
  }
  return state.carts[email];
}

function resetWorkwearCartForUser(email = appState.currentUser) {
  const key = String(email || "guest").trim().toLowerCase();
  const state = getWorkwearState();
  state.carts[key] = {
    items: [],
    comment: "",
    urgent: false,
    updatedAt: new Date().toISOString(),
  };
  saveWorkwearState();
}

function getWorkwearProductById(productId) {
  return getWorkwearState().products.find((product) => product.id === productId) || null;
}

function getStoreCategoryOptions(includeInactive = false) {
  const catalog = getStoreCategoryCatalogState();
  return Object.keys(catalog)
    .filter((category) => (includeInactive ? true : catalog[category].active !== false))
    .sort((a, b) => compareNaturally(a, b));
}

function getStoreSubcategoryOptions(category, includeInactive = false) {
  const key = String(category || "").trim();
  if (!key) return [];
  const catalog = getStoreCategoryCatalogState();
  const entry = catalog[key];
  if (!entry || !entry.subcategories || typeof entry.subcategories !== "object") return [];
  return Object.keys(entry.subcategories)
    .filter((subcategory) => (includeInactive ? true : entry.subcategories[subcategory].active !== false))
    .sort((a, b) => compareNaturally(a, b));
}

function ensureStoreCategory(categoryName) {
  const key = String(categoryName || "").trim();
  if (!key) return "";
  const catalog = getStoreCategoryCatalogState();
  if (!catalog[key]) {
    catalog[key] = { active: true, subcategories: {} };
  } else {
    catalog[key].active = true;
    catalog[key].subcategories = catalog[key].subcategories && typeof catalog[key].subcategories === "object"
      ? catalog[key].subcategories
      : {};
  }
  return key;
}

function ensureStoreSubcategory(categoryName, subcategoryName) {
  const categoryKey = ensureStoreCategory(categoryName);
  const subKey = String(subcategoryName || "").trim();
  if (!categoryKey || !subKey) return "";
  const catalog = getStoreCategoryCatalogState();
  catalog[categoryKey].subcategories[subKey] = { active: true };
  return subKey;
}

function isStoreCategoryInUse(categoryName) {
  const key = String(categoryName || "").trim();
  if (!key) return false;
  const state = getWorkwearState();
  return (state.products || []).some((product) => String(product.category || "").trim() === key);
}

function isStoreSubcategoryInUse(categoryName, subcategoryName) {
  const categoryKey = String(categoryName || "").trim();
  const subKey = String(subcategoryName || "").trim();
  if (!categoryKey || !subKey) return false;
  const state = getWorkwearState();
  return (state.products || []).some((product) => (
    String(product.category || "").trim() === categoryKey &&
    String(product.subcategory || "").trim() === subKey
  ));
}

function getCurrentStoreRoleKeys() {
  const email = String(appState.currentUser || "").trim().toLowerCase();
  const matchedUser = getStoreUserByEmail(email);
  if (matchedUser && canStoreUserAccessCurrentSite(matchedUser)) {
    const fromUser = normalizeStoreRoleList(matchedUser.storeRoles);
    if (fromUser.length) return fromUser;
  }
  const fallback = [];
  if (appState.isSuperAdmin) fallback.push("superadmin");
  if (typeof canManageWorkwearModule === "function" && canManageWorkwearModule()) fallback.push("store_manager");
  if (canOpenAdminPanelAccess()) fallback.push("admin");
  if (typeof canViewStoreTeamOrders === "function" && canViewStoreTeamOrders()) fallback.push("grupovodja");
  fallback.push("radnik");
  return Array.from(new Set(fallback));
}

function getCurrentStoreRole() {
  const roles = getCurrentStoreRoleKeys();
  return roles[0] || "radnik";
}

function normalizeStoreProductVariant(rawVariant, index = 0) {
  const variant = rawVariant && typeof rawVariant === "object" ? { ...rawVariant } : {};
  const normalizeOptionalNumber = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;
    const num = Number(text);
    return Number.isFinite(num) ? num : null;
  };
  const id = String(variant.id || `var_${index + 1}`).trim();
  return {
    id: id || `var_${index + 1}`,
    name: String(variant.name || "").trim(),
    image: String(variant.image || variant.imageUrl || "").trim(),
    imageUrl: String(variant.imageUrl || variant.image || "").trim(),
    active: variant.active !== false,
    priceOverride: normalizeOptionalNumber(variant.priceOverride),
    creditCostOverride: normalizeOptionalNumber(variant.creditCostOverride),
    supplierProductId: String(variant.supplierProductId || "").trim(),
  };
}

function getStoreProductVariants(product) {
  const normalizedProduct = normalizeStoreProduct(product);
  return Array.isArray(normalizedProduct.variants) ? normalizedProduct.variants : [];
}

function getActiveStoreProductVariants(product) {
  return getStoreProductVariants(product).filter((variant) => variant.active !== false && variant.name);
}

function getStoreProductVariantById(product, variantId) {
  const key = String(variantId || "").trim();
  if (!key) return null;
  return getStoreProductVariants(product).find((variant) => String(variant.id || "").trim() === key) || null;
}

function normalizeStoreProduct(raw) {
  const product = raw && typeof raw === "object" ? { ...raw } : {};
  const now = new Date().toISOString();
  const category = product.category || getStoreCategoryOptions()[0];
  return {
    id: product.id || `STP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: String(product.name || "").trim(),
    description: String(product.description || "").trim(),
    category,
    subcategory: String(product.subcategory || "").trim(),
    images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
    imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls.filter(Boolean) : [],
    sizes: Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [],
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant, index) => normalizeStoreProductVariant(variant, index)).filter((variant) => variant.name)
      : [],
    active: product.active !== false,
    availableSites: Array.isArray(product.availableSites) && product.availableSites.length
      ? (product.availableSites.includes("*") ? ["*"] : product.availableSites.filter(Boolean))
      : ["*"],
    visibleToRoles: normalizeStoreRoleList(Array.isArray(product.visibleToRoles) ? product.visibleToRoles : []),
    visibleToUsers: Array.isArray(product.visibleToUsers) ? product.visibleToUsers.map((v) => String(v).toLowerCase()) : [],
    price: Number(product.price) || 0,
    creditCost: Number(product.creditCost ?? product.price) || 0,
    showPriceToWorker: product.showPriceToWorker !== false,
    usesBudget: product.usesBudget !== false,
    approvalRequired: product.approvalRequired === true,
    freeRule: product.freeRule && typeof product.freeRule === "object" ? product.freeRule : { enabled: false, mode: "none", periodDays: 180 },
    periodLimit: product.periodLimit && typeof product.periodLimit === "object" ? product.periodLimit : { enabled: false, quantity: 0, periodDays: 0 },
    upgradeRule: product.upgradeRule && typeof product.upgradeRule === "object"
      ? product.upgradeRule
      : {
          enabled: product.enableUpgradeDifference === true,
          companyCoveredAmount: Number(product.companyCoveredAmount) || 0,
          differenceAmount: Number(product.differenceAmount ?? product.differencePrice) || 0,
        },
    supplierFields: product.supplierFields && typeof product.supplierFields === "object"
      ? product.supplierFields
      : {
          supplierId: product.supplierId || "manual",
          supplierProductId: product.supplierProductId || "",
          supplierLink: product.supplierLink || "",
          supplierPrice: Number(product.supplierPrice ?? product.price) || 0,
          externalSync: product.externalSync === true,
          externalLastSync: product.externalLastSync || "",
          externalSyncStatus: product.externalSyncStatus || "manual",
        },
    badges: {
      isNew: product.isNew === true,
      urgentSafety: product.urgentSafety === true,
      requiresApproval: product.approvalRequired === true,
      free: product.freeEligible === true || product.freeRule?.enabled === true,
      budget: product.usesBudget !== false,
      upgrade: (product.enableUpgradeDifference === true) || (product.upgradeRule?.enabled === true),
    },
    createdAt: product.createdAt || now,
    updatedAt: product.updatedAt || now,
  };
}

function isStoreProductSiteAllowed(product, site = currentSite) {
  const availableSites = Array.isArray(product.availableSites) ? product.availableSites : ["*"];
  return availableSites.includes("*") || availableSites.includes(site);
}

function isStoreProductRoleAllowed(product) {
  const roleKeys = getCurrentStoreRoleKeys();
  const email = String(appState.currentUser || "").trim().toLowerCase();
  const visibleToRoles = normalizeStoreRoleList(Array.isArray(product.visibleToRoles) ? product.visibleToRoles : []);
  const visibleToUsers = Array.isArray(product.visibleToUsers) ? product.visibleToUsers : [];
  if (!visibleToRoles.length && !visibleToUsers.length) return true;
  if (visibleToUsers.includes(email)) return true;
  return roleKeys.some((role) => visibleToRoles.includes(role));
}

function getVisibleStoreProducts(site = currentSite) {
  return (getWorkwearState(site).products || [])
    .map((product) => normalizeStoreProduct(product))
    .filter((product) => product.active !== false)
    .filter((product) => isStoreProductSiteAllowed(product, site))
    .filter((product) => isStoreProductRoleAllowed(product));
}

function getVisibleStoreOrders(site = currentSite) {
  const state = getWorkwearState(site);
  const role = getCurrentStoreRole();
  const currentUser = String(appState.currentUser || "").trim().toLowerCase();
  const canManageAll = (typeof canManageWorkwearModule === "function" && canManageWorkwearModule()) || role === "admin" || role === "superadmin";
  const canSeeTeam = typeof canViewStoreTeamOrders === "function" && canViewStoreTeamOrders();
  return (state.orders || []).filter((order) => {
    if (canManageAll) return true;
    if (canSeeTeam) return order.site === site;
    return String(order.workerId || "").trim().toLowerCase() === currentUser;
  });
}

function computeWorkwearOrderTotals(items, workerId) {
  const state = getWorkwearState();
  const profile = ensureWorkerWorkwearProfile(workerId);
  const freeRules = state.settings.freeRules || { enabled: false };
  const freeRulesEnabled = state.settings?.freeRulesEnabled !== false && freeRules.enabled === true;
  const now = Date.now();

  let subtotal = 0;
  let freeAppliedCount = 0;
  let differenceTotal = 0;

  const normalizedItems = (items || []).map((item) => {
    const product = getWorkwearProductById(item.productId);
    if (!product) return null;
    const variant = getStoreProductVariantById(product, item.variantId);

    const qty = Math.max(1, Number(item.quantity) || 1);
    const variantCredit = Number(variant?.creditCostOverride);
    const variantPrice = Number(variant?.priceOverride);
    const productPrice = Number(product.price);
    const productCreditCost = Number(product.creditCost);
    const baseProductCost = Number.isFinite(productCreditCost) && productCreditCost > 0
      ? productCreditCost
      : Number.isFinite(productPrice) && productPrice >= 0
        ? productPrice
        : 0;
    let unitCost = Number.isFinite(variantCredit) && variantCredit > 0
      ? variantCredit
      : Number.isFinite(variantPrice) && variantPrice >= 0
        ? variantPrice
        : baseProductCost;
    if (!Number.isFinite(unitCost) || unitCost < 0) unitCost = 0;
    const canUpgrade = product.enableUpgradeDifference === true || product.upgradeRule?.enabled === true;
    if (canUpgrade && item.useUpgrade === true) {
      unitCost = Number(product.upgradeRule?.differenceAmount || product.differencePrice || 0);
      if (!Number.isFinite(unitCost) || unitCost < 0) unitCost = 0;
      differenceTotal += unitCost * qty;
    }

    let freeApplied = false;
    const productFreeEnabled = product.freeRule?.enabled === true || product.freeEligible === true;
    const freeMode = product.freeRule?.mode || freeRules.mode || "none";
    const freePeriodDays = Math.max(1, Number(product.freeRule?.periodDays || freeRules.periodDays || 180));
    if (freeRulesEnabled && productFreeEnabled && freeMode !== "none") {
      const key = freeMode === "firstCategory"
        ? `cat:${product.category || "general"}`
        : freeMode === "firstProduct"
          ? `product:${product.id}`
          : "order:first";
      const usedAt = profile.freeEligibility?.[key] ? new Date(profile.freeEligibility[key]).getTime() : 0;
      const periodMs = freePeriodDays * 24 * 60 * 60 * 1000;
      if (!usedAt || now - usedAt > periodMs) {
        freeApplied = true;
      }
    }

    const lineCost = freeApplied ? 0 : unitCost * qty;
    subtotal += lineCost;
    if (freeApplied) freeAppliedCount += 1;

    return {
      ...item,
      productName: product.name,
      variantId: item.variantId || variant?.id || "",
      variantName: item.variantName || variant?.name || "",
      variantImage: item.variantImage || variant?.image || variant?.imageUrl || "",
      unitCost,
      lineCost,
      freeApplied,
      differenceCost: canUpgrade && item.useUpgrade ? Number(product.upgradeRule?.differenceAmount || product.differencePrice || 0) * qty : 0,
    };
  }).filter(Boolean);

  return {
    items: normalizedItems,
    subtotal,
    freeAppliedCount,
    differenceTotal,
    availableCredit: Math.max(0, Number(profile.creditBalance || 0)),
    reservedCredit: Math.max(0, Number(profile.reservedCredit || 0)),
  };
}
