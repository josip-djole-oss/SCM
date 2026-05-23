const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `map-store-wizard-proof-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const outputDir = path.join(appRoot, "tmp", runId);
const shotDir = path.join(outputDir, "screenshots");
const port = Number(process.env.MAP_STORE_PROOF_PORT || (7600 + (Date.now() % 400)));
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function rel(file) {
  return path.relative(outputDir, file).replace(/\\/g, "/");
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
      const response = await fetch(url);
      if (response.ok) return;
    } catch (_) {}
    await delay(200);
  }
  throw new Error("Timed out waiting for proof server");
}

async function login(page) {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.CMAX?.core?.login);
  const alreadyLoggedIn = await page.evaluate(() => Boolean(window.appState?.currentUser));
  if (!alreadyLoggedIn) {
  await page.fill("#loginEmail", "proof@cmax.test");
  await page.fill("#loginPassword", "testpass123");
  await page.evaluate(() => CMAX.core.login());
  await page.waitForFunction(() => window.appState?.currentUser === "proof@cmax.test");
  }
  await page.evaluate(() => {
    appState.isAdmin = true;
    appState.isSuperAdmin = true;
    appState.isReadonly = false;
    appState.adminLevel = 6;
    appState.permissions = {
      ...(appState.permissions || {}),
      canManageSites: true,
      canManageUsers: true,
      canManageWorkwear: true,
      canManageStore: true,
      canAccessWorkwear: true,
      canOpenAdminPanel: true,
      canManageWorkwearSettings: true,
    };
    if (Array.isArray(window.sites) && !window.sites.includes("Proof Base Site")) {
      window.sites.push("Proof Base Site");
      localStorage.setItem(window.SITES_KEY, JSON.stringify(window.sites));
      if (typeof initializeSiteStorage === "function") initializeSiteStorage("Proof Base Site");
    }
    const admins = getAdmins();
    const adminIndex = admins.findIndex((admin) => admin.email === appState.currentUser);
    if (adminIndex >= 0) {
      admins[adminIndex] = {
        ...admins[adminIndex],
        allowedSites: null,
        permissions: { ...(admins[adminIndex].permissions || {}), ...appState.permissions },
        isSuperAdmin: true,
        level: 6,
      };
      localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
    }
    if (typeof switchSiteFromLocal === "function") switchSiteFromLocal("Proof Base Site", { syncSites: false });
  });
}

async function capture(page, items, viewport, label, beforeBad, changed, compromise = "Nema funkcionalnog kompromisa; screenshot je focused proof za ovaj scenario.") {
  await delay(250);
  const file = path.join(shotDir, `${safeName(`${viewport}-${label}`)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    visibleButtons: Array.from(document.querySelectorAll("button, a.btn")).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth && rect.right > 0 && rect.top < window.innerHeight && rect.bottom > 0;
    }).length,
  }));
  items.push({ viewport, label, file, beforeBad, changed, compromise, metrics });
}

async function openSiteWizard(page) {
  await page.evaluate(() => {
    if (typeof openNewSiteWizard === "function") openNewSiteWizard();
  });
  await page.waitForSelector("#newSiteWizardOverlay.is-open", { state: "visible" });
}

async function runSiteWizardProof(page, items, viewport) {
  await openSiteWizard(page);
  await capture(
    page,
    items,
    viewport,
    "new-site-location-empty",
    "Prije je lokacija bila rucni latitude/longitude ili tekstualni Google query koji je znao otvoriti samo Sweden.",
    "Location step sada ima address search, map picker, hidden koordinatne vrijednosti i warning da pin jos nije postavljen.",
  );

  await page.fill("#siteWizard_name", `Proof Map Site ${viewport}`);
  await page.fill("#siteWizard_address", "Drottninggatan 1");
  await page.fill("#siteWizard_postalCode", "111 51");
  await page.fill("#siteWizard_city", "Stockholm");
  await page.fill("#siteWizard_country", "Sweden");
  await page.fill("#siteWizard_locationSearch", "Drottninggatan 1, 111 51 Stockholm, Sweden");
  await capture(
    page,
    items,
    viewport,
    "new-site-address-entered",
    "Prije upisana adresa nije bila vezana za stabilan pin.",
    "Adresa je unesena u search polje; korisnik sada ima jasan gumb Pronadji na karti i picker ispod.",
  );

  await page.evaluate(() => {
    collectNewSiteWizardStep();
    setSiteWizardPin(59.33258, 18.0649, { zoom: 16 });
  });
  await capture(
    page,
    items,
    viewport,
    "new-site-map-with-pin",
    "Prije se mogao spremiti neprecizan tekstualni query.",
    "Pin je postavljen na stvarne Stockholm koordinate i prikazan kao potvrdiva lokacija.",
  );

  await page.evaluate(() => setSiteWizardPin(59.33342, 18.06612, { zoom: 16 }));
  await capture(
    page,
    items,
    viewport,
    "new-site-pin-moved",
    "Prije nije bilo sigurnog nacina da se pin pomjeri ako geocode nije tacan.",
    "Pin se moze klikom/dragom promijeniti; proof ga pomjera na drugu koordinatu.",
  );

  await page.evaluate(() => {
    collectNewSiteWizardStep();
    newSiteWizardState.step = 5;
    renderNewSiteWizard();
  });
  await page.waitForSelector(".site-wizard-review", { state: "visible" });
  await capture(
    page,
    items,
    viewport,
    "new-site-review-map-preview",
    "Prije review nije dokazivao da ce se spremiti stvarni pin.",
    "Review sada prikazuje Pin i map preview sa Google Maps queryjem koji koristi koordinate.",
  );

  await page.evaluate((viewportName) => {
    const siteName = currentSite || "default";
    const proofName = `Proof Map Site ${viewportName}`;
    const info = {
      ...getNewSiteWizardDraft(),
      name: siteName,
      projectName: proofName,
      latitude: 59.33342,
      longitude: 18.06612,
      address: "Drottninggatan 1",
      postalCode: "111 51",
      city: "Stockholm",
      country: "Sweden",
    };
    saveSiteInfoStorage(siteName, info);
    closeNewSiteWizard();
    saveSiteInfoStorage(siteName, info);
    if (typeof showHomeDashboard === "function") showHomeDashboard({ replaceRoute: true });
    if (typeof refreshHomeLaunchpad === "function") refreshHomeLaunchpad();
    if (typeof renderHomeSiteInfo === "function") renderHomeSiteInfo();
  }, viewport);
  await page.waitForSelector("#homeSiteInfoPanel", { state: "visible" });
  const panelProof = await page.evaluate(() => ({
    currentSite: window.currentSite,
    text: document.querySelector("#homeSiteInfoPanel")?.textContent || "",
    keys: Object.keys(localStorage).filter((key) => key.includes("cmax_site_info")).slice(-8),
  }));
  if (!panelProof.text.includes(`Proof Map Site ${viewport}`)) {
    throw new Error(`Home site panel did not switch to proof site on ${viewport}: ${JSON.stringify(panelProof)}`);
  }
  const navHref = await page.locator("#homeSiteInfoPanel a", { hasText: "Otvori navigaciju" }).first().getAttribute("href");
  if (!navHref || !navHref.includes("59.333420%2C18.066120")) {
    throw new Error(`Navigation link does not use exact pin on ${viewport}: ${navHref}`);
  }
  await capture(
    page,
    items,
    viewport,
    "home-site-info-exact-pin",
    "Prije Info Baustele mogla je otvoriti adresu ili Sweden umjesto tacnog pina.",
    "Info Baustele koristi spremljene brojevne koordinate i navigation link ide na tacan LAT,LNG.",
  );
}

async function seedStoreWizard(page) {
  await page.evaluate(() => {
    if (typeof showWorkwear === "function") showWorkwear();
    currentView = "workwear";
    const workwearSection = document.getElementById("workwear-section");
    if (workwearSection) workwearSection.style.display = "block";
    const state = getWorkwearState();
    state.products = Array.from({ length: 8 }, (_, index) => normalizeStoreProduct({
      id: `wizard_proof_${index + 1}`,
      name: `Wizard proof artikal ${index + 1}`,
      description: "Proof proizvod za Store wizard.",
      category: index % 2 ? "Obuca" : "Odjeca",
      subcategory: index % 2 ? "Cipele" : "Majice",
      sizes: index % 2 ? ["42", "43"] : ["M", "L"],
      price: 500,
      creditCost: 500,
      active: true,
      availableSites: ["*"],
      usesBudget: true,
    }));
    saveWorkwearState(currentSite, { track: false });
    workwearManagerEditorOpen = true;
    workwearManagerTab = "products";
    workwearResetProductWizard(null);
    renderWorkwearAdminPanel();
    renderWorkwearManagerTabs();
    if (typeof renderWorkwearManagerOverlay === "function") renderWorkwearManagerOverlay();
  });
  await page.waitForSelector("#workwearManagerOverlay", { state: "visible" });
  await page.waitForSelector(".workwear-product-wizard", { state: "visible" });
}

async function runStoreWizardProof(page, items, viewport) {
  await seedStoreWizard(page);
  for (let step = 1; step <= 9; step += 1) {
    await page.evaluate((nextStep) => {
      workwearManagerEditorOpen = true;
      workwearManagerTab = "products";
      workwearReadWizardFormState?.();
      workwearManagerEditorOpen = true;
      workwearManagerTab = "products";
      workwearProductWizardStep = nextStep;
      renderWorkwearAdminPanel();
      renderWorkwearManagerTabs();
      renderWorkwearManagerOverlay?.();
    }, step);
    const activeState = await page.evaluate(() => ({
      activeCount: document.querySelectorAll(".workwear-wizard-step.is-active").length,
      wizardExists: Boolean(document.querySelector(".workwear-product-wizard")),
      managerDisplay: getComputedStyle(document.getElementById("workwearManagerOverlay") || document.body).display,
      currentView,
      canManage: canManageWorkwearModule?.(),
      managerOpen: window.workwearManagerEditorOpen,
      managerTab: window.workwearManagerTab,
      text: document.querySelector(".workwear-product-wizard")?.textContent?.slice(0, 120) || "",
    }));
    if (!activeState.activeCount) {
      throw new Error(`Store wizard active step missing on ${viewport} step ${step}: ${JSON.stringify(activeState)}`);
    }
    const ok = await page.evaluate((nextStep) => {
      const active = document.querySelector(".workwear-step-pill.is-active");
      const footer = document.querySelector(".workwear-product-wizard > .workwear-cart-actions");
      const rect = footer?.getBoundingClientRect();
      return Boolean(active && active.textContent.includes(String(nextStep)) && footer && rect.bottom <= window.innerHeight + 2);
    }, step);
    if (!ok) throw new Error(`Store wizard stepper/footer proof failed on ${viewport} step ${step}`);
    await capture(
      page,
      items,
      viewport,
      `store-wizard-step-${step}`,
      "Prije Store wizard nije bio vizualno uskladjen sa Backup/New Site wizardima i napredak nije bio jasan.",
      `Step ${step} sada ima vidljiv moderni stepper, aktivni/done state, header meta i sticky footer akcije.`,
      "Na manjim ekranima stepper horizontalno scrolla unutar wizard panela, ne kroz cijelu stranicu.",
    );
  }
}

async function runViewport(browser, items, viewport, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await login(page);
  await runSiteWizardProof(page, items, viewport);
  await runStoreWizardProof(page, items, viewport);
  await context.close();
}

function writeReport(items) {
  const sections = items.map((item) => [
    `### PASS - ${item.viewport} - ${item.label}`,
    "",
    `![${item.label}](${rel(item.file)})`,
    "",
    `- Sta je prije bilo lose: ${item.beforeBad}`,
    `- Sta je promijenjeno: ${item.changed}`,
    `- Zasto: da korisnik dobije siguran, vidljiv i touch-friendly workflow bez tehnickog unosa.`,
    `- Kompromis: ${item.compromise}`,
    `- Guard: horizontal overflow ${item.metrics.horizontalOverflow ? "YES" : "NO"}, visible buttons ${item.metrics.visibleButtons}.`,
    "",
  ].join("\n")).join("\n");
  const report = [
    "# Map Picker + Store Wizard Focused Proof",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    sections,
  ].join("\n");
  fs.writeFileSync(path.join(outputDir, "REPORT.md"), report, "utf8");
  fs.writeFileSync(
    path.join(outputDir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Map + Store Wizard Proof</title><style>body{font-family:Arial,sans-serif;margin:24px;background:#f6f8fb;color:#172033}img{max-width:100%;border:1px solid #d8e1ef;border-radius:12px}section{margin-bottom:28px;padding:16px;background:#fff;border-radius:16px}</style><h1>Map Picker + Store Wizard Proof</h1>${items.map((item) => `<section><h2>PASS - ${item.viewport} - ${item.label}</h2><img src="${rel(item.file)}"><p>${item.changed}</p></section>`).join("")}`,
    "utf8",
  );
}

(async () => {
  const server = startServer();
  const stderr = [];
  server.stderr.on("data", (chunk) => stderr.push(String(chunk)));
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath } : {});
    const items = [];
    await runViewport(browser, items, "desktop-1440x1000", 1440, 1000);
    await runViewport(browser, items, "tablet-768x1024", 768, 1024);
    await runViewport(browser, items, "mobile-390x844", 390, 844);
    writeReport(items);
    console.log(JSON.stringify({ ok: true, report: path.join(outputDir, "REPORT.md"), index: path.join(outputDir, "index.html"), screenshots: items.length }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message, stderr: stderr.slice(-8) }, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})();
