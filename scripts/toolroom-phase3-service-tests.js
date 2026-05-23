const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-phase3-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 9900 + Math.floor(Math.random() * 200);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.p3.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.p3.worker@cmax.test", password: "Toolroom!123" };
const OTHER = { email: "toolroom.p3.other@cmax.test", password: "Toolroom!123" };

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Toolroom Service Admin", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: WORKER.email, password: WORKER.password, fullName: "Toolroom Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true }, allowedSites: ["Site A"] },
    { email: OTHER.email, password: OTHER.password, fullName: "Other Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true }, allowedSites: ["Site B"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Site A", "Site B"],
    currentSite: "Site A",
    siteData: {
      "Site A": { warehouse: { catalog: [{ id: "wh-a", name: "A" }], stock: {}, logs: [] }, notifications: [] },
      "Site B": { warehouse: { catalog: [], stock: {}, logs: [] }, notifications: [] },
    },
    moduleVersions: { warehouse: { "Site A": 1, "Site B": 1 } },
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
  assert(res.ok, `login failed ${user.email} ${res.status} ${JSON.stringify(res.payload)}`);
  session.csrf = res.payload.csrfToken;
  return session;
}

async function createTool(session, internalNumber, extra = {}) {
  const res = await api(session, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber, name: extra.name || `Tool ${internalNumber}`, status: extra.status || "available", type: extra.type || "Busilica", brand: "Milwaukee", model: extra.model || "M18", ...extra } } });
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
    const other = await login(OTHER);

    const b054 = await createTool(admin, "B054", { name: "Milwaukee M18 FPD3", model: "M18 FPD3" });
    const b055 = await createTool(admin, "B055", { name: "Milwaukee M18 FPD3", model: "M18 FPD3" });
    const b056 = await createTool(admin, "B056", { name: "Milwaukee M18 FPD3", model: "M18 FPD3" });
    const br021 = await createTool(admin, "BR021", { name: "Bosch brusilica", type: "Brusilica", model: "GWS" });
    const l009 = await createTool(admin, "L009", { name: "Leica laser", type: "Laser", model: "Disto" });

    await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: b054.id, holderType: "worker", workerEmail: WORKER.email } });
    await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: br021.id, holderType: "site", siteId: "Site A" } });
    await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: l009.id, holderType: "site", siteId: "Site B" } });

    const whBefore = await api(admin, "/api/state");
    const warehouseBefore = JSON.stringify(whBefore.payload.state.siteData["Site A"].warehouse);
    const siteNotificationsBefore = JSON.stringify(whBefore.payload.state.siteData["Site A"].notifications || []);

    const ownFault = await api(worker, "/api/toolroom/faults", { method: "POST", json: { toolId: b054.id, activeSite: "Site A", faultType: "Ne radi", comment: "Motor ne radi", replacementRequested: true } });
    assert(ownFault.ok && ownFault.payload.fault.status === "reported", `worker own fault failed ${JSON.stringify(ownFault.payload)}`);
    checks.push("worker reports fault on own tool");

    const siteFault = await api(worker, "/api/toolroom/faults", { method: "POST", json: { toolId: br021.id, activeSite: "Site A", faultType: "Kabel ostecen", comment: "Site tool problem" } });
    assert(siteFault.ok, "worker reports fault on active site tool");
    checks.push("worker reports fault on site tool");

    const unrelated = await api(worker, "/api/toolroom/faults", { method: "POST", json: { toolId: l009.id, activeSite: "Site A", faultType: "Ne radi" } });
    assert.strictEqual(unrelated.status, 403, "worker cannot report unrelated site tool");
    checks.push("worker cannot report fault on unrelated tool");

    const queue = await api(admin, "/api/toolroom/faults?site=Site%20A");
    assert(queue.ok && queue.payload.faults.length >= 2, "admin sees fault queue");
    checks.push("Alatnicar sees fault queue");

    const service = await api(admin, "/api/toolroom/service", { method: "POST", json: { faultId: ownFault.payload.fault.id, serviceCompany: "Milwaukee Service", expectedReturnAt: "2026-06-10", cost: 1200, comment: "Send to service" } });
    assert(service.ok && service.payload.item.status === "in_service" && service.payload.item.currentHolderType === "service", `send service failed ${JSON.stringify(service.payload)}`);
    checks.push("send to service changes status holder");

    const repaired = await api(admin, `/api/toolroom/faults/${encodeURIComponent(ownFault.payload.fault.id)}`, { method: "PATCH", json: { action: "returned_available", returnedAt: "2026-06-02" } });
    assert(repaired.ok && repaired.payload.item.status === "available" && repaired.payload.item.currentHolderType === "toolroom", "repaired returns available/toolroom");
    checks.push("repaired returns tool to available/toolroom");

    const writeoff = await api(admin, `/api/toolroom/faults/${encodeURIComponent(siteFault.payload.fault.id)}`, { method: "PATCH", json: { action: "written_off" } });
    assert(writeoff.ok && writeoff.payload.item.status === "written_off" && writeoff.payload.item.currentHolderType === "written_off", "writeoff status holder");
    checks.push("writeoff changes status holder");

    const replacement = await api(admin, `/api/toolroom/faults/${encodeURIComponent(ownFault.payload.fault.id)}/replacement`, { method: "POST", json: { replacementToolId: b055.id } });
    assert(replacement.ok && replacement.payload.replacement.status === "assigned_worker", "replacement assignment works");
    checks.push("replacement request shown and assignment works");

    const after = await api(admin, "/api/toolroom");
    const history = after.payload.toolroom.history;
    for (const type of ["toolroom_fault_reported", "toolroom_service_sent", "toolroom_tool_returned_to_circulation", "toolroom_tool_written_off", "toolroom_replacement_assigned"]) {
      const event = history.find((entry) => entry.type === type);
      assert(event && event.actor && event.at && event.before && event.after, `history missing ${type}`);
    }
    checks.push("fault/service/replacement history with before-after");

    const stateAfter = await api(admin, "/api/state");
    assert.strictEqual(JSON.stringify(stateAfter.payload.state.siteData["Site A"].warehouse), warehouseBefore, "no warehouse overwrite");
    assert.strictEqual(JSON.stringify(stateAfter.payload.state.siteData["Site A"].notifications || []), siteNotificationsBefore, "no site notifications");
    const workerState = await api(worker, "/api/state");
    const workerNotifications = workerState.payload.state.accountNotifications?.[WORKER.email]?.notifications || [];
    assert(workerNotifications.some((entry) => entry.type === "toolroom"), "worker account notification");
    checks.push("account notification and no site notification");

    const backup = await api(admin, "/api/backup", { method: "POST", json: {} });
    assert(backup.ok, "backup created");
    const backupFile = fs.readdirSync(backupDir).find((name) => name.endsWith(".json"));
    const snapshot = JSON.parse(fs.readFileSync(path.join(backupDir, backupFile), "utf8"));
    assert(snapshot.toolroom.faults?.length >= 2, "backup includes faults");
    assert(snapshot.toolroom.serviceRecords?.length >= 1, "backup includes service");
    checks.push("backup/restore includes faults service data");

    const concurrent = await Promise.all([
      api(worker, "/api/toolroom/faults", { method: "POST", json: { toolId: replacement.payload.replacement.id, activeSite: "Site A", faultType: "Ostalo", comment: "Concurrent worker report" } }),
      api(admin, `/api/toolroom/faults/${encodeURIComponent(siteFault.payload.fault.id)}`, { method: "PATCH", json: { action: "received" } }),
      api(admin, "/api/toolroom/items", { method: "POST", json: { baseVersion: b056.itemVersion, item: { ...b056, notes: "Admin edits different tool" } } }),
    ]);
    assert(concurrent.every((res) => res.ok), `multi-user proof failed ${JSON.stringify(concurrent.map((res) => res.payload))}`);
    checks.push("multi-user worker reports, admin handles, admin edits other tool");

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
