const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const PORT = Number(process.env.RELEASE_STABILITY_PORT || 3297);
const HOST = `http://127.0.0.1:${PORT}`;
const USER = { email: "release.stability@cmax.test", password: "ReleaseStability!123" };
const SITE = "Release Stability Site";
const DATE = "2026-05-22";
const PLANNER_ROW_ID = "release-planner-row-1";
const TIDPLAN_ACTIVITY_ID = "release-tidplan-activity-1";
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function envelope(data, version = 1) { return { version, updatedAt: new Date().toISOString(), data }; }
function parseCookie(setCookieHeader) {
  const value = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(value || "").split(";")[0];
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function escapeMd(value) { return String(value == null ? "" : value).replace(/\|/g, "\\|").replace(/\n/g, " "); }

function fixture() {
  return {
    version: 2,
    sites: [SITE],
    currentSite: SITE,
    moduleVersions: { planner: { [SITE]: 1 }, tidplan: { [SITE]: 1 }, warehouse: { [SITE]: 1 }, storeCatalog: { [SITE]: 1 }, adminUsers: 1 },
    accountNotifications: {},
    siteData: {
      [SITE]: {
        planner: {
          workers: ["Josip", "Marko"],
          lifts: ["Lift 1"],
          moments: ["Moment A"],
          plans: ["Plan A", "Plan B"],
          karnas: ["Karna A"],
          resourceHistory: [],
          dailyData: {
            [DATE]: {
              planningRows: [
                { id: PLANNER_ROW_ID, worker: "Josip", w1: "Josip", plan: "Plan A", comment: "planner base", rowVersion: 1, fieldVersions: {} },
                { id: "release-planner-row-2", worker: "Marko", w1: "Marko", plan: "Plan B", comment: "planner second", rowVersion: 1, fieldVersions: {} },
              ],
              workerAttendance: {},
              liftAvailability: {},
              liftPlans: {},
            },
          },
        },
        tidplan: [
          { id: TIDPLAN_ACTIVITY_ID, plan: "Activity A", zona: "Z1", start: DATE, end: "2026-05-23", komentar: "tidplan base", activityVersion: 1, fieldVersions: {} },
          { id: "release-tidplan-activity-2", plan: "Activity B", zona: "Z2", start: "2026-05-24", end: "2026-05-25", komentar: "tidplan second", activityVersion: 1, fieldVersions: {} },
        ],
        tidplanZones: [],
        warehouse: { catalog: [{ id: "rel-wh-1", name: "Helmet", unit: "kom" }], stock: { "rel-wh-1": { current: 5, totalIssued: 0, totalReceived: 5 } }, logs: [] },
        store: { settings: {}, products: [], orders: [], carts: {}, workerProfiles: {}, creditLedger: [], auditLog: [] },
        notifications: [],
        surveys: [],
        reports: [],
        bins: { rows: [] },
      },
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

async function login() {
  const res = await fetch(`${HOST}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: USER.email, password: USER.password }),
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
  return { ok: res.ok, status: res.status, payload, headers: res.headers };
}

async function binary(session, pathname) {
  const res = await fetch(`${HOST}${pathname}`, { headers: { Cookie: session.cookie } });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { ok: res.ok, status: res.status, buffer, contentType: res.headers.get("content-type") || "" };
}

async function uploadImport(session, moduleName, format, buffer, filename) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
  const res = await fetch(`${HOST}/api/${moduleName}/import/${format}?site=${encodeURIComponent(SITE)}`, {
    method: "POST",
    headers: { Cookie: session.cookie, "x-csrf-token": session.csrf },
    body: form,
  });
  const payload = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, payload };
}

async function patchPlanner(session, changedFields, baseFieldVersions = {}) {
  return api(session, `/api/planner/${encodeURIComponent(SITE)}/${DATE}/rows/${encodeURIComponent(PLANNER_ROW_ID)}`, {
    method: "PATCH",
    json: { changedFields, baseFieldVersions },
  });
}
async function patchTidplan(session, changedFields, baseFieldVersions = {}) {
  return api(session, `/api/tidplan/${encodeURIComponent(SITE)}/activities/${encodeURIComponent(TIDPLAN_ACTIVITY_ID)}`, {
    method: "PATCH",
    json: { changedFields, baseFieldVersions },
  });
}
async function getState(session) {
  const res = await api(session, "/api/state");
  assert(res.ok, `GET /api/state failed: ${res.status}`);
  return res.payload.state;
}
function plannerRow(state) {
  return state.siteData[SITE].planner.dailyData[DATE].planningRows.find((row) => row.id === PLANNER_ROW_ID);
}
function tidplanActivity(state) {
  return state.siteData[SITE].tidplan.find((activity) => activity.id === TIDPLAN_ACTIVITY_ID);
}

async function loginPage(page) {
  await page.goto(`${HOST}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.CMAX?.core?.login);
  await page.fill("#loginEmail", USER.email);
  await page.fill("#loginPassword", USER.password);
  await page.evaluate(() => window.CMAX.core.login());
  await page.waitForFunction((email) => window.appState?.currentUser === email, USER.email);
  await page.waitForFunction((site) => Array.isArray(window.sites) && window.sites.includes(site), SITE);
  await page.evaluate((site) => {
    if (typeof switchSiteFromLocal === "function") switchSiteFromLocal(site, { syncSites: false });
    if (typeof currentSite !== "undefined") currentSite = site;
    window.currentSite = site;
    if (window.appState) window.appState.currentSite = site;
  }, SITE).catch(() => {});
  await page.waitForFunction((site) => window.currentSite === site && window.appState?.currentSite === site, SITE);
}

async function triggerMobilePlannerConflict(page) {
  await page.evaluate(({ site, date, rowId }) => {
    const planner = getCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), createEmptyPlannerData()) || createEmptyPlannerData();
    planner.dailyData = planner.dailyData || {};
    planner.dailyData[date] = planner.dailyData[date] || { planningRows: [], workerAttendance: {}, liftAvailability: {}, liftPlans: {} };
    planner.dailyData[date].planningRows[0] = ensurePlannerRowIdentity({ id: rowId, worker: "Josip", w1: "Josip", plan: "Plan A", comment: "mobile mine", rowVersion: 1, fieldVersions: {} }, date, 0);
    localStorage.setItem(getSiteStorageKey("cmax_planner_data", site), JSON.stringify(planner));
    appState.dailyData = planner.dailyData;
  }, { site: SITE, date: DATE, rowId: PLANNER_ROW_ID });
  const result = await page.evaluate(({ date }) => {
    const row = appState.dailyData[date].planningRows[0];
    row.comment = "mobile mine";
    return patchPlannerRow(date, row, { comment: "mobile mine" }, { siteId: currentSite, baseFieldVersions: {} });
  }, { date: DATE });
  if (result !== false) {
    const debug = await page.evaluate((date) => ({
      currentSite: typeof currentSite !== "undefined" ? currentSite : null,
      windowCurrentSite: window.currentSite || null,
      appSite: window.appState?.currentSite || null,
      row: window.appState?.dailyData?.[date]?.planningRows?.[0] || null,
    }), DATE);
    throw new Error(`Mobile planner conflict expected false, got ${result}; debug=${JSON.stringify(debug)}`);
  }
  await page.waitForSelector("#entityConflictOverlay", { state: "visible" });
}

async function run() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmax-release-stability-"));
  const reportDir = path.join(process.cwd(), "tmp", `release-stability-${Date.now()}`);
  const dataDir = path.join(tmpRoot, "data");
  const uploadDir = path.join(tmpRoot, "uploads");
  const backupDir = path.join(tmpRoot, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([{
    email: USER.email,
    password: USER.password,
    fullName: "Release Stability",
    isSuperAdmin: true,
    level: 6,
    active: true,
    permissions: {},
    allowedSites: null,
    storeRoles: ["superadmin"],
  }]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope(fixture()), null, 2));

  const checks = [];
  const addCheck = (name, status, detail = "") => checks.push({ name, status, detail });
  const server = spawn(process.execPath, ["server/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test", STORAGE_TYPE: "json", DATA_PATH: dataDir, UPLOAD_PATH: uploadDir, BACKUP_PATH: backupDir, BOOTSTRAP_ADMIN_EMAIL: USER.email, BOOTSTRAP_ADMIN_PASSWORD: USER.password, LOGIN_RATE_LIMIT_MAX: "100" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (chunk) => { serverLog += String(chunk || ""); });
  server.stderr.on("data", (chunk) => { serverLog += String(chunk || ""); });

  let browser = null;
  try {
    await waitHealth();
    const session = await login();

    let state = await getState(session);
    assert(plannerRow(state)?.id === PLANNER_ROW_ID, "Initial planner row ID missing");
    assert(tidplanActivity(state)?.id === TIDPLAN_ACTIVITY_ID, "Initial tidplan activity ID missing");
    addCheck("initial stable planner/tidplan IDs", "PASS", "Seeded IDs are present before backup.");

    const backupCreated = await api(session, "/api/backup", { method: "POST", json: {} });
    assert(backupCreated.ok, `Backup create failed: ${backupCreated.status}`);
    const backupId = backupCreated.payload.id || backupCreated.payload.file;
    assert(backupId, "Backup response missing id/file");
    addCheck("backup created", "PASS", String(backupId));

    let res = await patchPlanner(session, { comment: "mutated before restore" });
    assert(res.ok, `Planner mutate before restore failed: ${res.status}`);
    res = await patchTidplan(session, { komentar: "mutated before restore" });
    assert(res.ok, `Tidplan mutate before restore failed: ${res.status}`);
    state = await getState(session);
    assert(plannerRow(state).comment === "mutated before restore", "Planner mutation did not persist before restore");
    assert(tidplanActivity(state).komentar === "mutated before restore", "Tidplan mutation did not persist before restore");
    addCheck("destructive mutation before restore", "PASS", "Planner and Tidplan values changed after backup.");

    const dryRun = await api(session, "/api/backup/restore/dry-run", { method: "POST", json: { id: backupId } });
    assert(dryRun.ok && dryRun.payload.restoreToken, `Restore dry-run failed: ${dryRun.status}`);
    const restore = await api(session, "/api/backup/restore", { method: "POST", json: { id: backupId, restoreToken: dryRun.payload.restoreToken, confirmationText: "RESTORE" } });
    assert(restore.ok && restore.payload.integrity?.ok === true, `Restore failed: ${restore.status} ${JSON.stringify(restore.payload)}`);
    state = await getState(session);
    assert(plannerRow(state)?.id === PLANNER_ROW_ID && plannerRow(state)?.comment === "planner base", "Planner row ID/value not restored");
    assert(tidplanActivity(state)?.id === TIDPLAN_ACTIVITY_ID && tidplanActivity(state)?.komentar === "tidplan base", "Tidplan activity ID/value not restored");
    addCheck("backup restore preserves entity IDs", "PASS", "Planner row ID and Tidplan activity ID survived restore.");

    res = await patchPlanner(session, { comment: "server after restore" });
    assert(res.ok, "Planner patch after restore failed");
    res = await patchPlanner(session, { comment: "stale after restore" }, {});
    assert(res.status === 409 && res.payload.error === "ENTITY_VERSION_CONFLICT", "Planner conflict did not work after restore");
    res = await patchTidplan(session, { komentar: "server tidplan after restore" });
    assert(res.ok, "Tidplan patch after restore failed");
    res = await patchTidplan(session, { komentar: "stale tidplan after restore" }, {});
    assert(res.status === 409 && res.payload.error === "ENTITY_VERSION_CONFLICT", "Tidplan conflict did not work after restore");
    addCheck("conflict system after restore", "PASS", "Planner and Tidplan return entity conflicts after restore.");

    const plannerXlsx = await binary(session, `/api/planner/export/excel?site=${encodeURIComponent(SITE)}`);
    assert(plannerXlsx.ok && plannerXlsx.buffer.length > 100 && !plannerXlsx.contentType.includes("json"), "Planner Excel export failed or returned JSON");
    const tidplanXlsx = await binary(session, `/api/tidplan/export/excel?site=${encodeURIComponent(SITE)}`);
    assert(tidplanXlsx.ok && tidplanXlsx.buffer.length > 100 && !tidplanXlsx.contentType.includes("json"), "Tidplan Excel export failed or returned JSON");
    const plannerPdf = await binary(session, `/api/planner/export/pdf?site=${encodeURIComponent(SITE)}`);
    assert(plannerPdf.ok && plannerPdf.buffer.length > 100 && !plannerPdf.contentType.includes("json"), "Planner PDF export failed or returned JSON");
    const tidplanPdf = await binary(session, `/api/tidplan/export/pdf?site=${encodeURIComponent(SITE)}`);
    assert(tidplanPdf.ok && tidplanPdf.buffer.length > 100 && !tidplanPdf.contentType.includes("json"), "Tidplan PDF export failed or returned JSON");
    addCheck("planner/tidplan exports", "PASS", `Planner XLSX ${plannerXlsx.buffer.length} bytes, Tidplan XLSX ${tidplanXlsx.buffer.length} bytes.`);

    res = await patchPlanner(session, { comment: "changed before import roundtrip" }, { comment: 1 }).catch((error) => ({ ok: false, status: 0, payload: { error: error.message } }));
    const plannerImport = await uploadImport(session, "planner", "excel", plannerXlsx.buffer, "planner-release.xlsx");
    assert(plannerImport.ok, `Planner import roundtrip failed: ${plannerImport.status} ${JSON.stringify(plannerImport.payload)}`);
    const tidplanImport = await uploadImport(session, "tidplan", "excel", tidplanXlsx.buffer, "tidplan-release.xlsx");
    assert(tidplanImport.ok, `Tidplan import roundtrip failed: ${tidplanImport.status} ${JSON.stringify(tidplanImport.payload)}`);
    state = await getState(session);
    assert(plannerRow(state)?.id === PLANNER_ROW_ID, "Planner import roundtrip lost stable row ID");
    assert(tidplanActivity(state)?.id === TIDPLAN_ACTIVITY_ID, "Tidplan import roundtrip lost stable activity ID");
    addCheck("planner/tidplan import roundtrip", "PASS", "Exported XLSX files imported back without losing stable IDs.");

    browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await loginPage(page);
    state = await getState(session);
    const plannerMobileBase = plannerRow(state)?.fieldVersions || {};
    res = await patchPlanner(session, { comment: "mobile conflict server value" }, plannerMobileBase);
    assert(res.ok, `Planner server patch before mobile conflict failed: ${res.status} ${JSON.stringify(res.payload)}`);
    await triggerMobilePlannerConflict(page);
    const overlayBox = await page.locator("#entityConflictOverlay").boundingBox();
    const panelBox = await page.locator(".entity-conflict-box").boundingBox();
    assert(overlayBox && overlayBox.width <= 390 && overlayBox.height <= 844, "Conflict overlay exceeds mobile viewport");
    assert(panelBox && panelBox.x >= 0 && panelBox.y >= 0 && panelBox.x + panelBox.width <= 390 && panelBox.y + panelBox.height <= 844, "Conflict panel is outside mobile viewport");
    await page.screenshot({ path: path.join(reportDir, "mobile-conflict-ui-390.png"), fullPage: true });
    await page.click("#entityConflictCancel");

    state = await getState(session);
    const plannerEditBase = plannerRow(state)?.fieldVersions || {};
    const tidplanEditBase = tidplanActivity(state)?.fieldVersions || {};
    const plannerEdit = await page.evaluate(({ date, rowId, baseFieldVersions }) => {
      const row = appState.dailyData[date].planningRows.find((item) => item.id === rowId);
      row.comment = "mobile planner edit saved";
      return patchPlannerRow(date, row, { comment: "mobile planner edit saved" }, { siteId: currentSite, baseFieldVersions });
    }, { date: DATE, rowId: PLANNER_ROW_ID, baseFieldVersions: plannerEditBase });
    assert(plannerEdit !== false, "Mobile planner edit returned conflict/false");
    const tidplanEdit = await page.evaluate(({ activityId, baseFieldVersions }) => {
      window.tidplanData = [{ id: activityId, plan: "Activity A", zona: "Z1", start: "2026-05-22", end: "2026-05-23", komentar: "mobile tidplan edit saved", activityVersion: 1, fieldVersions: baseFieldVersions }];
      return patchTidplanActivity(window.tidplanData[0], { komentar: "mobile tidplan edit saved" }, { siteId: currentSite, baseFieldVersions });
    }, { activityId: TIDPLAN_ACTIVITY_ID, baseFieldVersions: tidplanEditBase });
    assert(tidplanEdit !== false, "Mobile tidplan edit returned conflict/false");
    addCheck("mobile conflict UI and edit paths", "PASS", "390px conflict panel fits viewport; Planner/Tidplan patch paths work from mobile browser.");

    fs.writeFileSync(path.join(reportDir, "server.log"), serverLog, "utf8");
    const report = [
      "# Release Stability Checklist",
      "",
      `Generated: ${new Date().toISOString()}`,
      `Viewport proof: 390x844 screenshot at \`mobile-conflict-ui-390.png\``, 
      "",
      "| Check | Status | Detail |",
      "| --- | --- | --- |",
      ...checks.map((check) => `| ${escapeMd(check.name)} | ${check.status} | ${escapeMd(check.detail)} |`),
      "",
      "## Notes",
      "- This is a targeted release checklist for backup/restore, import/export, restored entity metadata, and mobile entity conflict UI.",
      "- Existing multi-user/concurrency scripts cover Planner+Warehouse, Tidplan+Store, Admin+Planner, same-row Planner conflict, and same-activity Tidplan conflict.",
    ].join("\n");
    fs.writeFileSync(path.join(reportDir, "REPORT.md"), report, "utf8");

    console.log(JSON.stringify({ ok: true, reportDir, checks }, null, 2));
  } catch (error) {
    try {
      fs.writeFileSync(path.join(reportDir, "server.log"), serverLog, "utf8");
      fs.writeFileSync(path.join(reportDir, "REPORT.md"), `# Release Stability Checklist\n\nBLOCKER: ${error.stack || error.message}\n`, "utf8");
    } catch (_) {}
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (!server.killed) {
      server.kill("SIGTERM");
      await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(4000)]);
      if (!server.killed) server.kill("SIGKILL");
    }
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (_) {}
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

