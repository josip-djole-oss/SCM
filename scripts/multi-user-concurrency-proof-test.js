const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `multi-user-concurrency-${Date.now()}`;
const tmpRoot = path.join(os.tmpdir(), runId);
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const outputDir = path.join(appRoot, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const logDir = path.join(outputDir, "logs");
const port = Number(process.env.CONCURRENCY_PROOF_PORT || (7600 + (Date.now() % 700)));
const host = `http://127.0.0.1:${port}`;
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const SITE = "Concurrency Site";
const DATE = "2026-05-21";
const PASSWORD = "testpass123";
const DURATIONS = {
  test1: Number(process.env.CONCURRENCY_TEST1_MS || 120000),
  test2: Number(process.env.CONCURRENCY_TEST2_MS || 45000),
  test3: Number(process.env.CONCURRENCY_TEST3_MS || 45000),
  chaosActions: Number(process.env.CONCURRENCY_CHAOS_ACTIONS || 50),
  long: Number(process.env.CONCURRENCY_LONG_MS || 600000),
};

const USERS = {
  A: { email: "concurrency-a@cmax.test", name: "User A" },
  B: { email: "concurrency-b@cmax.test", name: "User B" },
  C: { email: "concurrency-c@cmax.test", name: "User C" },
};

const telemetry = {
  saves: 0,
  conflicts: 0,
  rejectedSaves: 0,
  overwriteAttempts: 0,
  preventedOverwrites: 0,
  jsErrors: [],
  responses: [],
  console: [],
};
const scenarios = [];
let activeProofPages = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envelope(data, version = 1) {
  return { version, updatedAt: new Date().toISOString(), data };
}

function ensureDirs() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
}

function initialAdmins() {
  return Object.values(USERS).map((user) => ({
    email: user.email,
    password: PASSWORD,
    fullName: user.name,
    isSuperAdmin: true,
    level: 6,
    active: true,
    permissions: {},
    allowedSites: null,
    storeRoles: ["superadmin", "store_manager", "admin"],
  }));
}

function initialState() {
  const rows = Array.from({ length: 35 }, (_, index) => ({
    worker: `Worker ${index + 1}`,
    plan: `Plan ${index + 1}`,
    karna: `Karna ${index + 1}`,
    moment: `Moment ${index + 1}`,
    lift: `Lift ${index + 1}`,
    komentar: `base planner row ${index + 1}`,
  }));
  return {
    version: 2,
    sites: [SITE, "Second Site"],
    currentSite: SITE,
    moduleVersions: {
      planner: { [SITE]: 1 },
      tidplan: { [SITE]: 1 },
      warehouse: { [SITE]: 1 },
      bins: { [SITE]: 1 },
      storeCatalog: { [SITE]: 1 },
      storeSettings: { [SITE]: 1 },
      adminUsers: 1,
    },
    siteData: {
      [SITE]: {
        planner: {
          workers: rows.map((row) => row.worker),
          lifts: ["Lift 1", "Lift 2", "Lift 3"],
          moments: ["Moment 1", "Moment 2", "Moment 3"],
          plans: ["Plan 1", "Plan 2", "Plan 3"],
          karnas: ["Karna 1", "Karna 2", "Karna 3"],
          resourceHistory: [],
          dailyData: {
            [DATE]: {
              planningRows: rows,
              workerAttendance: {},
              liftAvailability: {},
              liftPlans: {},
            },
          },
        },
        tidplan: Array.from({ length: 25 }, (_, index) => ({
          id: `tid-${index + 1}`,
          plan: `Activity ${index + 1}`,
          start: "2026-05-21",
          end: "2026-05-22",
          status: "planned",
          komentar: `base tidplan row ${index + 1}`,
        })),
        tidplanZones: [{ name: "Zone A", color: "#86a3ff" }],
        warehouse: {
          catalog: [
            { id: "itm-helmet", name: "Helmet", unit: "kom", minimum: 1 },
            { id: "itm-gloves", name: "Gloves", unit: "par", minimum: 1 },
          ],
          stock: {
            "itm-helmet": { current: 10, totalIssued: 0, totalReceived: 10 },
            "itm-gloves": { current: 20, totalIssued: 0, totalReceived: 20 },
          },
          logs: [],
          issueDraft: { worker: "", slots: [], comment: "" },
          stockForm: { itemId: "itm-helmet", quantity: 1, direction: "in", comment: "" },
        },
        store: {
          settings: { budgetEnabled: true, reserveOnPending: true },
          categories: [{ id: "cat-base", name: "Base", active: true, subcategories: [{ id: "sub-base", name: "Base Sub", active: true }] }],
          products: [{
            id: "store-base-1",
            name: "Base Product",
            active: true,
            category: "Base",
            subcategory: "Base Sub",
            sizes: ["M"],
            availableSites: ["*"],
            visibleToRoles: [],
            price: 500,
            creditCost: 500,
            usesBudget: true,
            approvalRequired: true,
            freeRule: { enabled: false },
            periodLimit: { enabled: false },
          }],
          orders: [],
          carts: {},
          workerProfiles: {},
          creditLedger: [],
          auditLog: [],
        },
        notifications: [],
        surveys: [],
        reports: [],
        bins: { [DATE]: { rows: [{ plan: "Plan 1", totalAvailable: 2 }] } },
      },
      "Second Site": {
        planner: { dailyData: {} },
        tidplan: [],
        warehouse: { catalog: [], stock: {}, logs: [] },
        store: { products: [], orders: [] },
        notifications: [],
        surveys: [],
      },
    },
  };
}

function startServer() {
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: appRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadDir,
      BACKUP_PATH: backupDir,
      STORAGE_TYPE: "json",
      BOOTSTRAP_ADMIN_EMAIL: USERS.A.email,
      BOOTSTRAP_ADMIN_PASSWORD: PASSWORD,
      LOGIN_RATE_LIMIT_MAX: "1000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    try {
      const response = await fetch(`${host}/api/health`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok && body.storageReady) return;
    } catch (_) {}
    await delay(250);
  }
  throw new Error("Server did not become healthy");
}

function setupDataFiles() {
  ensureDirs();
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope(initialAdmins()), null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope(initialState()), null, 2), "utf8");
}

async function login(page, userKey) {
  const user = USERS[userKey];
  await page.goto(`${host}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.CMAX?.core?.login);
  await page.fill("#loginEmail", user.email);
  await page.fill("#loginPassword", PASSWORD);
  await page.evaluate(() => window.CMAX.core.login());
  await page.waitForFunction((email) => window.appState?.currentUser === email && window.freshServerDataLoaded === true, user.email);
  await page.evaluate((site) => {
    window.appState.currentDate = "2026-05-21";
    if (typeof window.switchSiteFromLocal === "function") window.switchSiteFromLocal(site, { syncSites: false });
  }, SITE);
}

async function openModule(page, moduleName) {
  await page.evaluate(async (name) => {
    if (name === "planner") window.CMAX?.tidplan?.showPlanner?.();
    if (name === "tidplan") window.CMAX?.tidplan?.show?.();
    if (name === "warehouse") window.CMAX?.warehouse?.show?.();
    if (name === "store") window.CMAX?.workwear?.show?.();
    if (name === "admin") window.CMAX?.admin?.open?.();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }, moduleName);
}

async function screenshot(page, name) {
  const file = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(outputDir, file).replace(/\\/g, "/");
}

function watchPage(page, label) {
  page.on("pageerror", (error) => telemetry.jsErrors.push({ label, message: error.message }));
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) telemetry.console.push({ label, type: msg.type(), text: msg.text() });
  });
  page.on("response", async (response) => {
    const url = response.url();
    const isEntityPatch = (url.includes("/api/planner/") || url.includes("/api/tidplan/")) && response.request().method() === "PATCH";
    if (!url.includes("/api/state/module") && !url.includes("/api/state") && !isEntityPatch) return;
    const method = response.request().method();
    if (method !== "POST" && method !== "PATCH") return;
    let body = {};
    try {
      body = JSON.parse(response.request().postData() || "{}");
    } catch (_) {}
    const entry = {
      label,
      url: url.replace(host, ""),
      status: response.status(),
      target: body.target || body.module || (url.includes("/api/planner/") ? "plannerRow" : url.includes("/api/tidplan/") ? "tidplanActivity" : "state"),
      payloadKeys: body.payload ? Object.keys(body.payload) : Object.keys(body.state || {}),
      time: new Date().toISOString(),
    };
    if (response.status() >= 400) {
      entry.errorPayload = await response.json().catch(() => ({}));
    }
    telemetry.responses.push(entry);
    if (url.includes("/api/state/module") || isEntityPatch) {
      telemetry.saves += 1;
      if (response.status() === 409) telemetry.conflicts += 1;
      if (response.status() >= 400) telemetry.rejectedSaves += 1;
      const illegal = body.target ? detectCrossModulePayload(body.target, body.payload || {}) : [];
      if (illegal.length) {
        telemetry.overwriteAttempts += 1;
        if (response.status() >= 400) telemetry.preventedOverwrites += 1;
      }
    }
  });
}

function detectCrossModulePayload(target, payload) {
  const allowed = {
    planner: ["planner"],
    tidplan: ["tidplan", "tidplanZones"],
    warehouse: ["warehouse"],
    bins: ["bins"],
    storeCatalog: ["store"],
    storeSettings: ["store"],
    adminUsers: ["admins", "guestPermissions", "binPermissions", "adminRemovalNotices"],
  };
  const allowedKeys = new Set(allowed[target] || []);
  return Object.keys(payload || {}).filter((key) => !allowedKeys.has(key));
}

async function browserAction(page, action, marker) {
  await page.waitForFunction(() => window.syncModuleState && window.appState && window.currentSite);
  return page.evaluate(async ({ action, marker, site, date }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const refreshModuleVersion = async (target) => {
      const response = await fetch("/api/state", { cache: "no-store" }).catch(() => null);
      const body = response && response.ok ? await response.json().catch(() => ({})) : {};
      const versions = body?.state?.moduleVersions;
      if (!versions || typeof versions !== "object") return;
      window.moduleStateVersions = window.moduleStateVersions && typeof window.moduleStateVersions === "object" ? window.moduleStateVersions : {};
      if (target === "adminUsers") {
        window.moduleStateVersions.adminUsers = versions.adminUsers || window.moduleStateVersions.adminUsers || 1;
        return;
      }
      window.moduleStateVersions[target] = window.moduleStateVersions[target] && typeof window.moduleStateVersions[target] === "object" ? window.moduleStateVersions[target] : {};
      window.moduleStateVersions[target][site] = versions[target]?.[site] || window.moduleStateVersions[target][site] || 1;
    };
    const refreshPlannerFromServer = async () => {
      const response = await fetch("/api/state", { cache: "no-store" }).catch(() => null);
      const body = response && response.ok ? await response.json().catch(() => ({})) : {};
      const planner = body?.state?.siteData?.[site]?.planner;
      if (planner && typeof planner === "object") {
        localStorage.setItem(getSiteStorageKey("cmax_planner_data", site), JSON.stringify(planner));
      }
    };
    await sleep(20);
    if (action === "planner" || action === "plannerAlt") {
      const rowIndex = action === "plannerAlt" ? 1 : 0;
      await refreshPlannerFromServer();
      const planner = getCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), createEmptyPlannerData()) || createEmptyPlannerData();
      planner.dailyData = planner.dailyData || {};
      planner.dailyData[date] = planner.dailyData[date] || { planningRows: [], workerAttendance: {}, liftAvailability: {}, liftPlans: {} };
      const rows = planner.dailyData[date].planningRows || [];
      rows[rowIndex] = ensurePlannerRowIdentity({ ...(rows[rowIndex] || {}), worker: rows[rowIndex]?.worker || `Worker ${rowIndex + 1}`, plan: rows[rowIndex]?.plan || `Plan ${rowIndex + 1}`, komentar: marker }, date, rowIndex);
      planner.dailyData[date].planningRows = rows;
      localStorage.setItem(getSiteStorageKey("cmax_planner_data", site), JSON.stringify(planner));
      window.plannerData = planner;
      return patchPlannerRow(date, rows[rowIndex], { komentar: marker }, { siteId: site, baseFieldVersions: rows[rowIndex].fieldVersions || {} });
    }
    if (action === "plannerRowSame") {
      await refreshPlannerFromServer();
      const planner = getCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), createEmptyPlannerData()) || createEmptyPlannerData();
      planner.dailyData = planner.dailyData || {};
      planner.dailyData[date] = planner.dailyData[date] || { planningRows: [], workerAttendance: {}, liftAvailability: {}, liftPlans: {} };
      const rows = planner.dailyData[date].planningRows || [];
      rows[0] = ensurePlannerRowIdentity({ ...(rows[0] || {}), worker: rows[0]?.worker || "Worker 1", plan: rows[0]?.plan || "Plan 1", komentar: marker }, date, 0);
      planner.dailyData[date].planningRows = rows;
      localStorage.setItem(getSiteStorageKey("cmax_planner_data", site), JSON.stringify(planner));
      return patchPlannerRow(date, rows[0], { komentar: marker }, { siteId: site, baseFieldVersions: rows[0].fieldVersions || {} });
    }
    if (action === "tidplanA" || action === "tidplanB") {
      const offset = action === "tidplanA" ? 0 : 14;
      window.tidplanData = Array.isArray(window.tidplanData) && window.tidplanData.length ? window.tidplanData : [];
      const patches = [];
      for (let index = offset; index < Math.min(offset + 5, window.tidplanData.length); index += 1) {
        window.tidplanData[index] = ensureTidplanActivityIdentity({ ...(window.tidplanData[index] || {}), komentar: `${marker}-row-${index + 1}` }, index);
        patches.push(patchTidplanActivity(window.tidplanData[index], { komentar: window.tidplanData[index].komentar }, { siteId: site, baseFieldVersions: window.tidplanData[index].fieldVersions || {} }));
      }
      return Promise.all(patches).then(() => true);
    }
    if (action === "warehouse") {
      await refreshModuleVersion("warehouse");
      window.warehouseData = normalizeWarehouseData(window.warehouseData);
      const stock = window.warehouseData.stock["itm-helmet"] || { current: 0, totalIssued: 0, totalReceived: 0 };
      stock.current += 1;
      stock.totalReceived += 1;
      window.warehouseData.stock["itm-helmet"] = stock;
      window.warehouseData.logs = Array.isArray(window.warehouseData.logs) ? window.warehouseData.logs : [];
      window.warehouseData.logs.push({ id: `log-${marker}`, itemId: "itm-helmet", quantity: 1, direction: "in", comment: marker, createdAt: new Date().toISOString() });
      localStorage.setItem(getSiteStorageKey("cmax_warehouse_data", site), JSON.stringify(window.warehouseData));
      return syncModuleState("warehouse", { warehouse: window.warehouseData }, { siteId: site });
    }
    if (action === "store") {
      await refreshModuleVersion("storeCatalog");
      const state = getWorkwearState(site);
      state.products = Array.isArray(state.products) ? state.products : [];
      state.products.push(normalizeStoreProduct({
        id: `product-${marker}`,
        name: `Product ${marker}`,
        category: "Base",
        subcategory: "Base Sub",
        active: true,
        sizes: ["M"],
        availableSites: ["*"],
        visibleToRoles: [],
        price: 500,
        creditCost: 500,
        usesBudget: true,
      }));
      saveWorkwearState(site, { track: false });
      return syncModuleState("storeCatalog", { store: state }, { siteId: site });
    }
    if (action === "adminUsers") {
      await refreshModuleVersion("adminUsers");
      const admins = getAdmins();
      const email = `admin-${String(marker).toLowerCase().replace(/[^a-z0-9]+/g, "-")}@cmax.test`;
      admins.push({
        email,
        password: "testpass123",
        fullName: `Admin ${marker}`,
        active: true,
        isSuperAdmin: false,
        level: 1,
        permissions: { canAccessPlanner: true },
        allowedSites: [site],
        storeRoles: ["radnik"],
      });
      localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
      return syncModuleState("adminUsers", { admins });
    }
    return false;
  }, { action, marker, site: SITE, date: DATE });
}

async function runForDuration(page, action, label, durationMs, everyMs = 7000) {
  const started = Date.now();
  let count = 0;
  while (Date.now() - started < durationMs) {
    count += 1;
    await browserAction(page, action, `${label}-${count}-${Date.now()}`);
    await delay(Math.max(300, everyMs + Math.floor(Math.random() * 600) - 300));
  }
  return count;
}

async function fetchState(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    return body.state;
  });
}

function assertStateContains(state, checks) {
  const failures = [];
  for (const check of checks) {
    if (!check.pass(state)) failures.push(check.name);
  }
  return failures;
}

async function recordScenario(name, fn) {
  if (activeProofPages.length) {
    await Promise.all(activeProofPages.map((page) => page.evaluate(() => true).catch(() => {})));
  }
  const startConflicts = telemetry.conflicts;
  const startSaves = telemetry.saves;
  const startRejected = telemetry.rejectedSaves;
  const started = Date.now();
  const entry = { name, status: "PASS", problems: [], durationMs: 0, screenshots: [] };
  try {
    await fn(entry);
  } catch (error) {
    entry.status = "BLOCKER";
    entry.problems.push({
      problem: error.message,
      cause: "Scenario assertion or browser execution failed.",
      risk: "Potential data-loss/concurrency regression.",
      fix: "Inspect logs and server state for this scenario.",
    });
  }
  entry.durationMs = Date.now() - started;
  entry.conflicts = telemetry.conflicts - startConflicts;
  entry.saves = telemetry.saves - startSaves;
  entry.rejectedSaves = telemetry.rejectedSaves - startRejected;
  if (entry.status === "PASS" && entry.conflicts > 0) {
    entry.status = "MINOR";
    const recentConflicts = telemetry.responses.slice(-Math.max(12, entry.saves + 4)).filter((item) => item.status === 409);
    const allEntityConflicts = recentConflicts.length > 0 && recentConflicts.every((item) => item.errorPayload?.error === "ENTITY_VERSION_CONFLICT");
    entry.problems.push({
      problem: allEntityConflicts
        ? `${entry.conflicts} entity-level conflict(s) occurred on the same row/activity/field.`
        : `${entry.conflicts} same-module stale conflict(s) occurred during this scenario.`,
      cause: allEntityConflicts
        ? "Two browser profiles edited the same entity field from the same base value."
        : "A module-scoped save target still uses moduleVersion instead of entity-level merge.",
      risk: allEntityConflicts
        ? "This is expected protection: the server rejected only the conflicting entity, not another module."
        : "User may need to refresh/retry when two users edit the same module in parallel, but cross-module overwrite was not observed.",
      fix: allEntityConflicts
        ? "Add a richer compare UI with Keep mine / Use server / Refresh row."
        : "Move remaining noisy module save targets to entity endpoints where needed.",
    });
  }
  if (entry.status === "PASS" && entry.rejectedSaves > entry.conflicts) {
    entry.status = "MAJOR";
    entry.problems.push({
      problem: `${entry.rejectedSaves - entry.conflicts} non-conflict rejected save(s) occurred.`,
      cause: "A save failed for a reason other than expected stale module version.",
      risk: "A real user action could appear saved locally but fail on the server.",
      fix: "Inspect logs/network-responses.json for the rejected target and backend status.",
    });
  }
  scenarios.push(entry);
}

async function writeReport(finalState) {
  fs.writeFileSync(path.join(logDir, "network-responses.json"), JSON.stringify(telemetry.responses, null, 2), "utf8");
  fs.writeFileSync(path.join(logDir, "console.json"), JSON.stringify({ console: telemetry.console, jsErrors: telemetry.jsErrors }, null, 2), "utf8");
  fs.writeFileSync(path.join(logDir, "final-state.json"), JSON.stringify(finalState, null, 2), "utf8");

  const lostData = [];
  const siteData = finalState.siteData?.[SITE] || {};
  if (!String(siteData.planner?.dailyData?.[DATE]?.planningRows?.[0]?.komentar || "").includes("planner")) lostData.push("planner row marker missing");
  if (!Array.isArray(siteData.warehouse?.logs) || siteData.warehouse.logs.length < 1) lostData.push("warehouse logs missing");
  if (!Array.isArray(siteData.store?.products) || siteData.store.products.length < 2) lostData.push("store product additions missing");

  const overall = scenarios.some((item) => item.status === "BLOCKER")
    ? "BLOCKER"
    : scenarios.some((item) => item.status === "MAJOR")
      ? "MAJOR"
      : scenarios.some((item) => item.status === "MINOR")
        ? "MINOR"
        : "PASS";

  const lines = [
    "# Multi-user Concurrency Proof Report",
    "",
    `Run: ${runId}`,
    `Host: ${host}`,
    `Overall: ${overall}`,
    "",
    "## Summary Counters",
    "",
    `- Conflicts: ${telemetry.conflicts}`,
    `- Saves: ${telemetry.saves}`,
    `- Rejected saves: ${telemetry.rejectedSaves}`,
    `- Overwrite attempts detected in payloads: ${telemetry.overwriteAttempts}`,
    `- Prevented overwrite attempts: ${telemetry.preventedOverwrites}`,
    `- JS errors: ${telemetry.jsErrors.length}`,
    `- Lost data: ${lostData.length ? lostData.join(", ") : "none detected"}`,
    "",
    "## Scenarios",
    "",
  ];

  for (const scenario of scenarios) {
    lines.push(`### ${scenario.name}`);
    lines.push("");
    lines.push(`Status: ${scenario.status}`);
    lines.push(`Duration: ${Math.round(scenario.durationMs / 1000)}s`);
    lines.push(`Saves: ${scenario.saves}`);
    lines.push(`Conflicts: ${scenario.conflicts}`);
    lines.push(`Rejected saves: ${scenario.rejectedSaves}`);
    if (scenario.screenshots.length) {
      lines.push("Screenshots:");
      for (const shot of scenario.screenshots) lines.push(`- [${shot}](${shot})`);
    }
    if (scenario.problems.length) {
      lines.push("Problems:");
      for (const issue of scenario.problems) {
        lines.push(`- Problem: ${issue.problem}`);
        lines.push(`- Uzrok: ${issue.cause}`);
        lines.push(`- Rizik: ${issue.risk}`);
        lines.push(`- Predlozeni fix: ${issue.fix}`);
      }
    } else {
      lines.push("Problems: none");
    }
    lines.push("");
  }

  lines.push("## Logs");
  lines.push("");
  lines.push("- [network-responses.json](logs/network-responses.json)");
  lines.push("- [console.json](logs/console.json)");
  lines.push("- [final-state.json](logs/final-state.json)");
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- TEST 4 intentionally checks same-row Planner concurrency. Phase 1 is module-scoped, so row-level compare is expected to be a Phase 2 gap if only module conflict is returned.");
  lines.push("- Browser actions run inside real isolated Chromium contexts and use the same frontend module save bridge as the app.");

  fs.writeFileSync(path.join(outputDir, "REPORT.md"), lines.join("\n"), "utf8");
  return { overall, lostData };
}

async function main() {
  setupDataFiles();
  const server = startServer();
  let browser = null;
  try {
    await waitForServer();
    browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true });
    const contexts = {};
    const pages = {};
    for (const key of Object.keys(USERS)) {
      contexts[key] = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      pages[key] = await contexts[key].newPage();
      watchPage(pages[key], key);
      await login(pages[key], key);
    }
    activeProofPages = Object.values(pages);

    await recordScenario("TEST 1 - Planner + Warehouse + Store, real multi-user work", async (entry) => {
      await Promise.all([openModule(pages.A, "planner"), openModule(pages.B, "warehouse"), openModule(pages.C, "store")]);
      entry.screenshots.push(await screenshot(pages.A, "test1-user-a-planner-start"));
      await Promise.all([
        runForDuration(pages.A, "planner", "planner-test1", DURATIONS.test1, 9000),
        runForDuration(pages.B, "warehouse", "warehouse-test1", DURATIONS.test1, 8000),
        runForDuration(pages.C, "store", "store-test1", DURATIONS.test1, 11000),
      ]);
      entry.screenshots.push(await screenshot(pages.B, "test1-user-b-warehouse-end"));
      entry.screenshots.push(await screenshot(pages.C, "test1-user-c-store-end"));
      const state = await fetchState(pages.A);
      const failures = assertStateContains(state, [
        { name: "planner marker", pass: (s) => String(s.siteData[SITE].planner.dailyData[DATE].planningRows[0].komentar).includes("planner-test1") },
        { name: "warehouse logs", pass: (s) => s.siteData[SITE].warehouse.logs.some((log) => String(log.comment).includes("warehouse-test1")) },
        { name: "store product", pass: (s) => s.siteData[SITE].store.products.some((product) => String(product.name).includes("store-test1")) },
      ]);
      if (failures.length) throw new Error(`Lost data after TEST 1: ${failures.join(", ")}`);
    });

    await recordScenario("TEST 2 - Tidplan rows 1-5 + rows 15-20 + Warehouse", async (entry) => {
      const startConflicts = telemetry.conflicts;
      await Promise.all([openModule(pages.A, "tidplan"), openModule(pages.B, "tidplan"), openModule(pages.C, "warehouse")]);
      await Promise.all([
        runForDuration(pages.A, "tidplanA", "tidplanA-test2", DURATIONS.test2, 9000),
        runForDuration(pages.B, "tidplanB", "tidplanB-test2", DURATIONS.test2, 9000),
        runForDuration(pages.C, "warehouse", "warehouse-test2", DURATIONS.test2, 8000),
      ]);
      entry.screenshots.push(await screenshot(pages.A, "test2-user-a-tidplan-end"));
      const state = await fetchState(pages.A);
      const tidplan = state.siteData[SITE].tidplan || [];
      const hasA = tidplan.slice(0, 5).some((row) => String(row.komentar).includes("tidplanA-test2"));
      const hasB = tidplan.slice(14, 20).some((row) => String(row.komentar).includes("tidplanB-test2"));
      const hasWarehouse = state.siteData[SITE].warehouse.logs.some((log) => String(log.comment).includes("warehouse-test2"));
      if (!hasA || !hasB || telemetry.conflicts > startConflicts) {
        entry.status = "MAJOR";
        entry.problems.push({
          problem: `Different Tidplan row ranges are not independently mergeable yet: ${JSON.stringify({ hasA, hasB, conflicts: telemetry.conflicts - startConflicts })}`,
          cause: "Phase 1 protects modules with one tidplanVersion per site, but does not yet send changed activity IDs or merge per activity.",
          risk: "Two users working in different Tidplan rows can still force a module refresh/conflict. Other modules remain protected.",
          fix: "Phase 2: save Tidplan changed activities by stable ID with per-row version/updatedAt and conflict only the touched activity.",
        });
      }
      if (!hasWarehouse) throw new Error("Warehouse change was lost during TEST 2");
    });

    await recordScenario("TEST 3 - Store editor + Planner + Admin users", async (entry) => {
      await Promise.all([openModule(pages.A, "store"), openModule(pages.B, "planner"), openModule(pages.C, "admin")]);
      await Promise.all([
        runForDuration(pages.A, "store", "store-test3", DURATIONS.test3, 10000),
        runForDuration(pages.B, "plannerAlt", "planner-test3", DURATIONS.test3, 9000),
        runForDuration(pages.C, "adminUsers", "admin-test3", DURATIONS.test3, 12000),
      ]);
      entry.screenshots.push(await screenshot(pages.C, "test3-user-c-admin-end"));
      const state = await fetchState(pages.A);
      const failures = assertStateContains(state, [
        { name: "store product", pass: (s) => s.siteData[SITE].store.products.some((product) => String(product.name).includes("store-test3")) },
        { name: "planner marker", pass: (s) => String(s.siteData[SITE].planner.dailyData[DATE].planningRows[1]?.komentar || "").includes("planner-test3") },
        { name: "siteData preserved", pass: (s) => Boolean(s.siteData[SITE].warehouse && s.siteData[SITE].tidplan) },
      ]);
      if (failures.length) throw new Error(`Lost data after TEST 3: ${failures.join(", ")}`);
    });

    await recordScenario("TEST 4 - Same Planner row conflict scope", async (entry) => {
      const startConflicts = telemetry.conflicts;
      await Promise.all([openModule(pages.A, "planner"), openModule(pages.B, "planner")]);
      await Promise.all([
        browserAction(pages.A, "plannerRowSame", `same-row-A-${Date.now()}`),
        browserAction(pages.B, "plannerRowSame", `same-row-B-${Date.now()}`),
      ]);
      entry.screenshots.push(await screenshot(pages.A, "test4-same-planner-row"));
      if (telemetry.conflicts > startConflicts) {
        const recent = telemetry.responses.slice(-6).filter((item) => item.status === 409);
        const entityConflict = recent.some((item) => item.errorPayload?.error === "ENTITY_VERSION_CONFLICT" && item.target === "plannerRow");
        if (!entityConflict) {
          entry.status = "MAJOR";
          entry.problems.push({
            problem: "Same Planner row did not return an entity-scoped conflict.",
            cause: "Expected Planner row PATCH to return ENTITY_VERSION_CONFLICT.",
            risk: "Conflict UI could still be global/module-scoped.",
            fix: "Ensure Planner row edits use PATCH /api/planner/:site/:date/rows/:rowId.",
          });
        }
      }
    });

    await recordScenario("TEST 5 - Random chaos, 20-50 mixed actions", async (entry) => {
      const actions = ["planner", "warehouse", "store", "tidplanA", "tidplanB", "adminUsers"];
      for (let index = 0; index < DURATIONS.chaosActions; index += 1) {
        const pageKey = ["A", "B", "C"][index % 3];
        const action = actions[Math.floor(Math.random() * actions.length)];
        if (index % 9 === 0) await pages[pageKey].reload({ waitUntil: "domcontentloaded" }).catch(() => {});
        if (index % 11 === 0) {
          await pages[pageKey].evaluate((site) => {
            if (typeof switchSiteFromLocal === "function") switchSiteFromLocal("Second Site", { syncSites: false });
            if (typeof switchSiteFromLocal === "function") switchSiteFromLocal(site, { syncSites: false });
          }, SITE).catch(() => {});
        }
        await browserAction(pages[pageKey], action, `chaos-${index}-${Date.now()}`);
        await delay(250);
      }
      entry.screenshots.push(await screenshot(pages.A, "test5-chaos-user-a"));
      if (telemetry.jsErrors.length) {
        entry.status = "MAJOR";
        entry.problems.push({
          problem: `${telemetry.jsErrors.length} browser JS error(s) were captured during chaos test.`,
          cause: "See logs/console.json for stack/message.",
          risk: "A UI action may fail silently in real use.",
          fix: "Fix the specific stack trace before broad rollout.",
        });
      }
    });

    await recordScenario("TEST 6 - Long session, 3 users, module saves/refreshes", async (entry) => {
      await Promise.all([
        runForDuration(pages.A, "planner", "long-planner", DURATIONS.long, 15000),
        runForDuration(pages.B, "warehouse", "long-warehouse", DURATIONS.long, 14000),
        runForDuration(pages.C, "store", "long-store", DURATIONS.long, 18000),
      ]);
      entry.screenshots.push(await screenshot(pages.A, "test6-long-user-a"));
      entry.screenshots.push(await screenshot(pages.B, "test6-long-user-b"));
      const metrics = await Promise.all(Object.values(pages).map((page) => page.evaluate(() => ({
        usedJSHeapSize: performance?.memory?.usedJSHeapSize || null,
        totalJSHeapSize: performance?.memory?.totalJSHeapSize || null,
      })).catch(() => ({ usedJSHeapSize: null, totalJSHeapSize: null }))));
      fs.writeFileSync(path.join(logDir, "memory-sample.json"), JSON.stringify(metrics, null, 2), "utf8");
    });

    const finalState = await fetchState(pages.A);
    const report = await writeReport(finalState);
    const result = {
      ok: report.overall !== "BLOCKER",
      overall: report.overall,
      report: path.join(outputDir, "REPORT.md"),
      screenshots: screenshotDir,
      logs: logDir,
      counters: {
        conflicts: telemetry.conflicts,
        saves: telemetry.saves,
        rejectedSaves: telemetry.rejectedSaves,
        overwriteAttempts: telemetry.overwriteAttempts,
        preventedOverwrites: telemetry.preventedOverwrites,
        jsErrors: telemetry.jsErrors.length,
        lostData: report.lostData,
      },
    };
    console.log(JSON.stringify(result, null, 2));
    if (report.overall === "BLOCKER") process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
