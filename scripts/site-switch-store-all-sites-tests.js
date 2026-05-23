const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const PORT = Number(process.env.SITE_SWITCH_STORE_TEST_PORT || 3299);
const HOST = `http://127.0.0.1:${PORT}`;
const ADMIN = { email: "site-switch-admin@cmax.test", password: "SiteSwitch!123" };
const WORKER = { email: "site-switch-worker@cmax.test", password: "SiteSwitch!123" };
const SITE_A = "Site A";
const SITE_B = "Site B";
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function envelope(data, version = 1) { return { version, updatedAt: new Date().toISOString(), data }; }
function parseCookie(setCookieHeader) {
  const value = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(value || "").split(";")[0];
}
function assert(condition, message) { if (!condition) throw new Error(message); }

function fixture() {
  const productAll = {
    id: "all-sites-product",
    name: "All Sites Jacket",
    active: true,
    availableForAllSites: true,
    availableSites: [SITE_A],
    visibleToRoles: [],
    sizes: ["M"],
    price: 500,
    creditCost: 500,
    usesBudget: false,
    variants: [],
  };
  const productRestricted = {
    id: "site-a-only-product",
    name: "Site A Only Boots",
    active: true,
    availableForAllSites: false,
    availableSites: [SITE_A],
    visibleToRoles: [],
    sizes: ["42"],
    price: 100,
    creditCost: 100,
    usesBudget: false,
    variants: [],
  };
  const store = {
    settings: { approvalRequiredDefault: true },
    products: [productAll, productRestricted],
    orders: [],
    carts: {},
    workerProfiles: {},
    creditLedger: [],
    auditLog: [],
  };
  return {
    version: 2,
    sites: [SITE_A, SITE_B],
    currentSite: SITE_A,
    moduleVersions: { planner: { [SITE_A]: 1, [SITE_B]: 1 }, tidplan: { [SITE_A]: 1, [SITE_B]: 1 }, warehouse: { [SITE_A]: 1, [SITE_B]: 1 }, storeCatalog: { [SITE_A]: 1, [SITE_B]: 1 }, adminUsers: 1 },
    accountNotifications: {},
    siteData: {
      [SITE_A]: { planner: { workers: [], lifts: [], moments: [], plans: [], karnas: [], dailyData: {}, resourceHistory: [] }, tidplan: [], tidplanZones: [], warehouse: { catalog: [], stock: {}, logs: [] }, store: JSON.parse(JSON.stringify(store)), notifications: [], surveys: [], reports: [], bins: {} },
      [SITE_B]: { planner: { workers: [], lifts: [], moments: [], plans: [], karnas: [], dailyData: {}, resourceHistory: [] }, tidplan: [], tidplanZones: [], warehouse: { catalog: [], stock: {}, logs: [] }, store: { settings: { approvalRequiredDefault: true }, products: [], orders: [], carts: {}, workerProfiles: {}, creditLedger: [], auditLog: [] }, notifications: [], surveys: [], reports: [], bins: {} },
    },
  };
}

async function waitHealth() {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    try {
      const res = await fetch(`${HOST}/api/health`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.ok && payload.storageReady) return;
    } catch (_) {}
    await delay(250);
  }
  throw new Error("Server did not become healthy");
}

async function loginApi(user) {
  const res = await fetch(`${HOST}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${JSON.stringify(payload)}`);
  return { cookie: parseCookie(typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : res.headers.get("set-cookie")), csrf: payload.csrfToken };
}

async function api(session, pathname, options = {}) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers || {});
  headers.set("Cookie", session.cookie);
  if (options.json !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) headers.set("x-csrf-token", session.csrf);
  const res = await fetch(`${HOST}${pathname}`, { method, headers, body: options.json !== undefined ? JSON.stringify(options.json) : options.body });
  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch (_) { payload = { raw: text }; }
  return { ok: res.ok, status: res.status, payload };
}

async function loginPage(page, user) {
  await page.goto(`${HOST}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.CMAX?.core?.login);
  await page.fill("#loginEmail", user.email);
  await page.fill("#loginPassword", user.password);
  await page.evaluate(() => window.CMAX.core.login());
  await page.waitForFunction((email) => window.appState?.currentUser === email, user.email);
  await page.waitForFunction(() => window.freshServerDataLoaded === true || document.getElementById("mainContainer")?.style.display !== "none").catch(() => {});
}

async function assertCurrentSite(page, expected, label) {
  const actual = await page.evaluate(() => ({ currentSite, stored: getStoredCurrentSitePreference(), legacy: localStorage.getItem(CURRENT_SITE_KEY), view: currentView }));
  assert(actual.currentSite === expected, `${label}: currentSite changed to ${JSON.stringify(actual)}`);
  assert(actual.stored === expected, `${label}: stored site preference changed to ${JSON.stringify(actual)}`);
}

async function runBrowserSitePersistence() {
  const browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginPage(page, ADMIN);
    await page.evaluate((site) => switchSiteFromLocal(site, { syncSites: false }), SITE_B);
    await assertCurrentSite(page, SITE_B, "after switch to Site B");

    const flows = [
      ["planner", () => { currentView = "main"; renderAll(); }],
      ["store", () => { currentView = "workwear"; updateShellForView(currentView); }],
      ["warehouse", () => CMAX.warehouse.show()],
      ["tidplan", () => CMAX.tidplan.show()],
    ];
    for (const [name, fn] of flows) {
      await page.evaluate(fn);
      await page.waitForTimeout(150);
      await assertCurrentSite(page, SITE_B, `module ${name}`);
    }
    const storeVisibility = await page.evaluate((siteB) => {
      switchSiteFromLocal(siteB, { syncSites: false });
      const products = getVisibleStoreProducts(siteB).map((product) => product.id);
      return {
        products,
        hasAllSites: products.includes("all-sites-product"),
        hasRestricted: products.includes("site-a-only-product"),
      };
    }, SITE_B);
    assert(storeVisibility.hasAllSites, `All-sites product missing from Site B frontend catalog: ${JSON.stringify(storeVisibility)}`);
    assert(!storeVisibility.hasRestricted, `Restricted Site A product leaked to Site B frontend catalog: ${JSON.stringify(storeVisibility)}`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.appState?.currentUser === "site-switch-admin@cmax.test" && window.freshServerDataLoaded === true);
    await assertCurrentSite(page, SITE_B, "after refresh");

    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.removeItem(AUTH_KEY);
      if (window.appState) window.appState.currentUser = null;
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await loginPage(page, ADMIN);
    await assertCurrentSite(page, SITE_B, "after logout/login");
    await context.close();
  } finally {
    await browser.close();
  }
}

async function runStoreAllSitesApi() {
  const worker = await loginApi(WORKER);
  let res = await api(worker, "/api/store/orders", {
    method: "POST",
    json: { site: SITE_B, order: { workerComment: "all sites order", items: [{ productId: "all-sites-product", size: "M", quantity: 1 }] } },
  });
  assert(res.status === 201, `All-sites product should order on Site B, got ${res.status} ${JSON.stringify(res.payload)}`);
  res = await api(worker, "/api/store/orders", {
    method: "POST",
    json: { site: SITE_B, order: { workerComment: "blocked order", items: [{ productId: "site-a-only-product", size: "42", quantity: 1 }] } },
  });
  assert(res.status === 403 && res.payload.error === "STORE_PRODUCT_SITE_BLOCKED", `Restricted product should be blocked on Site B, got ${res.status} ${JSON.stringify(res.payload)}`);
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cmax-site-switch-store-"));
  const dataDir = path.join(tmp, "data");
  const uploadDir = path.join(tmp, "uploads");
  const backupDir = path.join(tmp, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Site Switch Admin", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null, storeRoles: ["superadmin"] },
    { email: WORKER.email, password: WORKER.password, fullName: "Site Switch Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessStore: true, canAccessWorkwear: true, canAccessPlanner: true, canAccessTidplan: true, canAccessWarehouse: true, canViewWarehouse: true }, allowedSites: [SITE_A, SITE_B], storeRoles: ["radnik"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope(fixture()), null, 2));

  const server = spawn(process.execPath, ["server/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test", STORAGE_TYPE: "json", DATA_PATH: dataDir, UPLOAD_PATH: uploadDir, BACKUP_PATH: backupDir, BOOTSTRAP_ADMIN_EMAIL: ADMIN.email, BOOTSTRAP_ADMIN_PASSWORD: ADMIN.password, LOGIN_RATE_LIMIT_MAX: "100" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitHealth();
    await runBrowserSitePersistence();
    await runStoreAllSitesApi();
    console.log(JSON.stringify({ ok: true, checks: [
      "site_b_persists_across_planner_store_warehouse_tidplan",
      "site_b_persists_after_refresh",
      "site_b_persists_after_logout_login",
      "store_all_sites_product_visible_on_site_b_frontend",
      "store_restricted_product_hidden_on_site_b_frontend",
      "store_availableForAllSites_orders_on_site_b",
      "store_restricted_site_a_product_blocked_on_site_b",
    ] }, null, 2));
  } finally {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(4000)]);
    if (!server.killed) server.kill("SIGKILL");
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
