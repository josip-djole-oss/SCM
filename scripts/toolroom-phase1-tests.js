const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-phase1-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 8500 + Math.floor(Math.random() * 400);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.worker@cmax.test", password: "Toolroom!123" };

function envelope(data) {
  return { version: 1, updatedAt: new Date().toISOString(), data };
}

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    {
      email: ADMIN.email,
      password: ADMIN.password,
      fullName: "Toolroom Admin",
      isSuperAdmin: true,
      level: 6,
      active: true,
      permissions: {},
      allowedSites: null,
    },
    {
      email: WORKER.email,
      password: WORKER.password,
      fullName: "Toolroom Worker",
      isSuperAdmin: false,
      level: 1,
      active: true,
      permissions: { canAccessToolroom: true },
      allowedSites: ["Toolroom Site"],
    },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Toolroom Site"],
    currentSite: "Toolroom Site",
    siteData: {
      "Toolroom Site": {
        warehouse: { catalog: [{ id: "wh-1", name: "Helmet" }], stock: {}, logs: [] },
      },
    },
    moduleVersions: { warehouse: { "Toolroom Site": 1 } },
    accountNotifications: {},
  }), null, 2));
}

function startServer() {
  writeFixture();
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      STORAGE_TYPE: "json",
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadDir,
      BACKUP_PATH: backupDir,
      BOOTSTRAP_ADMIN_EMAIL: ADMIN.email,
      BOOTSTRAP_ADMIN_PASSWORD: ADMIN.password,
      LOGIN_RATE_LIMIT_MAX: "100",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitHealth() {
  const started = Date.now();
  while (Date.now() - started < 60000) {
    try {
      const res = await fetch(`${host}/api/health`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok && json.storageReady) return;
    } catch (_) {}
    await delay(250);
  }
  throw new Error("Server did not become healthy");
}

async function api(session, url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.json);
  }
  if (session.cookie) headers.Cookie = session.cookie;
  if (session.csrf && options.method && options.method !== "GET") headers["x-csrf-token"] = session.csrf;
  const res = await fetch(`${host}${url}`, { ...options, headers });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) session.cookie = setCookie.split(";")[0];
  const payload = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, payload };
}

async function login(user) {
  const session = {};
  const res = await api(session, "/api/login", { method: "POST", json: { email: user.email, password: user.password } });
  assert(res.ok, `login failed ${res.status} ${JSON.stringify(res.payload)}`);
  session.csrf = res.payload.csrfToken;
  return session;
}

async function main() {
  const server = startServer();
  const checks = [];
  try {
    await waitHealth();
    const admin = await login(ADMIN);
    const worker = await login(WORKER);

    const initial = await api(admin, "/api/toolroom");
    assert(initial.ok, "admin can load toolroom");
    assert(Array.isArray(initial.payload.toolroom.categories), "categories exist");
    checks.push("toolroom route load");

    const workerCreate = await api(worker, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber: "B000", name: "Blocked" } } });
    assert.strictEqual(workerCreate.status, 403, "worker cannot create tool item");
    checks.push("permissions worker create 403");

    const categoryRes = await api(admin, "/api/toolroom/categories", { method: "POST", json: { category: { name: "Aku", parentId: "cat_drills", iconKey: "drill" } } });
    assert(categoryRes.ok, `category create failed ${JSON.stringify(categoryRes.payload)}`);
    const category = categoryRes.payload.category;
    const categoryEdit = await api(admin, "/api/toolroom/categories", { method: "POST", json: { baseVersion: category.categoryVersion, category: { ...category, name: "Aku busilice" } } });
    assert(categoryEdit.ok && categoryEdit.payload.category.categoryVersion === category.categoryVersion + 1, "category edit version bump");
    checks.push("category tree CRUD");

    const presetRes = await api(admin, "/api/toolroom/presets", { method: "POST", json: { preset: { type: "brand", label: "CMAX Test Brand", value: "CMAX Test Brand" } } });
    assert(presetRes.ok, "preset create");
    checks.push("preset CRUD");

    const itemA = await api(admin, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber: "B054", serialNumber: "SN-054", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "Milwaukee M18 FPD3", categoryId: category.id, status: "available" } } });
    assert(itemA.ok, `item create failed ${JSON.stringify(itemA.payload)}`);
    const itemB = await api(admin, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber: "B055", name: "Milwaukee M18 FPD3", status: "awaiting_engraving" } } });
    assert(itemB.ok, "second item create");
    checks.push("tool item CRUD");

    const duplicate = await api(admin, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber: "B054", name: "Duplicate" } } });
    assert.strictEqual(duplicate.status, 409, "duplicate internal number blocked");
    checks.push("duplicate internal number blocked");

    const freshEdit = await api(admin, "/api/toolroom/items", { method: "POST", json: { baseVersion: itemA.payload.item.itemVersion, item: { ...itemA.payload.item, notes: "Fresh edit" } } });
    assert(freshEdit.ok && freshEdit.payload.item.itemVersion === itemA.payload.item.itemVersion + 1, "fresh entity edit");
    const stale = await api(admin, "/api/toolroom/items", { method: "POST", json: { baseVersion: itemA.payload.item.itemVersion, item: { ...freshEdit.payload.item, name: "Stale edit" } } });
    assert.strictEqual(stale.status, 409, "entity conflict returned");
    assert.strictEqual(stale.payload.error, "ENTITY_VERSION_CONFLICT");
    checks.push("entity conflict test");

    const whBefore = await api(admin, "/api/state");
    const warehouseBefore = JSON.stringify(whBefore.payload.state.siteData["Toolroom Site"].warehouse);
    await api(admin, "/api/toolroom/items", { method: "POST", json: { baseVersion: itemB.payload.item.itemVersion, item: { ...itemB.payload.item, serialNumber: "SN-055" } } });
    const whAfter = await api(admin, "/api/state");
    assert.strictEqual(JSON.stringify(whAfter.payload.state.siteData["Toolroom Site"].warehouse), warehouseBefore, "toolroom save does not change warehouse");
    checks.push("toolroom save does not touch warehouse");

    const warehouseSave = await api(admin, "/api/state/module", {
      method: "POST",
      json: {
        target: "warehouse",
        siteId: "Toolroom Site",
        baseVersion: whAfter.payload.state.moduleVersions.warehouse["Toolroom Site"],
        payload: { warehouse: { catalog: [{ id: "wh-2", name: "Warehouse Only" }], stock: {}, logs: [] } },
      },
    });
    assert(warehouseSave.ok, "warehouse module save");
    const toolroomAfterWarehouse = await api(admin, "/api/toolroom");
    assert(toolroomAfterWarehouse.payload.toolroom.items.some((item) => item.internalNumber === "B054"), "warehouse save did not delete toolroom");
    checks.push("warehouse save does not touch toolroom");

    const backup = await api(admin, "/api/backup", { method: "POST", json: {} });
    assert(backup.ok, "backup create");
    const backupFile = fs.readdirSync(backupDir).find((name) => name.endsWith(".json"));
    const snapshot = JSON.parse(fs.readFileSync(path.join(backupDir, backupFile), "utf8"));
    assert(snapshot.toolroom && Array.isArray(snapshot.toolroom.items), "backup includes toolroom");
    checks.push("backup includes toolroom");

    console.log(JSON.stringify({ ok: true, checks }, null, 2));
  } finally {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(4000)]);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
