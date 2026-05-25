const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-phase4-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 10100 + Math.floor(Math.random() * 300);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.p4.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.p4.worker@cmax.test", password: "Toolroom!123" };

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Toolroom Phase4 Admin", isSuperAdmin: false, level: 5, active: true, permissions: { canAccessWarehouse: true, canAccessToolroom: true, canManageToolroom: true, canAssignTools: true, canReturnTools: true, canHandleToolService: true, canWriteOffTools: true, canExportToolroom: true, canViewBackups: true, canManageBackups: true, canRestoreBackups: true }, allowedSites: ["Site A", "Site B"] },
    { email: WORKER.email, password: WORKER.password, fullName: "Toolroom Phase4 Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true }, allowedSites: ["Site A"] },
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
    try { const res = await fetch(`${host}/api/health`); const json = await res.json().catch(() => ({})); if (res.ok && json.ok && json.storageReady) return; } catch (_) {}
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
  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch (_) { payload = text; }
  return { status: res.status, ok: res.ok, payload, headers: res.headers, text };
}

async function login(user) {
  const session = {};
  const res = await api(session, "/api/login", { method: "POST", json: { email: user.email, password: user.password } });
  assert(res.ok, `login failed ${user.email} ${res.status} ${JSON.stringify(res.payload)}`);
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

    const whBefore = await api(admin, "/api/state");
    const warehouseBefore = JSON.stringify(whBefore.payload.state.siteData["Site A"].warehouse);

    const bulk = await api(admin, "/api/toolroom/items/bulk", { method: "POST", json: { type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", name: "Milwaukee M18 FPD3", categoryId: "cat_drills", quantity: 20, prefix: "B", startNumber: 54, serialNumbers: Array.from({ length: 20 }, (_, i) => `SN-${String(i + 54).padStart(3, "0")}`), engraved: true, status: "available" } });
    assert.strictEqual(bulk.status, 201, JSON.stringify(bulk.payload));
    assert.strictEqual(bulk.payload.items.length, 20, "bulk add 20 tools");
    assert.deepStrictEqual([bulk.payload.items[0].internalNumber, bulk.payload.items[19].internalNumber], ["B054", "B073"]);
    assert.strictEqual(bulk.payload.items[0].serialNumber, "SN-054", "serial mapped first");
    assert.strictEqual(bulk.payload.items[19].serialNumber, "SN-073", "serial mapped last");
    checks.push("bulk add 20 tools B054-B073 and serial paste maps");

    const dup = await api(admin, "/api/toolroom/items/bulk", { method: "POST", json: { type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", name: "Duplicate", quantity: 2, prefix: "B", startNumber: 60, engraved: true } });
    assert.strictEqual(dup.status, 409, "range conflict blocked");
    const afterDup = await api(admin, "/api/toolroom");
    assert.strictEqual(afterDup.payload.toolroom.items.filter((item) => item.internalNumber === "B061").length, 1, "no partial duplicate batch created");
    checks.push("duplicate internal number/range conflict blocks full batch");

    const waiting = await api(admin, "/api/toolroom/items/bulk", { method: "POST", json: { type: "Laser", brand: "Leica", model: "Disto", name: "Leica Disto", quantity: 1, prefix: "L", startNumber: 9, engraved: false } });
    assert(waiting.ok && waiting.payload.items[0].status === "awaiting_engraving", "engraving status");
    const assignWaiting = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: waiting.payload.items[0].id, holderType: "worker", workerEmail: WORKER.email } });
    assert.strictEqual(assignWaiting.status, 400, "awaiting engraving blocks assignment");
    checks.push("engraved false blocks assignment");

    const assignWorker = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: bulk.payload.items[0].id, holderType: "worker", workerEmail: WORKER.email } });
    assert(assignWorker.ok, "assign for worker export");
    const assignWorkerStable = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: bulk.payload.items[3].id, holderType: "worker", workerEmail: WORKER.email } });
    assert(assignWorkerStable.ok, "assign stable worker export");
    const assignSite = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: bulk.payload.items[1].id, holderType: "site", siteId: "Site A" } });
    assert(assignSite.ok, "assign for site export");
    const assignLostCandidate = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: bulk.payload.items[2].id, holderType: "site", siteId: "Site A" } });
    assert(assignLostCandidate.ok, "assign lost candidate");
    const lostReturn = await api(admin, "/api/toolroom/returns", { method: "POST", json: { toolId: bulk.payload.items[2].id, condition: "lost" } });
    assert(lostReturn.ok, "mark lost for export");
    const fault = await api(worker, "/api/toolroom/faults", { method: "POST", json: { toolId: assignWorker.payload.item.id, activeSite: "Site A", faultType: "Ne radi", replacementRequested: false } });
    assert(fault.ok, "fault for export");
    await api(admin, "/api/toolroom/service", { method: "POST", json: { faultId: fault.payload.fault.id, serviceCompany: "Milwaukee Service" } });
    const writeoffCandidate = await api(admin, "/api/toolroom/assignments", { method: "POST", json: { toolId: bulk.payload.items[4].id, holderType: "site", siteId: "Site A" } });
    assert(writeoffCandidate.ok, "assign writeoff candidate");
    const writeoffFault = await api(worker, "/api/toolroom/faults", { method: "POST", json: { toolId: writeoffCandidate.payload.item.id, activeSite: "Site A", faultType: "Ne radi", replacementRequested: false } });
    assert(writeoffFault.ok, "writeoff fault");
    const writeoff = await api(admin, `/api/toolroom/faults/${encodeURIComponent(writeoffFault.payload.fault.id)}`, { method: "PATCH", json: { action: "written_off" } });
    assert(writeoff.ok, "writeoff for export");

    const csvAll = await api(admin, "/api/toolroom/export/csv?scope=all");
    assert(csvAll.ok && /^\uFEFF?InternalNumber,SerialNumber,Name/.test(csvAll.text), "csv not json");
    assert(csvAll.text.includes("B054") && csvAll.headers.get("content-type").includes("text/csv"), "export all tools csv");
    const csvWorker = await api(admin, `/api/toolroom/export/csv?worker=${encodeURIComponent(WORKER.email)}`);
    assert(csvWorker.ok && csvWorker.text.includes("B057"), "export by worker");
    const csvSite = await api(admin, "/api/toolroom/export/csv?site=Site%20A");
    assert(csvSite.ok && csvSite.text.includes("B055"), "export by site");
    const csvService = await api(admin, "/api/toolroom/export/csv?scope=service");
    assert(csvService.ok && csvService.text.includes("in_service"), "export service tools");
    const csvLost = await api(admin, "/api/toolroom/export/csv?status=lost");
    assert(csvLost.ok && csvLost.text.includes("lost"), "export lost/writeoff style status");
    const csvWriteoff = await api(admin, "/api/toolroom/export/csv?status=written_off");
    assert(csvWriteoff.ok && csvWriteoff.text.includes("written_off"), "export writeoff tools");
    const pdf = await api(admin, "/api/toolroom/export/pdf?scope=all");
    assert(pdf.ok && pdf.headers.get("content-type").includes("application/pdf") && !String(pdf.text).trim().startsWith("{"), "pdf not json");
    const xlsx = await api(admin, "/api/toolroom/export/excel?scope=all");
    assert(xlsx.ok && xlsx.headers.get("content-type").includes("spreadsheet"), "xlsx export");
    checks.push("exports all/worker/site/service/status as CSV/XLSX/PDF not JSON");

    const workerExport = await api(worker, "/api/toolroom/export/csv?scope=all");
    assert.strictEqual(workerExport.status, 403, "worker cannot export");
    checks.push("worker cannot export");

    const backup = await api(admin, "/api/backup", { method: "POST", json: { label: "toolroom phase4" } });
    assert(backup.ok, `backup failed ${JSON.stringify(backup.payload)}`);
    const backupId = backup.payload.backup?.id || backup.payload.id;
    const toolroomFile = path.join(dataDir, "toolroom.json");
    const wrapped = JSON.parse(fs.readFileSync(toolroomFile, "utf8"));
    fs.writeFileSync(toolroomFile, JSON.stringify({ ...wrapped, data: { ...wrapped.data, items: [] } }, null, 2));
    const dryRun = await api(admin, "/api/backup/restore/dry-run", { method: "POST", json: { id: backupId } });
    assert(dryRun.ok && dryRun.payload.restoreToken, "restore dry-run token");
    const restore = await api(admin, "/api/backup/restore", { method: "POST", json: { id: backupId, restoreToken: dryRun.payload.restoreToken, confirmationText: "RESTORE" } });
    assert(restore.ok, `restore failed ${JSON.stringify(restore.payload)}`);
    const restored = await api(admin, "/api/toolroom");
    assert(restored.payload.toolroom.items.some((item) => item.internalNumber === "B073"), "backup restore keeps bulk-created tools");
    checks.push("backup/restore keeps bulk-created tools");

    const whAfter = await api(admin, "/api/state");
    assert.strictEqual(JSON.stringify(whAfter.payload.state.siteData["Site A"].warehouse), warehouseBefore, "toolroom save did not touch warehouse");
    checks.push("toolroom save/export does not touch Warehouse");

    console.log(JSON.stringify({ ok: true, checks }, null, 2));
  } finally {
    server.kill();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
