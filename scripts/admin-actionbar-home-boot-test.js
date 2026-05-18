const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `admin-actionbar-home-boot-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const port = Number(process.env.ADMIN_ACTIONBAR_BOOT_PORT || (7600 + (Date.now() % 300)));
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startServer() {
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: appRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadDir,
      STORAGE_TYPE: "json",
      BOOTSTRAP_ADMIN_EMAIL: "proof@cmax.test",
      BOOTSTRAP_ADMIN_PASSWORD: "testpass123",
      LOGIN_RATE_LIMIT_MAX: "100",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer() {
  const url = `http://127.0.0.1:${port}/`;
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch (_) {}
    await delay(200);
  }
  throw new Error("Timed out waiting for test server");
}

async function login(page, pathName = "/") {
  await page.goto(`http://127.0.0.1:${port}${pathName}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.CMAX?.core?.login);
  await page.fill("#loginEmail", "proof@cmax.test");
  await page.fill("#loginPassword", "testpass123");
  await page.evaluate(() => CMAX.core.login());
  await page.waitForFunction(() => window.appState?.currentUser === "proof@cmax.test");
  await page.evaluate(() => {
    appState.isAdmin = true;
    appState.isSuperAdmin = true;
    appState.adminLevel = 6;
    appState.permissions = {
      ...(appState.permissions || {}),
      canOpenAdminPanel: true,
      canManageAdmins: true,
      canViewSettings: true,
      canManageGuestAccess: true,
      canViewLogs: true,
      canViewBackups: true,
      canRestoreBackups: true,
    };
    if (typeof applyPermissionVisibility === "function") applyPermissionVisibility();
  });
  await delay(400);
}

async function openAdmins(page) {
  await page.evaluate(async () => {
    await CMAX.admin.open();
    await new Promise((resolve) => setTimeout(resolve, 350));
    appState.isSuperAdmin = true;
    appState.adminLevel = 6;
    appState.permissions = { ...(appState.permissions || {}), canOpenAdminPanel: true, canManageAdmins: true };
    document.getElementById("tabBtnAdmins").style.display = "";
    document.getElementById("tabAdmins").style.display = "";
    document.querySelectorAll("#settings-section .tab-content").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll("#settings-section .tab-btn").forEach((button) => button.classList.remove("active"));
    document.getElementById("tabAdmins")?.classList.add("active");
    document.getElementById("tabBtnAdmins")?.classList.add("active");
  });
  await page.waitForSelector("#adminComposeActionBar");
}

async function actionBarMetric(page) {
  return page.evaluate(() => {
    const bar = document.getElementById("adminComposeActionBar");
    const tab = document.getElementById("tabAdmins");
    const settings = document.getElementById("settings-section");
    const box = document.querySelector("#settings-section .modal-box");
    if (!bar) return { exists: false };
    const rect = bar.getBoundingClientRect();
    const styles = getComputedStyle(bar);
    return {
      exists: true,
      position: styles.position,
      topStyle: styles.top,
      bottomStyle: styles.bottom,
      rectTop: Math.round(rect.top),
      rectBottom: Math.round(rect.bottom),
      rectHeight: Math.round(rect.height),
      viewportHeight: window.innerHeight,
      windowScrollY: Math.round(window.scrollY),
      tabScrollTop: Math.round(tab?.scrollTop || 0),
      tabClientHeight: Math.round(tab?.clientHeight || 0),
      tabScrollHeight: Math.round(tab?.scrollHeight || 0),
      settingsScrollTop: Math.round(settings?.scrollTop || 0),
      boxScrollTop: Math.round(box?.scrollTop || 0),
    };
  });
}

async function verifyActionBarScroll(page, viewportName) {
  await openAdmins(page);
  await page.evaluate(() => {
    const bar = document.getElementById("adminComposeActionBar");
    bar?.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await delay(120);
  const before = await actionBarMetric(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await delay(160);
  const afterWindowScroll = await actionBarMetric(page);
  await page.evaluate(() => {
    const tab = document.getElementById("tabAdmins");
    if (tab) tab.scrollTop = tab.scrollHeight;
  });
  await delay(160);
  const afterTabScroll = await actionBarMetric(page);

  if (before.position === "sticky" || before.position === "fixed") {
    throw new Error(`${viewportName}: adminComposeActionBar is ${before.position}: ${JSON.stringify(before)}`);
  }
  if (afterWindowScroll.position === "sticky" || afterWindowScroll.position === "fixed") {
    throw new Error(`${viewportName}: adminComposeActionBar became ${afterWindowScroll.position}: ${JSON.stringify(afterWindowScroll)}`);
  }
  if (afterTabScroll.position === "sticky" || afterTabScroll.position === "fixed") {
    throw new Error(`${viewportName}: adminComposeActionBar became ${afterTabScroll.position} after tab scroll: ${JSON.stringify(afterTabScroll)}`);
  }
  if (Math.abs(afterWindowScroll.rectTop - before.rectTop) <= 2 && afterWindowScroll.windowScrollY > before.windowScrollY + 40) {
    throw new Error(`${viewportName}: adminComposeActionBar visually stuck during page scroll: ${JSON.stringify({ before, afterWindowScroll })}`);
  }
  return { before, afterWindowScroll, afterTabScroll };
}

async function verifyHomeBoot(page) {
  await page.evaluate(() => {
    localStorage.setItem("cmax_current_view", "main");
    history.replaceState({ view: "main" }, "", "/planner");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.appState?.currentUser === "proof@cmax.test");
  await page.waitForFunction(() => window.currentView === "home", null, { timeout: 8000 });
  const result = await page.evaluate(() => ({
    currentView,
    path: window.location.pathname,
    homeDisplay: document.getElementById("home-section")?.style.display,
    plannerDisplay: document.getElementById("planner-section")?.style.display,
    savedView: localStorage.getItem("cmax_current_view"),
  }));
  if (result.currentView !== "home" || result.path !== "/home") {
    throw new Error(`Hard refresh did not start on home: ${JSON.stringify(result)}`);
  }
  return result;
}

async function main() {
  const server = startServer();
  let browser;
  let serverLog = "";
  server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });
  try {
    await waitForServer();
    browser = await chromium.launch({ executablePath: chromePath, headless: true });
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await login(desktop, "/");
    const homeBoot = await verifyHomeBoot(desktop);
    const desktopActionBar = await verifyActionBarScroll(desktop, "desktop");
    await desktop.close();

    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await login(mobile, "/");
    const mobileActionBar = await verifyActionBarScroll(mobile, "mobile");
    await mobile.close();

    console.log(JSON.stringify({
      ok: true,
      checks: [
        "hard_refresh_forces_home",
        "admin_action_bar_not_sticky_desktop",
        "admin_action_bar_not_sticky_mobile",
      ],
      homeBoot,
      desktopActionBar,
      mobileActionBar,
    }, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
    if (serverLog && process.env.DEBUG_ADMIN_ACTIONBAR_TEST === "1") {
      console.error(serverLog.slice(-2000));
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
