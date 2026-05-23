const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-phase2-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 8900 + Math.floor(Math.random() * 300);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.worker@cmax.test", password: "Toolroom!123" };
const MANAGER = { email: "toolroom.manager@cmax.test", password: "Toolroom!123" };

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Toolroom Admin", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: MANAGER.email, password: MANAGER.password, fullName: "Toolroom Manager", isSuperAdmin: false, level: 5, active: true, permissions: { canAccessToolroom: true, canManageToolroom: true, canAssignTools: true, canReturnTools: true, canViewToolHistory: true }, allowedSites: ["Toolroom Site", "Site B"] },
    { email: WORKER.email, password: WORKER.password, fullName: "Toolroom Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessToolroom: true, canViewMyTools: true }, allowedSites: ["Toolroom Site", "Site B"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Toolroom Site", "Site B"],
    currentSite: "Toolroom Site",
    siteData: {
      "Toolroom Site": { warehouse: { catalog: [{ id: "wh-1", name: "Helmet" }], stock: {}, logs: [] } },
      "Site B": { warehouse: { catalog: [], stock: {}, logs: [] } },
    },
    moduleVersions: { warehouse: { "Toolroom Site": 1, "Site B": 1 } },
    accountNotifications: {},
  }), null, 2));
}

function startServer() {
  writeFixture();
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NODE_ENV: "test", STORAGE_TYPE: "json", DATA_PATH: dataDir, UPLOAD_PATH: uploadDir, BACKUP_PATH: backupDir, BOOTSTRAP_ADMIN_EMAIL: ADMIN.email, BOOTSTRAP_ADMIN_PASSWORD: ADMIN.password, LOGIN_RATE_LIMIT_MAX: "100" },
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
  if (options.json !== undefined) { headers["Content-Type"] = "application/json"; options.body = JSON.stringify(options.json); }
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

async function createTool(session, internalNumber, extra = {}) {
  const res = await api(session, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber, name: extra.name || `Tool ${internalNumber}`, status: extra.status || "available", brand: "Milwaukee", model: "M18", ...extra } } });
  assert(res.ok, `create ${internalNumber} failed ${res.status} ${JSON.stringify(res.payload)}`);
  return res.payload.item;
}

async function main() {
  const server = startServer();
  const checks = [];
  try {
    await waitHealth();
    const admin = await login(ADMIN);
    const worker = await login(WORKER);
    const manager = await login(MANAGER);

    const b054 = await createTool(admin, "B054", { name: "Milwaukee M18 FPD3" });
    const b055 = await createTool(admin, "B055", { name: "Milwaukee M18 FPD3" });
    const br022 = await createTool(admin, "BR022", { name: "Brusilica" });
    const lost = await createTool(admin, "L999", { name: "Lost Laser", status: "lost" });
    const noNumber = await createTool(admin, "TMP1", { name: "No number placeholder" });
    const archived = await createTool(admin, "A001", { name: "Archived" });
    await api(admin, `/api/toolroom/items/${encodeURIComponent(archived.id)}/archive`, { method: "PATCH", json: { baseVersion: archived.itemVersion } });
    const toolroomPath = path.join(dataDir, "toolroom.json");
    const wrapped = JSON.parse(fs.readFileSync(toolroomPath, "utf8"));
    const doc = wrapped.data || wrapped;
    const noNumberIndex = doc.items.findIndex((item) => item.id === noNumber.id);
    doc.items[noNumberIndex].internalNumber = "";
    fs.writeFileSync(toolroomPath, JSON.stringify({ ...wrapped, data: doc }, null, 2));

    const assignWorker = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: b054.id, holderType: "worker", workerEmail: WORKER.email, assignedAt: "2026-05-24", expectedReturnAt: "2026-06-01", note: "Worker assignment" } });
    assert(assignWorker.ok, `assign worker failed ${JSON.stringify(assignWorker.payload)}`);
    assert.strictEqual(assignWorker.payload.item.status, "assigned_worker");
    checks.push("assign to worker");

    const myDirect = await api(worker, "/api/toolroom/my-tools?site=Toolroom%20Site");
    assert(myDirect.ok && myDirect.payload.tools.some((item) => item.internalNumber === "B054"), "my tools direct worker includes B054");
    checks.push("my tools direct worker");

    const assignSite = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: b055.id, holderType: "site", siteId: "Toolroom Site", assignedAt: "2026-05-24" } });
    assert(assignSite.ok && assignSite.payload.item.status === "assigned_site", "assign site");
    const mySite = await api(worker, "/api/toolroom/my-tools?site=Toolroom%20Site");
    assert(mySite.payload.tools.some((item) => item.internalNumber === "B055"), "my tools active site includes B055");
    checks.push("assign to site + my tools active site");

    const workerReturn = await api(worker, "/api/toolroom/returns", { method: "POST", json: { toolId: b054.id, condition: "ok" } });
    assert.strictEqual(workerReturn.status, 403, "worker cannot return without permission");
    checks.push("worker cannot return without permission");

    const returnTool = await api(admin, "/api/toolroom/returns", { method: "POST", json: { toolId: b054.id, condition: "ok", returnedAt: "2026-05-25" } });
    assert(returnTool.ok && returnTool.payload.item.status === "available" && returnTool.payload.item.currentHolderType === "toolroom", "return tool ok");
    checks.push("return tool");

    const assignBr = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: br022.id, holderType: "worker", workerEmail: WORKER.email } });
    assert(assignBr.ok, "assign BR022 to worker");
    const transferWorkerToSite = await api(admin, "/api/toolroom/transfers", { method: "POST", json: { toolId: br022.id, holderType: "site", siteId: "Toolroom Site" } });
    assert(transferWorkerToSite.ok && transferWorkerToSite.payload.item.currentHolderType === "site", "transfer worker to site");
    const transferSiteToSite = await api(admin, "/api/toolroom/transfers", { method: "POST", json: { toolId: br022.id, holderType: "site", siteId: "Site B" } });
    assert(transferSiteToSite.ok && transferSiteToSite.payload.item.currentHolderSiteId === "Site B", "transfer site to site");
    checks.push("transfer worker to site + site to site");

    const assignArchived = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: archived.id, holderType: "worker", workerEmail: WORKER.email } });
    assert.strictEqual(assignArchived.status, 404, "archived blocked");
    const assignLost = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: lost.id, holderType: "worker", workerEmail: WORKER.email } });
    assert.strictEqual(assignLost.status, 400, "lost blocked");
    const assignNoNumber = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: noNumber.id, holderType: "worker", workerEmail: WORKER.email } });
    assert.strictEqual(assignNoNumber.status, 400, "no internal number blocked");
    checks.push("cannot assign archived/lost/tool without internal number");

    const assignments = await api(admin, "/api/toolroom/assignments");
    assert(assignments.ok && assignments.payload.assignments.length >= 5, "assignments history exists");
    const fullToolroom = await api(admin, "/api/toolroom");
    assert(fullToolroom.payload.toolroom.history.some((event) => event.type === "toolroom_tool_assigned"), "history append assigned");
    assert(fullToolroom.payload.toolroom.history.some((event) => event.type === "toolroom_tool_returned"), "history append returned");
    checks.push("history append");

    const stateAfterNotifications = await api(worker, "/api/state");
    const workerNotifications = stateAfterNotifications.payload.state.accountNotifications?.[WORKER.email]?.notifications || [];
    assert(workerNotifications.some((entry) => entry.type === "toolroom"), "account notification created");
    checks.push("account notification");

    const whBefore = await api(admin, "/api/state");
    const warehouseBefore = JSON.stringify(whBefore.payload.state.siteData["Toolroom Site"].warehouse);
    await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: returnTool.payload.item.id, holderType: "site", siteId: "Site B" } });
    const whAfter = await api(admin, "/api/state");
    assert.strictEqual(JSON.stringify(whAfter.payload.state.siteData["Toolroom Site"].warehouse), warehouseBefore, "toolroom assignment does not change warehouse");
    checks.push("toolroom save does not touch Warehouse");

    const b056 = await createTool(admin, "B056", { name: "Concurrent drill" });
    const b057 = await createTool(admin, "B057", { name: "Concurrent edit" });
    const br023 = await createTool(admin, "BR023", { name: "Concurrent return" });
    await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: br023.id, holderType: "worker", workerEmail: WORKER.email } });
    const concurrent = await Promise.all([
      api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: b056.id, holderType: "worker", workerEmail: WORKER.email } }),
      api(manager, "/api/toolroom/items", { method: "POST", json: { baseVersion: b057.itemVersion, item: { ...b057, notes: "Edited by manager" } } }),
      api(admin, "/api/toolroom/returns", { method: "POST", json: { toolId: br023.id, condition: "ok" } }),
    ]);
    assert(concurrent.every((res) => res.ok), `multi-user concurrency failed ${JSON.stringify(concurrent.map((res) => res.payload))}`);
    const finalToolroom = await api(admin, "/api/toolroom");
    assert(finalToolroom.payload.toolroom.items.some((item) => item.internalNumber === "B056" && item.status === "assigned_worker"), "concurrent assign kept");
    assert(finalToolroom.payload.toolroom.items.some((item) => item.internalNumber === "B057" && item.notes === "Edited by manager"), "concurrent edit kept");
    assert(finalToolroom.payload.toolroom.items.some((item) => item.internalNumber === "BR023" && item.status === "available"), "concurrent return kept");
    checks.push("multi-user A assigns B054/B056, B edits B055/B057, C returns BR022/BR023");

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
