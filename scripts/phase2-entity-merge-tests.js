const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.PHASE2_ENTITY_TEST_PORT || 3291);
const HOST = `http://127.0.0.1:${PORT}`;
const USER = { email: "phase2-entity@cmax.test", password: "Phase2Entity!123" };
const SITE = "Entity Site";
const DATE = "2026-05-21";

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
  const cookie = parseCookie(typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : res.headers.get("set-cookie"));
  return { cookie, csrf: payload.csrfToken };
}

async function api(session, pathname, options = {}) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers || {});
  headers.set("Cookie", session.cookie);
  if (options.json !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) headers.set("x-csrf-token", session.csrf);
  const res = await fetch(`${HOST}${pathname}`, {
    method,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });
  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_) {
    payload = { raw: text };
  }
  return { ok: res.ok, status: res.status, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stateFixture() {
  return {
    version: 2,
    sites: [SITE],
    currentSite: SITE,
    moduleVersions: {
      planner: { [SITE]: 1 },
      tidplan: { [SITE]: 1 },
      warehouse: { [SITE]: 1 },
      storeCatalog: { [SITE]: 1 },
      adminUsers: 1,
    },
    siteData: {
      [SITE]: {
        planner: {
          workers: ["A", "B"],
          lifts: [],
          moments: [],
          plans: ["P1", "P20"],
          karnas: [],
          resourceHistory: [],
          dailyData: {
            [DATE]: {
              planningRows: [
                { id: "planner-row-1", worker: "A", plan: "P1", comment: "base1", rowVersion: 1, fieldVersions: {} },
                { id: "planner-row-20", worker: "B", plan: "P20", comment: "base20", rowVersion: 1, fieldVersions: {} },
              ],
              workerAttendance: {},
              liftAvailability: {},
              liftPlans: {},
            },
          },
        },
        tidplan: [
          { id: "activity-1", plan: "A1", komentar: "base1", start: "2026-05-21", activityVersion: 1, fieldVersions: {} },
          { id: "activity-20", plan: "A20", komentar: "base20", start: "2026-05-22", activityVersion: 1, fieldVersions: {} },
        ],
        tidplanZones: [],
        warehouse: {
          catalog: [{ id: "itm1", name: "Helmet", unit: "kom" }],
          stock: { itm1: { current: 1, totalIssued: 0, totalReceived: 1 } },
          logs: [],
        },
        store: {
          settings: {},
          products: [{ id: "base-product", name: "Base", active: true, sizes: ["M"], availableSites: ["*"], visibleToRoles: [] }],
          orders: [],
          carts: {},
          workerProfiles: {},
          creditLedger: [],
          auditLog: [],
        },
        notifications: [],
        surveys: [],
      },
    },
  };
}

async function patchPlanner(session, rowId, changedFields, baseFieldVersions = {}) {
  return api(session, `/api/planner/${encodeURIComponent(SITE)}/${DATE}/rows/${encodeURIComponent(rowId)}`, {
    method: "PATCH",
    json: { changedFields, baseFieldVersions },
  });
}

async function patchTidplan(session, activityId, changedFields, baseFieldVersions = {}) {
  return api(session, `/api/tidplan/${encodeURIComponent(SITE)}/activities/${encodeURIComponent(activityId)}`, {
    method: "PATCH",
    json: { changedFields, baseFieldVersions },
  });
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cmax-phase2-entity-"));
  const dataDir = path.join(tmp, "data");
  const uploadDir = path.join(tmp, "uploads");
  const backupDir = path.join(tmp, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([{
    email: USER.email,
    password: USER.password,
    fullName: "Phase 2 Entity",
    isSuperAdmin: true,
    level: 6,
    active: true,
    permissions: {},
    allowedSites: null,
    storeRoles: ["superadmin"],
  }]), null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope(stateFixture()), null, 2), "utf8");

  const proc = spawn(process.execPath, ["server/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      STORAGE_TYPE: "json",
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadDir,
      BACKUP_PATH: backupDir,
      BOOTSTRAP_ADMIN_EMAIL: USER.email,
      BOOTSTRAP_ADMIN_PASSWORD: USER.password,
      LOGIN_RATE_LIMIT_MAX: "100",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitHealth();
    const session = await login();

    let res = await patchPlanner(session, "planner-row-1", { comment: "planner row 1 A" });
    assert(res.ok, `Planner row 1 patch failed: ${res.status} ${JSON.stringify(res.payload)}`);
    res = await patchPlanner(session, "planner-row-20", { comment: "planner row 20 B" });
    assert(res.ok, `Planner row 20 patch failed: ${res.status} ${JSON.stringify(res.payload)}`);
    let state = (await api(session, "/api/state")).payload.state;
    assert(state.siteData[SITE].planner.dailyData[DATE].planningRows[0].comment === "planner row 1 A", "Planner row 1 lost");
    assert(state.siteData[SITE].planner.dailyData[DATE].planningRows[1].comment === "planner row 20 B", "Planner row 20 lost");

    res = await patchPlanner(session, "planner-row-1", { plan: "PlannerDifferentField" }, {});
    assert(res.ok, "Planner same row different field should merge when field untouched");
    res = await patchPlanner(session, "planner-row-1", { comment: "planner same field stale" }, {});
    assert(res.status === 409 && res.payload.error === "ENTITY_VERSION_CONFLICT", "Planner same field should conflict");

    res = await patchTidplan(session, "activity-1", { komentar: "tidplan activity 1 A" });
    assert(res.ok, `Tidplan activity 1 patch failed: ${res.status} ${JSON.stringify(res.payload)}`);
    res = await patchTidplan(session, "activity-20", { komentar: "tidplan activity 20 B" });
    assert(res.ok, `Tidplan activity 20 patch failed: ${res.status} ${JSON.stringify(res.payload)}`);
    state = (await api(session, "/api/state")).payload.state;
    assert(state.siteData[SITE].tidplan[0].komentar === "tidplan activity 1 A", "Tidplan activity 1 lost");
    assert(state.siteData[SITE].tidplan[1].komentar === "tidplan activity 20 B", "Tidplan activity 20 lost");

    res = await patchTidplan(session, "activity-1", { plan: "TidplanDifferentField" }, {});
    assert(res.ok, "Tidplan same activity different field should merge when field untouched");
    res = await patchTidplan(session, "activity-1", { komentar: "tidplan same field stale" }, {});
    assert(res.status === 409 && res.payload.error === "ENTITY_VERSION_CONFLICT", "Tidplan same field should conflict");

    res = await api(session, "/api/state/module", {
      method: "POST",
      json: {
        target: "warehouse",
        siteId: SITE,
        baseVersion: 1,
        payload: {
          warehouse: {
            catalog: [{ id: "itm1", name: "Helmet", unit: "kom" }],
            stock: { itm1: { current: 4, totalIssued: 0, totalReceived: 4 } },
            logs: [{ id: "w1", itemId: "itm1", quantity: 3, direction: "in" }],
          },
        },
      },
    });
    assert(res.ok, "Planner + Warehouse regression failed");
    res = await api(session, "/api/state/module", {
      method: "POST",
      json: {
        target: "storeCatalog",
        siteId: SITE,
        baseVersion: 1,
        payload: {
          store: {
            ...state.siteData[SITE].store,
            products: [...state.siteData[SITE].store.products, { id: "new-store-product", name: "New", active: true, sizes: ["M"], availableSites: ["*"], visibleToRoles: [] }],
          },
        },
      },
    });
    assert(res.ok, "Tidplan + Store regression failed");

    state = (await api(session, "/api/state")).payload.state;
    assert(state.siteData[SITE].planner.dailyData[DATE].planningRows[0].plan === "PlannerDifferentField", "Planner row merge did not persist after regressions");
    assert(state.siteData[SITE].tidplan[0].plan === "TidplanDifferentField", "Tidplan activity merge did not persist after regressions");
    assert(state.siteData[SITE].warehouse.stock.itm1.current === 4, "Warehouse regression data missing");
    assert(state.siteData[SITE].store.products.some((product) => product.id === "new-store-product"), "Store regression data missing");

    console.log(JSON.stringify({
      ok: true,
      checks: [
        "planner_different_rows_merge",
        "planner_same_row_different_field_merge",
        "planner_same_row_same_field_conflict",
        "tidplan_different_activities_merge",
        "tidplan_same_activity_different_field_merge",
        "tidplan_same_activity_same_field_conflict",
        "planner_warehouse_regression",
        "tidplan_store_regression",
      ],
    }, null, 2));
  } finally {
    proc.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
