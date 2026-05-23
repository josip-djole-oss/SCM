const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `home-site-info-proof-${Date.now()}`;
const tmpRoot = path.join(os.tmpdir(), runId);
const dataDir = path.join(tmpRoot, "data");
const uploadDir = path.join(tmpRoot, "uploads");
const outputDir = path.join(appRoot, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");
const port = Number(process.env.HOME_SITE_INFO_PROOF_PORT || (8300 + (Date.now() % 400)));
const host = `http://127.0.0.1:${port}`;
const chromePath = process.env.CHROME_PATH || "";
const SITE = "Proof Baustela 2";
const ADMIN = { email: "home-proof@cmax.test", password: "HomeProof!123" };

function envelope(data, version = 1) {
  return { version, updatedAt: new Date().toISOString(), data };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function fixtureState() {
  return {
    version: 2,
    sites: ["Proof Baustela 1", SITE],
    currentSite: SITE,
    moduleVersions: { siteMetadata: { [SITE]: 1 }, storeCatalog: { [SITE]: 1 } },
    accountNotifications: {},
    siteData: {
      "Proof Baustela 1": {
        planner: { workers: [], lifts: [], moments: [], plans: [], karnas: [], dailyData: {}, resourceHistory: [] },
        store: {
          products: [{
            id: "proof-all-sites-product",
            name: "All Sites Proof Jacket",
            active: true,
            availableForAllSites: true,
            availableSites: ["*"],
            visibleToRoles: [],
            sizes: ["M"],
            price: 500,
            creditCost: 500,
            usesBudget: false,
          }],
          orders: [],
          carts: {},
        },
      },
      [SITE]: {
        planner: { workers: [], lifts: [], moments: [], plans: [], karnas: [], dailyData: {}, resourceHistory: [] },
        tidplan: [],
        warehouse: { catalog: [], stock: {}, logs: [] },
        store: { products: [], orders: [], carts: {}, workerProfiles: {}, creditLedger: [] },
        siteInfo: {
          name: SITE,
          projectName: "Proof Baustela sa duzim nazivom projekta",
          description: "Proof lokacija za provjeru Home layouta.",
          address: "Drottninggatan 1",
          postalCode: "111 51",
          city: "Stockholm",
          country: "Sweden",
          latitude: 59.33258,
          longitude: 18.0649,
          status: "active",
          contactPerson: "Josip Arbetsledare",
          phone: "+46701234567",
          email: "proof@cmax.test",
          emergencyItems: [
            { name: "Hitni broj", phone: "112", description: "SOS" },
            { name: "Mjesto okupljanja", description: "Glavni ulaz" },
          ],
          contactGroups: [
            { name: "Arbetsledare", contacts: [{ name: "Josip", phone: "+46701234567", email: "josip@cmax.test" }] },
            { name: "Projektledare", contacts: [{ name: "Ana", phone: "+46707654321", email: "ana@cmax.test" }] },
          ],
          workHoursRows: [{ days: "Ponedjeljak-Petak", time: "07:00-16:00", breaks: "09:00-09:30, 12:00-12:30" }],
          safetyRules: [{ name: "Kaciga obavezna", required: true }, { name: "Reflektirajuci prsluk", required: true }],
          logisticsItems: [{ name: "Parking", description: "Sjeverni ulaz" }, { name: "Zona istovara", description: "Kapija B" }],
          modules: { planner: true, tidplan: true, warehouse: true, store: true, notifications: true, surveys: true, reports: true },
        },
      },
    },
  };
}

function startServer() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([{
    email: ADMIN.email,
    password: ADMIN.password,
    fullName: "Home Proof Admin",
    isSuperAdmin: true,
    level: 6,
    active: true,
    permissions: {},
    allowedSites: null,
    storeRoles: ["superadmin"],
  }]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope(fixtureState()), null, 2));
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: appRoot,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      STORAGE_TYPE: "json",
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadDir,
      BOOTSTRAP_ADMIN_EMAIL: ADMIN.email,
      BOOTSTRAP_ADMIN_PASSWORD: ADMIN.password,
      LOGIN_RATE_LIMIT_MAX: "100",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitHealth() {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    try {
      const res = await fetch(`${host}/api/health`, { cache: "no-store" });
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
  await page.waitForFunction((site) => window.appState?.currentUser && window.currentSite === site && window.freshServerDataLoaded === true, SITE, { timeout: 45000 });
  await page.evaluate(() => {
    if (typeof showHomeDashboard === "function") return showHomeDashboard({ fresh: false, replaceRoute: true });
    if (typeof showHome === "function") return showHome();
    return true;
  });
  await page.waitForSelector("#homeSiteInfoPanel", { timeout: 15000 });
}

async function inspectHome(page) {
  return page.evaluate(() => {
    const panel = document.getElementById("homeSiteInfoPanel");
    const actions = Array.from(document.querySelectorAll(".home-site-info-actions .btn"));
    const panelRect = panel?.getBoundingClientRect();
    const rects = actions.map((button) => {
      const rect = button.getBoundingClientRect();
      return { text: button.textContent.trim(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    const overlaps = [];
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const separated = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        if (!separated) overlaps.push([a.text, b.text]);
      }
    }
    const offscreen = rects.filter((rect) => rect.left < 0 || rect.right > window.innerWidth || rect.width < 36);
    const outsidePanel = panelRect ? rects.filter((rect) => rect.left < panelRect.left - 2 || rect.right > panelRect.right + 2) : [];
    const storeProducts = typeof getVisibleStoreProducts === "function" ? getVisibleStoreProducts(currentSite).map((product) => product.id) : [];
    return {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      currentSite,
      actionCount: actions.length,
      overlaps,
      offscreen,
      outsidePanel,
      storeProducts,
      hasAllSitesProduct: storeProducts.includes("proof-all-sites-product"),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });
}

async function main() {
  const server = startServer();
  let browser;
  try {
    await waitHealth();
    browser = await chromium.launch(chromePath && fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true });
    const viewports = [
      { name: "desktop-1440", width: 1440, height: 1000 },
      { name: "tablet-768", width: 768, height: 1024 },
      { name: "mobile-390", width: 390, height: 844 },
    ];
    const rows = [];
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await login(page);
      const file = path.join(screenshotDir, `${safe(viewport.name)}-home-full.png`);
      await page.screenshot({ path: file, fullPage: true });
      const metrics = await inspectHome(page);
      const status = metrics.overlaps.length || metrics.offscreen.length || metrics.outsidePanel.length || metrics.horizontalOverflow || !metrics.hasAllSitesProduct ? "MAJOR" : "GOOD";
      rows.push({ viewport: viewport.name, status, screenshot: path.relative(outputDir, file).replace(/\\/g, "/"), metrics });
      await context.close();
    }
    const md = ["# Home Site Info Proof", "", `Run: ${runId}`, ""];
    rows.forEach((row) => {
      md.push(`## ${row.status} - ${row.viewport}`, "", `![${row.viewport}](${row.screenshot})`, "", "```json", JSON.stringify(row.metrics, null, 2), "```", "");
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
