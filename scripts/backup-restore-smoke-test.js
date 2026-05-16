const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.BACKUP_RESTORE_TEST_PORT || 3217);
const HOST = `http://127.0.0.1:${PORT}`;
const BOOTSTRAP_EMAIL = "superadmin.backup@test.local";
const BOOTSTRAP_PASSWORD = "BackupTest!123";
const WORKER_EMAIL = "worker.backup@test.local";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  const value = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(value).split(";")[0];
}

function createEnvelope(data, version = 1) {
  return {
    version,
    updatedAt: new Date().toISOString(),
    data,
  };
}

async function waitForHealth(timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${HOST}/api/health`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok === true && data?.storageReady === true) return;
      }
    } catch (_) {}
    await delay(500);
  }
  throw new Error("Server health check timeout");
}

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmax-backup-restore-"));
  const dataDir = path.join(tmpRoot, "data");
  const uploadsDir = path.join(tmpRoot, "uploads");
  const backupsDir = path.join(tmpRoot, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(backupsDir, { recursive: true });

  const seededAdmins = [
    {
      email: BOOTSTRAP_EMAIL,
      password: BOOTSTRAP_PASSWORD,
      fullName: "Backup Superadmin",
      firstName: "Backup",
      lastName: "Superadmin",
      isSuperAdmin: true,
      level: 6,
      active: true,
      permissions: {},
      allowedSites: null,
      storeRoles: ["superadmin", "admin"],
    },
    {
      email: WORKER_EMAIL,
      password: "WorkerPass!123",
      fullName: "Backup Worker",
      firstName: "Backup",
      lastName: "Worker",
      isSuperAdmin: false,
      level: 1,
      active: true,
      permissions: {
        canAccessStore: true,
        canAccessWorkwear: true,
        canViewStoreTeamOrders: false,
        canManageStore: false,
        canManageWorkwear: false,
      },
      allowedSites: ["default"],
      storeRoles: ["radnik"],
    },
  ];
  fs.writeFileSync(
    path.join(dataDir, "admins.json"),
    JSON.stringify(createEnvelope(seededAdmins), null, 2),
    "utf8",
  );

  const serverProc = spawn("node", ["server/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      STORAGE_TYPE: "json",
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadsDir,
      BACKUP_PATH: backupsDir,
      BOOTSTRAP_ADMIN_EMAIL: BOOTSTRAP_EMAIL,
      BOOTSTRAP_ADMIN_PASSWORD: BOOTSTRAP_PASSWORD,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdoutBuf = "";
  let stderrBuf = "";
  serverProc.stdout.on("data", (chunk) => {
    stdoutBuf += String(chunk || "");
  });
  serverProc.stderr.on("data", (chunk) => {
    stderrBuf += String(chunk || "");
  });

  const cleanup = async () => {
    if (!serverProc.killed) {
      serverProc.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => serverProc.once("close", resolve)),
        delay(4000),
      ]);
      if (!serverProc.killed) serverProc.kill("SIGKILL");
    }
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch (_) {}
  };

  try {
    await waitForHealth();

    let cookie = "";
    let csrfToken = "";
    const loginRes = await fetch(`${HOST}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: BOOTSTRAP_EMAIL, password: BOOTSTRAP_PASSWORD }),
    });
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    const loginData = await loginRes.json();
    csrfToken = String(loginData?.csrfToken || "");
    cookie = parseCookie(
      typeof loginRes.headers.getSetCookie === "function"
        ? loginRes.headers.getSetCookie()
        : loginRes.headers.get("set-cookie"),
    );
    if (!csrfToken || !cookie) {
      throw new Error("Missing csrf token or session cookie after login");
    }

    async function api(pathname, options = {}) {
      const method = options.method || "GET";
      const headers = new Headers(options.headers || {});
      headers.set("Cookie", cookie);
      if (options.json !== undefined) {
        headers.set("Content-Type", "application/json");
      }
      if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
        headers.set("x-csrf-token", csrfToken);
      }
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
      if (!res.ok) {
        throw new Error(`${method} ${pathname} failed (${res.status}): ${JSON.stringify(payload)}`);
      }
      return payload;
    }

    const initial = await api("/api/state");
    const v1 = Number(initial?.version || 1);

    const seededState = {
      version: 2,
      sites: ["default", "north-site"],
      currentSite: "default",
      guestPermissions: { canAccessPlanner: true, canAccessStore: true, canAccessWorkwear: true },
      accountNotifications: {
        [BOOTSTRAP_EMAIL]: {
          notifications: [{ id: "acct_super_1", title: "Super alert", readAt: null }],
          siteTracker: { default: ["1"] },
          permissionSignature: "sig-super",
          workwearTracker: { default: ["evt-super"] },
        },
        [WORKER_EMAIL]: {
          notifications: [{ id: "acct_worker_1", title: "Worker alert", readAt: null }],
          siteTracker: { default: ["2"] },
          permissionSignature: "sig-worker",
          workwearTracker: { default: ["evt-worker"] },
        },
      },
      siteData: {
        default: {
          planner: {
            workers: ["Pero"],
            lifts: ["L1"],
            moments: ["M1"],
            plans: ["P1"],
            karnas: ["K1"],
            dailyData: { "2026-05-16": [{ worker1: "Pero", plan: "P1" }] },
            resourceHistory: [],
          },
          workers: ["Pero"],
          lifts: ["L1"],
          moments: ["M1"],
          plans: ["P1"],
          karnas: ["K1"],
          bins: { rows: [{ id: "bin-1", name: "Bin 1" }] },
          tidplan: [{ id: "tid-1", name: "Task 1", date: "2026-05-16" }],
          tidplanZones: [{ id: "zone-1", name: "Zone 1" }],
          warehouse: { catalog: [{ id: "wh-1", name: "Gloves", quantity: 5 }], logs: [] },
          store: {
            settings: {
              budgetMode: "global",
              budgetEnabled: true,
              reserveOnPending: true,
              creditRenewalAmount: 2500,
              creditRenewalPeriodMonths: 6,
              categoryCatalog: {
                "Zimska oprema": {
                  active: true,
                  subcategories: { "Softshell jakne": { active: true } },
                },
              },
              categoryCatalogVersion: 1,
            },
            products: [
              {
                id: "STP-1",
                name: "Jakna CMAX",
                description: "Test product",
                category: "Zimska oprema",
                subcategory: "Softshell jakne",
                active: true,
                sizes: ["M", "L"],
                price: 500,
                creditCost: 500,
              },
            ],
            orders: [
              
            ],
            carts: {
              [WORKER_EMAIL]: {
                items: [{ productId: "STP-1", productName: "Jakna CMAX", quantity: 1 }],
                comment: "cart keep",
                urgent: false,
              },
            },
            workerProfiles: {
              [WORKER_EMAIL]: {
                workerId: WORKER_EMAIL,
                workerName: "Backup Worker",
                creditBalance: 2500,
                reservedCredit: 0,
                orderHistory: [],
                savedSizes: { jacket: "L" },
                freeEligibility: {},
                adjustments: [],
              },
            },
            creditLedger: [],
            supplierConnections: [{ id: "manual", name: "Manual Supplier", adapter: "manualSupplierAdapter", active: true }],
            supplierSyncLog: [{ id: "sync-1", status: "ok" }],
            notificationEvents: [{ id: "evt-1", eventType: "store_notification", title: "Order pending" }],
            passwordResetRequests: [],
            auditLog: [{ id: "audit-1", eventType: "bulk_edit_applied" }],
            version: 2,
            meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          },
          reports: [{ id: "rep-1", title: "Report 1" }],
          notifications: [{ id: 1001, message: "Site alert default" }],
          surveys: [{ id: "survey-1", question: "Test survey?" }],
        },
        "north-site": {
          planner: { workers: ["Marko"], lifts: [], moments: [], plans: [], karnas: [], dailyData: {}, resourceHistory: [] },
          workers: ["Marko"],
          lifts: [],
          moments: [],
          plans: [],
          karnas: [],
          bins: { rows: [] },
          tidplan: [],
          tidplanZones: [],
          warehouse: { catalog: [], logs: [] },
          store: { settings: {}, products: [], orders: [], carts: {}, workerProfiles: {}, creditLedger: [], supplierConnections: [], supplierSyncLog: [], notificationEvents: [], passwordResetRequests: [], auditLog: [], version: 1, meta: {} },
          reports: [],
          notifications: [{ id: 2001, message: "North site alert" }],
        },
      },
    };

    await api("/api/state", { method: "POST", json: { state: seededState, lastKnownVersion: v1, module: "backup-test-seed" } });
    const seeded = await api("/api/state");
    if (!seeded?.state?.siteData?.default?.store?.products?.length) {
      throw new Error("Seed state missing default store products");
    }

    const workerLoginResSeed = await fetch(`${HOST}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: WORKER_EMAIL, password: "WorkerPass!123" }),
    });
    if (!workerLoginResSeed.ok) throw new Error(`Worker login failed before order seed (${workerLoginResSeed.status})`);
    const workerLoginSeed = await workerLoginResSeed.json();
    const workerCookieSeed = parseCookie(
      typeof workerLoginResSeed.headers.getSetCookie === "function"
        ? workerLoginResSeed.headers.getSetCookie()
        : workerLoginResSeed.headers.get("set-cookie"),
    );
    const workerCsrfSeed = String(workerLoginSeed?.csrfToken || "");
    if (!workerCookieSeed || !workerCsrfSeed) throw new Error("Worker seed session missing");
    const workerOrderSeedRes = await fetch(`${HOST}/api/store/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: workerCookieSeed,
        "x-csrf-token": workerCsrfSeed,
      },
      body: JSON.stringify({
        site: "default",
        order: {
          workerComment: "Backup order seed",
          urgent: false,
          items: [{ productId: "STP-1", size: "M", quantity: 1 }],
        },
      }),
    });
    const workerOrderSeedPayload = await workerOrderSeedRes.json().catch(() => ({}));
    if (!workerOrderSeedRes.ok) {
      throw new Error(`Worker order seed failed (${workerOrderSeedRes.status}): ${JSON.stringify(workerOrderSeedPayload)}`);
    }

    const backupCreated = await api("/api/backup", { method: "POST", json: {} });
    const backupId = backupCreated?.id || backupCreated?.file;
    if (!backupId) throw new Error("Backup response missing id/file");

    const v2 = Number((await api("/api/state"))?.version || 1);
    const mutatedState = JSON.parse(JSON.stringify(seededState));
    mutatedState.accountNotifications = {};
    mutatedState.siteData.default.store.products = [];
    mutatedState.siteData.default.store.orders = [];
    mutatedState.siteData.default.store.creditLedger = [];
    mutatedState.siteData.default.store.auditLog = [];
    mutatedState.siteData.default.store.settings.categoryCatalog = {};
    await api("/api/state", { method: "POST", json: { state: mutatedState, lastKnownVersion: v2, module: "backup-test-mutate" } });

    const adminsFileBeforeRestore = path.join(dataDir, "admins.json");
    const adminsEnvelopeBeforeRestore = JSON.parse(fs.readFileSync(adminsFileBeforeRestore, "utf8"));
    const adminsDataBeforeRestore = Array.isArray(adminsEnvelopeBeforeRestore?.data) ? adminsEnvelopeBeforeRestore.data : [];
    const workerBeforeRestore = adminsDataBeforeRestore.find((entry) => String(entry?.email || "").toLowerCase() === WORKER_EMAIL);
    if (workerBeforeRestore) {
      workerBeforeRestore.storeRoles = ["kontor"];
      workerBeforeRestore.allowedSites = ["north-site"];
    }
    fs.writeFileSync(
      adminsFileBeforeRestore,
      JSON.stringify(createEnvelope(adminsDataBeforeRestore, Number(adminsEnvelopeBeforeRestore?.version || 1) + 1), null, 2),
      "utf8",
    );
    const mutated = await api("/api/state");
    if ((mutated?.state?.siteData?.default?.store?.products || []).length !== 0) {
      throw new Error("Mutation step failed: products not cleared");
    }

    const restoreDryRun = await api("/api/backup/restore/dry-run", { method: "POST", json: { id: backupId } });
    const restoreToken = String(restoreDryRun?.restoreToken || "");
    if (!restoreToken) throw new Error("Restore dry-run missing restoreToken");
    const restoreResult = await api("/api/backup/restore", {
      method: "POST",
      json: { id: backupId, restoreToken, confirmationText: "RESTORE" },
    });
    if (restoreResult?.integrity?.ok !== true) {
      throw new Error(`Restore integrity check failed: ${JSON.stringify(restoreResult?.integrity || {})}`);
    }

    const restored = await api("/api/state");
    const restoredStore = restored?.state?.siteData?.default?.store || {};
    if ((restoredStore.products || []).length < 1) throw new Error("Restore failed: store products missing");
    if ((restoredStore.orders || []).length < 1) throw new Error("Restore failed: store orders missing");
    if ((restoredStore.creditLedger || []).length < 1) throw new Error("Restore failed: store credit ledger missing");
    if ((restoredStore.auditLog || []).length < 1) throw new Error("Restore failed: store audit log missing");
    if (!restoredStore.settings?.categoryCatalog?.["Zimska oprema"]) throw new Error("Restore failed: store category catalog missing");
    if (!Array.isArray(restored?.state?.sites) || !restored.state.sites.includes("north-site")) {
      throw new Error("Restore failed: site list / site isolation metadata missing");
    }

    const stateFile = path.join(dataDir, "state.json");
    const stateEnvelope = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    const stateData = stateEnvelope?.data || {};
    if (!stateData?.accountNotifications?.[WORKER_EMAIL]) {
      throw new Error("Restore failed: worker account notifications missing in server state");
    }
    if (!stateData?.accountNotifications?.[BOOTSTRAP_EMAIL]) {
      throw new Error("Restore failed: superadmin account notifications missing in server state");
    }

    const adminsFile = path.join(dataDir, "admins.json");
    const adminsEnvelope = JSON.parse(fs.readFileSync(adminsFile, "utf8"));
    const admins = Array.isArray(adminsEnvelope?.data) ? adminsEnvelope.data : [];
    const workerAdmin = admins.find((entry) => String(entry?.email || "").toLowerCase() === WORKER_EMAIL);
    if (!workerAdmin) throw new Error("Restore failed: worker admin record missing");
    if (!Array.isArray(workerAdmin.storeRoles) || !workerAdmin.storeRoles.includes("radnik")) {
      throw new Error("Restore failed: worker storeRoles not restored");
    }

    const workerLoginRes = await fetch(`${HOST}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: WORKER_EMAIL, password: "WorkerPass!123" }),
    });
    if (!workerLoginRes.ok) throw new Error(`Worker login failed after restore (${workerLoginRes.status})`);
    const workerLogin = await workerLoginRes.json();
    const workerCookie = parseCookie(
      typeof workerLoginRes.headers.getSetCookie === "function"
        ? workerLoginRes.headers.getSetCookie()
        : workerLoginRes.headers.get("set-cookie"),
    );
    const workerCsrf = String(workerLogin?.csrfToken || "");
    if (!workerCookie || !workerCsrf) throw new Error("Worker auth session missing after restore");

    const workerOrdersRes = await fetch(`${HOST}/api/store/orders?site=default`, {
      method: "GET",
      headers: { Cookie: workerCookie, "x-csrf-token": workerCsrf },
    });
    const workerOrdersData = await workerOrdersRes.json();
    if (!workerOrdersRes.ok) throw new Error(`Worker orders fetch failed (${workerOrdersRes.status})`);
    if (!Array.isArray(workerOrdersData?.orders) || workerOrdersData.orders.length !== 1) {
      throw new Error("Worker should see only own orders after restore");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          checks: [
            "backup_created",
            "restore_dry_run_preview",
            "restore_completed",
            "store_products_restored",
            "store_orders_restored",
            "store_budget_ledger_restored",
            "store_audit_log_restored",
            "store_categories_restored",
            "account_notifications_restored",
            "user_functions_roles_restored",
            "site_isolation_metadata_restored",
            "worker_login_after_restore",
            "worker_order_visibility_guard",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
