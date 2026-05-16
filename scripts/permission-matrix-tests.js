const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.PERMISSION_MATRIX_TEST_PORT || 3221);
const HOST = `http://127.0.0.1:${PORT}`;

const USERS = {
  superadmin: { email: "superadmin.matrix@test.local", password: "SuperAdmin!123" },
  admin: { email: "admin.matrix@test.local", password: "AdminUser!123" },
  manager: { email: "manager.matrix@test.local", password: "Manager!123" },
  worker: { email: "worker.matrix@test.local", password: "Worker!123" },
};

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
        const payload = await res.json();
        if (payload?.ok === true && payload?.storageReady === true) return;
      }
    } catch (_) {}
    await delay(500);
  }
  throw new Error("Server health check timeout");
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
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie"),
  );
  const csrf = String(payload?.csrfToken || "");
  if (!cookie || !csrf) throw new Error(`Missing auth material for ${email}`);
  return { cookie, csrf, auth: payload?.auth || {} };
}

async function api(session, pathname, options = {}) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers || {});
  headers.set("Cookie", session.cookie);
  if (options.json !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers.set("x-csrf-token", session.csrf);
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
  return { status: res.status, ok: res.ok, payload };
}

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmax-permission-matrix-"));
  const dataDir = path.join(tmpRoot, "data");
  const uploadsDir = path.join(tmpRoot, "uploads");
  const backupsDir = path.join(tmpRoot, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(backupsDir, { recursive: true });

  const seededAdmins = [
    {
      email: USERS.superadmin.email,
      password: USERS.superadmin.password,
      fullName: "Matrix Superadmin",
      isSuperAdmin: true,
      level: 6,
      active: true,
      permissions: {},
      allowedSites: null,
      storeRoles: ["superadmin", "admin"],
    },
    {
      email: USERS.admin.email,
      password: USERS.admin.password,
      fullName: "Matrix Admin",
      isSuperAdmin: false,
      level: 5,
      active: true,
      permissions: {
        canManageAdmins: true,
        canOpenAdminPanel: true,
        canAccessStore: true,
        canAccessWorkwear: true,
        canToggleReadOnly: true,
      },
      allowedSites: ["default"],
      storeRoles: ["admin"],
    },
    {
      email: USERS.manager.email,
      password: USERS.manager.password,
      fullName: "Matrix Store Manager",
      isSuperAdmin: false,
      level: 4,
      active: true,
      permissions: {
        canAccessStore: true,
        canAccessWorkwear: true,
        canManageStore: true,
        canManageWorkwear: true,
        canViewStoreTeamOrders: true,
        canExportStore: true,
      },
      allowedSites: ["default"],
      storeRoles: ["store_manager"],
    },
    {
      email: USERS.worker.email,
      password: USERS.worker.password,
      fullName: "Matrix Worker",
      isSuperAdmin: false,
      level: 1,
      active: true,
      permissions: {
        canAccessStore: true,
        canAccessWorkwear: true,
      },
      allowedSites: ["default"],
      storeRoles: ["radnik"],
    },
  ];

  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(createEnvelope(seededAdmins), null, 2), "utf8");

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
      BOOTSTRAP_ADMIN_EMAIL: USERS.superadmin.email,
      BOOTSTRAP_ADMIN_PASSWORD: USERS.superadmin.password,
    },
    stdio: ["ignore", "pipe", "pipe"],
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
    const superSession = await login(USERS.superadmin.email, USERS.superadmin.password);
    const managerSession = await login(USERS.manager.email, USERS.manager.password);
    const workerSession = await login(USERS.worker.email, USERS.worker.password);
    const adminSession = await login(USERS.admin.email, USERS.admin.password);

    const stateRes = await api(superSession, "/api/state");
    if (!stateRes.ok) throw new Error("Failed to load initial state as superadmin");
    const state = stateRes.payload?.state || {};
    const lastKnownVersion = Number(stateRes.payload?.version || 1);
    const nowIso = new Date().toISOString();

    const seededState = {
      ...state,
      sites: ["default"],
      currentSite: "default",
      siteData: {
        ...(state.siteData || {}),
        default: {
          ...(state.siteData?.default || {}),
          store: {
            settings: {
              budgetMode: "global",
              budgetEnabled: true,
              reserveOnPending: true,
              creditRenewalAmount: 2500,
              creditRenewalPeriodMonths: 6,
              categoryCatalog: {},
              categoryCatalogVersion: 1,
            },
            products: [
              {
                id: "MATRIX-P1",
                name: "Matrix Jacket",
                category: "Odjeca",
                subcategory: "Jakne",
                active: true,
                availableSites: ["*"],
                visibleToRoles: [],
                sizes: ["M"],
                price: 500,
                creditCost: 500,
                usesBudget: true,
                approvalRequired: true,
                freeRule: { enabled: false, mode: "none", periodDays: 180 },
                periodLimit: { enabled: false, quantity: 0, periodDays: 0 },
                upgradeRule: { enabled: false, companyCoveredAmount: 0, differenceAmount: 0 },
              },
            ],
            orders: [],
            carts: {},
            workerProfiles: {
              [USERS.worker.email]: {
                workerId: USERS.worker.email,
                workerName: "Matrix Worker",
                creditBalance: 2500,
                reservedCredit: 0,
                orderHistory: [],
                savedSizes: {},
                freeEligibility: {},
                adjustments: [],
              },
            },
            creditLedger: [],
            supplierConnections: [{ id: "manual", name: "Manual Supplier", adapter: "manualSupplierAdapter", active: true }],
            supplierSyncLog: [],
            notificationEvents: [],
            passwordResetRequests: [],
            auditLog: [],
            version: 1,
            meta: { createdAt: nowIso, updatedAt: nowIso },
          },
        },
      },
    };

    const seedWrite = await api(superSession, "/api/state", {
      method: "POST",
      json: { state: seededState, lastKnownVersion, module: "permission-matrix-seed" },
    });
    if (!seedWrite.ok) throw new Error(`Seed write failed: ${seedWrite.status} ${JSON.stringify(seedWrite.payload)}`);

    const workerOrderSeed = await api(workerSession, "/api/store/orders", {
      method: "POST",
      json: {
        site: "default",
        order: {
          workerComment: "Permission matrix seed order",
          urgent: false,
          items: [{ productId: "MATRIX-P1", size: "M", quantity: 1 }],
        },
      },
    });
    if (!workerOrderSeed.ok) {
      throw new Error(`Worker order seed failed: ${workerOrderSeed.status} ${JSON.stringify(workerOrderSeed.payload)}`);
    }
    const orderId = String(workerOrderSeed.payload?.order?.id || "");
    if (!orderId) throw new Error("Missing seeded order id");

    const workerState = await api(workerSession, "/api/state");
    const workerVersion = Number(workerState.payload?.version || 1);
    const workerMutated = JSON.parse(JSON.stringify(workerState.payload?.state || {}));
    workerMutated.siteData.default.store.products = [{ id: "EVIL", name: "Evil", active: true }];
    const workerMutationRes = await api(workerSession, "/api/state", {
      method: "POST",
      json: { state: workerMutated, lastKnownVersion: workerVersion, module: "store-worker-illegal-products" },
    });
    if (workerMutationRes.status !== 403) {
      throw new Error(`Worker store catalog mutation should be 403, got ${workerMutationRes.status}`);
    }

    const workerExport = await api(workerSession, "/api/store/export/csv?siteScope=all&statusScope=all");
    if (workerExport.status !== 403) {
      throw new Error(`Worker export all orders should be 403, got ${workerExport.status}`);
    }

    const workerStatus = await api(workerSession, `/api/store/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      json: { site: "default", status: "Approved" },
    });
    if (workerStatus.status !== 403) {
      throw new Error(`Worker status update should be 403, got ${workerStatus.status}`);
    }

    const managerApprove = await api(managerSession, `/api/store/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      json: { site: "default", status: "Approved" },
    });
    if (!managerApprove.ok) {
      throw new Error(`Manager approve should succeed, got ${managerApprove.status}`);
    }

    const managerDeliver = await api(managerSession, `/api/store/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      json: { site: "default", status: "Delivered" },
    });
    if (!managerDeliver.ok) {
      throw new Error(`Manager deliver should succeed, got ${managerDeliver.status}`);
    }

    const adminSuperAction = await api(adminSession, "/api/admin/toggle-readonly", {
      method: "POST",
      json: { email: USERS.worker.email },
    });
    if (adminSuperAction.status !== 403) {
      throw new Error(`Admin superadmin-only action should be 403, got ${adminSuperAction.status}`);
    }

    const adminState = await api(adminSession, "/api/state");
    const adminVersion = Number(adminState.payload?.version || 1);
    const adminStateMutated = JSON.parse(JSON.stringify(adminState.payload?.state || {}));
    if (!Array.isArray(adminStateMutated.admins)) throw new Error("Admin state missing admins list");
    const workerAdmin = adminStateMutated.admins.find((entry) => String(entry?.email || "").toLowerCase() === USERS.worker.email);
    if (!workerAdmin) throw new Error("Admin state missing worker account");
    workerAdmin.storeRoles = ["radnik", "store_manager"];
    const adminRoleUpdate = await api(adminSession, "/api/state", {
      method: "POST",
      json: { state: adminStateMutated, lastKnownVersion: adminVersion, module: "admin-role-update" },
    });
    if (!adminRoleUpdate.ok) {
      throw new Error(`Admin role/function update should succeed, got ${adminRoleUpdate.status}`);
    }

    console.log(JSON.stringify({
      ok: true,
      checks: [
        "worker_manager_action_forbidden_403",
        "worker_export_forbidden_403",
        "worker_status_update_forbidden_403",
        "store_manager_can_approve",
        "store_manager_can_deliver",
        "admin_cannot_call_superadmin_action",
        "admin_can_update_user_function_role",
      ],
    }, null, 2));
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
