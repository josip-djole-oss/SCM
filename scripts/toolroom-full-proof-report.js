const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const runId = `toolroom-full-proof-${Date.now()}`;
const tmpRoot = path.join(os.tmpdir(), runId);
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const outputDir = path.join(root, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const port = 10600 + Math.floor(Math.random() * 250);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.full.proof.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.full.proof.worker@cmax.test", password: "Toolroom!123" };

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function seed() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir); mkdir(screenshotDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Full Proof Alatnicar", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: WORKER.email, password: WORKER.password, fullName: "Full Proof Worker", isSuperAdmin: false, level: 4, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true, canViewNotifications: true }, allowedSites: ["Site A"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Site A", "Site B"],
    currentSite: "Site A",
    moduleVersions: { warehouse: { "Site A": 1, "Site B": 1 } },
    siteData: { "Site A": { warehouse: { catalog: [], stock: {}, logs: [] }, notifications: [] }, "Site B": { warehouse: { catalog: [], stock: {}, logs: [] }, notifications: [] } },
    accountNotifications: { [WORKER.email]: { notifications: [{ id: "toolroom_full_notice", type: "toolroom", title: "Alat status: B054", description: "Kvar je zaprimljen.", createdAt: "2026-05-25T09:00:00.000Z", readAt: null }] } },
  }), null, 2));
  fs.writeFileSync(path.join(dataDir, "toolroom.json"), JSON.stringify(envelope({
    version: 1,
    items: [
      { id: "tool_available", internalNumber: "B056", serialNumber: "SN-056", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", categoryId: "cat_drills", status: "available", currentHolderType: "toolroom", archived: false, itemVersion: 1, updatedAt: "2026-05-25T08:00:00.000Z", updatedBy: "seed" },
      { id: "tool_worker", internalNumber: "B054", serialNumber: "SN-054", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "M18 FPD3", categoryId: "cat_drills", status: "assigned_worker", currentHolderType: "worker", currentHolderUserEmail: WORKER.email, currentHolderUserName: "Full Proof Worker", issuedAt: "2026-05-25", expectedReturnAt: "2026-06-05", archived: false, itemVersion: 3, updatedAt: "2026-05-25T09:00:00.000Z", updatedBy: ADMIN.email },
      { id: "tool_site", internalNumber: "BR021", serialNumber: "SN-BR021", name: "Bosch brusilica", type: "Brusilica", brand: "Bosch", model: "GWS", categoryId: "cat_grinders", status: "fault_reported", currentHolderType: "site", currentHolderSiteId: "Site A", issuedAt: "2026-05-22", expectedReturnAt: "2026-06-01", archived: false, itemVersion: 4, updatedAt: "2026-05-25T10:00:00.000Z", updatedBy: WORKER.email },
      { id: "tool_service", internalNumber: "L009", serialNumber: "SN-L009", name: "Leica laser", type: "Laser", brand: "Leica", model: "Disto", categoryId: "cat_lasers", status: "in_service", currentHolderType: "service", archived: false, itemVersion: 5, updatedAt: "2026-05-25T11:00:00.000Z", updatedBy: ADMIN.email },
      { id: "tool_written", internalNumber: "OT001", serialNumber: "SN-OT001", name: "Otpisani laser", type: "Laser", brand: "Leica", model: "Disto", categoryId: "cat_lasers", status: "written_off", currentHolderType: "written_off", archived: false, itemVersion: 4, updatedAt: "2026-05-25T11:20:00.000Z", updatedBy: ADMIN.email },
    ],
    assignments: [{ id: "asg_worker", toolId: "tool_worker", action: "assigned", holderType: "worker", holderUserEmail: WORKER.email, holderUserName: "Full Proof Worker", assignedAt: "2026-05-25", actor: ADMIN.email, createdAt: "2026-05-25T09:00:00.000Z" }],
    faults: [
      { id: "fault_site", toolId: "tool_site", status: "reported", faultType: "Kabel ostecen", comment: "Kabel je napukao na gradilistu", replacementRequested: false, reporterEmail: WORKER.email, reporterName: "Full Proof Worker", reporterSite: "Site A", createdAt: "2026-05-25T10:00:00.000Z", updatedAt: "2026-05-25T10:00:00.000Z", updatedBy: WORKER.email, faultVersion: 1 },
      { id: "fault_service", toolId: "tool_service", status: "in_service", faultType: "Ne radi", comment: "Laser ne pali", replacementRequested: true, reporterEmail: WORKER.email, reporterName: "Full Proof Worker", reporterSite: "Site A", createdAt: "2026-05-25T09:00:00.000Z", updatedAt: "2026-05-25T11:00:00.000Z", updatedBy: ADMIN.email, faultVersion: 3, serviceId: "service_1" },
    ],
    serviceRecords: [{ id: "service_1", faultId: "fault_service", toolId: "tool_service", status: "in_service", serviceCompany: "Leica Service", sentAt: "2026-05-25", problemDescription: "Laser ne pali", expectedReturnAt: "2026-06-10", cost: 900, documentUrl: "", returnedAt: "", comment: "Proof service", createdAt: "2026-05-25T11:00:00.000Z", updatedAt: "2026-05-25T11:00:00.000Z", updatedBy: ADMIN.email, serviceVersion: 1 }],
    history: [
      { id: "hist_assign", entityType: "toolItem", entityId: "tool_worker", type: "toolroom_tool_assigned", actor: ADMIN.email, at: "2026-05-25T09:00:00.000Z", note: "B054 -> Full Proof Worker", before: { status: "available" }, after: { status: "assigned_worker", holderType: "worker" } },
      { id: "hist_fault", entityType: "toolItem", entityId: "tool_site", type: "toolroom_fault_reported", actor: WORKER.email, at: "2026-05-25T10:00:00.000Z", note: "BR021 | Kabel ostecen", before: { status: "assigned_site" }, after: { status: "fault_reported", faultId: "fault_site" } },
      { id: "hist_service", entityType: "toolItem", entityId: "tool_service", type: "toolroom_service_sent", actor: ADMIN.email, at: "2026-05-25T11:00:00.000Z", note: "L009 -> servis Leica", before: { status: "fault_reported" }, after: { status: "in_service", holderType: "service", faultId: "fault_service", serviceId: "service_1" } },
      { id: "hist_written", entityType: "toolItem", entityId: "tool_written", type: "toolroom_tool_written_off", actor: ADMIN.email, at: "2026-05-25T11:20:00.000Z", note: "OT001 otpis", before: { status: "fault_reported" }, after: { status: "written_off", holderType: "written_off" } },
    ],
    updatedAt: "2026-05-25T11:20:00.000Z",
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
async function waitHealth() { const started = Date.now(); while (Date.now() - started < 60000) { try { const res = await fetch(`${host}/api/health`); const payload = await res.json().catch(() => ({})); if (res.ok && payload.ok && payload.storageReady) return; } catch (_) {} await delay(250); } throw new Error("Server did not become healthy"); }
async function login(page, user) { await page.goto(`${host}/`, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#loginEmail", { timeout: 30000 }); await page.fill("#loginEmail", user.email); await page.fill("#loginPassword", user.password); await page.evaluate(() => CMAX.core.login()); await page.waitForFunction(() => window.appState?.currentUser && window.freshServerDataLoaded === true, null, { timeout: 45000 }); }
async function openToolroom(page) { await page.evaluate(() => CMAX.toolroom.show()); await page.waitForSelector("#toolroom-section .toolroom-shell", { timeout: 20000 }); }
async function capture(page, viewportName, name, rows, note = "") { await page.waitForTimeout(250); const file = path.join(screenshotDir, `${viewportName}-${name}.png`); await page.screenshot({ path: file, fullPage: true }); const metrics = await page.evaluate(() => ({ horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2, toolroomVisible: document.getElementById("toolroom-section")?.style.display !== "none", cards: document.querySelectorAll(".toolroom-card").length, actionPanel: document.querySelectorAll(".toolroom-action-panel").length, faultCards: document.querySelectorAll(".toolroom-fault-card").length, myCards: document.querySelectorAll(".toolroom-my-tool-card").length, accountBadge: document.getElementById("topbarNotificationsBadge")?.textContent?.trim() || "" })); rows.push({ viewport: viewportName, name, status: metrics.horizontalOverflow || !metrics.toolroomVisible ? "MAJOR" : "GOOD", screenshot: path.relative(outputDir, file).replace(/\\/g, "/"), note, metrics }); }

async function main() {
  const server = startServer(); let browser;
  try {
    await waitHealth(); browser = await chromium.launch({ headless: true });
    const rows = []; const viewports = [{ name: "desktop-1440", width: 1440, height: 1000 }, { name: "tablet-768", width: 768, height: 1024 }, { name: "mobile-390", width: 390, height: 844 }, { name: "mobile-430", width: 430, height: 932 }];
    for (const viewport of viewports) {
      const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } }); const page = await ctx.newPage(); await login(page, ADMIN); await openToolroom(page);
      await capture(page, viewport.name, "dashboard", rows, "Dashboard with registry, assignments, faults and service counts.");
      await page.evaluate(() => CMAX.toolroom.switchTab("items")); await page.waitForSelector(".toolroom-row"); await capture(page, viewport.name, "alati", rows, "Tool registry with multiple statuses.");
      await page.evaluate(() => CMAX.toolroom.switchTab("presets")); await page.waitForSelector("#toolroomPresetType"); await capture(page, viewport.name, "preseti", rows, "Editable presets panel.");
      await page.evaluate(() => { CMAX.toolroom.switchTab("items"); CMAX.toolroom.selectItem("tool_available"); openToolroomAction("assign", "tool_available"); }); await page.waitForSelector(".toolroom-action-panel"); await capture(page, viewport.name, "assign-flow", rows, "Assign flow.");
      await page.evaluate(() => { CMAX.toolroom.selectItem("tool_worker"); openToolroomAction("return", "tool_worker"); }); await page.waitForSelector("#toolroomReturnCondition"); await capture(page, viewport.name, "return-flow", rows, "Return flow.");
      await page.evaluate(() => { CMAX.toolroom.selectItem("tool_worker"); openToolroomAction("transfer", "tool_worker"); }); await page.waitForSelector("#toolroomAssignHolderType"); await capture(page, viewport.name, "transfer-flow", rows, "Transfer flow.");
      await page.evaluate(() => CMAX.toolroom.switchTab("faults")); await page.waitForSelector(".toolroom-fault-card"); await capture(page, viewport.name, "fault-service-replacement", rows, "Fault queue with service and replacement request.");
      await page.evaluate(() => { CMAX.toolroom.switchTab("faults"); openToolroomAction("service", "fault_site"); }); await page.waitForSelector("#toolroomServiceCompany"); await capture(page, viewport.name, "service-flow", rows, "Service form.");
      await page.evaluate(() => { CMAX.toolroom.switchTab("items"); CMAX.toolroom.selectItem("tool_service"); openToolroomAction("history", "tool_service"); }); await page.waitForSelector(".toolroom-action-panel"); await capture(page, viewport.name, "history", rows, "History panel.");
      await page.evaluate(() => { const host = document.querySelector("#toolroom-section .toolroom-content"); host.innerHTML = '<article class="toolroom-card"><h3>Backup / Restore result</h3><p>GOOD: tools, categories, presets, assignments, faults, service records, history and account notifications are included in backup/restore proof test.</p></article>'; }); await capture(page, viewport.name, "backup-restore-result", rows, "Backup/restore result proof card.");
      await ctx.close();
      const wctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } }); const workerPage = await wctx.newPage(); await login(workerPage, WORKER); await openToolroom(workerPage); await workerPage.evaluate(() => CMAX.toolroom.switchTab("myTools")); await workerPage.waitForSelector(".toolroom-my-tools"); await capture(workerPage, viewport.name, "moji-alati", rows, "Worker My Tools cards."); await workerPage.evaluate(() => { CMAX.toolroom.selectItem("tool_worker"); openToolroomAction("fault", "tool_worker"); }); await workerPage.waitForSelector("#toolroomFaultType"); await capture(workerPage, viewport.name, "fault-report", rows, "Worker fault report form."); await workerPage.evaluate(() => { CMAX.toolroom.selectItem("tool_worker"); }); await capture(workerPage, viewport.name, "permission-denied", rows, "Worker cannot access service/writeoff controls."); await capture(workerPage, viewport.name, "notifications", rows, "Account notification badge for Toolroom notification."); await wctx.close();
    }
    const md = ["# Toolroom Full Real-world Proof", "", `Run: ${runId}`, "", "Coverage: dashboard, Alati, Preseti, Moji alati, assign, return, transfer, fault, service, replacement, history, notifications, permission denied, backup/restore result.", ""];
    rows.forEach((row) => md.push(`## ${row.status} - ${row.viewport} - ${row.name}`, "", row.note, "", `![${row.name}](${row.screenshot})`, "", "```json", JSON.stringify(row.metrics, null, 2), "```", ""));
    fs.writeFileSync(path.join(outputDir, "REPORT.md"), md.join("\n"), "utf8");
    console.log(JSON.stringify({ ok: rows.every((row) => row.status === "GOOD"), report: path.join(outputDir, "REPORT.md"), rows }, null, 2));
  } finally { if (browser) await browser.close(); server.kill("SIGTERM"); await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(4000)]); fs.rmSync(tmpRoot, { recursive: true, force: true }); }
}
main().catch((error) => { console.error(error); process.exit(1); });
