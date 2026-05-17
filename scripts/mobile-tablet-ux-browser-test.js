const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `mobile-tablet-ux-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const screenshotDir = path.join(appRoot, "tmp", runId);
const port = Number(process.env.MOBILE_UX_PORT || (3600 + (Date.now() % 1000)));
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

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
      BOOTSTRAP_ADMIN_EMAIL: "mobile-ux@cmax.test",
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
  throw new Error("Timed out waiting for server");
}

async function login(page) {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.CMAX && window.CMAX.core && typeof window.CMAX.core.login === "function");
  await page.fill("#loginEmail", "mobile-ux@cmax.test");
  await page.fill("#loginPassword", "testpass123");
  await page.evaluate(() => window.CMAX.core.login());
  await page.waitForFunction(() => window.appState && window.appState.currentUser === "mobile-ux@cmax.test");
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
    if (Array.isArray(window.sites) && !window.sites.includes("UX Site")) {
      window.sites.push("UX Site");
      localStorage.setItem(window.SITES_KEY, JSON.stringify(window.sites));
      if (typeof initializeSiteStorage === "function") initializeSiteStorage("UX Site");
    }
    if (typeof switchSiteFromLocal === "function") switchSiteFromLocal("UX Site", { syncSites: false });
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
    await wait(350);
  }, view);
}

async function exerciseSidebar(page, viewport) {
  if (viewport.width > 1024) return [];
  const issues = [];
  await page.evaluate(() => {
    if (typeof toggleSidebarOverlay === "function") {
      toggleSidebarOverlay(true);
    } else if (window.CMAX?.dashboard?.toggleSidebarOverlay) {
      CMAX.dashboard.toggleSidebarOverlay(true);
    }
    document.getElementById("mainContainer")?.classList.add("sidebar-overlay-open");
    document.body.classList.add("sidebar-overlay-open");
  });
  await delay(120);
  await page.evaluate(() => {
    document.getElementById("mainContainer")?.classList.add("sidebar-overlay-open");
    document.body.classList.add("sidebar-overlay-open");
    const sidebar = document.querySelector(".app-sidebar");
    if (sidebar) sidebar.style.transition = "none";
  });
  await delay(60);
  const openIssue = await page.evaluate(({ viewport }) => {
    const container = document.getElementById("mainContainer");
    const sidebar = document.querySelector(".app-sidebar");
    const backdrop = document.getElementById("appSidebarBackdrop");
    const width = window.innerWidth;
    const height = window.innerHeight;
    const sideRect = sidebar?.getBoundingClientRect();
    const backStyle = backdrop ? getComputedStyle(backdrop) : null;
    if (!container?.classList.contains("sidebar-overlay-open")) return `sidebar@${viewport}: overlay class was not applied`;
    if (!sideRect || sideRect.right <= 0 || sideRect.left >= width || sideRect.bottom <= 0 || sideRect.top >= height) {
      return `sidebar@${viewport}: sidebar drawer is not visible in viewport`;
    }
    if (!backStyle || backStyle.display === "none") return `sidebar@${viewport}: backdrop is not visible`;
    return "";
  }, { viewport: `${viewport.width}x${viewport.height}` });
  if (openIssue) issues.push(openIssue);
  issues.push(...await collectLayoutIssues(page, viewport, "sidebar-open"));
  await page.evaluate(() => {
    const backdrop = document.getElementById("appSidebarBackdrop");
    if (backdrop) backdrop.click();
  });
  await delay(120);
  const closeIssue = await page.evaluate(({ viewport }) => {
    const container = document.getElementById("mainContainer");
    if (container?.classList.contains("sidebar-overlay-open")) return `sidebar@${viewport}: backdrop did not close sidebar`;
    return "";
  }, { viewport: `${viewport.width}x${viewport.height}` });
  if (closeIssue) issues.push(closeIssue);
  return issues;
}

async function seedVisibleRows(page, view) {
  if (view === "planner") {
    await page.evaluate(() => {
      if (typeof appState === "undefined") return;
      appState.workers = appState.workers?.length ? appState.workers : ["Pero", "Marko", "Amir"];
      appState.lifts = appState.lifts?.length ? appState.lifts : ["Lift 1", "Lift 2"];
      appState.plans = appState.plans?.length ? appState.plans : ["Plan A"];
      appState.karnas = appState.karnas?.length ? appState.karnas : ["Karna A"];
      appState.moments = appState.moments?.length ? appState.moments : ["Moment A"];
      if (typeof addPlanningRow === "function") addPlanningRow();
      if (typeof renderPlanningTable === "function") renderPlanningTable();
    });
  }
  if (view === "tidplan") {
    await page.evaluate(() => {
      if (typeof tidplanData !== "undefined" && Array.isArray(tidplanData) && !tidplanData.length) {
        tidplanData.push({
          plan: "Plan A",
          zona: "Zona A",
          karna: "Karna A",
          moment: "Moment A",
          resursi: 2,
          start: "2026-05-18",
          end: "2026-05-20",
          komentar: "Mobilna provjera",
          active: true,
        });
      }
      if (typeof updateTidplan === "function") updateTidplan();
      else if (window.CMAX?.tidplan?.update) CMAX.tidplan.update();
    });
  }
  if (view === "store") {
    await page.evaluate(() => {
      if (typeof getWorkwearState !== "function") return;
      const state = getWorkwearState();
      if (!Array.isArray(state.products)) state.products = [];
      if (!state.products.some((product) => product.id === "mobile_ux_product")) {
        state.products.push({
          id: "mobile_ux_product",
          name: "Mobilna test majica",
          description: "Touch friendly product card",
          category: "Odjeca",
          subcategory: "Majice",
          images: [],
          sizes: ["S", "M", "L"],
          variants: [{ id: "black", name: "Crna", active: true }],
          active: true,
          availableSites: ["*"],
          visibleToRoles: [],
          price: 500,
          creditCost: 500,
          usesBudget: true,
          showPriceToWorker: true,
        });
      }
      if (typeof renderWorkwearModule === "function") renderWorkwearModule();
    });
  }
}

async function exercisePanels(page, view, viewport) {
  const issues = [];
  const requireOpenPanel = async (selector, label) => {
    const issue = await page.evaluate(({ selector, label, viewport, view }) => {
      const el = document.querySelector(selector);
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (!el) return `${view}@${viewport}: ${label} panel missing`;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const visible = style.display !== "none" && style.visibility !== "hidden" && rect.width > 20 && rect.height > 20;
      const intersects = rect.bottom > 0 && rect.right > 0 && rect.top < height && rect.left < width;
      if (!visible || !intersects) {
        return `${view}@${viewport}: ${label} panel is not visible in viewport (${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.width)}x${Math.round(rect.height)}, display=${style.display})`;
      }
      return "";
    }, { selector, label, viewport: `${viewport.width}x${viewport.height}`, view });
    if (issue) issues.push(issue);
  };

  if (view === "store") {
    await page.evaluate(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      if (typeof workwearToggleCartOverlay === "function") {
        workwearCartOverlayOpen = true;
        renderWorkwearCartOverlay();
      }
      await wait(100);
    });
    await requireOpenPanel(".store-cart-drawer", "store cart");
    issues.push(...await collectLayoutIssues(page, viewport, `${view}-cart-open`));
    await page.evaluate(() => {
      if (typeof workwearCloseCartOverlay === "function") workwearCloseCartOverlay();
    });

    await page.evaluate(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      if (typeof workwearToggleOrdersOverlay === "function") {
        workwearOrdersOverlayOpen = true;
        renderWorkwearOrdersOverlay();
      }
      await wait(100);
    });
    await requireOpenPanel(".store-orders-shell", "store orders");
    issues.push(...await collectLayoutIssues(page, viewport, `${view}-orders-open`));
    await page.evaluate(() => {
      if (typeof workwearCloseOrdersOverlay === "function") workwearCloseOrdersOverlay();
    });

    await page.evaluate(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      if (typeof workwearToggleManagerEditor === "function" && typeof canManageWorkwearModule === "function" && canManageWorkwearModule()) {
        if (typeof workwearManagerEditorOpen !== "undefined") workwearManagerEditorOpen = false;
        workwearToggleManagerEditor();
      }
      await wait(100);
    });
    await requireOpenPanel("#workwearManagerPanels", "store editor");
    issues.push(...await collectLayoutIssues(page, viewport, `${view}-editor-open`));
    await page.evaluate(() => {
      if (typeof workwearCloseManagerEditor === "function") workwearCloseManagerEditor();
    });
  }
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    if (typeof toggleAccountNotificationsPanel === "function") toggleAccountNotificationsPanel();
    await wait(100);
  });
  await requireOpenPanel("#accountNotificationsPanel", "account notifications");
  issues.push(...await collectLayoutIssues(page, viewport, `${view}-account-panel-open`));
  await page.evaluate(() => {
    if (typeof closeAccountNotificationsPanel === "function") closeAccountNotificationsPanel();
  });
  return issues;
}

async function collectLayoutIssues(page, viewport, view) {
  return page.evaluate(({ viewport, view }) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const issues = [];
    const globalOverflow = Math.ceil(document.documentElement.scrollWidth - width);
    if (globalOverflow > 2) issues.push(`${view}@${viewport}: global horizontal overflow ${globalOverflow}px`);

    const frameSelectors = [
      ".header",
      ".app-content",
      ".store-header",
      ".store-catalog-card",
      ".store-cart-drawer",
      ".store-modal-shell",
      ".account-notifications-panel",
      ".planning-section",
      ".tidplan-container",
      ".warehouse-header",
      ".notifications-header",
      ".notifications-composer",
      ".survey-card",
      "#settings-section .modal-box",
    ];
    document.querySelectorAll(frameSelectors.join(",")).forEach((el) => {
      if (!visible(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.left < -3 || rect.right > width + 3) {
        issues.push(`${view}@${viewport}: ${el.className || el.id || el.tagName} overflows viewport (${Math.round(rect.left)}..${Math.round(rect.right)} / ${width})`);
      }
      if (rect.top < -height && el.closest(".tidplan-timeline-fullscreen")) return;
    });

    const tiny = [];
    document.querySelectorAll("button, input, select, textarea").forEach((el) => {
      if (!visible(el)) return;
      if (el.closest(".timeline-body") || el.closest(".timeline-header")) return;
      const rect = el.getBoundingClientRect();
      if (el.matches('input[type="checkbox"], input[type="radio"]')) {
        const label = el.closest("label");
        const labelRect = label?.getBoundingClientRect();
        if (label && labelRect && labelRect.height >= 44 && labelRect.width >= 44) return;
      }
      const isTiny = rect.height < 40 || (el.tagName === "BUTTON" && rect.width < 34);
      if (isTiny) tiny.push(`${el.id || el.textContent.trim().slice(0, 20) || el.tagName}:${Math.round(rect.width)}x${Math.round(rect.height)}`);
    });
    if (tiny.length) issues.push(`${view}@${viewport}: small touch targets ${tiny.slice(0, 8).join(", ")}`);

    if (width <= 640 && view === "planner") {
      const wrapper = document.querySelector(".planning-table-wrapper");
      const table = document.querySelector(".planning-table");
      const tableDisplay = getComputedStyle(table || document.body).display;
      const headDisplay = getComputedStyle(document.querySelector(".planning-table thead") || document.body).display;
      if (!wrapper || !table || tableDisplay !== "table" || headDisplay === "none") {
        issues.push(`${view}@${viewport}: planner is not in scrollable table mode`);
      } else if (wrapper.scrollWidth <= wrapper.clientWidth + 2) {
        issues.push(`${view}@${viewport}: planner table does not provide local horizontal scroll`);
      }
    }

    if (width <= 640 && view === "tidplan") {
      const container = document.querySelector(".tidplan-container");
      const timeline = document.querySelector(".tidplan-timeline");
      if (!container || !timeline || !visible(timeline)) {
        issues.push(`${view}@${viewport}: mobile tidplan should keep desktop gantt/timeline visible`);
      } else if (container.scrollWidth <= container.clientWidth + 2) {
        issues.push(`${view}@${viewport}: tidplan container does not provide local horizontal scroll`);
      }
    }

    return issues;
  }, { viewport: `${viewport.width}x${viewport.height}`, view });
}

async function main() {
  const server = startServer();
  let serverLog = "";
  server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

  const viewports = [
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1024, height: 1366 },
  ];
  const views = ["home", "planner", "tidplan", "store", "warehouse", "notifications", "surveys", "admin"];
  const issues = [];
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({ executablePath: chromePath, headless: true });
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: viewport.width <= 430, hasTouch: true });
      await login(page);
      issues.push(...await exerciseSidebar(page, viewport));
      for (const view of views) {
        await openView(page, view);
        await seedVisibleRows(page, view);
        issues.push(...await exercisePanels(page, view, viewport));
        await page.screenshot({ path: path.join(screenshotDir, `${viewport.width}x${viewport.height}-${view}.png`), fullPage: true });
        issues.push(...await collectLayoutIssues(page, viewport, view));
      }
      await page.close();
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }

  if (issues.length) {
    console.error(JSON.stringify({ ok: false, issues, screenshotDir, serverLog: serverLog.slice(-1000) }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, viewports, views, screenshotDir }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
