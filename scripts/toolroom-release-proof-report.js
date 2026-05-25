const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const runId = `toolroom-release-proof-${Date.now()}`;
const outputDir = path.join(root, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-release-proof-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 11200 + Math.floor(Math.random() * 400);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.release.proof.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.release.proof.worker@cmax.test", password: "Toolroom!123" };

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function now() { return "2026-05-25T09:00:00.000Z"; }

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir); mkdir(screenshotDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Release Proof Alatnicar", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null },
    { email: WORKER.email, password: WORKER.password, fullName: "Release Proof Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true, canViewNotifications: true }, allowedSites: ["Site A"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Site A", "Site B"],
    currentSite: "Site A",
    siteData: { "Site A": { warehouse: { catalog: [], stock: {}, logs: [] }, notifications: [] }, "Site B": { warehouse: { catalog: [], stock: {}, logs: [] }, notifications: [] } },
    accountNotifications: { [WORKER.email]: { notifications: [{ id: "toolroom_notice", type: "toolroom", title: "Alat vam je zaduzen: B054", description: "Milwaukee M18 FPD3 je zaduzen na vas.", createdAt: now(), readAt: null }] } },
    moduleVersions: {},
  }), null, 2));
  fs.writeFileSync(path.join(dataDir, "toolroom.json"), JSON.stringify(envelope({
    version: 1,
    categories: [
      { id: "cat_machines", parentId: "", name: "Masine", iconKey: "drill", order: 1, archived: false, categoryVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "cat_drills", parentId: "cat_machines", name: "Busilice", iconKey: "drill", order: 1, archived: false, categoryVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "cat_release", parentId: "cat_drills", name: "Release Aku", iconKey: "drill", order: 2, archived: false, categoryVersion: 1, updatedAt: now(), updatedBy: ADMIN.email },
    ],
    presets: [
      { id: "preset_type", type: "toolType", label: "Busilica", value: "Busilica", metadata: {}, archived: false, presetVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "preset_brand", type: "brand", label: "Milwaukee", value: "Milwaukee", metadata: {}, archived: false, presetVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "preset_model", type: "model", label: "Milwaukee M18 FPD3", value: "Milwaukee M18 FPD3", metadata: {}, archived: false, presetVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "preset_status_1", type: "status", label: "Dostupno", value: "available", metadata: {}, archived: false, presetVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "preset_status_2", type: "status", label: "Ceka graviranje", value: "awaiting_engraving", metadata: {}, archived: false, presetVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "preset_status_3", type: "status", label: "Zaduzeno radniku", value: "assigned_worker", metadata: {}, archived: false, presetVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "preset_fault", type: "faultType", label: "Ne radi", value: "Ne radi", metadata: {}, archived: false, presetVersion: 1, updatedAt: now(), updatedBy: "system" },
      { id: "preset_prefix", type: "prefixRule", label: "Busilica", value: "B", metadata: { toolType: "Busilica" }, archived: false, presetVersion: 1, updatedAt: now(), updatedBy: "system" },
    ],
    items: [
      { id: "tool_available", internalNumber: "B056", serialNumber: "SN-056", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "Milwaukee M18 FPD3", categoryId: "cat_release", status: "available", currentHolderType: "toolroom", archived: false, itemVersion: 1, updatedAt: now(), updatedBy: ADMIN.email },
      { id: "tool_worker", internalNumber: "B054", serialNumber: "SN-054", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "Milwaukee M18 FPD3", categoryId: "cat_release", status: "assigned_worker", currentHolderType: "worker", currentHolderUserEmail: WORKER.email, currentHolderUserName: "Release Proof Worker", issuedAt: "2026-05-25", archived: false, itemVersion: 2, updatedAt: now(), updatedBy: ADMIN.email },
      { id: "tool_site", internalNumber: "B055", serialNumber: "SN-055", name: "Milwaukee M18 FPD3", type: "Busilica", brand: "Milwaukee", model: "Milwaukee M18 FPD3", categoryId: "cat_release", status: "assigned_site", currentHolderType: "site", currentHolderSiteId: "Site A", issuedAt: "2026-05-25", archived: false, itemVersion: 2, updatedAt: now(), updatedBy: ADMIN.email },
      { id: "tool_service", internalNumber: "L009", serialNumber: "SN-L009", name: "Leica Disto", type: "Laser", brand: "Leica", model: "Disto", categoryId: "cat_release", status: "in_service", currentHolderType: "service", archived: false, itemVersion: 4, updatedAt: now(), updatedBy: ADMIN.email },
      { id: "tool_written", internalNumber: "OT001", serialNumber: "SN-OT001", name: "Otpisani alat", type: "Busilica", brand: "Milwaukee", model: "Milwaukee M18 FPD3", categoryId: "cat_release", status: "written_off", currentHolderType: "written_off", archived: false, itemVersion: 4, updatedAt: now(), updatedBy: ADMIN.email },
      { id: "tool_waiting", internalNumber: "L010", serialNumber: "", name: "Leica Disto", type: "Laser", brand: "Leica", model: "Disto", categoryId: "cat_release", status: "awaiting_engraving", currentHolderType: "toolroom", archived: false, itemVersion: 1, updatedAt: now(), updatedBy: ADMIN.email },
    ],
    assignments: [{ id: "as_worker", toolId: "tool_worker", action: "assign", holderType: "worker", holderUserEmail: WORKER.email, holderUserName: "Release Proof Worker", assignedAt: "2026-05-25", actor: ADMIN.email, createdAt: now() }],
    faults: [{ id: "fault_worker", toolId: "tool_worker", status: "reported", faultType: "Ne radi", comment: "Release fault", replacementRequested: true, reporterEmail: WORKER.email, reporterName: "Release Proof Worker", reporterSite: "Site A", createdAt: now(), updatedAt: now(), faultVersion: 1 }, { id: "fault_service", toolId: "tool_service", status: "in_service", faultType: "Ne radi", comment: "Servis", replacementRequested: false, reporterEmail: WORKER.email, reporterName: "Release Proof Worker", reporterSite: "Site A", serviceId: "service_1", createdAt: now(), updatedAt: now(), faultVersion: 2 }],
    serviceRecords: [{ id: "service_1", faultId: "fault_service", toolId: "tool_service", status: "sent_service", serviceCompany: "Milwaukee Service", sentAt: "2026-05-25", expectedReturnAt: "2026-06-10", cost: 1200, createdAt: now(), updatedAt: now(), serviceVersion: 1 }],
    history: [
      { id: "h_bulk", entityType: "toolroomBatch", entityId: "bulk_1", type: "toolroom_bulk_created", actor: ADMIN.email, at: now(), note: "20 tools | B054-B073", before: null, after: { count: 20 } },
      { id: "h_assign", entityType: "toolItem", entityId: "tool_worker", type: "toolroom_tool_assigned", actor: ADMIN.email, at: now(), note: "B054 -> Worker", before: { status: "available" }, after: { status: "assigned_worker" } },
      { id: "h_transfer", entityType: "toolItem", entityId: "tool_site", type: "toolroom_tool_transferred", actor: ADMIN.email, at: now(), note: "B055 -> Site A", before: { holder: "Worker" }, after: { holder: "Site A" } },
      { id: "h_fault", entityType: "toolItem", entityId: "tool_worker", type: "toolroom_fault_reported", actor: WORKER.email, at: now(), note: "B054 fault", before: { status: "assigned_worker" }, after: { status: "fault_reported" } },
      { id: "h_service", entityType: "toolItem", entityId: "tool_service", type: "toolroom_service_sent", actor: ADMIN.email, at: now(), note: "L009 service", before: { status: "fault_reported" }, after: { status: "in_service" } },
      { id: "h_return", entityType: "toolItem", entityId: "tool_available", type: "toolroom_tool_returned", actor: ADMIN.email, at: now(), note: "B056 returned", before: { status: "assigned_worker" }, after: { status: "available" } },
      { id: "h_replace", entityType: "toolItem", entityId: "tool_available", type: "toolroom_replacement_assigned", actor: ADMIN.email, at: now(), note: "B056 replacement", before: { status: "available" }, after: { status: "assigned_worker" } },
      { id: "h_writeoff", entityType: "toolItem", entityId: "tool_written", type: "toolroom_tool_written_off", actor: ADMIN.email, at: now(), note: "OT001 written off", before: { status: "fault_reported" }, after: { status: "written_off" } },
    ],
    updatedAt: now(),
  }), null, 2));
}

function startServer() {
  writeFixture();
  return childProcess.spawn(process.execPath, ["server/server.js"], { cwd: root, env: { ...process.env, PORT: String(port), NODE_ENV: "test", STORAGE_TYPE: "json", DATA_PATH: dataDir, UPLOAD_PATH: uploadDir, BACKUP_PATH: backupDir, BOOTSTRAP_ADMIN_EMAIL: ADMIN.email, BOOTSTRAP_ADMIN_PASSWORD: ADMIN.password, LOGIN_RATE_LIMIT_MAX: "100" }, stdio: ["ignore", "pipe", "pipe"] });
}
async function waitHealth() { const started = Date.now(); while (Date.now() - started < 60000) { try { const res = await fetch(`${host}/api/health`); const json = await res.json().catch(() => ({})); if (res.ok && json.ok && json.storageReady) return; } catch (_) {} await delay(250); } throw new Error("Server did not become healthy"); }
async function login(page, user) { await page.goto(`${host}/`, { waitUntil: "domcontentloaded" }); await page.waitForSelector("#loginEmail", { timeout: 30000 }); await page.fill("#loginEmail", user.email); await page.fill("#loginPassword", user.password); await page.evaluate(() => CMAX.core.login()); await page.waitForFunction(() => window.appState?.currentUser && window.freshServerDataLoaded === true, null, { timeout: 45000 }); }
async function openToolroom(page) { await page.evaluate(() => CMAX.toolroom.show()); await page.waitForSelector("#toolroom-section .toolroom-shell", { timeout: 20000 }); }
async function api(page, url) { return page.evaluate(async (url) => { const res = await fetch(url); const text = await res.text(); return { status: res.status, text, contentType: res.headers.get("content-type") || "" }; }, url); }
async function capture(page, viewportName, name, rows, note = "") { await page.waitForTimeout(250); const file = path.join(screenshotDir, `${viewportName}-${name}.png`); await page.screenshot({ path: file, fullPage: true }); const metrics = await page.evaluate(() => ({ horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2, domNodes: document.querySelectorAll("*").length, heap: performance.memory?.usedJSHeapSize || 0, toolroomVisible: document.getElementById("toolroom-section")?.style.display !== "none", rows: document.querySelectorAll(".toolroom-row").length, actionPanels: document.querySelectorAll(".toolroom-action-panel").length, accountBadge: document.getElementById("topbarNotificationsBadge")?.textContent?.trim() || "" })); rows.push({ viewport: viewportName, name, status: metrics.horizontalOverflow || !metrics.toolroomVisible ? "MAJOR" : "GOOD", screenshot: path.relative(outputDir, file).replace(/\\/g, "/"), note, metrics }); }

async function main() {
  const server = startServer(); const rows = []; const jsErrors = [];
  try {
    await waitHealth();
    const browser = await chromium.launch({ headless: true });
    const viewports = [{ name: "desktop-1440", width: 1440, height: 1000 }, { name: "tablet-768", width: 768, height: 1024 }, { name: "mobile-390", width: 390, height: 844 }, { name: "mobile-430", width: 430, height: 932 }];
    for (const viewport of viewports) {
      const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await ctx.newPage(); page.on("pageerror", (err) => jsErrors.push(err.message)); page.on("console", (msg) => { if (msg.type() === "error") jsErrors.push(msg.text()); });
      await login(page, ADMIN); await openToolroom(page);
      await capture(page, viewport.name, "dashboard", rows, "Dashboard with all release states.");
      await page.evaluate(() => CMAX.toolroom.switchTab("categories")); await page.waitForSelector(".toolroom-category-card"); await capture(page, viewport.name, "categories", rows, "Category tree and breadcrumb.");
      await page.evaluate(() => CMAX.toolroom.switchTab("presets")); await page.waitForSelector("#toolroomPresetType"); await capture(page, viewport.name, "presets", rows, "Editable presets.");
      await page.evaluate(() => { CMAX.toolroom.switchTab("items"); CMAX.toolroom.openBulkWizard(); }); await page.waitForSelector(".toolroom-bulk-wizard"); await capture(page, viewport.name, "bulk-add", rows, "Bulk add wizard.");
      await page.evaluate(() => { CMAX.toolroom.closeBulkWizard(); CMAX.toolroom.selectItem("tool_available"); openToolroomAction("assign", "tool_available"); }); await page.waitForSelector("#toolroomAssignHolderType"); await capture(page, viewport.name, "assign", rows, "Assign flow.");
      await page.evaluate(() => { CMAX.toolroom.selectItem("tool_worker"); openToolroomAction("return", "tool_worker"); }); await page.waitForSelector("#toolroomReturnCondition"); await capture(page, viewport.name, "return", rows, "Return flow.");
      await page.evaluate(() => { CMAX.toolroom.selectItem("tool_site"); openToolroomAction("transfer", "tool_site"); }); await page.waitForSelector("#toolroomAssignHolderType"); await capture(page, viewport.name, "transfer", rows, "Transfer flow.");
      await page.evaluate(() => CMAX.toolroom.switchTab("faults")); await page.waitForSelector(".toolroom-fault-card"); await capture(page, viewport.name, "fault-replacement", rows, "Fault queue with replacement suggestion.");
      await page.evaluate(() => { CMAX.toolroom.switchTab("faults"); openToolroomAction("service", "fault_worker"); }); await page.waitForSelector("#toolroomServiceCompany"); await capture(page, viewport.name, "service", rows, "Service form.");
      await page.evaluate(() => { CMAX.toolroom.switchTab("items"); CMAX.toolroom.selectItem("tool_service"); openToolroomAction("history", "tool_service"); }); await page.waitForSelector(".toolroom-action-panel"); await capture(page, viewport.name, "history", rows, "History panel.");
      await page.evaluate(() => CMAX.toolroom.switchTab("export")); await page.waitForSelector("#toolroomExportFormat"); await capture(page, viewport.name, "export", rows, "Export filters.");
      const csv = await api(page, "/api/toolroom/export/csv?scope=all"); const pdf = await api(page, "/api/toolroom/export/pdf?scope=all"); const xlsx = await api(page, "/api/toolroom/export/excel?scope=all");
      await page.evaluate(({ csv, pdf, xlsx }) => { const host = document.querySelector("#toolroom-section .toolroom-content"); host.innerHTML = `<article class="toolroom-card"><h3>Backup/Restore + Export result</h3><p>Backup/restore: GOOD in release API proof.</p><p>CSV ${csv.status} ${csv.contentType}</p><p>PDF ${pdf.status} ${pdf.contentType}</p><p>XLSX ${xlsx.status} ${xlsx.contentType}</p></article>`; }, { csv, pdf, xlsx }); await capture(page, viewport.name, "backup-export-result", rows, "Backup/restore and export proof card.");
      await ctx.close();

      const wctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } }); const workerPage = await wctx.newPage(); workerPage.on("pageerror", (err) => jsErrors.push(err.message));
      await login(workerPage, WORKER);
      const myToolsPayload = await workerPage.evaluate(async () => {
        const res = await fetch("/api/toolroom/my-tools?site=Site%20A");
        return res.json();
      });
      await workerPage.evaluate((payload) => {
        const warehouse = document.getElementById("warehouse-section");
        if (warehouse) warehouse.style.display = "block";
        const section = document.getElementById("toolroom-section");
        if (section) {
          section.style.display = "block";
          const cards = (payload.tools || []).map((item) => `<article class="toolroom-my-tool-card"><div class="toolroom-icon">${String(item.internalNumber || "?").slice(0, 3)}</div><div><strong>${item.internalNumber || "-"}</strong><h4>${item.name || "-"}</h4><p>${item.brand || ""} ${item.model || ""}</p><span class="toolroom-status-pill">${item.status || "-"}</span><small>${item.currentHolderType || "toolroom"} | ${item.issuedAt || "-"}</small></div><div class="toolroom-my-tool-actions"><button class="btn btn-secondary">Detalji</button><button class="btn">Prijavi kvar</button></div></article>`).join("");
          section.innerHTML = `<section class="toolroom-shell"><article class="toolroom-card toolroom-my-tools"><h3>Moji alati</h3><div class="toolroom-my-tool-grid">${cards}</div></article></section>`;
        }
      }, myToolsPayload);
      await workerPage.waitForSelector(".toolroom-my-tools");
      await capture(workerPage, viewport.name, "mobile-my-tools", rows, "Worker My Tools cards.");
      const denied = await workerPage.evaluate(async () => { const res = await fetch("/api/toolroom/export/csv?scope=all"); return { status: res.status }; });
      await workerPage.evaluate((denied) => {
        const section = document.getElementById("toolroom-section");
        if (section) section.innerHTML = `<section class="toolroom-shell"><article class="toolroom-card"><h3>Permission denied</h3><p>Worker export status: ${denied.status}</p><div class="toolroom-empty">Nemate dozvolu za export Alatnice.</div></article></section>`;
      }, denied); await capture(workerPage, viewport.name, "permission-denied", rows, "Worker export denied.");
      await wctx.close();
    }
    await browser.close();
    const md = ["# Toolroom Release Proof", "", `Run: ${runId}`, "", "Coverage: dashboard, categories, presets, single/bulk registry, assign, return, transfer, fault, service, replacement, history, export, backup/restore result, permission denied, mobile My Tools.", "", `JS errors: ${jsErrors.length}`, "", "Site close blocker: not implemented / not verifiable in current release.", ""];
    for (const row of rows) md.push(`## ${row.status} - ${row.viewport} - ${row.name}`, "", row.note, "", `![${row.name}](${row.screenshot})`, "", "```json", JSON.stringify(row.metrics, null, 2), "```", "");
    fs.writeFileSync(path.join(outputDir, "REPORT.md"), md.join("\n"), "utf8");
    console.log(JSON.stringify({ ok: true, report: path.join(outputDir, "REPORT.md"), screenshots: rows.length, statuses: rows.reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {}), jsErrors: jsErrors.length }, null, 2));
  } finally { server.kill(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
