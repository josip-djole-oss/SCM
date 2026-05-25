const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-full-proof-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 10300 + Math.floor(Math.random() * 300);
const host = `http://127.0.0.1:${port}`;
const USERS = {
  a: { email: "toolroom.full.alatnicar@cmax.test", password: "Toolroom!123" },
  b: { email: "toolroom.full.worker.a@cmax.test", password: "Toolroom!123" },
  c: { email: "toolroom.full.admin@cmax.test", password: "Toolroom!123" },
  d: { email: "toolroom.full.worker.b@cmax.test", password: "Toolroom!123" },
};

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: USERS.a.email, password: USERS.a.password, fullName: "Alatnicar A", isSuperAdmin: false, level: 5, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canManageToolroom: true, canEditToolPresets: true, canAssignTools: true, canReturnTools: true, canViewToolHistory: true, canViewMyTools: true, canReportToolFault: true, canHandleToolService: true, canWriteOffTools: true, canViewNotifications: true }, allowedSites: ["Site A", "Site B"] },
    { email: USERS.b.email, password: USERS.b.password, fullName: "Worker Site A", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true, canViewNotifications: true }, allowedSites: ["Site A"] },
    { email: USERS.c.email, password: USERS.c.password, fullName: "Admin C", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: USERS.d.email, password: USERS.d.password, fullName: "Worker Site B", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true, canViewNotifications: true }, allowedSites: ["Site B"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Site A", "Site B"],
    currentSite: "Site A",
    siteData: {
      "Site A": { warehouse: { catalog: [{ id: "wh-a", name: "Site A stock" }], stock: {}, logs: [] }, notifications: [] },
      "Site B": { warehouse: { catalog: [{ id: "wh-b", name: "Site B stock" }], stock: {}, logs: [] }, notifications: [] },
    },
    moduleVersions: { warehouse: { "Site A": 1, "Site B": 1 } },
    accountNotifications: {},
  }), null, 2));
}

function startServer() {
  writeFixture();
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NODE_ENV: "test", STORAGE_TYPE: "json", DATA_PATH: dataDir, UPLOAD_PATH: uploadDir, BACKUP_PATH: backupDir, BOOTSTRAP_ADMIN_EMAIL: USERS.c.email, BOOTSTRAP_ADMIN_PASSWORD: USERS.c.password, LOGIN_RATE_LIMIT_MAX: "100" },
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
  const res = await api(session, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber, name: extra.name || `Tool ${internalNumber}`, status: extra.status || "available", type: extra.type || "Busilica", brand: extra.brand || "Milwaukee", model: extra.model || "M18", ...extra } } });
  assert(res.ok, `create ${internalNumber} failed ${res.status} ${JSON.stringify(res.payload)}`);
  return res.payload.item;
}

function assertInvariant(item) {
  const holder = item.currentHolderType;
  assert(["toolroom", "worker", "site", "service", "lost", "written_off"].includes(holder), `${item.internalNumber} invalid holder ${holder}`);
  if (item.status === "in_service") assert.strictEqual(holder, "service", `${item.internalNumber} in_service must be service holder`);
  if (item.status === "written_off") assert.strictEqual(holder, "written_off", `${item.internalNumber} written_off must be written_off holder`);
  if (item.status === "assigned_worker") assert.strictEqual(holder, "worker", `${item.internalNumber} assigned_worker must be worker holder`);
  if (item.status === "assigned_site") assert.strictEqual(holder, "site", `${item.internalNumber} assigned_site must be site holder`);
  if (item.status === "available") assert.strictEqual(holder, "toolroom", `${item.internalNumber} available must be toolroom holder`);
  if (holder === "worker") assert(item.currentHolderUserEmail && !item.currentHolderSiteId, `${item.internalNumber} worker holder invalid`);
  if (holder === "site") assert(item.currentHolderSiteId && !item.currentHolderUserEmail, `${item.internalNumber} site holder invalid`);
  if (["toolroom", "service", "lost", "written_off"].includes(holder)) assert(!item.currentHolderUserEmail && !item.currentHolderSiteId, `${item.internalNumber} terminal/toolroom holder has active user/site`);
}

function assertUniqueInternalNumbers(items) {
  const active = items.filter((item) => !item.archived && item.internalNumber);
  const set = new Set(active.map((item) => item.internalNumber.toLowerCase()));
  assert.strictEqual(set.size, active.length, "duplicate internalNumber detected");
}

function assertHistory(history, toolId, type) {
  const event = history.find((entry) => entry.entityId === toolId && entry.type === type);
  assert(event, `missing history ${type}`);
  assert(event.actor && event.at && event.before && event.after, `history incomplete ${type}`);
}

async function main() {
  const server = startServer();
  const report = { actions: 0, conflicts: 0, rejectedActions: 0, overwriteAttemptsPrevented: 0, checks: [] };
  try {
    await waitHealth();
    const userA = await login(USERS.a);
    const userB = await login(USERS.b);
    const userC = await login(USERS.c);
    const userD = await login(USERS.d);

    const stateBefore = await api(userA, "/api/state");
    const warehouseBefore = JSON.stringify(stateBefore.payload.state.siteData["Site A"].warehouse);
    const siteNotificationsBefore = JSON.stringify(stateBefore.payload.state.siteData["Site A"].notifications || []);

    const category = await api(userA, "/api/toolroom/categories", { method: "POST", json: { category: { name: "Full Proof Aku", parentId: "cat_drills", iconKey: "drill" } } });
    assert(category.ok, "category create");
    const preset = await api(userA, "/api/toolroom/presets", { method: "POST", json: { preset: { type: "model", label: "Full Proof M18", value: "Full Proof M18" } } });
    assert(preset.ok, "preset create");
    report.actions += 2;
    report.checks.push("categories and presets CRUD foundation");

    const b054 = await createTool(userA, "B054", { name: "Milwaukee M18 FPD3", model: "Full Proof M18", categoryId: category.payload.category.id });
    const b055 = await createTool(userA, "B055", { name: "Milwaukee M18 FPD3", model: "Full Proof M18", categoryId: category.payload.category.id });
    const br021 = await createTool(userA, "BR021", { name: "Bosch brusilica", type: "Brusilica", model: "GWS" });
    const l009 = await createTool(userA, "L009", { name: "Leica laser", type: "Laser", model: "Disto" });
    const ot001 = await createTool(userA, "OT001", { name: "Otpis test", type: "Laser", model: "Disto" });
    const noNum = await createTool(userA, "TMPX", { name: "No engraving test" });
    report.actions += 6;

    const dup = await api(userA, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber: "B054", name: "Duplicate" } } });
    assert.strictEqual(dup.status, 409, "duplicate internalNumber rejected");
    report.rejectedActions += 1;
    report.overwriteAttemptsPrevented += 1;

    const wrapped = JSON.parse(fs.readFileSync(path.join(dataDir, "toolroom.json"), "utf8"));
    const doc = wrapped.data || wrapped;
    doc.items[doc.items.findIndex((item) => item.id === noNum.id)].internalNumber = "";
    fs.writeFileSync(path.join(dataDir, "toolroom.json"), JSON.stringify({ ...wrapped, data: doc }, null, 2));
    const noNumAssign = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: noNum.id, holderType: "worker", workerEmail: USERS.b.email } });
    assert.strictEqual(noNumAssign.status, 400, "no internal number cannot assign");
    report.rejectedActions += 1;
    report.checks.push("no internalNumber assignment blocked");

    const assignWorker = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b054.id, holderType: "worker", workerEmail: USERS.b.email, assignedAt: "2026-05-25" } });
    assert(assignWorker.ok, "assign worker");
    const assignSite = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: br021.id, holderType: "site", siteId: "Site A", assignedAt: "2026-05-25" } });
    assert(assignSite.ok, "assign site");
    report.actions += 2;

    const myToolsB = await api(userB, "/api/toolroom/my-tools?site=Site%20A");
    assert(myToolsB.payload.tools.some((item) => item.internalNumber === "B054"), "worker sees direct");
    assert(myToolsB.payload.tools.some((item) => item.internalNumber === "BR021"), "worker sees site tool");
    const myToolsD = await api(userD, "/api/toolroom/my-tools?site=Site%20B");
    assert(!myToolsD.payload.tools.some((item) => ["B054", "BR021"].includes(item.internalNumber)), "other site cannot see Site A tools");
    report.checks.push("my tools and site isolation");

    const workerReturn = await api(userB, "/api/toolroom/returns", { method: "POST", json: { toolId: b054.id, condition: "ok" } });
    assert.strictEqual(workerReturn.status, 403, "worker cannot return");
    const workerWriteoff = await api(userB, `/api/toolroom/faults/nonexistent`, { method: "PATCH", json: { action: "written_off" } });
    assert.strictEqual(workerWriteoff.status, 403, "worker cannot writeoff/service");
    report.rejectedActions += 2;

    const faultOwn = await api(userB, "/api/toolroom/faults", { method: "POST", json: { toolId: b054.id, activeSite: "Site A", faultType: "Ne radi", comment: "Motor ne radi", replacementRequested: true } });
    assert(faultOwn.ok, "worker fault own");
    const faultSite = await api(userB, "/api/toolroom/faults", { method: "POST", json: { toolId: br021.id, activeSite: "Site A", faultType: "Kabel ostecen", comment: "Kabel" } });
    assert(faultSite.ok, "worker fault site");
    const unrelated = await api(userB, "/api/toolroom/faults", { method: "POST", json: { toolId: l009.id, activeSite: "Site A", faultType: "Ne radi" } });
    assert.strictEqual(unrelated.status, 403, "worker cannot report unrelated tool");
    report.actions += 2;
    report.rejectedActions += 1;

    const service = await api(userA, "/api/toolroom/service", { method: "POST", json: { faultId: faultOwn.payload.fault.id, serviceCompany: "Milwaukee Service", sentAt: "2026-05-25", expectedReturnAt: "2026-06-05", cost: 1500, comment: "Service proof" } });
    assert(service.ok && service.payload.item.status === "in_service" && service.payload.item.currentHolderType === "service", "service holder");
    const returnAvailable = await api(userA, `/api/toolroom/faults/${encodeURIComponent(faultOwn.payload.fault.id)}`, { method: "PATCH", json: { action: "returned_available", returnedAt: "2026-06-02" } });
    assert(returnAvailable.ok && returnAvailable.payload.item.status === "available" && returnAvailable.payload.item.currentHolderType === "toolroom", "returned available");
    const replacement = await api(userA, `/api/toolroom/faults/${encodeURIComponent(faultOwn.payload.fault.id)}/replacement`, { method: "POST", json: { replacementToolId: b055.id } });
    assert(replacement.ok && replacement.payload.replacement.currentHolderType === "worker", "replacement assigned worker");
    report.actions += 3;

    const transfer = await api(userA, "/api/toolroom/transfers", { method: "POST", json: { toolId: replacement.payload.replacement.id, holderType: "site", siteId: "Site A" } });
    assert(transfer.ok && transfer.payload.item.currentHolderType === "site", "transfer replacement to site");
    const returned = await api(userA, "/api/toolroom/returns", { method: "POST", json: { toolId: replacement.payload.replacement.id, condition: "ok", returnedAt: "2026-06-03" } });
    assert(returned.ok && returned.payload.item.currentHolderType === "toolroom", "return replacement");
    report.actions += 2;

    await api(userC, "/api/toolroom/assignments", { method: "POST", json: { toolId: ot001.id, holderType: "site", siteId: "Site B" } });
    const faultOt = await api(userC, "/api/toolroom/faults", { method: "POST", json: { toolId: ot001.id, activeSite: "Site B", faultType: "Ne radi", comment: "Writeoff proof" } });
    const writeoff = await api(userC, `/api/toolroom/faults/${encodeURIComponent(faultOt.payload.fault.id)}`, { method: "PATCH", json: { action: "written_off" } });
    assert(writeoff.ok && writeoff.payload.item.status === "written_off" && writeoff.payload.item.currentHolderType === "written_off", "admin writeoff");
    report.actions += 3;

    const stateAfter = await api(userA, "/api/state");
    assert.strictEqual(JSON.stringify(stateAfter.payload.state.siteData["Site A"].warehouse), warehouseBefore, "no warehouse overwrite");
    assert.strictEqual(JSON.stringify(stateAfter.payload.state.siteData["Site A"].notifications || []), siteNotificationsBefore, "no site notifications");
    report.checks.push("no cross-module overwrite / no warehouse save / no site notification");

    const toolroom = await api(userA, "/api/toolroom");
    const items = toolroom.payload.toolroom.items;
    const history = toolroom.payload.toolroom.history;
    assertUniqueInternalNumbers(items);
    items.forEach(assertInvariant);
    for (const [toolId, type] of [[b054.id, "toolroom_tool_assigned"], [br021.id, "toolroom_tool_assigned"], [b054.id, "toolroom_fault_reported"], [b054.id, "toolroom_service_sent"], [b054.id, "toolroom_tool_returned_to_circulation"], [b055.id, "toolroom_replacement_assigned"], [b055.id, "toolroom_tool_transferred"], [b055.id, "toolroom_tool_returned"], [ot001.id, "toolroom_tool_written_off"]]) {
      assertHistory(history, toolId, type);
    }
    report.checks.push("holder/status invariants and complete history");

    const notifState = await api(userB, "/api/state");
    const workerNotifications = notifState.payload.state.accountNotifications?.[USERS.b.email]?.notifications || [];
    assert(workerNotifications.some((entry) => entry.type === "toolroom"), "account notification exists");
    report.checks.push("account notifications work");

    const backup = await api(userC, "/api/backup", { method: "POST", json: {} });
    assert(backup.ok, "backup created");
    const backupId = backup.payload.id || backup.payload.file || fs.readdirSync(backupDir).find((name) => name.endsWith(".json"));
    const backupFile = fs.readdirSync(backupDir).find((name) => name.endsWith(".json"));
    const snapshot = JSON.parse(fs.readFileSync(path.join(backupDir, backupFile), "utf8"));
    assert(snapshot.toolroom.items.length >= 5, "backup tools");
    assert(snapshot.toolroom.assignments.length >= 4, "backup assignments");
    assert(snapshot.toolroom.faults.length >= 3, "backup faults");
    assert(snapshot.toolroom.serviceRecords.length >= 1, "backup service");
    assert(snapshot.toolroom.history.length >= 9, "backup history");
    const toolroomFile = path.join(dataDir, "toolroom.json");
    const wrappedToolroom = JSON.parse(fs.readFileSync(toolroomFile, "utf8"));
    fs.writeFileSync(toolroomFile, JSON.stringify({ ...wrappedToolroom, data: { ...wrappedToolroom.data, items: [], assignments: [], faults: [], serviceRecords: [], history: [] } }, null, 2));
    const dryRun = await api(userC, "/api/backup/restore/dry-run", { method: "POST", json: { id: backupId } });
    assert(dryRun.ok && dryRun.payload.restoreToken, "dry run token");
    const restore = await api(userC, "/api/backup/restore", { method: "POST", json: { id: backupId, restoreToken: dryRun.payload.restoreToken, confirmationText: "RESTORE" } });
    assert(restore.ok && restore.payload.restored, "restore ok");
    const restored = await api(userC, "/api/toolroom");
    assert(restored.payload.toolroom.items.some((item) => item.internalNumber === "B054"), "restore tools");
    assert(restored.payload.toolroom.faults.length >= 3, "restore faults");
    assert(restored.payload.toolroom.serviceRecords.length >= 1, "restore service");
    report.actions += 3;
    report.checks.push("backup/restore returns all Toolroom data");

    console.log(JSON.stringify({ ok: true, ...report, dataLoss: false, duplicateInternalNumber: false, wrongHolders: false, permissions: true, backupRestore: true }, null, 2));
  } finally {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(4000)]);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
