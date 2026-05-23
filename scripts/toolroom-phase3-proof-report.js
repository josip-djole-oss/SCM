const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const runId = `toolroom-phase3-proof-${Date.now()}`;
const tmpRoot = path.join(os.tmpdir(), runId);
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const outputDir = path.join(root, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const port = 10100 + Math.floor(Math.random() * 200);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.p3.proof.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.p3.proof.worker@cmax.test", password: "Toolroom!123" };

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function seed() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir); mkdir(screenshotDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Proof Alatnicar", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: WORKER.email, password: WORKER.password, fullName: "Proof Worker", isSuperAdmin: false, level: 4, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true, canViewNotifications: true }, allowedSites: ["Site A"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Site A"],
    currentSite: "Site A",
    moduleVersions: { warehouse: { "Site A": 1 } },
    siteData: { "Site A": { warehouse: { catalog: [], stock: {}, logs: [] }, notifications: [] } },
    accountNotifications: { [WORKER.email]: { notifications: [{ id: "toolroom_fault_notice", type: "toolroom", title: "Kvar zaprimljen: B054", description: "Status kvara je zaprimljen.", createdAt: "2026-05-24T11:00:00.000Z", readAt: null }] } },
  }), null, 2));
  fs.writeFileSync(path.join(dataDir, "toolroom.json"), JSON.stringify(envelope({
    version: 1,
    items: [
      { id: "tool_worker", internalNumber: "B054", serialNumber: "SN-054", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", categoryId: "cat_drills", status: "assigned_worker", currentHolderType: "worker", currentHolderUserEmail: WORKER.email, currentHolderUserName: "Proof Worker", issuedAt: "2026-05-24", expectedReturnAt: "2026-06-05", archived: false, itemVersion: 3, updatedAt: "2026-05-24T09:00:00.000Z", updatedBy: ADMIN.email },
      { id: "tool_site", internalNumber: "BR021", serialNumber: "SN-BR021", name: "Bosch brusilica", type: "Brusilica", brand: "Bosch", model: "GWS", categoryId: "cat_grinders", status: "fault_reported", currentHolderType: "site", currentHolderSiteId: "Site A", issuedAt: "2026-05-22", expectedReturnAt: "2026-06-01", archived: false, itemVersion: 4, updatedAt: "2026-05-24T10:00:00.000Z", updatedBy: WORKER.email },
      { id: "tool_replacement", internalNumber: "B055", serialNumber: "SN-055", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", categoryId: "cat_drills", status: "available", currentHolderType: "toolroom", archived: false, itemVersion: 1, updatedAt: "2026-05-24T08:00:00.000Z", updatedBy: "seed" },
      { id: "tool_service", internalNumber: "L009", serialNumber: "SN-L009", name: "Leica laser", type: "Laser", brand: "Leica", model: "Disto", categoryId: "cat_lasers", status: "in_service", currentHolderType: "service", archived: false, itemVersion: 5, updatedAt: "2026-05-24T11:00:00.000Z", updatedBy: ADMIN.email },
    ],
    assignments: [],
    faults: [
      { id: "fault_site", toolId: "tool_site", status: "reported", faultType: "Kabel ostecen", comment: "Kabel je napukao na gradilistu", replacementRequested: false, reporterEmail: WORKER.email, reporterName: "Proof Worker", reporterSite: "Site A", createdAt: "2026-05-24T10:00:00.000Z", updatedAt: "2026-05-24T10:00:00.000Z", updatedBy: WORKER.email, faultVersion: 1 },
      { id: "fault_service", toolId: "tool_service", status: "in_service", faultType: "Ne radi", comment: "Laser ne pali", replacementRequested: true, reporterEmail: WORKER.email, reporterName: "Proof Worker", reporterSite: "Site A", createdAt: "2026-05-24T09:00:00.000Z", updatedAt: "2026-05-24T11:00:00.000Z", updatedBy: ADMIN.email, faultVersion: 3, serviceId: "service_1" },
    ],
    serviceRecords: [{ id: "service_1", faultId: "fault_service", toolId: "tool_service", status: "in_service", serviceCompany: "Leica Service", sentAt: "2026-05-24", problemDescription: "Laser ne pali", expectedReturnAt: "2026-06-10", cost: 900, documentUrl: "", returnedAt: "", comment: "Proof service", createdAt: "2026-05-24T11:00:00.000Z", updatedAt: "2026-05-24T11:00:00.000Z", updatedBy: ADMIN.email, serviceVersion: 1 }],
    history: [
      { id: "hist_fault", entityType: "toolItem", entityId: "tool_site", type: "toolroom_fault_reported", actor: WORKER.email, at: "2026-05-24T10:00:00.000Z", note: "BR021 | Kabel ostecen", before: { status: "assigned_site" }, after: { status: "fault_reported", faultId: "fault_site" } },
      { id: "hist_service", entityType: "toolItem", entityId: "tool_service", type: "toolroom_service_sent", actor: ADMIN.email, at: "2026-05-24T11:00:00.000Z", note: "L009 -> servis Leica", before: { status: "fault_reported" }, after: { status: "in_service", holderType: "service", faultId: "fault_service", serviceId: "service_1" } },
    ],
    updatedAt: "2026-05-24T11:00:00.000Z",
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
    try { const res = await fetch(`${host}/api/health`); const payload = await res.json().catch(() => ({})); if (res.ok && payload.ok && payload.storageReady) return; } catch (_) {}
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
    faultCards: document.querySelectorAll(".toolroom-fault-card").length,
    myCards: document.querySelectorAll(".toolroom-my-tool-card").length,
    accountBadge: document.getElementById("topbarNotificationsBadge")?.textContent?.trim() || "",
  }));
  rows.push({ viewport: viewportName, name, status: metrics.horizontalOverflow || !metrics.toolroomVisible ? "MAJOR" : "GOOD", screenshot: path.relative(outputDir, file).replace(/\\/g, "/"), note, metrics });
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
      const adminContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const adminPage = await adminContext.newPage();
      await login(adminPage, ADMIN);
      await openToolroom(adminPage);
      await adminPage.evaluate(() => CMAX.toolroom.switchTab("faults"));
      await adminPage.waitForSelector(".toolroom-fault-card");
      await capture(adminPage, viewport.name, "alatnicar-fault-queue", rows, "Alatnicar fault queue with replacement request and service records.");
      await adminPage.evaluate(() => { CMAX.toolroom.switchTab("faults"); openToolroomAction("service", "fault_site"); });
      await adminPage.waitForSelector("#toolroomServiceCompany");
      await capture(adminPage, viewport.name, "service-form", rows, "Service form with company/date/cost/document/comment fields.");
      await adminPage.evaluate(() => { CMAX.toolroom.switchTab("items"); CMAX.toolroom.selectItem("tool_service"); openToolroomAction("history", "tool_service"); });
      await adminPage.waitForSelector(".toolroom-action-panel");
      await capture(adminPage, viewport.name, "service-history", rows, "History panel for service workflow.");
      await adminContext.close();

      const workerContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const workerPage = await workerContext.newPage();
      await login(workerPage, WORKER);
      await openToolroom(workerPage);
      await workerPage.evaluate(() => CMAX.toolroom.switchTab("myTools"));
      await workerPage.waitForSelector(".toolroom-my-tools");
      await capture(workerPage, viewport.name, "worker-my-tools-fault", rows, "Mobile My Tools cards include Prijavi kvar action.");
      await workerPage.evaluate(() => { CMAX.toolroom.selectItem("tool_worker"); openToolroomAction("fault", "tool_worker"); });
      await workerPage.waitForSelector("#toolroomFaultType");
      await capture(workerPage, viewport.name, "worker-fault-report", rows, "Worker fault report form with replacement checkbox.");
      await capture(workerPage, viewport.name, "notifications-badge", rows, "Worker topbar account badge shows Toolroom account notification.");
      await workerContext.close();
    }
    const md = ["# Toolroom Phase 3 Service Proof", "", `Run: ${runId}`, ""];
    rows.forEach((row) => md.push(`## ${row.status} - ${row.viewport} - ${row.name}`, "", row.note, "", `![${row.name}](${row.screenshot})`, "", "```json", JSON.stringify(row.metrics, null, 2), "```", ""));
    fs.writeFileSync(path.join(outputDir, "REPORT.md"), md.join("\n"), "utf8");
    console.log(JSON.stringify({ ok: rows.every((row) => row.status === "GOOD"), report: path.join(outputDir, "REPORT.md"), rows }, null, 2));
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(4000)]);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
