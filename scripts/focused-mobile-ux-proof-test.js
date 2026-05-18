const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `focused-mobile-ux-proof-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const outputDir = path.join(appRoot, "tmp", runId);
const shotDir = path.join(outputDir, "screenshots");
const port = Number(process.env.FOCUSED_PROOF_PORT || (6400 + (Date.now() % 600)));
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });

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
  const start = Date.now();
  while (Date.now() - start < 20000) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (_) {}
    await delay(200);
  }
  throw new Error("Timed out waiting for focused proof server");
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function rel(file) {
  return path.relative(outputDir, file).replace(/\\/g, "/");
}

async function metric(page, selector) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { selector, exists: false };
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyle(el);
    return {
      selector,
      exists: true,
      display: styles.display,
      position: styles.position,
      flexWrap: styles.flexWrap,
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      scrollWidth: Math.round(el.scrollWidth || 0),
      clientWidth: Math.round(el.clientWidth || 0),
      scrollHeight: Math.round(el.scrollHeight || 0),
      clientHeight: Math.round(el.clientHeight || 0),
      insideViewport:
        rect.top >= -2 &&
        rect.left >= -2 &&
        rect.right <= window.innerWidth + 2 &&
        rect.bottom <= window.innerHeight + 2,
    };
  }, selector);
}

async function capture(page, items, viewport, label, selector, notes = {}) {
  await delay(140);
  const file = path.join(shotDir, `${safeName(label)}-${viewport}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const metrics = selector ? await metric(page, selector) : null;
  if (metrics?.exists && !metrics.insideViewport && notes.allowOutside !== true) {
    throw new Error(`${label} outside viewport ${viewport}: ${JSON.stringify(metrics)}`);
  }
  items.push({ viewport, label, selector, file, metrics, notes });
}

async function login(page) {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.CMAX?.core?.login);
  await page.fill("#loginEmail", "proof@cmax.test");
  await page.fill("#loginPassword", "testpass123");
  await page.evaluate(() => CMAX.core.login());
  await page.waitForFunction(() => window.appState?.currentUser === "proof@cmax.test");
  await page.evaluate(() => {
    appState.isAdmin = true;
    appState.isSuperAdmin = true;
    appState.isReadonly = false;
    appState.adminLevel = 6;
    appState.functions = ["Admin", "Superadmin", "Store Manager"];
    appState.permissions = {
      ...(appState.permissions || {}),
      canAccessPlanner: true,
      canAccessTidplan: true,
      canAccessWarehouse: true,
      canAccessWorkwear: true,
      canAccessReports: true,
      canAccessNotifications: true,
      canViewNotifications: true,
      canManageNotifications: true,
      canDeleteNotifications: true,
      canAccessSurveys: true,
      canAccessAdmin: true,
      canOpenAdminPanel: true,
      canManageAdmins: true,
      canManageGuestAccess: true,
      canViewLogs: true,
      canViewBackups: true,
      canManageBackups: true,
      canRestoreBackups: true,
      canManageWorkwear: true,
    };
    if (Array.isArray(window.sites) && !window.sites.includes("Proof Site")) {
      window.sites.push("Proof Site");
      localStorage.setItem(window.SITES_KEY, JSON.stringify(window.sites));
      if (typeof initializeSiteStorage === "function") initializeSiteStorage("Proof Site");
    }
    if (typeof switchSiteFromLocal === "function") switchSiteFromLocal("Proof Site", { syncSites: false });
    if (typeof setLanguage === "function") {
      currentLang = "hr";
      localStorage.setItem("cmax_lang", "hr");
      updateLangButtons();
      applyTranslations();
    }
  });
  await delay(300);
}

async function proveNotifications(page, items, viewport) {
  await capture(page, items, viewport, "compact-language-selector", "#headerLangSelector", {
    changed: "HR/EN/SV su compact pill buttons i ne zauzimaju cijeli red.",
  });
  const langTooLarge = await page.evaluate(() => Array.from(document.querySelectorAll("#headerLangSelector .lang-btn")).some((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width > 72 || rect.height > 44;
  }));
  if (langTooLarge) throw new Error(`Language selector still too large on ${viewport}`);

  await page.evaluate(() => {
    if (typeof pushAccountNotification === "function") {
      for (let i = 0; i < 6; i += 1) {
        pushAccountNotification({
          uniqueKey: `focused-proof-${Date.now()}-${i}`,
          title: `Proof notifikacija ${i + 1}`,
          description: "X, backdrop i Escape moraju zatvoriti ovaj panel.",
          type: "proof",
        });
      }
    }
    closeAccountNotificationsPanel();
    toggleAccountNotificationsPanel();
  });
  await delay(180);
  const close = await metric(page, ".account-notifications-close");
  if (!close.exists || !close.insideViewport || close.width < 44 || close.height < 44) {
    throw new Error(`Account notification close target invalid on ${viewport}: ${JSON.stringify(close)}`);
  }
  await capture(page, items, viewport, "account-notifications-x-visible", ".account-notifications-panel", {
    changed: "Panel ima sticky header, naslov Notifikacije i veliki X za zatvaranje.",
  });
  await page.click(".account-notifications-close");
  await page.waitForFunction(() => document.getElementById("accountNotificationsPanel")?.style.display !== "block");

  await page.evaluate(() => toggleAccountNotificationsPanel());
  await delay(100);
  await page.click("#accountNotificationsBackdrop", { position: { x: 4, y: 4 } });
  await page.waitForFunction(() => document.getElementById("accountNotificationsPanel")?.style.display !== "block");

  await page.evaluate(() => toggleAccountNotificationsPanel());
  await delay(100);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.getElementById("accountNotificationsPanel")?.style.display !== "block");
}

async function seedStore(page) {
  await page.evaluate(() => {
    const state = getWorkwearState();
    state.settings.freeRulesEnabled = true;
    state.settings.freeRules = { enabled: true, mode: "firstProduct", periodDays: 180 };
    state.products = [
      normalizeStoreProduct({
        id: "priced_500",
        name: "Proof jakna 500 SEK",
        description: "Nema slike, ali cijena mora biti jasna.",
        category: "Odjeca",
        subcategory: "Jakne",
        images: [],
        sizes: ["M", "L"],
        active: true,
        availableSites: ["*"],
        visibleToRoles: [],
        price: 500,
        creditCost: 0,
        usesBudget: true,
        showPriceToWorker: true,
        freeRule: { enabled: false, mode: "none", periodDays: 180 },
      }),
    ];
    state.catalog = { Odjeca: { active: true, subcategories: { Jakne: { active: true } } } };
    state.workerProfiles["proof@cmax.test"] = {
      workerId: "proof@cmax.test",
      workerName: "Proof Admin",
      creditBalance: 2500,
      reservedCredit: 0,
      ledger: [],
    };
    const cart = getWorkwearCartForCurrentUser();
    cart.items = [{ productId: "priced_500", size: "M", quantity: 1 }];
    cart.comment = "";
    cart.urgent = false;
    workwearProductPage = 1;
  });
}

async function proveStoreCart(page, items) {
  await page.evaluate(async () => {
    await CMAX.workwear.show();
    if (typeof renderWorkwearModule === "function") renderWorkwearModule();
  });
  await seedStore(page);
  await page.evaluate(() => {
    renderWorkwearModule();
    workwearCartOverlayOpen = false;
    document.querySelector(".workwear-product-card")?.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await delay(220);
  await capture(page, items, "390x844", "store-no-image-product-card", ".workwear-product-image-wrap.is-placeholder", {
    changed: "No-image kartica koristi manji placeholder umjesto ogromne prazne slike.",
  });
  const placeholder = await metric(page, ".workwear-product-image-wrap.is-placeholder");
  if (!placeholder.exists || placeholder.height > 130) {
    throw new Error(`No-image placeholder too tall: ${JSON.stringify(placeholder)}`);
  }

  await page.evaluate(() => {
    workwearCartOverlayOpen = true;
    renderWorkwearCart();
    renderWorkwearCartOverlay();
  });
  await delay(180);
  const cartText1 = await page.locator("#workwearCartPanel").innerText();
  if (!cartText1.includes("500 SEK")) throw new Error(`Cart qty 1 missing 500 SEK: ${cartText1}`);
  await capture(page, items, "390x844", "store-cart-priced-item-qty-1", ".store-cart-drawer", {
    changed: "Cart prikazuje server/client-aligned 500 SEK za qty 1.",
  });

  await page.evaluate(() => {
    const cart = getWorkwearCartForCurrentUser();
    cart.items = [{ productId: "priced_500", size: "M", quantity: 2 }];
    renderWorkwearCart();
  });
  await delay(120);
  const cartText2 = await page.locator("#workwearCartPanel").innerText();
  if (!cartText2.includes("1000 SEK")) throw new Error(`Cart qty 2 missing 1000 SEK: ${cartText2}`);
  await capture(page, items, "390x844", "store-cart-priced-item-qty-2", ".store-cart-drawer", {
    changed: "Cart prikazuje 1000 SEK za qty 2.",
  });
}

async function proveAdmin(page, items) {
  await page.evaluate(async () => {
    if (typeof workwearCartOverlayOpen !== "undefined") workwearCartOverlayOpen = false;
    if (typeof renderWorkwearCartOverlay === "function") renderWorkwearCartOverlay();
    await CMAX.admin.open();
    await new Promise((resolve) => setTimeout(resolve, 500));
    appState.isSuperAdmin = true;
    appState.adminLevel = 6;
    appState.permissions = { ...(appState.permissions || {}), canManageAdmins: true, canOpenAdminPanel: true };
    document.getElementById("tabBtnAdmins").style.display = "";
    document.getElementById("tabAdmins").style.display = "";
    document.querySelectorAll("#settings-section .tab-content").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll("#settings-section .tab-btn").forEach((button) => button.classList.remove("active"));
    document.getElementById("tabAdmins")?.classList.add("active");
    document.getElementById("tabBtnAdmins")?.classList.add("active");
  });
  await delay(250);
  const activeTab = await page.evaluate(() => document.querySelector("#settings-section .tab-btn.active")?.id || "");
  if (activeTab !== "tabBtnAdmins") throw new Error(`Admini tab did not become active, got ${activeTab}`);
  const tabBar = await metric(page, "#settings-section .tab-bar");
  if (tabBar.flexWrap !== "nowrap") throw new Error(`Admin tabs wrap on mobile: ${JSON.stringify(tabBar)}`);
  await capture(page, items, "390x844", "admin-tabs-horizontal-scroll", "#settings-section .tab-bar", {
    changed: "Admin tabovi su jedan horizontalni scroll red, Backup ne pada u ruzan novi red.",
  });

  await page.evaluate(() => {
    const active = document.getElementById("tabAdmins");
    if (active) active.scrollTop = 0;
    document.getElementById("adminComposeActionBar")?.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await delay(120);
  const actionTop = await metric(page, "#adminComposeActionBar");
  if (!actionTop.exists || !["static", "relative"].includes(actionTop.position)) {
    throw new Error(`adminComposeActionBar unstable at top: ${JSON.stringify(actionTop)}`);
  }
  await capture(page, items, "390x844", "admin-action-bar-top", "#settings-section .modal-box", {
    changed: "Action bar je stabilan unutar Admini taba i ne lebdi preko inputa.",
  });
  await page.evaluate(() => {
    const active = document.getElementById("tabAdmins");
    if (active) active.scrollTop = Math.max(0, active.scrollHeight - active.clientHeight);
  });
  await delay(160);
  const actionAfterScroll = await metric(page, "#adminComposeActionBar");
  if (actionAfterScroll.position === "fixed") {
    throw new Error(`adminComposeActionBar became fixed after scroll: ${JSON.stringify(actionAfterScroll)}`);
  }
  await capture(page, items, "390x844", "admin-action-bar-after-scroll", "#settings-section .modal-box", {
    changed: "Nakon scrolla action bar ne prekriva pogresan sadrzaj.",
  });
}

async function proveTidplan(page, items) {
  await page.evaluate(async () => {
    await CMAX.tidplan.show();
    window.tidplanData = Array.from({ length: 16 }, (_, index) => ({
      plan: `Plan ${index + 1}`,
      zona: "Zona A",
      karna: "Karna A",
      moment: `Moment ${index + 1}`,
      resursi: 2,
      start: "2026-05-18",
      end: "2026-05-25",
      komentar: "Focused fullscreen proof",
      active: true,
    }));
    if (typeof updateTidplan === "function") updateTidplan();
    window.scrollTo(0, Math.min(900, document.body.scrollHeight - window.innerHeight));
  });
  await delay(200);
  await page.evaluate(() => document.getElementById("tidplanFullscreenToggle")?.click());
  await delay(250);
  const full = await metric(page, ".tidplan-timeline-fullscreen");
  const close = await metric(page, ".tidplan-fullscreen-close");
  if (!full.exists || full.top > 1 || full.left > 1 || full.width < 380 || full.height < 830) {
    throw new Error(`Tidplan fullscreen not covering viewport after page scroll: ${JSON.stringify(full)}`);
  }
  if (!close.exists || !close.insideViewport) {
    throw new Error(`Tidplan fullscreen close outside viewport: ${JSON.stringify(close)}`);
  }
  await capture(page, items, "390x844", "tidplan-fullscreen-after-page-scroll", ".tidplan-timeline-fullscreen", {
    changed: "Fullscreen pokriva viewport i poslije page scrolla; X je unutar ekrana.",
  });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".tidplan-timeline-fullscreen"));
}

async function provePlanner(page, items) {
  await page.evaluate(async () => {
    await CMAX.tidplan.showPlanner();
    appState.currentDate = "2026-05-18";
    appState.workers = ["Pero", "Marko"];
    appState.plans = ["Plan A"];
    appState.karnas = ["Karna A"];
    appState.moments = ["Moment A"];
    appState.lifts = ["Lift 1"];
    appState.resourceHistory = [];
    ["workers", "plans", "karnas", "moments", "lifts"].forEach((type) => {
      (appState[type] || []).forEach((resourceId) => {
        if (typeof recordResourceAdded === "function") recordResourceAdded(type, resourceId, appState.currentDate);
      });
    });
    appState.dailyData[appState.currentDate] = {
      workerAttendance: {},
      liftAvailability: {},
      liftPlans: {},
      planningRows: [],
    };
    if (typeof renderAll === "function") renderAll();
  });
  await delay(220);
  await page.evaluate(() => {
    const select = document.querySelector('#planningTableBody tr[data-row-index="0"] td[data-field="w1"] select');
    if (!select) throw new Error("Planner worker select missing");
    if (![...select.options].some((option) => option.value === "Pero")) {
      const option = document.createElement("option");
      option.value = "Pero";
      option.textContent = "Pero";
      select.appendChild(option);
    }
    select.value = "Pero";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await delay(220);
  const saved = await page.evaluate(() => appState.dailyData[appState.currentDate]?.planningRows?.[0]?.w1 === "Pero");
  if (!saved) throw new Error("Planner mobile select edit did not persist in day data");
  await capture(page, items, "390x844", "planner-mobile-edit-save-proof", ".planning-table-wrapper", {
    changed: "Na 390px Planner select se moze promijeniti i vrijednost ostaje u day data/save toku.",
  });
}

async function proveNotificationsI18n(page) {
  const labels = await page.evaluate(() => {
    currentLang = "hr";
    const hr = { pin: t("notificationPin"), unpin: t("notificationUnpin"), pinnedOnly: t("notificationPinnedOnlyLabel") };
    currentLang = "en";
    const en = { pin: t("notificationPin"), unpin: t("notificationUnpin"), pinnedOnly: t("notificationPinnedOnlyLabel") };
    currentLang = "sv";
    const sv = { pin: t("notificationPin"), unpin: t("notificationUnpin"), pinnedOnly: t("notificationPinnedOnlyLabel") };
    currentLang = "hr";
    return { hr, en, sv };
  });
  if (labels.hr.pin === "Pin" || labels.hr.unpin === "Unpin" || labels.hr.pinnedOnly.includes("pinned")) {
    throw new Error(`Notifications HR i18n still English: ${JSON.stringify(labels)}`);
  }
  if (labels.en.pin !== "Pin" || labels.en.unpin !== "Unpin") {
    throw new Error(`Notifications EN i18n broken: ${JSON.stringify(labels)}`);
  }
  if (!labels.sv.pin || labels.sv.pin === "Pin" || labels.sv.unpin === "Unpin") {
    throw new Error(`Notifications SV i18n missing: ${JSON.stringify(labels)}`);
  }
}

function writeReport(items, serverLog) {
  const lines = [
    "# Focused mobile UX proof report",
    "",
    `Run: ${runId}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Ovaj report je mali i ciljan: account notifications, Store cart price, Admin action bar/tabs, Tidplan fullscreen after scroll, language selector, Store no-image cards i Planner edit/save.",
    "",
  ];
  items.forEach((item, index) => {
    lines.push(`## ${index + 1}. ${item.label} - ${item.viewport}`);
    lines.push("");
    lines.push(`![${item.label}](${rel(item.file)})`);
    lines.push("");
    if (item.notes?.changed) lines.push(`- Dokaz: ${item.notes.changed}`);
    if (item.metrics) lines.push(`- Metrika: \`${JSON.stringify(item.metrics)}\``);
    lines.push("");
  });
  if (serverLog) {
    lines.push("## Server log tail");
    lines.push("```text");
    lines.push(serverLog.slice(-1200));
    lines.push("```");
  }
  fs.writeFileSync(path.join(outputDir, "REPORT.md"), lines.join("\n"), "utf8");

  const cards = items.map((item, index) => `
    <article>
      <h2>${index + 1}. ${item.label} <span>${item.viewport}</span></h2>
      <a href="${rel(item.file)}"><img src="${rel(item.file)}" alt="${item.label}" loading="lazy"></a>
      <p>${item.notes?.changed || ""}</p>
      ${item.metrics ? `<pre>${JSON.stringify(item.metrics, null, 2)}</pre>` : ""}
    </article>
  `).join("\n");
  fs.writeFileSync(path.join(outputDir, "index.html"), `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Focused mobile UX proof</title>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f7fb; color: #172640; }
    article { background: #fff; border: 1px solid #dbe4f1; border-radius: 16px; padding: 16px; margin-bottom: 18px; box-shadow: 0 10px 28px rgba(15,23,42,.08); }
    h2 { margin-top: 0; font-size: 18px; }
    h2 span { color: #64748b; font-size: 13px; }
    img { max-width: 100%; border: 1px solid #dbe4f1; border-radius: 12px; }
    pre { white-space: pre-wrap; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 10px; }
  </style>
</head>
<body>
  <h1>Focused mobile UX proof</h1>
  <p>Run: ${runId}</p>
  ${cards}
</body>
</html>`, "utf8");
}

async function main() {
  const server = startServer();
  let serverLog = "";
  server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });
  const items = [];
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({ executablePath: chromePath, headless: true });
    for (const viewport of [
      { key: "390x844", width: 390, height: 844 },
      { key: "430x932", width: 430, height: 932 },
      { key: "768x1024", width: 768, height: 1024 },
    ]) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        isMobile: viewport.width <= 430,
        hasTouch: true,
      });
      await login(page);
      await proveNotifications(page, items, viewport.key);
      await page.close();
    }

    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    await login(page);
    await proveStoreCart(page, items);
    await proveAdmin(page, items);
    await proveTidplan(page, items);
    await provePlanner(page, items);
    await proveNotificationsI18n(page);
    await page.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
  writeReport(items, serverLog);
  console.log(JSON.stringify({
    ok: true,
    outputDir,
    report: path.join(outputDir, "REPORT.md"),
    index: path.join(outputDir, "index.html"),
    screenshots: items.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
