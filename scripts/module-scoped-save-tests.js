const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.MODULE_SCOPED_SAVE_TEST_PORT || 3287);
const HOST = `http://127.0.0.1:${PORT}`;
const SUPER = { email: "super.module@test.local", password: "SuperModule!123" };
const WORKER = { email: "worker.module@test.local", password: "WorkerModule!123" };

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
    await delay(350);
  }
  throw new Error("Server did not become healthy");
}

async function login(email, password) {
  const res = await fetch(`${HOST}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Login failed ${email}: ${res.status} ${JSON.stringify(payload)}`);
  const cookie = parseCookie(
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : res.headers.get("set-cookie"),
  );
  if (!cookie || !payload.csrfToken) throw new Error(`Missing auth material for ${email}`);
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

function initialState() {
  return {
    version: 2,
    sites: ["Site A"],
    currentSite: "Site A",
    moduleVersions: {
      planner: { "Site A": 1 },
      tidplan: { "Site A": 1 },
      warehouse: { "Site A": 1 },
      bins: { "Site A": 1 },
      storeCatalog: { "Site A": 1 },
      storeSettings: { "Site A": 1 },
      adminUsers: 1,
    },
    siteData: {
      "Site A": {
        planner: {
          workers: ["Pero"],
          lifts: ["L1"],
          moments: ["M1"],
          plans: ["P1"],
          karnas: ["K1"],
          resourceHistory: [],
          dailyData: {
            "2026-05-21": {
              planningRows: [{ worker: "Pero", plan: "P1", komentar: "base" }],
              workerAttendance: {},
              liftAvailability: {},
              liftPlans: {},
            },
          },
        },
        bins: { "2026-05-21": { rows: [{ plan: "P1", totalAvailable: 1 }] } },
        tidplan: [
          { id: "t1", plan: "P1", start: "2026-05-21", komentar: "row1" },
          { id: "t20", plan: "P20", start: "2026-05-22", komentar: "row20" },
        ],
        tidplanZones: [{ name: "Zona A", color: "#abc" }],
        warehouse: {
          catalog: [{ id: "itm1", name: "Helmet", unit: "kom", minimum: 0 }],
          stock: { itm1: { current: 5, totalIssued: 0, totalReceived: 5 } },
          logs: [],
          issueDraft: { worker: "", slots: [], comment: "" },
          stockForm: { itemId: "itm1", quantity: 1, direction: "in", comment: "" },
        },
        store: {
          settings: { budgetEnabled: true, reserveOnPending: true },
          products: [{
            id: "P500",
            name: "Jacket",
            active: true,
            category: "Odjeca",
            subcategory: "Jakne",
            sizes: ["M"],
            availableSites: ["*"],
            visibleToRoles: [],
            price: 500,
            creditCost: 500,
            usesBudget: false,
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
      },
    },
  };
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cmax-module-save-"));
  const dataDir = path.join(tmp, "data");
  const uploadDir = path.join(tmp, "uploads");
  const backupDir = path.join(tmp, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    {
      email: SUPER.email,
      password: SUPER.password,
      fullName: "Super Module",
      isSuperAdmin: true,
      level: 6,
      active: true,
      permissions: {},
      allowedSites: null,
      storeRoles: ["superadmin"],
    },
    {
      email: WORKER.email,
      password: WORKER.password,
      fullName: "Worker Module",
      isSuperAdmin: false,
      level: 1,
      active: true,
      permissions: { canAccessStore: true, canAccessWorkwear: true },
      allowedSites: ["Site A"],
      storeRoles: ["radnik"],
    },
  ]), null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope(initialState()), null, 2), "utf8");

  const proc = spawn(process.execPath, ["server/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      STORAGE_TYPE: "json",
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadDir,
      BACKUP_PATH: backupDir,
      BOOTSTRAP_ADMIN_EMAIL: SUPER.email,
      BOOTSTRAP_ADMIN_PASSWORD: SUPER.password,
      LOGIN_RATE_LIMIT_MAX: "100",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitHealth();
    const superSession = await login(SUPER.email, SUPER.password);
    const workerSession = await login(WORKER.email, WORKER.password);

    const plannerPayload = {
      planner: {
        ...initialState().siteData["Site A"].planner,
        dailyData: {
          "2026-05-21": {
            planningRows: [{ worker: "Pero", plan: "P1", komentar: "planner A" }],
            workerAttendance: {},
            liftAvailability: {},
            liftPlans: {},
          },
        },
      },
    };
    const warehousePayload = {
      warehouse: {
        ...initialState().siteData["Site A"].warehouse,
        stock: { itm1: { current: 8, totalIssued: 0, totalReceived: 8 } },
        logs: [{ id: "w1", itemId: "itm1", quantity: 3, direction: "in" }],
      },
    };

    let res = await api(superSession, "/api/state/module", {
      method: "POST",
      json: { target: "planner", siteId: "Site A", baseVersion: 1, payload: plannerPayload },
    });
    assert(res.ok, `Planner scoped save failed: ${res.status} ${JSON.stringify(res.payload)}`);
    res = await api(superSession, "/api/state/module", {
      method: "POST",
      json: { target: "warehouse", siteId: "Site A", baseVersion: 1, payload: warehousePayload },
    });
    assert(res.ok, `Warehouse scoped save failed after planner: ${res.status} ${JSON.stringify(res.payload)}`);

    let state = (await api(superSession, "/api/state")).payload.state;
    assert(state.siteData["Site A"].planner.dailyData["2026-05-21"].planningRows[0].komentar === "planner A", "Planner change was lost after warehouse save");
    assert(state.siteData["Site A"].warehouse.stock.itm1.current === 8, "Warehouse change was not saved");

    res = await api(superSession, "/api/state/module", {
      method: "POST",
      json: {
        target: "tidplan",
        siteId: "Site A",
        baseVersion: 1,
        payload: { tidplan: [{ id: "t1", komentar: "tidplan A" }, { id: "t20", komentar: "row20" }], tidplanZones: [] },
      },
    });
    assert(res.ok, "Tidplan scoped save failed");
    res = await api(superSession, "/api/state/module", {
      method: "POST",
      json: {
        target: "warehouse",
        siteId: "Site A",
        baseVersion: 2,
        payload: { warehouse: { ...warehousePayload.warehouse, stock: { itm1: { current: 10, totalIssued: 0, totalReceived: 10 } } } },
      },
    });
    assert(res.ok, "Warehouse scoped save failed after tidplan");
    state = (await api(superSession, "/api/state")).payload.state;
    assert(state.siteData["Site A"].tidplan[0].komentar === "tidplan A", "Tidplan change was lost after warehouse save");
    assert(state.siteData["Site A"].warehouse.stock.itm1.current === 10, "Warehouse second change was not saved");

    res = await api(workerSession, "/api/store/orders", {
      method: "POST",
      json: { site: "Site A", order: { items: [{ productId: "P500", size: "M", quantity: 1 }] } },
    });
    assert(res.status === 201, `Store order failed: ${res.status} ${JSON.stringify(res.payload)}`);
    state = (await api(superSession, "/api/state")).payload.state;
    assert(state.siteData["Site A"].warehouse.stock.itm1.current === 10, "Warehouse was changed by store order");
    assert(state.siteData["Site A"].store.orders.length === 1, "Store order was not saved");

    res = await api(superSession, "/api/notifications", {
      method: "POST",
      json: {
        site: "Site A",
        lastKnownVersion: 1,
        notifications: [{ id: "n1", message: "Scoped notification", createdAt: new Date().toISOString() }],
      },
    });
    assert(res.ok, `Notification save failed: ${res.status} ${JSON.stringify(res.payload)}`);
    res = await api(superSession, "/api/surveys", {
      method: "POST",
      json: {
        site: "Site A",
        question: "Scoped survey?",
        answers: ["Yes", "No"],
        startDate: "2026-05-21",
        startTime: "08:00",
        endDate: "2026-05-22",
        endTime: "08:00",
        targetSite: true,
        privacy: "semiAnonymous",
      },
    });
    assert(res.ok, `Survey save failed: ${res.status} ${JSON.stringify(res.payload)}`);
    const surveysPayload = await api(superSession, "/api/surveys?site=Site%20A");
    assert(Array.isArray(surveysPayload.payload.surveys) && surveysPayload.payload.surveys.length === 1, "Survey was not saved");
    const notificationsPayload = await api(superSession, "/api/notifications?site=Site%20A");
    assert(Array.isArray(notificationsPayload.payload.notifications) && notificationsPayload.payload.notifications.length === 1, "Notification was not saved");
    state = (await api(superSession, "/api/state")).payload.state;
    assert(state.siteData["Site A"].warehouse.stock.itm1.current === 10, "Survey/notification flow changed Warehouse");
    assert(state.siteData["Site A"].planner.dailyData["2026-05-21"].planningRows[0].komentar === "planner A", "Survey/notification flow changed Planner");

    res = await api(superSession, "/api/state/module", {
      method: "POST",
      json: { target: "warehouse", siteId: "Site A", baseVersion: 1, payload: warehousePayload },
    });
    assert(res.status === 409 && res.payload.error === "MODULE_VERSION_CONFLICT", "Stale same-module save did not return module conflict");

    res = await api(superSession, "/api/state/module", {
      method: "POST",
      json: { target: "warehouse", siteId: "Site A", baseVersion: 3, payload: { warehouse: warehousePayload.warehouse, planner: plannerPayload.planner } },
    });
    assert(res.status === 400 && res.payload.error === "MODULE_PAYLOAD_SCOPE_ERROR", "Cross-module payload was not rejected");

    res = await api(superSession, "/api/state/module", {
      method: "POST",
      json: {
        target: "storeCatalog",
        siteId: "Site A",
        baseVersion: 1,
        payload: {
          store: {
            products: [{ ...initialState().siteData["Site A"].store.products[0], name: "Updated Jacket" }],
          },
        },
      },
    });
    assert(res.ok, `Store catalog save failed: ${res.status} ${JSON.stringify(res.payload)}`);
    state = (await api(superSession, "/api/state")).payload.state;
    assert(state.siteData["Site A"].planner.dailyData["2026-05-21"].planningRows[0].komentar === "planner A", "Store catalog save overwrote Planner");
    assert(state.siteData["Site A"].warehouse.stock.itm1.current === 10, "Store catalog save overwrote Warehouse");
    assert(state.siteData["Site A"].tidplan[0].komentar === "tidplan A", "Store catalog save overwrote Tidplan");

    const admins = [
      {
        email: SUPER.email,
        password: SUPER.password,
        fullName: "Super Module",
        isSuperAdmin: true,
        level: 6,
        active: true,
        permissions: {},
        allowedSites: null,
        storeRoles: ["superadmin"],
      },
      {
        email: WORKER.email,
        password: WORKER.password,
        fullName: "Worker Module",
        isSuperAdmin: false,
        level: 1,
        active: true,
        permissions: { canAccessStore: true, canAccessWorkwear: true },
        allowedSites: ["Site A"],
        storeRoles: ["radnik"],
      },
    ];
    res = await api(superSession, "/api/state/module", {
      method: "POST",
      json: { target: "adminUsers", baseVersion: 1, payload: { admins } },
    });
    assert(res.ok, `Admin users scoped save failed: ${res.status} ${JSON.stringify(res.payload)}`);
    state = (await api(superSession, "/api/state")).payload.state;
    assert(state.siteData["Site A"].warehouse.stock.itm1.current === 10, "Admin save changed siteData warehouse");
    assert(state.siteData["Site A"].planner.dailyData["2026-05-21"].planningRows[0].komentar === "planner A", "Admin save changed siteData planner");

    console.log(JSON.stringify({
      ok: true,
      checks: [
        "planner_plus_warehouse_preserved",
        "tidplan_plus_warehouse_preserved",
        "warehouse_plus_store_order_preserved",
        "notifications_plus_surveys_no_cross_module_loss",
        "stale_same_module_conflict",
        "cross_module_payload_rejected",
        "store_catalog_does_not_overwrite_other_modules",
        "admin_save_does_not_carry_site_data",
      ],
    }, null, 2));
  } finally {
    proc.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => proc.once("close", resolve)), delay(4000)]);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
