const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const runId = `toolroom-phase2-proof-${Date.now()}`;
const tmpRoot = path.join(os.tmpdir(), runId);
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const outputDir = path.join(root, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const port = 9200 + Math.floor(Math.random() * 300);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.phase2.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.phase2.worker@cmax.test", password: "Toolroom!123" };

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function seed() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir); mkdir(screenshotDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Alatnicar Proof", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: WORKER.email, password: WORKER.password, fullName: "Marko Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canViewMyTools: true, canManageToolroom: true, canAssignTools: true, canReturnTools: true }, allowedSites: ["Proof Site", "Site B"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Proof Site", "Site B"],
    currentSite: "Proof Site",
    moduleVersions: { warehouse: { "Proof Site": 1, "Site B": 1 } },
    siteData: { "Proof Site": { warehouse: { catalog: [], stock: {}, logs: [] } }, "Site B": { warehouse: { catalog: [], stock: {}, logs: [] } } },
    accountNotifications: {},
  }), null, 2));
  fs.writeFileSync(path.join(dataDir, "toolroom.json"), JSON.stringify(envelope({
    version: 1,
    items: [
      { id: "tool_available", internalNumber: "B054", serialNumber: "SN-054", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", categoryId: "cat_drills", status: "available", currentHolderType: "toolroom", archived: false, itemVersion: 1, updatedAt: "2026-05-24T08:00:00.000Z", updatedBy: "seed" },
      { id: "tool_worker", internalNumber: "B055", serialNumber: "SN-055", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", categoryId: "cat_drills", status: "assigned_worker", currentHolderType: "worker", currentHolderUserEmail: WORKER.email, currentHolderUserName: "Marko Worker", issuedAt: "2026-05-24", expectedReturnAt: "2026-06-05", archived: false, itemVersion: 3, updatedAt: "2026-05-24T09:00:00.000Z", updatedBy: ADMIN.email },
      { id: "tool_site", internalNumber: "BR022", serialNumber: "SN-BR022", name: "Brusilica", type: "Brusilica", brand: "Bosch", model: "GWS", categoryId: "cat_grinders", status: "assigned_site", currentHolderType: "site", currentHolderSiteId: "Proof Site", issuedAt: "2026-05-22", expectedReturnAt: "2026-06-01", archived: false, itemVersion: 2, updatedAt: "2026-05-24T10:00:00.000Z", updatedBy: ADMIN.email },
    ],
    assignments: [
      { id: "asg_worker", toolId: "tool_worker", action: "assigned", holderType: "worker", holderUserEmail: WORKER.email, holderUserName: "Marko Worker", assignedAt: "2026-05-24", expectedReturnAt: "2026-06-05", note: "Proof assignment", actor: ADMIN.email, createdAt: "2026-05-24T09:00:00.000Z" },
      { id: "asg_site", toolId: "tool_site", action: "assigned", holderType: "site", holderSiteId: "Proof Site", assignedAt: "2026-05-22", expectedReturnAt: "2026-06-01", note: "Proof site assignment", actor: ADMIN.email, createdAt: "2026-05-24T10:00:00.000Z" },
    ],
    history: [
      { id: "hist1", entityType: "toolItem", entityId: "tool_worker", type: "toolroom_tool_assigned", actor: ADMIN.email, at: "2026-05-24T09:00:00.000Z", note: "B055 -> Marko Worker" },
      { id: "hist2", entityType: "toolItem", entityId: "tool_site", type: "toolroom_tool_assigned", actor: ADMIN.email, at: "2026-05-24T10:00:00.000Z", note: "BR022 -> Proof Site" },
    ],
    updatedAt: "2026-05-24T10:00:00.000Z",
  }), null, 2));
}

function startServer() {
  seed();
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
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.ok && payload.storageReady) return;
    } catch (_) {}
    await delay(250);
  }
  throw new Error("Server did not become healthy");
}

async function login(page, user) {
  await page.goto(`${host}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#loginEmail", { timeout: 30000 });
  await page.fill("#loginEmail", user.email);
  await page.fill("#loginPassword", user.password);
  await page.evaluate(() => CMAX.core.login());
  await page.waitForFunction(() => window.appState?.currentUser && window.freshServerDataLoaded === true, null, { timeout: 45000 });
}

async function openToolroom(page) {
  await page.evaluate(() => CMAX.toolroom.show());
  await page.waitForSelector("#toolroom-section .toolroom-shell", { timeout: 20000 });
}

async function capture(page, viewportName, name, rows, note = "") {
  await page.waitForTimeout(250);
  const file = path.join(screenshotDir, `${viewportName}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const metrics = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    toolroomVisible: document.getElementById("toolroom-section")?.style.display !== "none",
    actionPanel: document.querySelectorAll(".toolroom-action-panel").length,
    myCards: document.querySelectorAll(".toolroom-my-tool-card").length,
    quickActions: document.querySelectorAll(".toolroom-quick-actions .btn").length,
  }));
  rows.push({
    viewport: viewportName,
    name,
    status: metrics.horizontalOverflow || !metrics.toolroomVisible ? "MAJOR" : "GOOD",
    screenshot: path.relative(outputDir, file).replace(/\\/g, "/"),
    note,
    metrics,
  });
}

async function main() {
  const server = startServer();
  let browser;
  try {
    await waitHealth();
    browser = await chromium.launch({ headless: true });
    const viewports = [
      { name: "desktop-1440", width: 1440, height: 1000 },
      { name: "tablet-768", width: 768, height: 1024 },
      { name: "mobile-390", width: 390, height: 844 },
      { name: "mobile-430", width: 430, height: 932 },
    ];
    const rows = [];
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await login(page, ADMIN);
      await openToolroom(page);
      await capture(page, viewport.name, "dashboard-worker-site", rows, "Dashboard with worker/site assignment summaries and history.");
      await page.evaluate(() => { CMAX.toolroom.switchTab("items"); CMAX.toolroom.selectItem("tool_available"); openToolroomAction("assign", "tool_available"); });
      await page.waitForSelector(".toolroom-action-panel");
      await capture(page, viewport.name, "assign-wizard", rows, "Assign wizard for available B054.");
      await page.evaluate(() => { CMAX.toolroom.selectItem("tool_worker"); openToolroomAction("return", "tool_worker"); });
      await page.waitForSelector("#toolroomReturnCondition");
      await capture(page, viewport.name, "return-wizard", rows, "Return wizard for worker-assigned B055.");
      await page.evaluate(() => { CMAX.toolroom.selectItem("tool_site"); openToolroomAction("transfer", "tool_site"); });
      await page.waitForSelector("#toolroomAssignHolderType");
      await capture(page, viewport.name, "transfer-wizard", rows, "Transfer wizard for site-assigned BR022.");
      await page.evaluate(() => { CMAX.toolroom.selectItem("tool_worker"); openToolroomAction("history", "tool_worker"); });
      await page.waitForSelector(".toolroom-action-panel");
      await capture(page, viewport.name, "history", rows, "Tool history panel.");
      await page.evaluate(() => CMAX.toolroom.switchTab("myTools"));
      await page.waitForSelector(".toolroom-my-tools", { timeout: 20000 });
      await capture(page, viewport.name, "my-tools-cards", rows, "My Tools mobile cards for active site tools.");
      await context.close();
    }
    const md = ["# Toolroom Phase 2 Proof", "", `Run: ${runId}`, ""];
    rows.forEach((row) => {
      md.push(`## ${row.status} - ${row.viewport} - ${row.name}`, "", row.note, "", `![${row.name}](${row.screenshot})`, "", "```json", JSON.stringify(row.metrics, null, 2), "```", "");
    });
    fs.writeFileSync(path.join(outputDir, "REPORT.md"), md.join("\n"), "utf8");
    console.log(JSON.stringify({ ok: rows.every((row) => row.status === "GOOD"), report: path.join(outputDir, "REPORT.md"), rows }, null, 2));
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(4000)]);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
