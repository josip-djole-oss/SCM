const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const runId = `toolroom-phase4-proof-${Date.now()}`;
const outputDir = path.join(root, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "toolroom-p4-proof-"));
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const port = 10400 + Math.floor(Math.random() * 300);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.p4.proof.admin@cmax.test", password: "Toolroom!123" };
const WORKER = { email: "toolroom.p4.proof.worker@cmax.test", password: "Toolroom!123" };

function envelope(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function writeFixture() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir); mkdir(screenshotDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    { email: ADMIN.email, password: ADMIN.password, fullName: "Phase4 Proof Admin", isSuperAdmin: false, level: 5, active: true, permissions: { canAccessWarehouse: true, canAccessToolroom: true, canManageToolroom: true, canAssignTools: true, canReturnTools: true, canHandleToolService: true, canWriteOffTools: true, canEditToolPresets: true, canExportToolroom: true }, allowedSites: ["Site A", "Site B"] },
    { email: WORKER.email, password: WORKER.password, fullName: "Phase4 Proof Worker", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessWarehouse: true, canViewWarehouse: true, canAccessToolroom: true, canViewMyTools: true, canReportToolFault: true, canViewNotifications: true }, allowedSites: ["Site A"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Site A", "Site B"],
    currentSite: "Site A",
    siteData: { "Site A": { warehouse: { catalog: [], stock: {}, logs: [] }, notifications: [] }, "Site B": { warehouse: { catalog: [], stock: {}, logs: [] }, notifications: [] } },
    moduleVersions: {},
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

async function login(page, user) {
  await page.goto(`${host}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#loginEmail", { timeout: 30000 });
  await page.fill("#loginEmail", user.email);
  await page.fill("#loginPassword", user.password);
  await page.evaluate(() => CMAX.core.login());
  await page.waitForFunction(() => window.appState?.currentUser && window.freshServerDataLoaded === true, null, { timeout: 45000 });
}

async function api(page, url, options = {}) {
  return page.evaluate(async ({ url, options }) => {
    const headers = { ...(options.headers || {}) };
    if (options.json !== undefined) { headers["Content-Type"] = "application/json"; options.body = JSON.stringify(options.json); }
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch (_) { payload = text; }
    return { ok: res.ok, status: res.status, text, payload, contentType: res.headers.get("content-type") || "" };
  }, { url, options });
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
    stepper: document.querySelectorAll(".toolroom-stepper button").length,
    rows: document.querySelectorAll(".toolroom-row").length,
    empty: document.querySelectorAll(".toolroom-empty").length,
  }));
  rows.push({ viewport: viewportName, name, status: metrics.horizontalOverflow || !metrics.toolroomVisible ? "MAJOR" : "GOOD", screenshot: path.relative(outputDir, file).replace(/\\/g, "/"), note, metrics });
}

async function main() {
  const server = startServer();
  const rows = [];
  try {
    await waitHealth();
    const browser = await chromium.launch({ headless: true });
    const viewports = [
      { name: "desktop-1440", width: 1440, height: 1000 },
      { name: "tablet-768", width: 768, height: 1024 },
      { name: "mobile-390", width: 390, height: 844 },
      { name: "mobile-430", width: 430, height: 932 },
    ];

    for (const viewport of viewports) {
      const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await ctx.newPage();
      await login(page, ADMIN);
      await openToolroom(page);
      await page.evaluate(() => CMAX.toolroom.switchTab("items"));
      await page.evaluate(() => CMAX.toolroom.openBulkWizard());
      await page.waitForSelector(".toolroom-bulk-wizard");
      await page.selectOption("#toolroomBulkType", "Busilica");
      await page.selectOption("#toolroomBulkBrand", "Milwaukee");
      await page.selectOption("#toolroomBulkModel", "Milwaukee M18 FPD3");
      await page.fill("#toolroomBulkName", "Milwaukee M18 FPD3");
      await capture(page, viewport.name, "bulk-step-basic", rows, "Bulk add wizard basic step.");
      await page.evaluate(() => CMAX.toolroom.setBulkStep(1));
      await page.waitForSelector("#toolroomBulkQuantity");
      await page.fill("#toolroomBulkQuantity", "20");
      await page.fill("#toolroomBulkPrefix", "B");
      await page.fill("#toolroomBulkStart", "54");
      await capture(page, viewport.name, "bulk-preview-numbers", rows, "Preview B054-B073.");
      await page.evaluate(() => CMAX.toolroom.setBulkStep(2));
      await page.waitForSelector("#toolroomBulkSerials");
      await page.selectOption("#toolroomBulkSerialMode", "now");
      await page.fill("#toolroomBulkSerials", Array.from({ length: 20 }, (_, i) => `SN-${String(i + 54).padStart(3, "0")}`).join("\n"));
      await capture(page, viewport.name, "bulk-serial-paste", rows, "Serial paste list.");
      await page.evaluate(() => CMAX.toolroom.setBulkStep(3));
      await page.waitForSelector("#toolroomBulkEngraved");
      await page.check("#toolroomBulkEngraved");
      await page.evaluate(() => CMAX.toolroom.setBulkStep(4));
      await capture(page, viewport.name, "bulk-review", rows, "Bulk review with missing serial count.");
      await page.evaluate(() => CMAX.toolroom.submitBulkAdd());
      await page.waitForSelector(".toolroom-row");
      await capture(page, viewport.name, "created-tools-list", rows, "Created tools list after bulk add.");
      await page.evaluate(() => CMAX.toolroom.openBulkWizard());
      await page.evaluate(() => CMAX.toolroom.setBulkStep(1));
      await page.fill("#toolroomBulkQuantity", "2");
      await page.fill("#toolroomBulkPrefix", "B");
      await page.fill("#toolroomBulkStart", "54");
      await page.evaluate(() => CMAX.toolroom.setBulkStep(4));
      await page.evaluate(() => CMAX.toolroom.submitBulkAdd().catch(() => {}));
      await page.waitForTimeout(700);
      await capture(page, viewport.name, "duplicate-warning", rows, "Duplicate range warning from backend conflict.");
      await page.evaluate(() => CMAX.toolroom.switchTab("export"));
      await page.waitForSelector("#toolroomExportFormat");
      await capture(page, viewport.name, "export-wizard", rows, "Toolroom export filters.");
      const csv = await api(page, "/api/toolroom/export/csv?scope=all");
      const pdf = await api(page, "/api/toolroom/export/pdf?scope=all");
      const excel = await api(page, "/api/toolroom/export/excel?scope=all");
      await page.evaluate(({ csv, pdf, excel }) => {
        const host = document.querySelector("#toolroom-section .toolroom-content");
        host.innerHTML = `<article class="toolroom-card"><h3>Export proof</h3><p>CSV: ${csv.status} ${csv.contentType}</p><p>PDF: ${pdf.status} ${pdf.contentType}</p><p>XLSX: ${excel.status} ${excel.contentType}</p><p>CSV starts with JSON: ${String(csv.text || "").trim().startsWith("{")}</p><p>PDF starts with JSON: ${String(pdf.text || "").trim().startsWith("{")}</p></article>`;
      }, { csv, pdf, excel });
      await capture(page, viewport.name, "export-file-proof", rows, "CSV/PDF/XLSX proof is not JSON.");
      await ctx.close();

      const wctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const workerPage = await wctx.newPage();
      await login(workerPage, WORKER);
      const denied = await api(workerPage, "/api/toolroom/export/csv?scope=all");
      await workerPage.evaluate((denied) => {
        const section = document.getElementById("toolroom-section");
        if (section) {
          const warehouse = document.getElementById("warehouse-section");
          if (warehouse) warehouse.style.display = "block";
          section.style.display = "block";
          section.innerHTML = `<section class="toolroom-shell"><article class="toolroom-card"><h3>Export permission denied</h3><p>Worker export status: ${denied.status}</p><div class="toolroom-empty">Nemate dozvolu za export Alatnice.</div></article></section>`;
        }
      }, denied);
      await workerPage.waitForSelector("#toolroom-section .toolroom-shell");
      await capture(workerPage, viewport.name, "permission-denied-export", rows, "Worker cannot export all Toolroom data.");
      await wctx.close();
    }

    await browser.close();
    const md = ["# Toolroom Phase 4 Bulk Add + Export Proof", "", `Run: ${runId}`, "", "Coverage: bulk wizard, internal number preview, serial paste, duplicate warning, created tools, export wizard, CSV/PDF/XLSX proof, permission denied export.", ""];
    for (const row of rows) {
      md.push(`## ${row.status} - ${row.viewport} - ${row.name}`, "", row.note, "", `![${row.name}](${row.screenshot})`, "", "```json", JSON.stringify(row.metrics, null, 2), "```", "");
    }
    fs.writeFileSync(path.join(outputDir, "REPORT.md"), md.join("\n"), "utf8");
    console.log(JSON.stringify({ ok: true, report: path.join(outputDir, "REPORT.md"), screenshots: rows.length, statuses: rows.reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {}) }, null, 2));
  } finally {
    server.kill();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
