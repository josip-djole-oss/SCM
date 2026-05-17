const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `mobile-tablet-proof-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const outputDir = path.join(appRoot, "tmp", runId);
const shotDir = path.join(outputDir, "screenshots");
const port = Number(process.env.MOBILE_PROOF_PORT || (5200 + (Date.now() % 700)));
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const viewports = [
  { key: "390x844", width: 390, height: 844, label: "390x844 mobile" },
  { key: "430x932", width: 430, height: 932, label: "430x932 mobile" },
  { key: "768x1024", width: 768, height: 1024, label: "768x1024 tablet" },
  { key: "1024x1366", width: 1024, height: 1366, label: "1024x1366 tablet" },
  { key: "1440x1000", width: 1440, height: 1000, label: "desktop 1440x1000" },
];

const views = [
  { key: "home", title: "Home" },
  { key: "planner", title: "Planner" },
  { key: "tidplan", title: "Tidplan" },
  { key: "store", title: "Store" },
  { key: "warehouse", title: "Warehouse" },
  { key: "notifications", title: "Notifications" },
  { key: "surveys", title: "Surveys" },
  { key: "admin", title: "Admin" },
];

const viewNotes = {
  home: {
    before: "Home je na malim sirinama lako postajao desktop lista sa previse prostora i mogucim prelijevanjem.",
    changed: "Shell, header, module cards i site cards su slozeni u mobile/tablet tok bez globalnog horizontalnog overflowa.",
    why: "Home je ulaz u aplikaciju i mora biti citljiv bez zoomiranja.",
    compromise: "Na mobitelu se vidi manje modula iznad folda, ali su touch zone vece.",
  },
  planner: {
    before: "Planner je bio lomljen izmedju card pristupa i velike tablice, sto nije odgovaralo radu na gradilistu.",
    changed: "Planner na mobitelu/tabletu opet koristi 11-kolonsku tablicu, ali u lokalnom scroll containeru.",
    why: "Korisnik je trazio da moze pomjerati lijevo/desno i gore/dolje jer je tako lakse upravljati rasporedom.",
    compromise: "Potrebno je horizontalno swipe/scroll kretanje kroz kolone.",
  },
  tidplan: {
    before: "Tidplan je na mobitelu bio prebacen u listu i timeline nije bio primarna radna povrsina.",
    changed: "Tidplan zadrzava desktop-like tablicu i Gantt/timeline, uz lokalni horizontalni i vertikalni scroll.",
    why: "Za planiranje je vazno zadrzati isti mentalni model kao desktop.",
    compromise: "Na malom ekranu se vidi samo dio Gantta dok se korisnik ne pomakne lijevo/desno.",
  },
  store: {
    before: "Store se mjesao sa side panelima i kartice/paneli su znali izlaziti iz viewporta.",
    changed: "Store katalog je jedna kolona na mobitelu, paneli su odvojeni, a cart/editor/orders su drawer/fullscreen.",
    why: "Store mora biti kao mobilna interna trgovina.",
    compromise: "Na mobitelu ima vise vertikalnog scrolla, ali nema preklapanja panela.",
  },
  warehouse: {
    before: "Warehouse forme i tablice su bile preteske za mali ekran.",
    changed: "Glavne akcije i forme su stacked, a siroke povrsine se lokalno scrollaju.",
    why: "Radnik mora moci unijeti izdavanje/ulaz robe bez zoomiranja.",
    compromise: "Detaljne tablice i dalje traze lokalni horizontalni scroll.",
  },
  notifications: {
    before: "Notifications paneli i compose forma su mogli bjezati van ekrana.",
    changed: "Filteri, compose forma i kartice su stacked; account notification panel je zakljucan unutar viewporta.",
    why: "Obavijesti moraju ostati citljive i na telefonu.",
    compromise: "Kod mnogo obavijesti lista je duga, ali ne siri stranicu.",
  },
  surveys: {
    before: "Survey forma je bila preduga i inputi su se zbijali.",
    changed: "Pitanja, datumi, opcije i privacy su slozeni vertikalno sa vecim touch zonama.",
    why: "Glasanje i objava ankete moraju biti sigurni za touch.",
    compromise: "Forma zauzima vise visine.",
  },
  admin: {
    before: "Admin panel je znao biti djelomicno vidljiv ili tezak za scroll.",
    changed: "Admin panel je ogranicen na viewport i scrolla se unutar panela.",
    why: "Admin radnje ne smiju ostati skrivene ispod ruba ekrana.",
    compromise: "Admin je i dalje najgusci modul i trazi pazljivije tablet/desktop koristenje.",
  },
};

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
  throw new Error("Timed out waiting for proof server");
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
    if (target === "home") CMAX.core.showHome();
    if (target === "planner") CMAX.tidplan.showPlanner();
    if (target === "tidplan") CMAX.tidplan.show();
    if (target === "store") CMAX.workwear.show();
    if (target === "warehouse") CMAX.warehouse.show();
    if (target === "notifications") CMAX.notifications.show();
    if (target === "surveys") CMAX.surveys.show();
    if (target === "admin") CMAX.admin.open();
    window.scrollTo(0, 0);
    await wait(400);
  }, view);
}

async function seedBase(page) {
  await page.evaluate(() => {
    appState.workers = ["Pero", "Marko", "Amir", "Ana", "Ivan", "Sara", "Lejla", "Nermin"];
    appState.lifts = ["Lift 1", "Lift 2", "Lift 3"];
    appState.plans = ["Plan A", "Plan B", "Plan C"];
    appState.karnas = ["Karna A", "Karna B", "Karna C"];
    appState.moments = ["Moment A", "Moment B", "Moment C"];
    if (typeof renderAll === "function") renderAll();
  });
}

async function seedPlannerRows(page, count) {
  await page.evaluate((count) => {
    const dayData = typeof getCurrentDayData === "function" ? getCurrentDayData() : null;
    if (!dayData) return;
    dayData.planningRows = Array.from({ length: count }, (_, index) => ({
      w1: appState.workers[index % appState.workers.length] || "",
      w2: appState.workers[(index + 1) % appState.workers.length] || "",
      w3: "",
      plan: appState.plans[index % appState.plans.length] || "",
      karna: appState.karnas[index % appState.karnas.length] || "",
      m1: appState.moments[index % appState.moments.length] || "",
      m2: appState.moments[(index + 1) % appState.moments.length] || "",
      l1: appState.lifts[index % appState.lifts.length] || "",
      l2: "",
      l3: "",
      comment: `Proof row ${index + 1}`,
    }));
    if (typeof renderPlanningTable === "function") renderPlanningTable();
    if (typeof updatePlannerSummaryCards === "function") updatePlannerSummaryCards();
  }, count);
}

async function seedTidplanRows(page, count) {
  await page.evaluate((count) => {
    const formatDate = (date) => date.toISOString().slice(0, 10);
    const base = new Date("2026-04-27T00:00:00Z");
    window.tidplanData = Array.from({ length: count }, (_, index) => {
      const startDate = new Date(base);
      startDate.setUTCDate(base.getUTCDate() + index);
      const endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 2 + (index % 3));
      return {
        plan: `Plan ${String.fromCharCode(65 + (index % 3))}`,
        zona: `Zona ${String.fromCharCode(65 + (index % 4))}`,
        karna: `Karna ${String.fromCharCode(65 + (index % 3))}`,
        moment: `Moment ${index + 1}`,
        resursi: 1 + (index % 5),
        start: formatDate(startDate),
        end: formatDate(endDate),
        komentar: `Proof aktivnost ${index + 1}`,
        active: true,
      };
    });
    if (typeof updateTidplan === "function") updateTidplan();
    else if (window.CMAX?.tidplan?.update) CMAX.tidplan.update();
  }, count);
}

async function seedStoreProducts(page, count) {
  await page.evaluate((count) => {
    const state = typeof getWorkwearState === "function" ? getWorkwearState() : null;
    if (!state) return;
    state.products = Array.from({ length: count }, (_, index) => ({
      id: `proof_product_${index + 1}`,
      name: `Proof artikl ${index + 1}`,
      description: "Mobilni proof proizvod",
      category: index % 2 ? "Odjeca" : "PPE",
      subcategory: index % 2 ? "Majice" : "Kacige",
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
    window.workwearProductPage = 1;
    if (typeof renderWorkwearModule === "function") renderWorkwearModule();
  }, count);
}

async function seedCart(page) {
  await page.evaluate(() => {
    const cart = typeof getWorkwearCartForCurrentUser === "function" ? getWorkwearCartForCurrentUser() : null;
    const state = typeof getWorkwearState === "function" ? getWorkwearState() : null;
    if (!cart || !state?.products?.length) return;
    const product = state.products[0];
    cart.items = [{
      productId: product.id,
      productName: product.name,
      variantId: product.variants?.[0]?.id || "",
      variantName: product.variants?.[0]?.name || "",
      size: product.sizes?.[1] || "M",
      quantity: 2,
      comment: "Proof cart item",
    }];
    cart.comment = "Proof checkout komentar";
    cart.urgent = false;
    if (typeof renderWorkwearCart === "function") renderWorkwearCart();
    if (typeof renderWorkwearCartBadge === "function") renderWorkwearCartBadge();
  });
}

async function seedNotifications(page, count) {
  await page.evaluate(async (count) => {
    const list = Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      message: `Proof obavijest ${index + 1}: provjera mobilnog layouta i citljivosti kartice.`,
      createdAt: new Date(Date.now() - index * 60000).toISOString(),
      createdBy: "proof@cmax.test",
      authorName: "Proof Admin",
      pinned: index % 9 === 0,
      images: [],
    }));
    if (typeof saveNotificationsForSite === "function") await saveNotificationsForSite(currentSite, list);
    if (typeof resetNotificationsRenderLimit === "function") resetNotificationsRenderLimit();
    if (typeof renderNotificationsList === "function") renderNotificationsList();
    if (typeof updateNotificationsBadge === "function") updateNotificationsBadge();
  }, count);
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function rel(file) {
  return path.relative(outputDir, file).replace(/\\/g, "/");
}

async function capture(page, items, viewport, group, label, notes, options = {}) {
  if (options.scrollTo) {
    await page.evaluate((selector) => {
      document.querySelector(selector)?.scrollIntoView({ block: "start", inline: "nearest" });
    }, options.scrollTo);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await delay(options.delay || 150);
  const file = path.join(shotDir, `${safeName(group)}-${safeName(label)}-${viewport.key}.png`);
  await page.screenshot({ path: file, fullPage: options.fullPage !== false });
  items.push({
    group,
    label,
    viewport: viewport.label,
    file,
    notes,
  });
}

function writeReport(items, serverLog) {
  const lines = [];
  lines.push("# Mobile/tablet UX proof report");
  lines.push("");
  lines.push(`Run: ${runId}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("Ovaj report je dokazni pregled: svaka stavka ima screenshot i biljesku sta je bilo lose, sta je promijenjeno, zasto i koji je kompromis.");
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
      </dl>
    </article>`).join("\n");
  const html = `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mobile/tablet UX proof</title>
  <style>
    body { margin: 0; padding: 24px; font-family: Arial, sans-serif; background: #f4f7fb; color: #172640; }
    h1 { margin-top: 0; }
    .proof-card { background: #fff; border: 1px solid #dce4f2; border-radius: 16px; padding: 18px; margin: 0 0 22px; box-shadow: 0 10px 28px rgba(15,23,42,.08); }
    h2 { margin: 0 0 12px; font-size: 20px; }
    h2 span { color: #66748b; font-size: 14px; font-weight: 600; }
    img { max-width: 100%; border: 1px solid #dce4f2; border-radius: 12px; background: #fff; }
    dl { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 8px 12px; }
    dt { font-weight: 800; }
    dd { margin: 0; }
  </style>
</head>
<body>
  <h1>Mobile/tablet UX proof report</h1>
  <p>Run: ${runId}</p>
  ${htmlItems}
</body>
</html>`;
  fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");
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
      await seedPlannerRows(page, 5);
      await seedTidplanRows(page, 8);
      await seedStoreProducts(page, 10);
      await seedNotifications(page, 10);

      for (const view of views) {
        await openView(page, view.key);
        if (view.key === "planner") await seedPlannerRows(page, 5);
        if (view.key === "tidplan") await seedTidplanRows(page, 8);
        if (view.key === "store") await seedStoreProducts(page, 10);
        if (view.key === "notifications") await seedNotifications(page, 10);
        await capture(page, items, viewport, "01-overview", view.title, viewNotes[view.key]);
      }

      await openView(page, "home");
      await capture(page, items, viewport, "02-header-panels", "Header closed", {
        before: "Header se znao preklapati pri resize-u i na mobilnim sirinama.",
        changed: "Header je razdvojen u jasne redove i akcije ostaju u viewportu.",
        why: "Glavni shell mora biti stabilan prije svakog modula.",
        compromise: "Na manjim ekranima se skriva dio desktop konteksta.",
      }, { fullPage: false });

      await page.evaluate(() => {
        document.getElementById("mainContainer")?.classList.add("sidebar-overlay-open");
        document.body.classList.add("sidebar-overlay-open");
      });
      await capture(page, items, viewport, "02-header-panels", "Sidebar open", {
        before: "Sidebar je mogao gurati ili prekrivati sadrzaj bez jasnog zatvaranja.",
        changed: "Sidebar je overlay drawer sa backdropom.",
        why: "Navigacija mora biti dostupna bez lomljenja layouta.",
        compromise: "Na mobitelu ne vidis content dok je menu otvoren.",
      }, { fullPage: false });
      await page.evaluate(() => {
        if (typeof toggleSidebarOverlay === "function") toggleSidebarOverlay(false);
        document.getElementById("mainContainer")?.classList.remove("sidebar-overlay-open");
        document.body.classList.remove("sidebar-overlay-open");
      });
      await delay(300);

      await page.evaluate(() => {
        if (typeof pushAccountNotification === "function") {
          pushAccountNotification({
            uniqueKey: `proof-${Date.now()}`,
            title: "Proof account notification",
            description: "Panel mora ostati unutar viewporta.",
            type: "proof",
          });
        }
        if (typeof toggleAccountNotificationsPanel === "function") toggleAccountNotificationsPanel();
      });
      await capture(page, items, viewport, "02-header-panels", "Account notifications open", {
        before: "Account notifications panel je na telefonu/tabletu znao pobjeci izvan ekrana.",
        changed: "Panel je fiksiran unutar viewporta i dobio je backdrop.",
        why: "Obavijesti moraju biti citljive i zatvorive na touch uredjaju.",
        compromise: "Na mobitelu panel zauzima veci dio ekrana.",
      }, { fullPage: false });
      await page.evaluate(() => { if (typeof closeAccountNotificationsPanel === "function") closeAccountNotificationsPanel(); });

      await openView(page, "store");
      await seedStoreProducts(page, 10);
      await capture(page, items, viewport, "02-header-panels", "Store open", viewNotes.store, { fullPage: false });
      await seedCart(page);
      await page.evaluate(() => {
        window.workwearCartOverlayOpen = true;
        if (typeof renderWorkwearCart === "function") renderWorkwearCart();
        if (typeof renderWorkwearCartOverlay === "function") renderWorkwearCartOverlay();
      });
      await capture(page, items, viewport, "02-header-panels", "Cart open", {
        before: "Cart je zauzimao prostor ili se mijesao sa katalogom.",
        changed: "Cart je poseban drawer/fullscreen panel.",
        why: "Checkout mora biti fokusiran i sprijeciti pogresne klikove.",
        compromise: "Dok je cart otvoren katalog je u pozadini.",
      }, { fullPage: false });
      await page.evaluate(() => { if (typeof workwearCloseCartOverlay === "function") workwearCloseCartOverlay(); });

      for (const count of [0, 5, 35]) {
        await openView(page, "planner");
        await seedPlannerRows(page, count);
        await capture(page, items, viewport, "03-planner-counts", `Planner ${count} rows`, viewNotes.planner, { fullPage: false, scrollTo: ".planning-section" });
        if (count === 35) {
          await page.evaluate(() => {
            const wrapper = document.querySelector(".planning-table-wrapper");
            if (wrapper) wrapper.scrollLeft = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
          });
          await capture(page, items, viewport, "03-planner-counts", "Planner 35 rows scrolled right", {
            ...viewNotes.planner,
            changed: "Ovaj screenshot pokazuje istu 11-kolonsku tablicu pomjerenu desno unutar lokalnog scroll containera.",
          }, { fullPage: false, scrollTo: ".planning-section" });
        }
      }

      for (const count of [0, 10, 100]) {
        await openView(page, "store");
        await seedStoreProducts(page, count);
        await capture(page, items, viewport, "04-store-counts", `Store ${count} products`, viewNotes.store, { fullPage: false, scrollTo: "#workwearProductsGrid" });
      }

      for (const count of [0, 10, 100]) {
        await openView(page, "notifications");
        await seedNotifications(page, count);
        await capture(page, items, viewport, "05-notification-counts", `Notifications ${count}`, viewNotes.notifications, { fullPage: false, scrollTo: "#notificationsList" });
      }

      await openView(page, "tidplan");
      await seedTidplanRows(page, 12);
      await capture(page, items, viewport, "06-tidplan", "Tidplan normal", viewNotes.tidplan, { fullPage: false });
      await page.evaluate(() => {
        const container = document.querySelector(".tidplan-container");
        if (container) container.scrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      });
      await capture(page, items, viewport, "06-tidplan", "Tidplan normal scrolled right", {
        ...viewNotes.tidplan,
        changed: "Ovaj screenshot pokazuje Tidplan/Gantt povrsinu pomjerenu desno unutar lokalnog scroll containera.",
      }, { fullPage: false, scrollTo: ".tidplan-container" });
      await page.click("#tidplanFullscreenToggle");
      await delay(250);
      await capture(page, items, viewport, "06-tidplan", "Tidplan fullscreen", {
        before: "Fullscreen Gantt je znao pokazivati dio stranice ispod ili imati X van ekrana.",
        changed: "Timeline koristi viewport fullscreen layer sa internim scrollom.",
        why: "Gantt mora biti citljiv kao radna povrsina.",
        compromise: "Fullscreen fokusira timeline, ne cijeli ostatak Tidplan forme.",
      }, { fullPage: false });
      await page.keyboard.press("Escape");
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
