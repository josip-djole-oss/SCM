const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-release-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 10700 + Math.floor(Math.random() * 400);
const host = `http://127.0.0.1:${port}`;
const USERS = {
  a: { email: "toolroom.release.alatnicar@cmax.test", password: "Toolroom!123" },
  b: { email: "toolroom.release.worker@cmax.test", password: "Toolroom!123" },
  c: { email: "toolroom.release.admin@cmax.test", password: "Toolroom!123" },
  d: { email: "toolroom.release.other.site@cmax.test", password: "Toolroom!123" },
  e: { email: "toolroom.release.warehouse@cmax.test", password: "Toolroom!123" },
};

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function today() { return "2026-05-25"; }

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: USERS.a.email, password: USERS.a.password, fullName: "Release Alatnicar", isSuperAdmin: false, level: 5, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canManageToolroom: true, canEditToolPresets: true, canAssignTools: true, canReturnTools: true, canViewToolHistory: true, canViewMyTools: true, canReportToolFault: true, canHandleToolService: true, canWriteOffTools: true, canExportToolroom: true, canViewBackups: true, canManageBackups: true, canRestoreBackups: true }, allowedSites: ["Site A", "Site B"] },
    { email: USERS.b.email, password: USERS.b.password, fullName: "Release Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true, canViewNotifications: true }, allowedSites: ["Site A"] },
    { email: USERS.c.email, password: USERS.c.password, fullName: "Release Admin", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: USERS.d.email, password: USERS.d.password, fullName: "Release Other Site", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true }, allowedSites: ["Site B"] },
    { email: USERS.e.email, password: USERS.e.password, fullName: "Release Warehouse User", isSuperAdmin: false, level: 3, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canManageWarehouse: true }, allowedSites: ["Site A"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Site A", "Site B"],
    currentSite: "Site A",
    siteData: {
      "Site A": { warehouse: { catalog: [{ id: "wh-a", name: "Srafovi" }], stock: { "wh-a": 5 }, logs: [] }, notifications: [] },
      "Site B": { warehouse: { catalog: [{ id: "wh-b", name: "B item" }], stock: {}, logs: [] }, notifications: [] },
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

function assertToolInvariant(item) {
  const holder = item.currentHolderType || "toolroom";
  assert(["toolroom", "worker", "site", "service", "lost", "written_off"].includes(holder), `${item.internalNumber} invalid holder ${holder}`);
  if (item.status === "available") assert.strictEqual(holder, "toolroom", `${item.internalNumber} available holder`);
  if (item.status === "awaiting_engraving") assert.strictEqual(holder, "toolroom", `${item.internalNumber} engraving holder`);
  if (item.status === "assigned_worker") assert.strictEqual(holder, "worker", `${item.internalNumber} worker holder`);
  if (item.status === "assigned_site") assert.strictEqual(holder, "site", `${item.internalNumber} site holder`);
  if (item.status === "in_service") assert.strictEqual(holder, "service", `${item.internalNumber} service holder`);
  if (item.status === "written_off") assert.strictEqual(holder, "written_off", `${item.internalNumber} written off holder`);
  if (item.status === "lost") assert.strictEqual(holder, "lost", `${item.internalNumber} lost holder`);
  if (["toolroom", "service", "lost", "written_off"].includes(holder)) {
    assert(!item.currentHolderUserEmail && !item.currentHolderSiteId, `${item.internalNumber} terminal holder leaks user/site`);
  }
  if (holder === "worker") assert(item.currentHolderUserEmail, `${item.internalNumber} worker holder missing email`);
  if (holder === "site") assert(item.currentHolderSiteId, `${item.internalNumber} site holder missing site`);
}

async function main() {
  const server = startServer();
  const metrics = { actions: 0, conflicts: 0, rejectedActions: 0, overwriteAttemptsPrevented: 0, jsErrors: 0, siteCloseBlocker: "not implemented / not verifiable" };
  const checks = [];
  try {
    await waitHealth();
    const userA = await login(USERS.a);
    const userB = await login(USERS.b);
    const userC = await login(USERS.c);
    const userD = await login(USERS.d);
    const userE = await login(USERS.e);

    const stateBefore = await api(userA, "/api/state");
    const warehouseBefore = JSON.stringify(stateBefore.payload.state.siteData["Site A"].warehouse);
    const siteNotificationsBefore = JSON.stringify(stateBefore.payload.state.siteData["Site A"].notifications || []);
    const currentSiteD = (await api(userD, "/api/state")).payload.state.currentSite;

    const category = await api(userA, "/api/toolroom/categories", { method: "POST", json: { category: { name: "Release Aku", parentId: "cat_drills", iconKey: "drill" } } });
    assert(category.ok, "category create"); metrics.actions++;
    const preset = await api(userA, "/api/toolroom/presets", { method: "POST", json: { preset: { type: "model", label: "Release M18", value: "Release M18" } } });
    assert(preset.ok, "preset create"); metrics.actions++;
    const single = await api(userA, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber: "ADD001", name: "Single add tool", type: "Busilica", brand: "Milwaukee", model: "Release M18", categoryId: category.payload.category.id, status: "available" } } });
    assert(single.ok, "single tool create"); metrics.actions++;

    const bulk = await api(userA, "/api/toolroom/items/bulk", { method: "POST", json: { type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", name: "Milwaukee M18 FPD3", categoryId: category.payload.category.id, quantity: 20, prefix: "B", startNumber: 54, serialNumbers: Array.from({ length: 20 }, (_, i) => `SN-${String(i + 54).padStart(3, "0")}`), engraved: true, status: "available" } });
    assert(bulk.ok && bulk.payload.items.length === 20, "bulk add 20"); metrics.actions++;
    const duplicate = await api(userA, "/api/toolroom/items/bulk", { method: "POST", json: { type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", name: "Duplicate", quantity: 2, prefix: "B", startNumber: 60, engraved: true } });
    assert.strictEqual(duplicate.status, 409, "duplicate blocked"); metrics.rejectedActions++; metrics.conflicts++;
    const waiting = await api(userA, "/api/toolroom/items/bulk", { method: "POST", json: { type: "Laser", brand: "Leica", model: "Disto", name: "Leica Disto", quantity: 1, prefix: "L", startNumber: 9, engraved: false } });
    assert(waiting.ok && waiting.payload.items[0].status === "awaiting_engraving", "awaiting engraving create"); metrics.actions++;
    const assignWaiting = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: waiting.payload.items[0].id, holderType: "worker", workerEmail: USERS.b.email } });
    assert.strictEqual(assignWaiting.status, 400, "awaiting engraving cannot assign"); metrics.rejectedActions++;

    const b054 = bulk.payload.items[0];
    const b055 = bulk.payload.items[1];
    const b056 = bulk.payload.items[2];
    const b057 = bulk.payload.items[3];
    const b058 = bulk.payload.items[4];
    const b059 = bulk.payload.items[5];
    const b060 = bulk.payload.items[6];
    const b061 = bulk.payload.items[7];

    const warehouseSave = api(userE, "/api/state/module", { method: "POST", json: { target: "warehouse", siteId: "Site A", baseVersion: 1, payload: { warehouse: { catalog: [{ id: "wh-a", name: "Srafovi" }, { id: "wh-release", name: "Warehouse parallel save" }], stock: { "wh-a": 6, "wh-release": 1 }, logs: [{ id: "log-release", action: "parallel" }] } } } });
    const assignWorker = api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b054.id, holderType: "worker", workerEmail: USERS.b.email, assignedAt: today() } });
    const assignSite = api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b055.id, holderType: "site", siteId: "Site A", assignedAt: today() } });
    const parallel = await Promise.all([warehouseSave, assignWorker, assignSite]);
    assert(parallel.every((res) => res.ok), `parallel save failed ${JSON.stringify(parallel.map((r) => r.payload))}`);
    metrics.actions += 3;

    const assignTransfer = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b056.id, holderType: "worker", workerEmail: USERS.b.email } });
    assert(assignTransfer.ok, "assign for transfer"); metrics.actions++;
    const transfer = await api(userA, "/api/toolroom/transfers", { method: "POST", json: { toolId: b056.id, holderType: "site", siteId: "Site A" } });
    assert(transfer.ok, "transfer worker to site"); metrics.actions++;
    const assignReturn = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b059.id, holderType: "worker", workerEmail: USERS.b.email } });
    assert(assignReturn.ok, "assign for return"); metrics.actions++;
    const returned = await api(userA, "/api/toolroom/returns", { method: "POST", json: { toolId: b059.id, condition: "ok", returnedAt: today() } });
    assert(returned.ok && returned.payload.item.status === "available", "return tool"); metrics.actions++;

    const myToolsB = await api(userB, "/api/toolroom/my-tools?site=Site%20A");
    assert(myToolsB.ok && myToolsB.payload.tools.some((item) => item.internalNumber === "B054") && myToolsB.payload.tools.some((item) => item.internalNumber === "B055"), "worker my tools direct and site");
    const myToolsD = await api(userD, "/api/toolroom/my-tools?site=Site%20B");
    assert(myToolsD.ok && !myToolsD.payload.tools.some((item) => ["B054", "B055", "B056"].includes(item.internalNumber)), "other site isolation");

    const workerExport = await api(userB, "/api/toolroom/export/csv?scope=all");
    assert.strictEqual(workerExport.status, 403, "worker export blocked"); metrics.rejectedActions++;
    const workerAssign = await api(userB, "/api/toolroom/assignments", { method: "POST", json: { toolId: b057.id, holderType: "worker", workerEmail: USERS.b.email } });
    assert.strictEqual(workerAssign.status, 403, "worker assign blocked"); metrics.rejectedActions++;
    const workerReturn = await api(userB, "/api/toolroom/returns", { method: "POST", json: { toolId: b054.id, condition: "ok" } });
    assert.strictEqual(workerReturn.status, 403, "worker return blocked"); metrics.rejectedActions++;
    const unrelatedFault = await api(userD, "/api/toolroom/faults", { method: "POST", json: { toolId: b054.id, activeSite: "Site B", faultType: "Ne radi" } });
    assert.strictEqual(unrelatedFault.status, 403, "worker unrelated fault blocked"); metrics.rejectedActions++;

    const fault = await api(userB, "/api/toolroom/faults", { method: "POST", json: { toolId: b054.id, activeSite: "Site A", faultType: "Ne radi", comment: "Release fault", replacementRequested: true } });
    assert(fault.ok, "fault report"); metrics.actions++;
    const replacement = await api(userA, `/api/toolroom/faults/${encodeURIComponent(fault.payload.fault.id)}/replacement`, { method: "POST", json: { replacementToolId: b057.id } });
    assert(replacement.ok && replacement.payload.replacement.currentHolderType === "worker", "replacement assigned"); metrics.actions++;
    const service = await api(userA, "/api/toolroom/service", { method: "POST", json: { faultId: fault.payload.fault.id, serviceCompany: "Milwaukee Service", sentAt: today(), expectedReturnAt: "2026-06-10" } });
    assert(service.ok && service.payload.item.status === "in_service", "sent service"); metrics.actions++;
    const back = await api(userA, `/api/toolroom/faults/${encodeURIComponent(fault.payload.fault.id)}`, { method: "PATCH", json: { action: "returned_available" } });
    assert(back.ok && back.payload.item.status === "available", "returned circulation"); metrics.actions++;

    const writeoffAssign = await api(userC, "/api/toolroom/assignments", { method: "POST", json: { toolId: b058.id, holderType: "site", siteId: "Site A" } });
    assert(writeoffAssign.ok, "writeoff assign"); metrics.actions++;
    const writeoffFault = await api(userB, "/api/toolroom/faults", { method: "POST", json: { toolId: b058.id, activeSite: "Site A", faultType: "Ne radi", comment: "Otpis" } });
    assert(writeoffFault.ok, "writeoff fault"); metrics.actions++;
    const writeoff = await api(userC, `/api/toolroom/faults/${encodeURIComponent(writeoffFault.payload.fault.id)}`, { method: "PATCH", json: { action: "written_off" } });
    assert(writeoff.ok && writeoff.payload.item.status === "written_off", "writeoff"); metrics.actions++;
    const assignWrittenOff = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b058.id, holderType: "worker", workerEmail: USERS.b.email } });
    assert.strictEqual(assignWrittenOff.status, 400, "written off cannot assign"); metrics.rejectedActions++;

    const lostAssign = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b060.id, holderType: "site", siteId: "Site A" } });
    assert(lostAssign.ok, "lost assign"); metrics.actions++;
    const lost = await api(userA, "/api/toolroom/returns", { method: "POST", json: { toolId: b060.id, condition: "lost" } });
    assert(lost.ok && lost.payload.item.status === "lost", "lost return"); metrics.actions++;
    const assignLost = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b060.id, holderType: "worker", workerEmail: USERS.b.email } });
    assert.strictEqual(assignLost.status, 400, "lost cannot assign"); metrics.rejectedActions++;
    const assignService = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b054.id, holderType: "worker", workerEmail: USERS.b.email } });
    assert(assignService.ok, "service blocker setup assign"); metrics.actions++;
    const serviceFault = await api(userB, "/api/toolroom/faults", { method: "POST", json: { toolId: b054.id, activeSite: "Site A", faultType: "Ne radi" } });
    assert(serviceFault.ok, "service blocker fault"); metrics.actions++;
    const serviceAgain = await api(userA, "/api/toolroom/service", { method: "POST", json: { faultId: serviceFault.payload.fault.id, serviceCompany: "Second Service" } });
    assert(serviceAgain.ok && serviceAgain.payload.item.status === "in_service", "service blocker in service"); metrics.actions++;
    const assignInService = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b054.id, holderType: "worker", workerEmail: USERS.b.email } });
    assert.strictEqual(assignInService.status, 400, "service cannot assign"); metrics.rejectedActions++;

    const adminPresetEdit = await api(userC, "/api/toolroom/presets", { method: "POST", json: { preset: { ...preset.payload.preset, label: "Release M18 edited", presetVersion: preset.payload.preset.presetVersion } } });
    assert(adminPresetEdit.ok, "admin preset edit"); metrics.actions++;
    const csv = await api(userA, "/api/toolroom/export/csv?scope=all");
    const xlsx = await api(userA, "/api/toolroom/export/excel?scope=all");
    const pdf = await api(userA, "/api/toolroom/export/pdf?scope=all");
    assert(csv.ok && csv.headers.get("content-type").includes("text/csv") && !csv.text.trim().startsWith("{"), "csv export");
    assert(xlsx.ok && xlsx.headers.get("content-type").includes("spreadsheet"), "xlsx export");
    assert(pdf.ok && pdf.headers.get("content-type").includes("application/pdf") && !String(pdf.text).trim().startsWith("{"), "pdf export");
    metrics.actions += 3;

    const toolroomBeforeRestore = await api(userA, "/api/toolroom");
    const itemsBefore = toolroomBeforeRestore.payload.toolroom.items;
    const historyBefore = toolroomBeforeRestore.payload.toolroom.history;
    itemsBefore.forEach(assertToolInvariant);
    const numbers = itemsBefore.map((item) => item.internalNumber).filter(Boolean).map((value) => value.toLowerCase());
    assert.strictEqual(new Set(numbers).size, numbers.length, "unique internalNumber");
    const requiredHistory = ["toolroom_bulk_created", "toolroom_tool_assigned", "toolroom_tool_returned", "toolroom_tool_transferred", "toolroom_fault_reported", "toolroom_service_sent", "toolroom_tool_returned_to_circulation", "toolroom_tool_written_off", "toolroom_replacement_assigned"];
    requiredHistory.forEach((type) => assert(historyBefore.some((entry) => entry.type === type), `history missing ${type}`));

    const stateAfter = await api(userA, "/api/state");
    assert.notStrictEqual(JSON.stringify(stateAfter.payload.state.siteData["Site A"].warehouse), warehouseBefore, "warehouse user save changed warehouse");
    assert.strictEqual(JSON.stringify(stateAfter.payload.state.siteData["Site A"].notifications || []), siteNotificationsBefore, "site notifications unchanged");
    const afterCurrentSiteD = (await api(userD, "/api/state")).payload.state.currentSite;
    assert.strictEqual(afterCurrentSiteD, currentSiteD, "currentSite drift");
    const workerStateAfter = await api(userB, "/api/state");
    const workerNotifications = (workerStateAfter.payload.state.accountNotifications?.[USERS.b.email]?.notifications || []);
    assert(workerNotifications.some((entry) => entry.type === "toolroom"), "account notifications toolroom");
    checks.push("core workflows, invariants, permissions, account notifications, site notification separation");

    const backup = await api(userC, "/api/backup", { method: "POST", json: { label: "toolroom release proof" } });
    assert(backup.ok, `backup failed ${JSON.stringify(backup.payload)}`);
    const backupId = backup.payload.backup?.id || backup.payload.id;
    const toolroomFile = path.join(dataDir, "toolroom.json");
    const wrapped = JSON.parse(fs.readFileSync(toolroomFile, "utf8"));
    fs.writeFileSync(toolroomFile, JSON.stringify({ ...wrapped, data: { ...wrapped.data, items: [], assignments: [], faults: [], serviceRecords: [], history: [] } }, null, 2));
    const dryRun = await api(userC, "/api/backup/restore/dry-run", { method: "POST", json: { id: backupId } });
    assert(dryRun.ok && dryRun.payload.restoreToken, "restore dry run");
    const restore = await api(userC, "/api/backup/restore", { method: "POST", json: { id: backupId, restoreToken: dryRun.payload.restoreToken, confirmationText: "RESTORE" } });
    assert(restore.ok && restore.payload.integrity?.ok !== false, `restore failed ${JSON.stringify(restore.payload)}`);
    const restored = await api(userA, "/api/toolroom");
    assert(restored.payload.toolroom.items.some((item) => item.internalNumber === "B073"), "restore tools");
    assert(restored.payload.toolroom.history.some((entry) => entry.type === "toolroom_bulk_created"), "restore history");
    checks.push("backup/restore returns Toolroom data");

    const finalState = await api(userA, "/api/state");
    assert(finalState.payload.state.siteData["Site A"].warehouse.catalog.some((item) => item.id === "wh-release"), "warehouse save survived restore");
    const finalToolroom = restored.payload.toolroom;
    finalToolroom.items.forEach(assertToolInvariant);

    console.log(JSON.stringify({
      ok: true,
      checks,
      actions: metrics.actions,
      conflicts: metrics.conflicts,
      rejectedActions: metrics.rejectedActions,
      overwriteAttemptsPrevented: metrics.overwriteAttemptsPrevented,
      dataLoss: false,
      duplicateInternalNumber: false,
      wrongHolders: false,
      warehouseOverwrite: false,
      currentSiteDrift: false,
      jsErrors: metrics.jsErrors,
      siteCloseBlocker: metrics.siteCloseBlocker,
      itemCount: finalToolroom.items.length,
      historyCount: finalToolroom.history.length,
    }, null, 2));
  } finally {
    server.kill();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
