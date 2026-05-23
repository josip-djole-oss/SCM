const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-real-world-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 9400 + Math.floor(Math.random() * 300);
const host = `http://127.0.0.1:${port}`;
const USERS = {
  a: { email: "toolroom.a@cmax.test", password: "Toolroom!123" },
  b: { email: "toolroom.worker.a@cmax.test", password: "Toolroom!123" },
  c: { email: "toolroom.c@cmax.test", password: "Toolroom!123" },
  d: { email: "toolroom.worker.b@cmax.test", password: "Toolroom!123" },
};

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function today() { return "2026-05-24"; }

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: USERS.a.email, password: USERS.a.password, fullName: "Alatnicar A", isSuperAdmin: false, level: 5, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canManageToolroom: true, canAssignTools: true, canReturnTools: true, canViewToolHistory: true, canViewMyTools: true, canViewNotifications: true }, allowedSites: ["Site A", "Site B"] },
    { email: USERS.b.email, password: USERS.b.password, fullName: "Worker Site A", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canViewMyTools: true, canViewNotifications: true }, allowedSites: ["Site A"] },
    { email: USERS.c.email, password: USERS.c.password, fullName: "Admin C", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: USERS.d.email, password: USERS.d.password, fullName: "Worker Site B", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canViewMyTools: true, canViewNotifications: true }, allowedSites: ["Site B"] },
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
  const res = await api(session, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber, name: extra.name || `Tool ${internalNumber}`, status: extra.status || "available", brand: extra.brand || "Milwaukee", model: extra.model || "M18", ...extra } } });
  assert(res.ok, `create ${internalNumber} failed ${res.status} ${JSON.stringify(res.payload)}`);
  return res.payload.item;
}

function assertHolderInvariant(item) {
  const holderTypes = ["toolroom", "worker", "site", "lost"];
  assert(holderTypes.includes(item.currentHolderType), `${item.internalNumber} invalid holder ${item.currentHolderType}`);
  if (item.currentHolderType === "worker") {
    assert.strictEqual(item.status, "assigned_worker", `${item.internalNumber} worker holder must be assigned_worker`);
    assert(item.currentHolderUserEmail, `${item.internalNumber} worker holder missing email`);
    assert(!item.currentHolderSiteId, `${item.internalNumber} worker holder must not have site holder`);
  }
  if (item.currentHolderType === "site") {
    assert.strictEqual(item.status, "assigned_site", `${item.internalNumber} site holder must be assigned_site`);
    assert(item.currentHolderSiteId, `${item.internalNumber} site holder missing site`);
    assert(!item.currentHolderUserEmail, `${item.internalNumber} site holder must not have worker holder`);
  }
  if (item.currentHolderType === "toolroom") {
    assert(!["assigned_worker", "assigned_site", "lost"].includes(item.status), `${item.internalNumber} toolroom holder cannot have assigned/lost status`);
    assert(!item.currentHolderUserEmail && !item.currentHolderSiteId, `${item.internalNumber} returned tool cannot still have holder`);
  }
  if (item.currentHolderType === "lost") {
    assert.strictEqual(item.status, "lost", `${item.internalNumber} lost holder must be lost status`);
  }
}

function assertUniqueInternalNumbers(items) {
  const active = items.filter((item) => !item.archived && item.internalNumber);
  const set = new Set(active.map((item) => item.internalNumber.toLowerCase()));
  assert.strictEqual(set.size, active.length, "duplicate internalNumber detected");
}

function assertHistoryEvent(history, toolId, type) {
  const event = history.find((entry) => entry.entityId === toolId && entry.type === type);
  assert(event, `missing history ${type} for ${toolId}`);
  assert(event.actor, `history ${type} missing actor`);
  assert(event.at, `history ${type} missing timestamp`);
  assert(event.before && typeof event.before === "object", `history ${type} missing before`);
  assert(event.after && typeof event.after === "object", `history ${type} missing after`);
  return event;
}

async function main() {
  const server = startServer();
  const report = { actions: 0, conflicts: 0, rejectedSaves: 0, overwriteAttemptsPrevented: 0, jsErrors: 0, checks: [] };
  try {
    await waitHealth();
    const userA = await login(USERS.a);
    const userB = await login(USERS.b);
    const userC = await login(USERS.c);
    const userD = await login(USERS.d);

    const whBefore = await api(userA, "/api/state");
    const warehouseBefore = JSON.stringify(whBefore.payload.state.siteData["Site A"].warehouse);
    const siteNotificationsBefore = JSON.stringify(whBefore.payload.state.siteData["Site A"].notifications || []);

    const created = await Promise.all([
      createTool(userA, "B054", { name: "Milwaukee M18 FPD3" }),
      createTool(userC, "B055", { name: "Milwaukee M18 FPD3" }),
      createTool(userC, "BR021", { name: "Bosch brusilica" }),
      createTool(userC, "L009", { name: "Leica laser" }),
      createTool(userC, "D001", { name: "Damaged return drill" }),
    ]);
    report.actions += 5;
    const [b054, b055, br021, l009, d001] = created;

    const dup = await api(userA, "/api/toolroom/items", { method: "POST", json: { item: { internalNumber: "B054", name: "Duplicate" } } });
    assert.strictEqual(dup.status, 409, "duplicate internalNumber blocked");
    report.rejectedSaves += 1;
    report.overwriteAttemptsPrevented += 1;
    report.checks.push("duplicate internalNumber blocked");

    const assignB054 = await api(userA, "/api/toolroom/assignments", { method: "POST", json: { toolId: b054.id, holderType: "worker", workerEmail: USERS.b.email, assignedAt: today(), expectedReturnAt: "2026-06-05", note: "Real-world worker assignment" } });
    assert(assignB054.ok, `assign B054 failed ${JSON.stringify(assignB054.payload)}`);
    report.actions += 1;

    const userBMyTools = await api(userB, "/api/toolroom/my-tools?site=Site%20A");
    assert(userBMyTools.ok && userBMyTools.payload.tools.some((item) => item.internalNumber === "B054"), "Worker B sees direct B054");
    report.checks.push("worker sees direct tool");

    const workerReturn = await api(userB, "/api/toolroom/returns", { method: "POST", json: { toolId: b054.id, condition: "ok" } });
    assert.strictEqual(workerReturn.status, 403, "worker cannot return without permission");
    report.rejectedSaves += 1;
    report.checks.push("worker cannot return without permission");

    const transferB054 = await api(userA, "/api/toolroom/transfers", { method: "POST", json: { toolId: b054.id, holderType: "site", siteId: "Site A", assignedAt: today(), note: "Move to Site A" } });
    assert(transferB054.ok && transferB054.payload.item.currentHolderSiteId === "Site A", "B054 transfer to site A");
    report.actions += 1;

    const siteATools = await api(userB, "/api/toolroom/my-tools?site=Site%20A");
    assert(siteATools.payload.tools.some((item) => item.internalNumber === "B054"), "Worker B sees Site A B054");
    const siteBToolsBefore = await api(userD, "/api/toolroom/my-tools?site=Site%20B");
    assert(!siteBToolsBefore.payload.tools.some((item) => item.internalNumber === "B054"), "Worker D does not see Site A B054");
    report.checks.push("site isolation for my-tools");

    const assignBr = await api(userC, "/api/toolroom/assignments", { method: "POST", json: { toolId: br021.id, holderType: "site", siteId: "Site B", assignedAt: today() } });
    assert(assignBr.ok, "BR021 assigned Site B");
    const assignD001 = await api(userC, "/api/toolroom/assignments", { method: "POST", json: { toolId: d001.id, holderType: "worker", workerEmail: USERS.b.email, assignedAt: today() } });
    assert(assignD001.ok, "D001 assigned worker");
    report.actions += 2;

    const concurrent = await Promise.all([
      api(userC, "/api/toolroom/items", { method: "POST", json: { baseVersion: b055.itemVersion, item: { ...b055, notes: "Edited by Admin C" } } }),
      api(userC, "/api/toolroom/returns", { method: "POST", json: { toolId: br021.id, condition: "ok", returnedAt: "2026-05-25" } }),
      api(userC, "/api/toolroom/returns", { method: "POST", json: { toolId: l009.id, condition: "lost", returnedAt: "2026-05-25", note: "Lost during site audit" } }),
      api(userC, "/api/toolroom/returns", { method: "POST", json: { toolId: d001.id, condition: "damaged", returnedAt: "2026-05-25", note: "Housing cracked" } }),
    ]);
    // L009 was not assigned, so lost via return should be rejected. Assign then mark lost to keep workflow valid.
    if (!concurrent[2].ok) {
      report.rejectedSaves += 1;
      const assignL009 = await api(userC, "/api/toolroom/assignments", { method: "POST", json: { toolId: l009.id, holderType: "site", siteId: "Site B", assignedAt: today() } });
      assert(assignL009.ok, "L009 assigned before lost");
      const lostL009 = await api(userC, "/api/toolroom/returns", { method: "POST", json: { toolId: l009.id, condition: "lost", returnedAt: "2026-05-25", note: "Lost during site audit" } });
      assert(lostL009.ok && lostL009.payload.item.status === "lost", "L009 marked lost");
      report.actions += 2;
    }
    assert(concurrent[0].ok, `B055 edit failed ${JSON.stringify(concurrent[0].payload)}`);
    assert(concurrent[1].ok, `BR021 return failed ${JSON.stringify(concurrent[1].payload)}`);
    assert(concurrent[3].ok, `D001 damaged return failed ${JSON.stringify(concurrent[3].payload)}`);
    report.actions += 3;
    report.checks.push("parallel edit/return/damaged workflow preserved");

    const stateAfter = await api(userA, "/api/state");
    assert.strictEqual(JSON.stringify(stateAfter.payload.state.siteData["Site A"].warehouse), warehouseBefore, "warehouse unchanged by toolroom");
    assert.strictEqual(JSON.stringify(stateAfter.payload.state.siteData["Site A"].notifications || []), siteNotificationsBefore, "site notifications unchanged by toolroom");
    report.checks.push("no cross-module overwrite and no site notification write");

    const finalToolroom = await api(userA, "/api/toolroom");
    const items = finalToolroom.payload.toolroom.items;
    const history = finalToolroom.payload.toolroom.history;
    assertUniqueInternalNumbers(items);
    items.forEach(assertHolderInvariant);
    report.checks.push("holder invariants and unique numbers");

    assertHistoryEvent(history, b054.id, "toolroom_tool_assigned");
    assertHistoryEvent(history, b054.id, "toolroom_tool_transferred");
    assertHistoryEvent(history, br021.id, "toolroom_tool_returned");
    assertHistoryEvent(history, l009.id, "toolroom_tool_lost");
    assertHistoryEvent(history, d001.id, "toolroom_tool_returned_damaged");
    report.checks.push("history actor/timestamp/before/after/action");

    const workerState = await api(userB, "/api/state");
    const workerNotifications = workerState.payload.state.accountNotifications?.[USERS.b.email]?.notifications || [];
    assert(workerNotifications.some((entry) => entry.type === "toolroom"), "worker account notification exists");
    const unreadCount = workerNotifications.filter((entry) => !entry.readAt).length;
    assert(unreadCount > 0, "topbar account badge would increment via unread account notifications");
    report.checks.push("account notifications only");

    const backup = await api(userC, "/api/backup", { method: "POST", json: {} });
    assert(backup.ok, "backup created");
    const backupId = backup.payload.id || backup.payload.file || fs.readdirSync(backupDir).find((name) => name.endsWith(".json"));
    const backupFile = fs.readdirSync(backupDir).find((name) => name.endsWith(".json"));
    const snapshot = JSON.parse(fs.readFileSync(path.join(backupDir, backupFile), "utf8"));
    assert(snapshot.toolroom && snapshot.toolroom.items?.length >= 5, "backup includes tools");
    assert(snapshot.toolroom.assignments?.length >= 3, "backup includes assignments");
    assert(snapshot.toolroom.history?.length >= 5, "backup includes history");
    assert(snapshot.toolroom.presets?.length > 0, "backup includes presets");
    assert(snapshot.toolroom.categories?.length > 0, "backup includes categories");
    const toolroomFile = path.join(dataDir, "toolroom.json");
    const wrappedToolroom = JSON.parse(fs.readFileSync(toolroomFile, "utf8"));
    fs.writeFileSync(toolroomFile, JSON.stringify({ ...wrappedToolroom, data: { ...wrappedToolroom.data, items: [], assignments: [], history: [] } }, null, 2));
    const destructiveCheck = await api(userC, "/api/toolroom");
    assert.strictEqual(destructiveCheck.payload.toolroom.items.length, 0, "destructive test setup did not clear tools");
    const dryRun = await api(userC, "/api/backup/restore/dry-run", { method: "POST", json: { id: backupId } });
    assert(dryRun.ok && dryRun.payload.restoreToken, `restore dry-run failed ${JSON.stringify(dryRun.payload)}`);
    const restore = await api(userC, "/api/backup/restore", { method: "POST", json: { id: backupId, restoreToken: dryRun.payload.restoreToken, confirmationText: "RESTORE" } });
    assert(restore.ok && restore.payload.restored, `restore failed ${JSON.stringify(restore.payload)}`);
    const restoredToolroom = await api(userC, "/api/toolroom");
    assert(restoredToolroom.payload.toolroom.items.some((item) => item.internalNumber === "B054"), "restore returned B054");
    assert(restoredToolroom.payload.toolroom.assignments.length >= 3, "restore returned assignments");
    assert(restoredToolroom.payload.toolroom.history.length >= 5, "restore returned history");
    report.actions += 2;
    report.checks.push("backup dry-run and restore returns full toolroom data");

    const noDataLoss = ["B054", "B055", "BR021", "L009", "D001"].every((num) => items.some((item) => item.internalNumber === num));
    assert(noDataLoss, "data loss detected");
    report.noDataLoss = true;
    report.duplicateInternalNumbers = false;
    report.wrongHolders = false;
    report.permissionsOk = true;
    report.backupRestoreToolroomOk = true;
    console.log(JSON.stringify({ ok: true, ...report }, null, 2));
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
