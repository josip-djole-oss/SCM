const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const runId = `toolroom-phase1-proof-${Date.now()}`;
const tmpRoot = path.join(os.tmpdir(), runId);
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const backupDir = path.join(tmpRoot, "backups");
const outputDir = path.join(root, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const port = 8900 + Math.floor(Math.random() * 400);
const host = `http://127.0.0.1:${port}`;
const ADMIN = { email: "toolroom.proof@cmax.test", password: "Toolroom!123" };

function envelope(data) {
  return { version: 1, updatedAt: new Date().toISOString(), data };
}

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seed() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir); mkdir(screenshotDir);
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([{
    email: ADMIN.email,
    password: ADMIN.password,
    fullName: "Toolroom Proof Admin",
    isSuperAdmin: true,
    level: 6,
    active: true,
    permissions: {},
    allowedSites: null,
  }]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Proof Site"],
    currentSite: "Proof Site",
    moduleVersions: { warehouse: { "Proof Site": 1 } },
    siteData: { "Proof Site": { warehouse: { catalog: [], stock: {}, logs: [] } } },
    accountNotifications: {},
  }), null, 2));
}

function startServer() {
  seed();
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      STORAGE_TYPE: "json",
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadDir,
      BACKUP_PATH: backupDir,
      BOOTSTRAP_ADMIN_EMAIL: ADMIN.email,
      BOOTSTRAP_ADMIN_PASSWORD: ADMIN.password,
      LOGIN_RATE_LIMIT_MAX: "100",
    },
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

async function login(page) {
  await page.goto(`${host}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#loginEmail", { timeout: 30000 });
  await page.fill("#loginEmail", ADMIN.email);
  await page.fill("#loginPassword", ADMIN.password);
  await page.evaluate(() => CMAX.core.login());
  await page.waitForFunction(() => window.appState?.currentUser && window.freshServerDataLoaded === true, null, { timeout: 45000 });
}

async function openToolroom(page) {
  await page.evaluate(() => CMAX.toolroom.show());
  await page.waitForSelector("#toolroom-section .toolroom-shell", { timeout: 20000 });
}

async function capture(page, viewportName, name, rows, note = "") {
  await page.waitForTimeout(200);
  const file = path.join(screenshotDir, `${viewportName}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const metrics = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    toolroomVisible: document.getElementById("toolroom-section")?.style.display !== "none",
    statCount: document.querySelectorAll(".toolroom-stats article").length,
    quickActions: document.querySelectorAll(".toolroom-quick-actions .btn").length,
    emptyStates: document.querySelectorAll(".toolroom-empty").length,
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
      await login(page);
      await openToolroom(page);
      await capture(page, viewport.name, "dashboard", rows, "Dashboard skeleton and empty history.");
      await page.click("[data-cmax-action='toolroom.switchTab'][data-cmax-args='[\"categories\"]']");
      await page.waitForSelector(".toolroom-breadcrumb");
      await capture(page, viewport.name, "categories", rows, "Category tree and breadcrumb.");
      await page.click("[data-cmax-action='toolroom.switchTab'][data-cmax-args='[\"presets\"]']");
      await page.waitForSelector("#toolroomPresetType");
      await capture(page, viewport.name, "presets", rows, "Preset editor groups.");
      await page.click("[data-cmax-action='toolroom.switchTab'][data-cmax-args='[\"items\"]']");
      await page.waitForSelector("#toolroomInternalNumber");
      await capture(page, viewport.name, "items-empty-add", rows, "Tool registry empty state and add form.");
      await page.fill("#toolroomInternalNumber", `B${viewport.width}`);
      await page.fill("#toolroomItemName", "Milwaukee M18 FPD3");
      await page.selectOption("#toolroomItemType", "Busilica").catch(() => {});
      await page.selectOption("#toolroomItemBrand", "Milwaukee").catch(() => {});
      await page.click("[data-cmax-action='toolroom.saveItemFromForm']");
      await page.waitForFunction(() => document.querySelectorAll(".toolroom-row").length > 0, null, { timeout: 20000 });
      await capture(page, viewport.name, "item-detail", rows, "Saved tool and detail view with Phase 1 quick action placeholders.");
      await page.click("[data-cmax-action='toolroom.switchTab'][data-cmax-args='[\"myTools\"]']");
      await capture(page, viewport.name, "my-tools-empty", rows, "My Tools Phase 1 empty state.");
      await context.close();
    }
    const md = ["# Toolroom Phase 1 Proof", "", `Run: ${runId}`, ""];
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
