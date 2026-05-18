const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `mobile-tablet-overlay-proof-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const outputDir = path.join(appRoot, "tmp", runId);
const shotDir = path.join(outputDir, "screenshots");
const port = Number(process.env.OVERLAY_PROOF_PORT || (6200 + (Date.now() % 700)));
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const viewports = [
  { key: "390x844", width: 390, height: 844, label: "390x844 mobile" },
  { key: "430x932", width: 430, height: 932, label: "430x932 mobile" },
  { key: "768x1024", width: 768, height: 1024, label: "768x1024 tablet" },
  { key: "1024x1366", width: 1024, height: 1366, label: "1024x1366 tablet" },
  { key: "1440x1000", width: 1440, height: 1000, label: "desktop 1440x1000" },
];

const storeTabs = [
  ["products", "Artikli"],
  ["categories", "Kategorije"],
  ["orders", "Narudzbe"],
  ["budgets", "Budzeti"],
  ["rules", "Pravila"],
  ["export", "Export"],
  ["audit", "Audit"],
];

const settingsTabs = [
  ["tabSettings", "Postavke"],
  ["tabAdmins", "Admini"],
  ["tabGuest", "Gost mode"],
  ["tabLogs", "Logovi"],
  ["tabBackup", "Backup"],
];

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
  throw new Error("Timed out waiting for overlay proof server");
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
    appState.functions = ["Admin", "Superadmin", "Store Manager"];
    appState.permissions = {
      ...(appState.permissions || {}),
      canAccessPlanner: true,
      canAccessTidplan: true,
      canAccessWarehouse: true,
      canAccessWorkwear: true,
      canAccessReports: true,
      canAccessNotifications: true,
      canAccessSurveys: true,
      canAccessAdmin: true,
      canManageAdmins: true,
      canManageGuestAccess: true,
      canViewLogs: true,
      canViewBackups: true,
      canManageBackups: true,
      canRestoreBackups: true,
      canManageWorkwear: true,
      canViewWorkwearAnalytics: true,
    };
    if (Array.isArray(window.sites) && !window.sites.includes("Proof Site")) {
      window.sites.push("Proof Site");
      localStorage.setItem(window.SITES_KEY, JSON.stringify(window.sites));
      if (typeof initializeSiteStorage === "function") initializeSiteStorage("Proof Site");
    }
    if (typeof switchSiteFromLocal === "function") switchSiteFromLocal("Proof Site", { syncSites: false });
  });
  await delay(350);
}

async function openView(page, view) {
  await page.evaluate(async (target) => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let result = null;
    if (target === "tidplan") result = CMAX.tidplan.show();
    if (target === "store") result = CMAX.workwear.show();
    if (target === "admin") result = CMAX.admin.open();
    if (result && typeof result.then === "function") await result.catch(() => {});
    window.scrollTo(0, 0);
    await wait(350);
  }, view);
  await page.waitForFunction((target) => window.currentView === target, view, { timeout: 5000 }).catch(() => {});
}

async function seedBase(page) {
  await page.evaluate(() => {
    appState.workers = ["Pero", "Marko", "Amir", "Ana", "Ivan", "Sara", "Lejla", "Nermin"];
    appState.lifts = ["Lift 1", "Lift 2", "Lift 3"];
    appState.plans = ["Plan A", "Plan B", "Plan C"];
    appState.karnas = ["Karna A", "Karna B", "Karna C"];
    appState.moments = ["Moment A", "Moment B", "Moment C"];
    appState.admins = [
      {
        email: "proof@cmax.test",
        firstName: "Proof",
        lastName: "Admin",
        active: true,
        functions: ["Admin", "Superadmin", "Store Manager"],
        permissions: appState.permissions,
        allowedSites: ["Proof Site"],
      },
      {
        email: "worker@cmax.test",
        firstName: "Proof",
        lastName: "Worker",
        active: true,
        functions: ["Radnik"],
        permissions: {},
        allowedSites: ["Proof Site"],
      },
    ];
    if (typeof renderAll === "function") renderAll();
  });
}

async function seedTidplanRows(page, count) {
  await page.evaluate((count) => {
    const formatDate = (date) => date.toISOString().slice(0, 10);
    const base = new Date("2026-04-27T00:00:00Z");
    window.tidplanData = Array.from({ length: count }, (_, index) => {
      const startDate = new Date(base);
      startDate.setUTCDate(base.getUTCDate() + index);
      const endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 2 + (index % 4));
      return {
        plan: `Plan ${String.fromCharCode(65 + (index % 3))}`,
        zona: `Zona ${String.fromCharCode(65 + (index % 4))}`,
        karna: `Karna ${String.fromCharCode(65 + (index % 3))}`,
        moment: `Moment ${index + 1}`,
        resursi: 1 + (index % 5),
        start: formatDate(startDate),
        end: formatDate(endDate),
        komentar: `Overlay proof aktivnost ${index + 1}`,
        active: true,
      };
    });
    if (typeof updateTidplan === "function") updateTidplan();
  }, count);
}

async function seedStore(page, productCount, orderCount) {
  await page.evaluate(({ productCount, orderCount }) => {
    const state = typeof getWorkwearState === "function" ? getWorkwearState() : null;
    if (!state) return;
    state.products = Array.from({ length: productCount }, (_, index) => ({
      id: `overlay_product_${index + 1}`,
      name: `Overlay artikl ${index + 1}`,
      description: "Proof proizvod za overlay provjeru.",
      category: index % 2 ? "Odjeca" : "Zimska oprema",
      subcategory: index % 2 ? "Majice" : "Softshell jakne",
      images: [],
      sizes: ["S", "M", "L", "XL"],
      variants: [
        { id: `black_${index + 1}`, name: "Crna", active: true },
        { id: `white_${index + 1}`, name: "Bijela", active: true },
      ],
      active: true,
      availableSites: ["*"],
      visibleToRoles: [],
      price: 500 + index,
      creditCost: 500 + index,
      usesBudget: true,
      showPriceToWorker: true,
    }));
    state.catalog = {
      Odjeca: { active: true, subcategories: { Majice: { active: true }, Jakne: { active: true } } },
      "Zimska oprema": { active: true, subcategories: { "Softshell jakne": { active: true }, Kape: { active: true } } },
    };
    state.workerProfiles = {
      "proof@cmax.test": {
        workerId: "proof@cmax.test",
        workerName: "Proof Admin",
        creditBalance: 7000,
        reservedCredit: 0,
        ledger: [],
      },
      "worker@cmax.test": {
        workerId: "worker@cmax.test",
        workerName: "Proof Worker",
        creditBalance: 2500,
        reservedCredit: 0,
        ledger: [],
      },
    };
    state.orders = Array.from({ length: orderCount }, (_, index) => {
      const product = state.products[index % Math.max(1, state.products.length)];
      return {
        id: `overlay_order_${index + 1}`,
        workerId: "proof@cmax.test",
        workerName: "Proof Admin",
        site: "Proof Site",
        status: ["Pending", "Approved", "Delivered", "Rejected"][index % 4],
        createdAt: new Date(Date.now() - index * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - index * 1800000).toISOString(),
        statusHistory: [
          { status: "Pending", at: new Date(Date.now() - index * 3600000).toISOString() },
          ...(index % 4 >= 1 ? [{ status: "Approved", at: new Date(Date.now() - index * 1800000).toISOString() }] : []),
        ],
        items: [
          {
            productId: product?.id || "missing",
            productName: product?.name || "Missing product",
            variantId: product?.variants?.[0]?.id || "",
            variantName: product?.variants?.[0]?.name || "",
            size: "M",
            quantity: 1 + (index % 3),
            lineCost: 500 + index,
            budgetImpact: 500 + index,
            priceAtOrder: 500 + index,
          },
        ],
        totals: { subtotal: 500 + index, budgetImpact: 500 + index },
        comment: `Overlay order komentar ${index + 1}`,
      };
    });
    state.auditLog = Array.from({ length: 35 }, (_, index) => ({
      id: `audit_${index + 1}`,
      eventType: index % 2 ? "store_product_updated" : "store_order_status_changed",
      actor: "proof@cmax.test",
      actorName: "Proof Admin",
      timestamp: new Date(Date.now() - index * 60000).toISOString(),
      entityType: "store",
      entityId: `overlay_${index + 1}`,
    }));
    window.workwearProductPage = 1;
    if (typeof renderWorkwearModule === "function") renderWorkwearModule();
  }, { productCount, orderCount });
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function rel(file) {
  return path.relative(outputDir, file).replace(/\\/g, "/");
}

async function measure(page, selector, opts = {}) {
  return page.evaluate(({ selector, opts }) => {
    const el = document.querySelector(selector);
    if (!el) return { selector, exists: false };
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyle(el);
    const slop = opts.slop ?? 2;
    return {
      selector,
      exists: true,
      display: styles.display,
      position: styles.position,
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollTop: Math.round(el.scrollTop || 0),
      scrollHeight: Math.round(el.scrollHeight || 0),
      clientHeight: Math.round(el.clientHeight || 0),
      insideViewport:
        rect.top >= -slop &&
        rect.left >= -slop &&
        rect.right <= window.innerWidth + slop &&
        rect.bottom <= window.innerHeight + slop,
      canScrollDown: el.scrollHeight > el.clientHeight + 2,
      atBottom: el.scrollHeight <= el.clientHeight + 2 || Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 4,
    };
  }, { selector, opts });
}

async function scrollElementToBottom(page, selector) {
  await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (el) el.scrollTop = el.scrollHeight;
  }, selector);
  await delay(100);
}

async function capture(page, items, viewport, group, label, selector, notes, options = {}) {
  if (options.scrollTop === true) await page.evaluate(() => window.scrollTo(0, 0));
  if (options.scrollIntoView) {
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start", inline: "nearest" }), options.scrollIntoView);
  }
  await delay(options.delay || 160);
  const file = path.join(shotDir, `${safeName(group)}-${safeName(label)}-${viewport.key}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const metrics = selector ? await measure(page, selector, options.measure || {}) : null;
  if (metrics?.exists && !metrics.insideViewport && options.allowOutside !== true) {
    throw new Error(`${label} is outside viewport on ${viewport.key}: ${JSON.stringify(metrics)}`);
  }
  items.push({ group, label, viewport: viewport.label, file, notes, metrics });
}

function writeReport(items, serverLog) {
  const lines = [];
  lines.push("# Mobile/tablet overlay proof report");
  lines.push("");
  lines.push(`Run: ${runId}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("Ovaj report ciljano provjerava Tidplan toggle/fullscreen, Store editor tabove, Moje narudzbe i Postavke tabove. Screenshot je viewport screenshot, a metrika ispod pokazuje da panel nije izasao van ekrana.");
  lines.push("");
  let currentGroup = "";
  items.forEach((item, index) => {
    if (item.group !== currentGroup) {
      currentGroup = item.group;
      lines.push(`## ${currentGroup}`);
      lines.push("");
    }
    lines.push(`### ${index + 1}. ${item.label} - ${item.viewport}`);
    lines.push("");
    lines.push(`![${item.label} - ${item.viewport}](${rel(item.file)})`);
    lines.push("");
    lines.push(`- Prije lose: ${item.notes.before}`);
    lines.push(`- Promijenjeno: ${item.notes.changed}`);
    lines.push(`- Zasto: ${item.notes.why}`);
    lines.push(`- Kompromis: ${item.notes.compromise}`);
    if (item.metrics) {
      lines.push(`- Metrika: \`${JSON.stringify(item.metrics)}\``);
    }
    lines.push("");
  });
  if (serverLog) {
    lines.push("## Server log tail");
    lines.push("");
    lines.push("```text");
    lines.push(serverLog.slice(-1500));
    lines.push("```");
  }
  fs.writeFileSync(path.join(outputDir, "REPORT.md"), lines.join("\n"), "utf8");

  const htmlItems = items.map((item, index) => `
    <article class="proof-card">
      <h2>${index + 1}. ${item.label} <span>${item.viewport}</span></h2>
      <a href="${rel(item.file)}"><img src="${rel(item.file)}" alt="${item.label} ${item.viewport}" loading="lazy"></a>
      <dl>
        <dt>Prije lose</dt><dd>${item.notes.before}</dd>
        <dt>Promijenjeno</dt><dd>${item.notes.changed}</dd>
        <dt>Zasto</dt><dd>${item.notes.why}</dd>
        <dt>Kompromis</dt><dd>${item.notes.compromise}</dd>
        ${item.metrics ? `<dt>Metrika</dt><dd><code>${JSON.stringify(item.metrics)}</code></dd>` : ""}
      </dl>
    </article>`).join("\n");
  const html = `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mobile/tablet overlay proof</title>
  <style>
    body { margin: 0; padding: 24px; font-family: Arial, sans-serif; background: #f4f7fb; color: #172640; }
    h1 { margin-top: 0; }
    .proof-card { background: #fff; border: 1px solid #dce4f2; border-radius: 16px; padding: 18px; margin: 0 0 22px; box-shadow: 0 10px 28px rgba(15,23,42,.08); }
    h2 { margin: 0 0 12px; font-size: 20px; }
    h2 span { color: #66748b; font-size: 14px; font-weight: 600; }
    img { max-width: 100%; border: 1px solid #dce4f2; border-radius: 12px; background: #fff; }
    dl { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 8px 12px; }
    dt { font-weight: 800; }
    dd { margin: 0; word-break: break-word; }
    code { font-size: 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Mobile/tablet overlay proof report</h1>
  <p>Run: ${runId}</p>
  ${htmlItems}
</body>
</html>`;
  fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");
}

async function proveTidplan(page, items, viewport) {
  await openView(page, "tidplan");
  await page.evaluate(() => {
    localStorage.setItem("tidplanPanelMode", "normal");
    window.scrollTo(0, 0);
  });
  await seedTidplanRows(page, 18);
  await capture(page, items, viewport, "01-tidplan", "Tidplan normal before toggle", ".tidplan-container", {
    before: "Na mobile/tablet verziji panel toggle nije pouzdano mijenjao raspored.",
    changed: "Normal mode prikazuje tabelu i timeline kao lokalno scrollabilnu radnu povrsinu.",
    why: "Korisnik zeli zadrzati desktop-like Tidplan sa scrollom.",
    compromise: "Na malom ekranu treba pomicati radnu povrsinu lijevo/desno.",
  }, { scrollIntoView: ".tidplan-container" });

  await page.click("#tidplanPanelToggle");
  await delay(180);
  await capture(page, items, viewport, "01-tidplan", "Tidplan toggle timeline only", ".tidplan-container", {
    before: "Mobile CSS je vracao lijevi panel iako je toggle trebao sakriti panel.",
    changed: "Hidden mode sada stvarno sakrije tabelu i daje timelineu prostor.",
    why: "Toggle mora raditi jednako na touch uredjaju kao na desktopu.",
    compromise: "Timeline-only mode i dalje koristi horizontalni scroll za sirinu Gantta.",
  }, { scrollIntoView: ".tidplan-container" });

  await page.click("#tidplanPanelToggle");
  await delay(180);
  await capture(page, items, viewport, "01-tidplan", "Tidplan toggle table only", ".tidplan-container", {
    before: "Expanded/table mode je na mobile mogao ostaviti timeline vidljiv ili pokvariti sirinu.",
    changed: "Expanded mode sada prikazuje tabelu bez timelinea i sa lokalnim scrollom.",
    why: "Panel toggle mora biti predvidljiv za unos podataka.",
    compromise: "Tabela je sira od mobitela i zato ostaje lokalni scroll.",
  }, { scrollIntoView: ".tidplan-container" });

  await page.click("#tidplanPanelToggle");
  await delay(180);
  await page.evaluate(() => window.scrollTo(0, Math.min(900, document.body.scrollHeight - window.innerHeight)));
  await delay(120);
  await page.evaluate(() => document.getElementById("tidplanFullscreenToggle")?.click());
  await delay(260);
  await capture(page, items, viewport, "01-tidplan", "Tidplan fullscreen after page scroll", ".tidplan-timeline-fullscreen", {
    before: "Ako je stranica ranije bila scrollana, fullscreen Gantt je znao ostati previsoko i dio stranice se vidio.",
    changed: "Timeline se za fullscreen privremeno premjesti u body kao viewport layer.",
    why: "Fullscreen ne smije zavisiti od scroll pozicije ili parent layouta.",
    compromise: "Dok je fullscreen otvoren fokus je samo timeline/Gantt, a ostatak Tidplana je u pozadini.",
  });
  await page.keyboard.press("Escape");
  await delay(160);
}

async function proveStore(page, items, viewport) {
  await openView(page, "store");
  await seedStore(page, 35, 45);
  await page.evaluate(() => {
    workwearManagerEditorOpen = true;
    workwearOrdersOverlayOpen = false;
    workwearCartOverlayOpen = false;
    if (typeof renderWorkwearModule === "function") renderWorkwearModule();
  });
  await delay(200);
  for (const [tab, label] of storeTabs) {
    await page.evaluate((tab) => CMAX.workwear.switchManagerTab(tab), tab);
    await delay(180);
    await capture(page, items, viewport, "02-store-editor-tabs", `Store editor ${label} top`, "#workwearManagerPanels", {
      before: `Store editor tab ${label} je mogao biti djelomicno van ekrana ili bez jasnog unutrasnjeg scrolla.`,
      changed: "Editor je fiksni overlay sa headerom/tabovima i jednim content scroll containerom.",
      why: "Manager mora vidjeti cijeli editor bez da panel nestane ispod viewporta.",
      compromise: "Dugi tabovi se scrollaju unutar editora, ne kroz cijelu stranicu.",
    });
    await scrollElementToBottom(page, "#workwearManagerPanels .store-modal-body");
    await capture(page, items, viewport, "02-store-editor-tabs", `Store editor ${label} bottom`, "#workwearManagerPanels", {
      before: `Dno Store editor taba ${label} je moglo ostati odsjeceno.`,
      changed: "Dno taba je dostupno kroz unutrasnji scroll.",
      why: "Save/export/audit krajevi panela moraju biti dostupni na telefonu i tabletu.",
      compromise: "Kod dugih listi treba scrollati unutar editora.",
    });
    await page.evaluate(() => {
      const body = document.querySelector("#workwearManagerPanels .store-modal-body");
      if (body) body.scrollTop = 0;
    });
  }
  await page.evaluate(() => {
    workwearManagerEditorOpen = false;
    workwearOrdersOverlayOpen = true;
    if (typeof renderWorkwearModule === "function") renderWorkwearModule();
  });
  await delay(180);
  await capture(page, items, viewport, "03-store-orders-overlay", "Moje narudzbe many orders top", ".store-orders-shell", {
    before: "Moje narudzbe je moglo zauzimati katalog ili izgubiti donji dio kada ima vise narudzbi.",
    changed: "Narudzbe su zaseban overlay sa internim scrollom.",
    why: "Katalog mora ostati cist, a lista narudzbi citljiva.",
    compromise: "Kod mnogo narudzbi lista se scrolla unutar panela.",
  });
  await scrollElementToBottom(page, "#workwearOrdersList");
  await capture(page, items, viewport, "03-store-orders-overlay", "Moje narudzbe many orders bottom", ".store-orders-shell", {
    before: "Dno liste Moje narudzbe je moglo biti odsjeceno.",
    changed: "Panel se moze doscrollati do dna i ostaje u viewportu.",
    why: "Korisnik mora vidjeti zadnje narudzbe i dostupne akcije.",
    compromise: "Na telefonu panel zauzima cijeli ekran.",
  });
  await page.evaluate(() => {
    workwearOrdersOverlayOpen = false;
    if (typeof renderWorkwearModule === "function") renderWorkwearModule();
  });
}

async function proveSettings(page, items, viewport) {
  await openView(page, "admin");
  const allowDesktopPageFlow = viewport.width > 1024;
  for (const [tabId, label] of settingsTabs) {
    await page.evaluate((tabId) => {
      if (typeof switchTab === "function") switchTab(tabId);
    }, tabId);
    await delay(220);
    await capture(page, items, viewport, "04-settings-tabs", `Postavke ${label} top`, "#settings-section .modal-box", {
      before: `Postavke tab ${label} je mogao imati content koji izadje van ekrana.`,
      changed: "Settings panel koristi viewport-limited shell i content scroll po tabu.",
      why: "Admin radnje moraju biti dostupne na touch uredjajima.",
      compromise: "Dugi admin/log/backup tabovi traze unutrasnji scroll.",
    }, { allowOutside: allowDesktopPageFlow });
    await page.evaluate((tabId) => {
      const active = document.getElementById(tabId);
      if (active) active.scrollTop = active.scrollHeight;
    }, tabId);
    await delay(120);
    await capture(page, items, viewport, "04-settings-tabs", `Postavke ${label} bottom`, "#settings-section .modal-box", {
      before: `Dno Postavke taba ${label} je moglo ostati skriveno.`,
      changed: "Aktivni settings tab se moze doscrollati do dna bez pomjeranja panela van viewporta.",
      why: "Backup/log/admin akcije na dnu moraju ostati dostupne.",
      compromise: "Na mobitelu settings radi kao full-screen panel.",
    }, { allowOutside: allowDesktopPageFlow });
    if (tabId === "tabAdmins") {
      await page.evaluate(() => {
        const actionBar = document.getElementById("adminComposeActionBar");
        actionBar?.scrollIntoView({ block: "center", inline: "nearest" });
      });
      await delay(120);
      const actionBarMetrics = await measure(page, "#adminComposeActionBar");
      if (!actionBarMetrics.exists) throw new Error(`adminComposeActionBar missing on ${viewport.key}`);
      if (!["static", "relative"].includes(actionBarMetrics.position)) {
        throw new Error(`adminComposeActionBar should stay in normal flow on ${viewport.key}: ${JSON.stringify(actionBarMetrics)}`);
      }
      await capture(page, items, viewport, "06-shell-fixes", "Admin action bar static", "#settings-section .modal-box", {
        before: "adminComposeActionBar je bio sticky i pratio scroll pa je smetao preko admin forme.",
        changed: "Action bar je vracen u normalan tok forme i vise ne lebdi preko inputa.",
        why: "Admin forma mora imati predvidljiv scroll bez plutajuceg bara koji zaklanja polja.",
        compromise: "Gumb za dodavanje ostaje na svojoj poziciji u formi, nije stalno vidljiv tokom scrolla.",
      }, { allowOutside: allowDesktopPageFlow });
    }
  }
}

async function proveAccountNotifications(page, items, viewport) {
  await capture(page, items, viewport, "06-shell-fixes", "Compact language selector", "#headerLangSelector", {
    before: "Language buttons su na mobile/tablet zauzimali previse sirine i visine.",
    changed: "Header lang-selector koristi compact inline buttons umjesto tri velika full-width gumba.",
    why: "Header mora ostati laksi i manje zbijen na touch uredjajima.",
    compromise: "Language buttons su manji od ostalih primarnih akcija, ali i dalje dovoljno jasni.",
  }, { allowOutside: viewport.width > 1024 });
  if (viewport.width <= 1024) {
    const langMetrics = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("#headerLangSelector .lang-btn")).map((button) => {
        const rect = button.getBoundingClientRect();
        return { text: button.textContent.trim(), width: Math.round(rect.width), height: Math.round(rect.height) };
      });
    });
    const tooLarge = langMetrics.find((entry) => entry.width > 72 || entry.height > 44);
    if (tooLarge) throw new Error(`Language button is still too large: ${JSON.stringify(langMetrics)}`);
  }

  await page.evaluate(() => {
    if (typeof pushAccountNotification === "function") {
      for (let i = 0; i < 8; i += 1) {
        pushAccountNotification({
          uniqueKey: `overlay-proof-${Date.now()}-${i}`,
          title: `Overlay proof notification ${i + 1}`,
          description: "Panel mora ostati unutar ekrana.",
          type: "proof",
        });
      }
    }
    if (typeof closeAccountNotificationsPanel === "function") closeAccountNotificationsPanel();
    if (typeof toggleAccountNotificationsPanel === "function") toggleAccountNotificationsPanel();
  });
  await delay(180);
  const closeMetrics = await measure(page, ".account-notifications-close");
  if (!closeMetrics.exists || !closeMetrics.insideViewport) {
    throw new Error(`Account notification close button is not visible on ${viewport.key}: ${JSON.stringify(closeMetrics)}`);
  }
  await capture(page, items, viewport, "05-account-notifications", "Account notifications panel", ".account-notifications-panel", {
    before: "Account notifications panel je mogao pobjeci van ekrana na mobile/tablet.",
    changed: "Panel je mjeren kao fixed viewport panel sa max visinom, unutrasnjim scrollom i jasnim X close gumbom.",
    why: "Privatne obavijesti moraju biti citljive i zatvorive.",
    compromise: "Na uskim uredjajima zauzima veci dio ekrana.",
  });
  await page.click(".account-notifications-close");
  await delay(120);
  const stillOpen = await page.evaluate(() => {
    const panel = document.getElementById("accountNotificationsPanel");
    return panel?.style.display === "block";
  });
  if (stillOpen) throw new Error(`Account notification close button did not close panel on ${viewport.key}`);
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
    for (const viewport of viewports) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        isMobile: viewport.width <= 430,
        hasTouch: viewport.width <= 1024,
      });
      await login(page);
      await seedBase(page);
      await proveAccountNotifications(page, items, viewport);
      await proveTidplan(page, items, viewport);
      await proveStore(page, items, viewport);
      await proveSettings(page, items, viewport);
      await page.close();
    }
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
