const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `recent-changes-full-proof-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const outputDir = path.join(appRoot, "tmp", runId);
const shotDir = path.join(outputDir, "screenshots");
const port = Number(process.env.RECENT_FULL_PROOF_PORT || (7900 + (Date.now() % 300)));
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeName = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const rel = (file) => path.relative(outputDir, file).replace(/\\/g, "/");

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
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch (_) {}
    await wait(200);
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
    appState.adminLevel = 6;
    appState.permissions = Object.fromEntries(Object.keys(DEFAULT_PERMISSIONS || {}).map((key) => [key, true]));
    const admins = getAdmins();
    const index = admins.findIndex((admin) => admin.email === appState.currentUser);
    if (index >= 0) {
      admins[index] = { ...admins[index], allowedSites: null, isSuperAdmin: true, level: 6, permissions: { ...appState.permissions } };
      localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
    }
  });
}

async function capture(page, items, viewport, area, label, expected) {
  await wait(260);
  const file = path.join(shotDir, `${safeName(`${viewport}-${area}-${label}`)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const metrics = await page.evaluate(() => {
    const visibleOverlays = Array.from(document.querySelectorAll(".store-modal-overlay,.site-wizard-overlay,.backup-wizard-overlay,.admin-user-wizard-overlay,.account-notifications-panel,.entity-conflict-overlay"))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return style.display !== "none" && rect.width > 0 && rect.height > 0;
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return { id: el.id || el.className, left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom) };
      });
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      visibleButtons: Array.from(document.querySelectorAll("button, a.btn")).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width >= 36 && rect.height >= 32 && rect.left < window.innerWidth && rect.right > 0 && rect.top < window.innerHeight && rect.bottom > 0;
      }).length,
      visibleOverlays,
      jsErrors: window.__proofErrors || [],
    };
  });
  const status = metrics.jsErrors.length ? "MAJOR" : (metrics.horizontalOverflow ? "MINOR" : "PASS");
  items.push({ viewport, area, label, expected, file, metrics, status });
}

async function prepareData(page) {
  await page.evaluate(() => {
    if (!sites.includes("Proof Site A")) sites.push("Proof Site A");
    if (!sites.includes("Proof Site B")) sites.push("Proof Site B");
    localStorage.setItem(SITES_KEY, JSON.stringify(sites));
    ["Proof Site A", "Proof Site B"].forEach((site) => {
      initializeSiteStorage?.(site);
      saveSiteInfoStorage?.(site, {
        name: site,
        projectName: `${site} Projekt`,
        address: "Drottninggatan 1",
        city: "Stockholm",
        country: "Sweden",
        latitude: 59.33342,
        longitude: 18.06612,
        contactGroups: [{ id: "g1", name: "Arbetsledare", contacts: [{ id: "c1", name: "Josip", phone: "+46700000000", email: "josip@example.test", note: "Proof" }] }],
        workHoursRows: [{ id: "w1", days: "Ponedjeljak-Petak", time: "07:00-16:00", breaks: "09:00-09:30, 12:00-12:30" }],
        safetyRules: [{ id: "r1", name: "Kaciga obavezna", required: true, order: 1 }],
        logisticsItems: [{ id: "l1", name: "Parking", description: "Ulaz A", link: "" }],
        emergencyItems: [{ id: "e1", name: "Hitni broj", phone: "112", description: "", link: "" }],
        modules: Object.fromEntries(SITE_MODULE_OPTIONS.map((item) => [item.key, true])),
      });
    });
    switchSiteFromLocal?.("Proof Site A", { syncSites: false });
    const store = getWorkwearState();
    store.products = Array.from({ length: 12 }, (_, index) => normalizeStoreProduct({
      id: `review_product_${index + 1}`,
      name: `Review artikal ${index + 1}`,
      category: index % 2 ? "Obuca" : "Odjeca",
      subcategory: index % 2 ? "Cipele" : "Majice",
      sizes: index % 2 ? ["42", "43"] : ["M", "L"],
      price: 500,
      creditCost: 500,
      availableSites: ["*"],
      active: true,
      usesBudget: true,
    }));
    store.orders = [{ id: "order_review_1", workerEmail: appState.currentUser, workerName: "Proof User", siteId: currentSite, status: "Pending", createdAt: new Date().toISOString(), items: [{ productId: "review_product_1", productName: "Review artikal 1", size: "M", quantity: 1, budgetImpact: 500, priceAtOrder: 500 }] }];
    saveWorkwearState(currentSite, { track: false });
  });
}

async function runViewport(browser, items, viewport, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on("pageerror", (error) => page.evaluate((message) => { window.__proofErrors = (window.__proofErrors || []).concat(message); }, error.message).catch(() => {}));
  await login(page);
  await prepareData(page);

  await page.evaluate(() => showHomeDashboard?.({ replaceRoute: true }));
  await capture(page, items, viewport, "header-home-site-info", "home", "Header, site metadata, map/navigation, dynamic contact/emergency cards");

  await page.evaluate(() => openNewSiteWizard?.());
  await page.waitForSelector("#newSiteWizardOverlay.is-open", { state: "visible" });
  await capture(page, items, viewport, "new-site-wizard", "editable-site-details", "Map picker plus editable contact/work/rule/logistics/emergency sections");
  await page.evaluate(() => {
    const body = document.getElementById("newSiteWizardBody");
    if (body) body.scrollTop = body.scrollHeight;
  });
  await capture(page, items, viewport, "new-site-wizard", "editable-dynamic-sections", "Editable contact groups, work hours, safety rules, logistics and emergency rows");
  await page.evaluate(() => closeNewSiteWizard?.());

  await page.evaluate(() => { openAdminPanel?.(); switchTab?.("tabAdmins"); });
  await page.click("#adminUserWizardOpenBtn").catch(() => page.evaluate(() => openAdminUserWizard?.("create")));
  await page.evaluate(() => {
    const modal = document.getElementById("adminModal");
    if (modal) modal.style.display = "flex";
    const admins = document.getElementById("tabAdmins");
    if (admins) admins.classList.add("active");
  });
  await page.waitForSelector("#adminUserWizardOverlay.is-open", { state: "attached" });
  await capture(page, items, viewport, "admin-user-wizard", "create-user-stepper", "Admin user wizard stepper, permissions and safe modal spacing");
  await page.evaluate(() => { closeAdminUserWizard?.(); closeAdminPanel?.(); const modal = document.getElementById("adminModal"); if (modal) modal.style.display = "none"; });

  await page.evaluate(() => openBackupRestoreWizard?.());
  await page.waitForSelector("#backupRestoreWizardOverlay.is-open", { state: "attached" }).catch(() => {});
  await capture(page, items, viewport, "backup-restore-wizard", "select-or-empty", "Backup wizard card workflow/dry-run safety shell");
  await page.evaluate(() => { closeBackupRestoreWizard?.(); closeAdminPanel?.(); const modal = document.getElementById("adminModal"); if (modal) modal.style.display = "none"; });

  await page.evaluate(() => {
    showWorkwear?.();
  });
  await page.click("#workwearManagerEditorToggle").catch(() => page.evaluate(() => {
    workwearManagerEditorOpen = true;
    workwearManagerTab = "products";
    renderWorkwearModule?.();
  }));
  await page.evaluate(() => {
    workwearManagerEditorOpen = true;
    workwearManagerTab = "products";
    renderWorkwearAdminPanel?.();
    renderWorkwearManagerTabs?.();
    renderWorkwearManagerOverlay?.();
  });
  await page.waitForFunction(() => {
    const overlay = document.getElementById("workwearManagerOverlay");
    const rect = overlay?.getBoundingClientRect();
    return overlay && getComputedStyle(overlay).display !== "none" && rect.width > 0 && rect.height > 0;
  });
  await capture(page, items, viewport, "store", "manager-editor", "Store editor overlay, product table, wizard progress, product cards");
  await page.evaluate(() => {
    workwearManagerEditorOpen = false;
    workwearCartOverlayOpen = true;
    renderWorkwearModule?.();
  });
  await capture(page, items, viewport, "store", "cart-overlay", "Cart overlay stays readable and within viewport");
  await page.evaluate(() => { workwearCartOverlayOpen = false; workwearOrdersOverlayOpen = true; renderWorkwearModule?.(); });
  await capture(page, items, viewport, "store", "orders-panel", "My orders panel separated from catalog");

  await page.evaluate(() => CMAX?.siteChat?.show?.());
  await capture(page, items, viewport, "site-chat", "list-thread", "Site chat list/thread responsive shell and account-notification separation surface");

  await page.evaluate(() => showPlanner?.());
  await capture(page, items, viewport, "planner", "row-save-surface", "Planner surface after row-level save/conflict work");
  await page.evaluate(() => showEntityConflictPanel?.({ module: "planner", entityLabel: "Proof row", field: "plan", mine: "Moja vrijednost", server: "Server vrijednost", updatedBy: "User B", updatedAt: new Date().toISOString() }));
  await capture(page, items, viewport, "planner", "entity-conflict-ui", "Entity conflict UI scoped to row/field");

  await page.evaluate(() => { closeEntityConflictPanel?.(); showTidplan?.(); });
  await capture(page, items, viewport, "tidplan", "normal", "Tidplan activity patch surface");
  await page.evaluate(() => document.getElementById("tidplanFullscreenToggle")?.click());
  await wait(300);
  await capture(page, items, viewport, "tidplan", "fullscreen-gantt", "Fullscreen Gantt after recent fixes");
  await page.keyboard.press("Escape").catch(() => {});

  await page.evaluate(() => showNotifications?.());
  await capture(page, items, viewport, "notifications", "site-notifications", "Site notifications module remains separate from account notifications");
  await page.evaluate(() => { toggleAccountNotificationsPanel?.(); });
  await capture(page, items, viewport, "notifications", "account-panel", "Account notifications panel/badge responsive surface");

  await context.close();
}

function writeReport(items) {
  const counts = items.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {});
  const sections = items.map((item) => [
    `### ${item.status} - ${item.viewport} - ${item.area} - ${item.label}`,
    "",
    `![${item.label}](${rel(item.file)})`,
    "",
    `- Pregledano: ${item.expected}`,
    `- Estetika/UX: ${item.status === "PASS" ? "nema vidljivog overflowa ili JS greske u automatskom guardu" : "oznaceno za rucni pregled"}.`,
    `- Responsive guard: horizontal overflow ${item.metrics.horizontalOverflow ? "YES" : "NO"}, buttons ${item.metrics.visibleButtons}.`,
    `- JS errors: ${item.metrics.jsErrors.length ? item.metrics.jsErrors.join("; ") : "none"}.`,
    "",
  ].join("\n")).join("\n");
  const report = [
    "# Full Recent Changes Proof Review",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Summary: PASS ${counts.PASS || 0}, MINOR ${counts.MINOR || 0}, MAJOR ${counts.MAJOR || 0}, BLOCKER ${counts.BLOCKER || 0}.`,
    "",
    "Scope: admin wizard, backup wizard, site wizard/info/map, Store editor/cart/orders, Site Chat shell, Planner entity conflict, Tidplan fullscreen, notifications/account panel, header/mobile/tablet surfaces.",
    "",
    sections,
  ].join("\n");
  fs.writeFileSync(path.join(outputDir, "REPORT.md"), report, "utf8");
  fs.writeFileSync(path.join(outputDir, "index.html"), `<!doctype html><meta charset="utf-8"><title>Full Recent Changes Proof</title><style>body{font-family:Arial,sans-serif;margin:24px;background:#f6f8fb;color:#172033}img{max-width:100%;border:1px solid #d8e1ef;border-radius:12px}section{margin-bottom:28px;padding:16px;background:#fff;border-radius:16px}.PASS{color:#166534}.MINOR{color:#92400e}.MAJOR,.BLOCKER{color:#991b1b}</style><h1>Full Recent Changes Proof</h1><p>PASS ${counts.PASS || 0}, MINOR ${counts.MINOR || 0}, MAJOR ${counts.MAJOR || 0}, BLOCKER ${counts.BLOCKER || 0}</p>${items.map((item) => `<section><h2 class="${item.status}">${item.status} - ${item.viewport} - ${item.area} - ${item.label}</h2><img src="${rel(item.file)}"><p>${item.expected}</p></section>`).join("")}`, "utf8");
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
    await runViewport(browser, items, "tablet-1024x1366", 1024, 1366);
    await runViewport(browser, items, "mobile-390x844", 390, 844);
    await runViewport(browser, items, "mobile-430x932", 430, 932);
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
