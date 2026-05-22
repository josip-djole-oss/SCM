const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const PORT = Number(process.env.ENTITY_CONFLICT_UI_PORT || 3293);
const HOST = `http://127.0.0.1:${PORT}`;
const USER = { email: "entity-ui@cmax.test", password: "EntityUi!123" };
const SITE = "Conflict UI Site";
const DATE = "2026-05-21";
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envelope(data, version = 1) {
  return { version, updatedAt: new Date().toISOString(), data };
}

function parseCookie(setCookieHeader) {
  const value = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(value || "").split(";")[0];
}

function fixture() {
  return {
    version: 2,
    sites: [SITE],
    currentSite: SITE,
    moduleVersions: { planner: { [SITE]: 1 }, tidplan: { [SITE]: 1 }, warehouse: { [SITE]: 1 }, storeCatalog: { [SITE]: 1 }, adminUsers: 1 },
    siteData: {
      [SITE]: {
        planner: {
          workers: ["A", "B"],
          lifts: [],
          moments: [],
          plans: ["P1", "P2"],
          karnas: [],
          resourceHistory: [],
          dailyData: {
            [DATE]: {
              planningRows: [
                { id: "planner_row_2026_05_21_1", worker: "A", plan: "P1", comment: "base", rowVersion: 1, fieldVersions: {} },
                { id: "planner_row_2026_05_21_2", worker: "B", plan: "P2", comment: "local-other", rowVersion: 1, fieldVersions: {} },
              ],
              workerAttendance: {},
              liftAvailability: {},
              liftPlans: {},
            },
          },
        },
        tidplan: [
          { id: "tid-1", plan: "A1", komentar: "base", start: "2026-05-21", activityVersion: 1, fieldVersions: {} },
        ],
        tidplanZones: [],
        warehouse: { catalog: [], stock: {}, logs: [] },
        store: { products: [], orders: [], settings: {}, carts: {}, workerProfiles: {}, creditLedger: [], auditLog: [] },
        notifications: [],
        surveys: [],
      },
    },
  };
}

async function waitHealth() {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    try {
      const res = await fetch(`${HOST}/api/health`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok && body.storageReady) return;
    } catch (_) {}
    await delay(250);
  }
  throw new Error("Server did not become healthy");
}

async function loginApi() {
  const res = await fetch(`${HOST}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: USER.email, password: USER.password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return {
    cookie: parseCookie(typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : res.headers.get("set-cookie")),
    csrf: body.csrfToken,
  };
}

async function api(session, pathName, json) {
  const res = await fetch(`${HOST}${pathName}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: session.cookie, "x-csrf-token": session.csrf },
    body: JSON.stringify(json),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function getState(session) {
  const res = await fetch(`${HOST}/api/state`, { headers: { Cookie: session.cookie } });
  return (await res.json()).state;
}

async function loginPage(page) {
  await page.goto(`${HOST}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.CMAX?.core?.login);
  await page.fill("#loginEmail", USER.email);
  await page.fill("#loginPassword", USER.password);
  await page.evaluate(() => window.CMAX.core.login());
  await page.waitForFunction((email) => window.appState?.currentUser === email, USER.email);
  await page.evaluate((site) => {
    if (typeof switchSiteFromLocal === "function") switchSiteFromLocal(site, { syncSites: false });
  }, SITE).catch(() => {});
}

async function seedLocalPlanner(page, comment, fieldVersions = {}) {
  await page.evaluate(({ site, date, comment, fieldVersions }) => {
    const planner = getCachedStorageJson(getSiteStorageKey("cmax_planner_data", site), createEmptyPlannerData()) || createEmptyPlannerData();
    planner.dailyData = planner.dailyData || {};
    planner.dailyData[date] = planner.dailyData[date] || { planningRows: [], workerAttendance: {}, liftAvailability: {}, liftPlans: {} };
    planner.dailyData[date].planningRows[0] = ensurePlannerRowIdentity({
      id: "planner_row_2026_05_21_1",
      worker: "A",
      plan: "P1",
      comment,
      rowVersion: 1,
      fieldVersions,
    }, date, 0);
    planner.dailyData[date].planningRows[1] = ensurePlannerRowIdentity({
      id: "planner_row_2026_05_21_2",
      worker: "B",
      plan: "P2",
      comment: "LOCAL_OTHER_UNSAVED",
      rowVersion: 1,
      fieldVersions: {},
    }, date, 1);
    localStorage.setItem(getSiteStorageKey("cmax_planner_data", site), JSON.stringify(planner));
    appState.dailyData = planner.dailyData;
  }, { site: SITE, date: DATE, comment, fieldVersions });
}

async function triggerPlannerConflict(page, mine) {
  await seedLocalPlanner(page, mine, {});
  const result = await page.evaluate(({ date, mine }) => {
    const row = appState.dailyData[date].planningRows[0];
    row.comment = mine;
    return patchPlannerRow(date, row, { comment: mine }, { siteId: currentSite, baseFieldVersions: {} });
  }, { date: DATE, mine });
  if (result !== false) throw new Error(`Planner conflict was not returned by patchPlannerRow (result=${result})`);
  await page.waitForSelector("#entityConflictOverlay", { state: "visible" });
}

async function triggerTidplanConflict(page, mine) {
  const result = await page.evaluate((mine) => {
    window.tidplanData = [{ id: "tid-1", plan: "A1", komentar: mine, start: "2026-05-21", activityVersion: 1, fieldVersions: {} }];
    return patchTidplanActivity(window.tidplanData[0], { komentar: mine }, { siteId: currentSite, baseFieldVersions: {} });
  }, mine);
  if (result !== false) throw new Error(`Tidplan conflict was not returned by patchTidplanActivity (result=${result})`);
  await page.waitForSelector("#entityConflictOverlay", { state: "visible" });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cmax-entity-conflict-ui-"));
  const dataDir = path.join(tmp, "data");
  const uploadDir = path.join(tmp, "uploads");
  const backupDir = path.join(tmp, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([{
    email: USER.email,
    password: USER.password,
    fullName: "Entity UI",
    isSuperAdmin: true,
    level: 6,
    active: true,
    permissions: {},
    allowedSites: null,
    storeRoles: ["superadmin"],
  }]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope(fixture()), null, 2));

  const server = spawn(process.execPath, ["server/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), DATA_PATH: dataDir, UPLOAD_PATH: uploadDir, BACKUP_PATH: backupDir, STORAGE_TYPE: "json", BOOTSTRAP_ADMIN_EMAIL: USER.email, BOOTSTRAP_ADMIN_PASSWORD: USER.password, LOGIN_RATE_LIMIT_MAX: "100" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let browser = null;
  try {
    await waitHealth();
    const session = await loginApi();
    browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await loginPage(page);

    let res = await api(session, `/api/planner/${encodeURIComponent(SITE)}/${DATE}/rows/planner_row_2026_05_21_1`, { changedFields: { comment: "SERVER_A" }, baseFieldVersions: {} });
    assert(res.status === 200, `Initial server planner patch failed: ${res.status} ${JSON.stringify(res.body)}`);
    await triggerPlannerConflict(page, "MINE_A");
    const panelText = await page.textContent("#entityConflictOverlay");
    assert(panelText.includes("Planner") && panelText.includes("comment") && panelText.includes("MINE_A") && panelText.includes("SERVER_A"), "Planner conflict panel missing details");

    await page.click("#entityConflictUseServer");
    const useServerLocal = await page.evaluate((date) => appState.dailyData[date].planningRows[0].comment, DATE);
    assert(useServerLocal === "SERVER_A", "Use server did not update only local field/entity");

    res = await api(session, `/api/planner/${encodeURIComponent(SITE)}/${DATE}/rows/planner_row_2026_05_21_1`, { changedFields: { comment: "SERVER_B" }, baseFieldVersions: { comment: 1 } });
    assert(res.status === 200, `Server planner B patch failed: ${res.status} ${JSON.stringify(res.body)}`);
    await triggerPlannerConflict(page, "MINE_B");
    await page.click("#entityConflictKeepMine");
    await delay(600);
    let state = await getState(session);
    assert(state.siteData[SITE].planner.dailyData[DATE].planningRows[0].comment === "MINE_B", "Keep mine did not resend only conflicting Planner field");

    res = await api(session, `/api/planner/${encodeURIComponent(SITE)}/${DATE}/rows/planner_row_2026_05_21_1`, { changedFields: { comment: "SERVER_C" }, baseFieldVersions: { comment: 3 } });
    assert(res.status === 200, `Server planner C patch failed: ${res.status} ${JSON.stringify(res.body)}`);
    await triggerPlannerConflict(page, "MINE_C");
    await page.click("#entityConflictRefresh");
    const refreshResult = await page.evaluate((date) => ({
      row1: appState.dailyData[date].planningRows[0].comment,
      row2: appState.dailyData[date].planningRows[1].comment,
    }), DATE);
    assert(refreshResult.row1 === "SERVER_C", "Refresh row did not apply server entity");
    assert(refreshResult.row2 === "LOCAL_OTHER_UNSAVED", "Refresh row touched another local row");

    res = await api(session, `/api/planner/${encodeURIComponent(SITE)}/${DATE}/rows/planner_row_2026_05_21_1`, { changedFields: { comment: "SERVER_D" }, baseFieldVersions: { comment: 4 } });
    assert(res.status === 200, `Server planner D patch failed: ${res.status} ${JSON.stringify(res.body)}`);
    await triggerPlannerConflict(page, "MINE_D");
    await page.click("#entityConflictCancel");
    const cancelLocal = await page.evaluate((date) => appState.dailyData[date].planningRows[0].comment, DATE);
    state = await getState(session);
    assert(cancelLocal === "MINE_D", "Cancel changed local Planner state");
    assert(state.siteData[SITE].planner.dailyData[DATE].planningRows[0].comment === "SERVER_D", "Cancel unexpectedly saved Planner state");

    res = await api(session, `/api/tidplan/${encodeURIComponent(SITE)}/activities/tid-1`, { changedFields: { komentar: "SERVER_T" }, baseFieldVersions: {} });
    assert(res.status === 200, `Server tidplan patch failed: ${res.status} ${JSON.stringify(res.body)}`);
    await triggerTidplanConflict(page, "MINE_T");
    const tidText = await page.textContent("#entityConflictOverlay");
    assert(tidText.includes("Tidplan") && tidText.includes("komentar") && tidText.includes("MINE_T") && tidText.includes("SERVER_T"), "Tidplan conflict panel missing details");

    console.log(JSON.stringify({
      ok: true,
      checks: [
        "planner_conflict_ui_visible",
        "tidplan_conflict_ui_visible",
        "use_server_only_entity",
        "keep_mine_resends_field",
        "refresh_row_preserves_other_local_changes",
        "cancel_keeps_local_without_save",
      ],
    }, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
