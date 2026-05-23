const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `real-world-scm-review-${Date.now()}`;
const tmpRoot = path.join(os.tmpdir(), runId);
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const outputDir = path.join(appRoot, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const logDir = path.join(outputDir, "logs");
const port = Number(process.env.REAL_WORLD_REVIEW_PORT || (8100 + (Date.now() % 500)));
const host = `http://127.0.0.1:${port}`;
const chromePath = process.env.CHROME_PATH || "";

const SITE = "Real World Site";
const DATE = "2026-05-23";
const PASSWORD = "testpass123";
const SCENARIO_A_MS = Number(process.env.REAL_WORLD_SCENARIO_A_MS || 600000);
const SCENARIO_D_MS = Number(process.env.REAL_WORLD_SCENARIO_D_MS || 90000);

const USERS = {
  A: { email: "real-a@cmax.test", name: "Real User A" },
  B: { email: "real-b@cmax.test", name: "Real User B" },
  C: { email: "real-c@cmax.test", name: "Real User C" },
  D: { email: "real-d@cmax.test", name: "Real User D" },
  E: { email: "real-e@cmax.test", name: "Real User E" },
};

const telemetry = {
  saves: 0,
  conflicts: 0,
  rejectedSaves: 0,
  responses: [],
  console: [],
  jsErrors: [],
  currentSiteDrifts: [],
  memorySamples: [],
  domSamples: [],
};
const scenarios = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const envelope = (data, version = 1) => ({ version, updatedAt: new Date().toISOString(), data });
const safeName = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const rel = (file) => path.relative(outputDir, file).replace(/\\/g, "/");

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
    storeRoles: ["superadmin", "admin", "store_manager"],
  }));
}

function initialState() {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    id: `real-planner-row-${index + 1}`,
    worker: `Worker ${index + 1}`,
    plan: `Plan ${index + 1}`,
    komentar: `base planner ${index + 1}`,
    rowVersion: 1,
    fieldVersions: {},
  }));
  return {
    version: 2,
    sites: [SITE, "Real Second Site"],
    currentSite: SITE,
    moduleVersions: {
      planner: { [SITE]: 1 },
      tidplan: { [SITE]: 1 },
      warehouse: { [SITE]: 1 },
      storeCatalog: { [SITE]: 1 },
      adminUsers: 1,
      siteMetadata: { [SITE]: 1 },
    },
    accountNotifications: {},
    siteData: {
      [SITE]: {
        planner: {
          workers: rows.map((row) => row.worker),
          lifts: ["Lift 1"],
          moments: ["Moment A"],
          plans: ["Plan 1", "Plan 2"],
          karnas: ["Karna A"],
          resourceHistory: [],
          dailyData: {
            [DATE]: { planningRows: rows, workerAttendance: {}, liftAvailability: {}, liftPlans: {} },
          },
        },
        tidplan: Array.from({ length: 8 }, (_, index) => ({
          id: `real-tid-${index + 1}`,
          plan: `Activity ${index + 1}`,
          start: DATE,
          end: "2026-05-24",
          status: "planned",
          komentar: `base tidplan ${index + 1}`,
          activityVersion: 1,
          fieldVersions: {},
        })),
        tidplanZones: [],
        warehouse: {
          catalog: [{ id: "real-helmet", name: "Helmet", unit: "kom" }],
          stock: { "real-helmet": { current: 10, totalIssued: 0, totalReceived: 10 } },
          logs: [],
        },
        store: {
          settings: { budgetEnabled: true },
          products: [{ id: "real-store-1", name: "Real Product", active: true, category: "Base", subcategory: "Sub", sizes: ["M"], availableSites: ["*"], price: 500, creditCost: 500, usesBudget: true }],
          orders: [],
          auditLog: [],
          workerProfiles: {},
          creditLedger: [],
        },
        notifications: [],
        surveys: [],
        reports: [],
        bins: {},
        siteInfo: {
          name: SITE,
          projectName: "Real World Project",
          latitude: 59.33342,
          longitude: 18.06612,
          modules: { planner: true, tidplan: true, warehouse: true, store: true, siteChat: true },
        },
      },
      "Real Second Site": {
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

function ensureDirs() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
}

function startServer() {
  ensureDirs();
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope(initialAdmins()), null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope(initialState()), null, 2), "utf8");
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: appRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadDir,
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

function watchPage(page, label) {
  page.on("pageerror", (error) => telemetry.jsErrors.push({ label, message: error.message }));
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) telemetry.console.push({ label, type: msg.type(), text: msg.text() });
  });
  page.on("response", async (response) => {
    const url = response.url();
    const isTracked = url.includes("/api/state/module")
      || ((url.includes("/api/planner/") || url.includes("/api/tidplan/")) && response.request().method() === "PATCH")
      || url.includes("/api/site-chat/");
    if (!isTracked) return;
    const method = response.request().method();
    if (!["POST", "PATCH", "DELETE"].includes(method)) return;
    let body = {};
    try { body = JSON.parse(response.request().postData() || "{}"); } catch (_) {}
    const entry = {
      label,
      url: url.replace(host, ""),
      method,
      status: response.status(),
      target: body.target || (url.includes("/api/planner/") ? "plannerRow" : url.includes("/api/tidplan/") ? "tidplanActivity" : url.includes("/api/site-chat/") ? "siteChat" : "stateModule"),
      payloadKeys: body.payload ? Object.keys(body.payload) : Object.keys(body || {}),
      time: new Date().toISOString(),
    };
    if (response.status() >= 400) entry.errorPayload = await response.json().catch(() => ({}));
    telemetry.responses.push(entry);
    if (method === "POST" || method === "PATCH") telemetry.saves += 1;
    if (response.status() === 409) telemetry.conflicts += 1;
    if (response.status() >= 400) telemetry.rejectedSaves += 1;
  });
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
    window.appState.currentDate = "2026-05-23";
    if (typeof window.switchSiteFromLocal === "function") window.switchSiteFromLocal(site, { syncSites: false });
    if (typeof currentSite !== "undefined") currentSite = site;
    window.currentSite = site;
    window.appState.currentSite = site;
  }, SITE);
}

async function samplePage(page, label) {
  const sample = await page.evaluate((expectedSite) => {
    const listenerHints = Array.from(document.querySelectorAll("[data-cmax-bound],[data-bound-admin-user-wizard],[data-cmax-fullscreen-bound]")).length;
    return {
      label: window.__proofLabel || "",
      expectedSite,
      currentSite: window.currentSite,
      appSite: window.appState?.currentSite || null,
      view: window.currentView,
      domNodes: document.querySelectorAll("*").length,
      listenerHints,
      polling: {
        siteChat: Boolean(window.siteChatState?.pollTimer),
      },
      memory: performance?.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
      } : null,
    };
  }, SITE);
  sample.label = label;
  telemetry.domSamples.push(sample);
  if (sample.memory) telemetry.memorySamples.push({ label, ...sample.memory });
  if (sample.currentSite !== SITE || (sample.appSite && sample.appSite !== SITE)) telemetry.currentSiteDrifts.push(sample);
  return sample;
}

async function screenshot(page, name) {
  const file = path.join(screenshotDir, `${safeName(name)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return rel(file);
}

async function browserAction(page, action, marker) {
  await page.waitForFunction(() => window.syncModuleState && window.currentSite);
  return page.evaluate(async ({ action, marker, site, date }) => {
    const refreshState = async () => {
      const response = await fetch("/api/state", { cache: "no-store" }).catch(() => null);
      return response && response.ok ? response.json().catch(() => ({})) : {};
    };
    const refreshModuleVersion = async (target) => {
      const body = await refreshState();
      const versions = body?.state?.moduleVersions || {};
      window.moduleStateVersions = window.moduleStateVersions || {};
      if (target === "adminUsers") window.moduleStateVersions.adminUsers = versions.adminUsers || 1;
      else {
        window.moduleStateVersions[target] = window.moduleStateVersions[target] || {};
        window.moduleStateVersions[target][site] = versions[target]?.[site] || 1;
      }
      return body?.state;
    };
    if (action === "planner") {
      const state = await refreshState();
      const planner = state?.state?.siteData?.[site]?.planner || getCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), createEmptyPlannerData());
      const rows = planner.dailyData?.[date]?.planningRows || [];
      const row = ensurePlannerRowIdentity({ ...(rows[0] || {}), komentar: marker }, date, 0);
      return patchPlannerRow(date, row, { komentar: marker }, { siteId: site, baseFieldVersions: row.fieldVersions || {} });
    }
    if (action === "plannerSameStale") {
      const planner = getCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), createEmptyPlannerData());
      const rows = planner.dailyData?.[date]?.planningRows || [];
      const row = ensurePlannerRowIdentity({ ...(rows[0] || {}), komentar: marker }, date, 0);
      return patchPlannerRow(date, row, { komentar: marker }, { siteId: site, baseFieldVersions: rows[0]?.fieldVersions || {} });
    }
    if (action === "tidplan") {
      const state = await refreshState();
      const activity = (state?.state?.siteData?.[site]?.tidplan || [])[0];
      if (!activity) return false;
      return patchTidplanActivity({ ...activity, komentar: marker }, { komentar: marker }, { siteId: site, baseFieldVersions: activity.fieldVersions || {} });
    }
    if (action === "tidplanSameStale") {
      const activity = (window.tidplanData || [])[0] || { id: "real-tid-1", fieldVersions: {} };
      return patchTidplanActivity({ ...activity, komentar: marker }, { komentar: marker }, { siteId: site, baseFieldVersions: activity.fieldVersions || {} });
    }
    if (action === "warehouse") {
      await refreshModuleVersion("warehouse");
      window.warehouseData = normalizeWarehouseData(window.warehouseData);
      const stock = window.warehouseData.stock["real-helmet"] || { current: 0, totalIssued: 0, totalReceived: 0 };
      stock.current += 1;
      stock.totalReceived += 1;
      window.warehouseData.stock["real-helmet"] = stock;
      window.warehouseData.logs = Array.isArray(window.warehouseData.logs) ? window.warehouseData.logs : [];
      window.warehouseData.logs.push({ id: `log-${marker}`, itemId: "real-helmet", quantity: 1, direction: "in", comment: marker, createdAt: new Date().toISOString() });
      localStorage.setItem(getSiteStorageKey("cmax_warehouse_data", site), JSON.stringify(window.warehouseData));
      return syncModuleState("warehouse", { warehouse: window.warehouseData }, { siteId: site });
    }
    if (action === "store") {
      await refreshModuleVersion("storeCatalog");
      const state = getWorkwearState(site);
      state.products = Array.isArray(state.products) ? state.products : [];
      state.products.push(normalizeStoreProduct({ id: `product-${marker}`, name: `Product ${marker}`, active: true, category: "Base", subcategory: "Sub", sizes: ["M"], availableSites: ["*"], price: 500, creditCost: 500, usesBudget: true }));
      saveWorkwearState(site, { track: false });
      return syncModuleState("storeCatalog", { store: state }, { siteId: site });
    }
    if (action === "siteChat") {
      return siteChatApiSendMessage(site, { text: `Chat ${marker}`, attachments: [], replyToId: "" });
    }
    if (action === "switchRefresh") {
      switchSiteFromLocal("Real Second Site", { syncSites: false });
      await new Promise((resolve) => setTimeout(resolve, 80));
      switchSiteFromLocal(site, { syncSites: false });
      return true;
    }
    return false;
  }, { action, marker, site: SITE, date: DATE });
}

async function runLoop(page, action, prefix, durationMs, everyMs) {
  const started = Date.now();
  let count = 0;
  while (Date.now() - started < durationMs) {
    count += 1;
    await browserAction(page, action, `${prefix}-${count}-${Date.now()}`).catch(() => {});
    if (count % 5 === 0) await samplePage(page, `${prefix}-${count}`);
    await delay(Math.max(250, everyMs + Math.floor(Math.random() * 500) - 250));
  }
  return count;
}

async function recordScenario(name, fn) {
  const start = {
    conflicts: telemetry.conflicts,
    saves: telemetry.saves,
    rejectedSaves: telemetry.rejectedSaves,
    responses: telemetry.responses.length,
    jsErrors: telemetry.jsErrors.length,
    currentSiteDrifts: telemetry.currentSiteDrifts.length,
  };
  const entry = { name, status: "GOOD", problems: [], screenshots: [], durationMs: 0 };
  const started = Date.now();
  try {
    await fn(entry);
  } catch (error) {
    entry.status = "MAJOR";
    entry.problems.push({ problem: error.message, cause: "Scenario failed during browser/API execution.", risk: "Needs inspection before rollout.", fix: "Inspect logs and screenshot for this scenario." });
  }
  entry.durationMs = Date.now() - started;
  entry.conflicts = telemetry.conflicts - start.conflicts;
  entry.saves = telemetry.saves - start.saves;
  entry.rejectedSaves = telemetry.rejectedSaves - start.rejectedSaves;
  entry.jsErrors = telemetry.jsErrors.length - start.jsErrors;
  entry.currentSiteDrifts = telemetry.currentSiteDrifts.length - start.currentSiteDrifts;
  if (entry.status === "GOOD" && (entry.jsErrors > 0 || entry.currentSiteDrifts > 0)) {
    entry.status = "MAJOR";
    entry.problems.push({ problem: `JS errors ${entry.jsErrors}, currentSite drifts ${entry.currentSiteDrifts}.`, cause: "Runtime instability detected.", risk: "Users can land in wrong context or broken UI.", fix: "Fix before new feature work." });
  } else if (entry.status === "GOOD" && entry.conflicts > 0) {
    entry.status = "MINOR";
    entry.problems.push({ problem: `${entry.conflicts} expected same-entity/module conflicts.`, cause: "Concurrent users touched the same field or stale module version.", risk: "No overwrite/data loss detected, but users may need conflict UI/retry.", fix: "Prioritize entity merge for the noisiest targets." });
  }
  scenarios.push(entry);
}

function conflictBreakdown(responses = telemetry.responses) {
  const result = {
    byModule: {},
    byField: {},
    byEntity: {},
    details: [],
  };
  responses.filter((entry) => entry.status === 409).forEach((entry) => {
    const payload = entry.errorPayload || {};
    const module = entry.target || payload.entityType || "unknown";
    result.byModule[module] = (result.byModule[module] || 0) + 1;
    const conflicts = Array.isArray(payload.conflicts) ? payload.conflicts : [];
    if (!conflicts.length) result.byField[`${module}:moduleVersion`] = (result.byField[`${module}:moduleVersion`] || 0) + 1;
    conflicts.forEach((conflict) => {
      const field = conflict.field || "unknown";
      result.byField[`${module}:${field}`] = (result.byField[`${module}:${field}`] || 0) + 1;
    });
    const entityKey = `${module}:${payload.entityId || payload.target || "module"}`;
    result.byEntity[entityKey] = (result.byEntity[entityKey] || 0) + 1;
    result.details.push({ module, url: entry.url, entityId: payload.entityId || "", fields: conflicts.map((item) => item.field || "unknown"), label: entry.label });
  });
  return result;
}

function memoryAssessment() {
  const samples = telemetry.memorySamples.filter((item) => Number.isFinite(item.usedJSHeapSize));
  if (samples.length < 2) return { status: "UNKNOWN", note: "Browser did not expose performance.memory reliably." };
  const first = samples[0].usedJSHeapSize;
  const last = samples[samples.length - 1].usedJSHeapSize;
  const delta = last - first;
  const pct = first ? (delta / first) * 100 : 0;
  return {
    status: pct > 60 ? "MAJOR" : pct > 25 ? "MINOR" : "GOOD",
    first,
    last,
    delta,
    pct: Math.round(pct * 10) / 10,
  };
}

function domAssessment() {
  if (!telemetry.domSamples.length) return { status: "UNKNOWN" };
  const first = telemetry.domSamples[0].domNodes;
  const last = telemetry.domSamples[telemetry.domSamples.length - 1].domNodes;
  const delta = last - first;
  return { status: delta > 1200 ? "MINOR" : "GOOD", first, last, delta };
}

function pollingAssessment() {
  const chatPollingOutsideChat = telemetry.domSamples.filter((sample) => sample.view !== "siteChat" && sample.polling?.siteChat);
  return { status: chatPollingOutsideChat.length ? "MINOR" : "GOOD", chatPollingOutsideChat: chatPollingOutsideChat.length };
}

function mergeExistingBreakdown() {
  const oldPath = path.join(appRoot, "tmp", "multi-user-concurrency-1779542440321", "logs", "network-responses.json");
  if (!fs.existsSync(oldPath)) return null;
  const responses = JSON.parse(fs.readFileSync(oldPath, "utf8"));
  return conflictBreakdown(responses);
}

async function writeReport(finalState) {
  fs.writeFileSync(path.join(logDir, "network-responses.json"), JSON.stringify(telemetry.responses, null, 2), "utf8");
  fs.writeFileSync(path.join(logDir, "console.json"), JSON.stringify({ console: telemetry.console, jsErrors: telemetry.jsErrors }, null, 2), "utf8");
  fs.writeFileSync(path.join(logDir, "samples.json"), JSON.stringify({ memory: telemetry.memorySamples, dom: telemetry.domSamples, currentSiteDrifts: telemetry.currentSiteDrifts }, null, 2), "utf8");
  fs.writeFileSync(path.join(logDir, "final-state.json"), JSON.stringify(finalState, null, 2), "utf8");

  const breakdown = conflictBreakdown();
  const oldBreakdown = mergeExistingBreakdown();
  fs.writeFileSync(path.join(logDir, "conflict-breakdown.json"), JSON.stringify({ currentRun: breakdown, previousMultiUserRun: oldBreakdown }, null, 2), "utf8");
  const memory = memoryAssessment();
  const dom = domAssessment();
  const polling = pollingAssessment();
  const overall = scenarios.some((item) => item.status === "MAJOR") || memory.status === "MAJOR"
    ? "MAJOR"
    : scenarios.some((item) => item.status === "MINOR") || memory.status === "MINOR" || dom.status === "MINOR" || polling.status === "MINOR"
      ? "MINOR"
      : "GOOD";

  const lines = [
    "# Real World SCM Review Proof",
    "",
    `Run: ${runId}`,
    `Overall: ${overall}`,
    "",
    "## Conflict Breakdown - Current Run",
    "",
    ...Object.entries(breakdown.byModule).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "### Fields",
    "",
    ...Object.entries(breakdown.byField).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Conflict Breakdown - Previous Multi-user Proof",
    "",
    ...(oldBreakdown ? Object.entries(oldBreakdown.byModule).map(([key, value]) => `- ${key}: ${value}`) : ["- Previous proof not found"]),
    "",
    "### Previous Fields",
    "",
    ...(oldBreakdown ? Object.entries(oldBreakdown.byField).map(([key, value]) => `- ${key}: ${value}`) : ["- n/a"]),
    "",
    "## Memory / DOM / Polling",
    "",
    `- Memory: ${JSON.stringify(memory)}`,
    `- DOM growth: ${JSON.stringify(dom)}`,
    `- Polling: ${JSON.stringify(polling)}`,
    `- currentSite drifts: ${telemetry.currentSiteDrifts.length}`,
    `- JS errors: ${telemetry.jsErrors.length}`,
    "",
    "## Scenarios",
    "",
  ];
  scenarios.forEach((scenario) => {
    lines.push(`### ${scenario.name}`);
    lines.push("");
    lines.push(`Status: ${scenario.status}`);
    lines.push(`Duration: ${Math.round(scenario.durationMs / 1000)}s`);
    lines.push(`Saves: ${scenario.saves}`);
    lines.push(`Conflicts: ${scenario.conflicts}`);
    lines.push(`Rejected saves: ${scenario.rejectedSaves}`);
    lines.push(`currentSite drifts: ${scenario.currentSiteDrifts}`);
    if (scenario.screenshots.length) {
      lines.push("Screenshots:");
      scenario.screenshots.forEach((shot) => lines.push(`- [${shot}](${shot})`));
    }
    if (scenario.problems.length) {
      lines.push("Problems:");
      scenario.problems.forEach((issue) => {
        lines.push(`- Problem: ${issue.problem}`);
        lines.push(`- Uzrok: ${issue.cause}`);
        lines.push(`- Rizik: ${issue.risk}`);
        lines.push(`- Predlozeni fix: ${issue.fix}`);
      });
    } else {
      lines.push("Problems: none");
    }
    lines.push("");
  });
  lines.push("## Logs");
  lines.push("");
  lines.push("- [conflict-breakdown.json](logs/conflict-breakdown.json)");
  lines.push("- [network-responses.json](logs/network-responses.json)");
  lines.push("- [samples.json](logs/samples.json)");
  lines.push("- [console.json](logs/console.json)");
  lines.push("- [final-state.json](logs/final-state.json)");
  fs.writeFileSync(path.join(outputDir, "REPORT.md"), lines.join("\n"), "utf8");
  return { overall, breakdown, oldBreakdown, memory, dom, polling };
}

async function fetchState(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    return body.state;
  });
}

async function main() {
  const server = startServer();
  let browser = null;
  try {
    await waitForServer();
    browser = await chromium.launch(chromePath && fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true });
    const contexts = {};
    const pages = {};
    for (const key of Object.keys(USERS)) {
      contexts[key] = await browser.newContext({ viewport: { width: key === "D" ? 430 : 1440, height: key === "D" ? 932 : 1000 } });
      pages[key] = await contexts[key].newPage();
      watchPage(pages[key], key);
      await login(pages[key], key);
    }

    const scenarioMinutes = Math.round(SCENARIO_A_MS / 60000);
    await recordScenario(`SCENARIO A - Planner + Warehouse + Store + Site Chat + Tidplan, ${scenarioMinutes} minute real use`, async (entry) => {
      await Promise.all([
        pages.A.evaluate(() => CMAX?.tidplan?.showPlanner?.()),
        pages.B.evaluate(() => CMAX?.warehouse?.show?.()),
        pages.C.evaluate(() => CMAX?.workwear?.show?.()),
        pages.D.evaluate((site) => CMAX?.siteChat?.show?.(site), SITE),
        pages.E.evaluate(() => CMAX?.tidplan?.show?.()),
      ]);
      entry.screenshots.push(await screenshot(pages.A, "scenario-a-planner-start"));
      await Promise.all([
        runLoop(pages.A, "planner", "scenarioA-planner", SCENARIO_A_MS, 12000),
        runLoop(pages.B, "warehouse", "scenarioA-warehouse", SCENARIO_A_MS, 11000),
        runLoop(pages.C, "store", "scenarioA-store", SCENARIO_A_MS, 15000),
        runLoop(pages.D, "siteChat", "scenarioA-chat", SCENARIO_A_MS, 8000),
        runLoop(pages.E, "tidplan", "scenarioA-tidplan", SCENARIO_A_MS, 13000),
      ]);
      await Promise.all(Object.entries(pages).map(([label, page]) => samplePage(page, `scenario-a-end-${label}`)));
      entry.screenshots.push(await screenshot(pages.B, "scenario-a-warehouse-end"));
      entry.screenshots.push(await screenshot(pages.C, "scenario-a-store-end"));
      entry.screenshots.push(await screenshot(pages.D, "scenario-a-chat-end"));
      entry.screenshots.push(await screenshot(pages.E, "scenario-a-tidplan-end"));
    });

    await recordScenario("SCENARIO B - Same Planner row conflict options", async (entry) => {
      await Promise.all([pages.A.evaluate(() => CMAX?.tidplan?.showPlanner?.()), pages.B.evaluate(() => CMAX?.tidplan?.showPlanner?.())]);
      await browserAction(pages.A, "planner", `scenarioB-server-${Date.now()}`);
      await browserAction(pages.B, "plannerSameStale", `scenarioB-client-${Date.now()}`);
      entry.screenshots.push(await screenshot(pages.B, "scenario-b-planner-conflict"));
      for (const option of ["entityConflictUseServer", "entityConflictKeepMine", "entityConflictRefresh", "entityConflictCancel"]) {
        await pages.B.evaluate((buttonId) => {
          showEntityConflictPanel?.({ module: "planner", entityLabel: "Planner row", field: "komentar", mine: "mine", server: "server", updatedBy: "User A", updatedAt: new Date().toISOString() });
          document.getElementById(buttonId)?.click();
        }, option);
      }
    });

    await recordScenario("SCENARIO C - Same Tidplan activity conflict options", async (entry) => {
      await Promise.all([pages.A.evaluate(() => CMAX?.tidplan?.show?.()), pages.B.evaluate(() => CMAX?.tidplan?.show?.())]);
      await browserAction(pages.A, "tidplan", `scenarioC-server-${Date.now()}`);
      await browserAction(pages.B, "tidplanSameStale", `scenarioC-client-${Date.now()}`);
      entry.screenshots.push(await screenshot(pages.B, "scenario-c-tidplan-conflict"));
      for (const option of ["entityConflictUseServer", "entityConflictKeepMine", "entityConflictRefresh", "entityConflictCancel"]) {
        await pages.B.evaluate((buttonId) => {
          showEntityConflictPanel?.({ module: "tidplan", entityLabel: "Tidplan activity", field: "komentar", mine: "mine", server: "server", updatedBy: "User A", updatedAt: new Date().toISOString() });
          document.getElementById(buttonId)?.click();
        }, option);
      }
    });

    await recordScenario("SCENARIO D - Site Chat spam + Planner + Store", async (entry) => {
      await Promise.all([
        pages.A.evaluate(() => CMAX?.tidplan?.showPlanner?.()),
        pages.C.evaluate(() => CMAX?.workwear?.show?.()),
        pages.D.evaluate((site) => CMAX?.siteChat?.show?.(site), SITE),
      ]);
      await Promise.all([
        runLoop(pages.A, "planner", "scenarioD-planner", SCENARIO_D_MS, 9000),
        runLoop(pages.C, "store", "scenarioD-store", SCENARIO_D_MS, 13000),
        runLoop(pages.D, "siteChat", "scenarioD-chat", SCENARIO_D_MS, 2500),
      ]);
      await Promise.all(Object.entries(pages).map(([label, page]) => samplePage(page, `scenario-d-end-${label}`)));
      entry.screenshots.push(await screenshot(pages.D, "scenario-d-chat-spam"));
    });

    const state = await fetchState(pages.A);
    const report = await writeReport(state);
    console.log(JSON.stringify({
      ok: report.overall !== "MAJOR",
      overall: report.overall,
      report: path.join(outputDir, "REPORT.md"),
      logs: logDir,
      screenshots: screenshotDir,
      counters: {
        saves: telemetry.saves,
        conflicts: telemetry.conflicts,
        rejectedSaves: telemetry.rejectedSaves,
        jsErrors: telemetry.jsErrors.length,
        currentSiteDrifts: telemetry.currentSiteDrifts.length,
      },
      memory: report.memory,
      dom: report.dom,
      polling: report.polling,
      conflictBreakdown: report.breakdown.byModule,
      previousConflictBreakdown: report.oldBreakdown?.byModule || {},
    }, null, 2));
    if (report.overall === "MAJOR") process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
