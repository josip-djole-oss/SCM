const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `store-editor-wizard-proof-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const outputDir = path.join(appRoot, "tmp", runId);
const shotDir = path.join(outputDir, "screenshots");
const port = Number(process.env.STORE_EDITOR_PROOF_PORT || (7100 + (Date.now() % 500)));
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
  await page.fill("#loginEmail", "proof@cmax.test");
  await page.fill("#loginPassword", "testpass123");
  await page.evaluate(() => CMAX.core.login());
  await page.waitForFunction(() => window.appState?.currentUser === "proof@cmax.test");
  await page.evaluate(() => {
    appState.isAdmin = true;
    appState.isSuperAdmin = true;
    appState.isReadonly = false;
    appState.adminLevel = 6;
    appState.permissions = {
      ...(appState.permissions || {}),
      canAccessWorkwear: true,
      canManageWorkwear: true,
      canManageStore: true,
      canOpenAdminPanel: true,
      canManageWorkwearSettings: true,
      canManageStoreRules: true,
      canManageStoreBudgets: true,
    };
    if (Array.isArray(window.sites) && !window.sites.includes("Proof Store Site")) {
      window.sites.push("Proof Store Site");
      localStorage.setItem(window.SITES_KEY, JSON.stringify(window.sites));
      if (typeof initializeSiteStorage === "function") initializeSiteStorage("Proof Store Site");
    }
    if (typeof switchSiteFromLocal === "function") switchSiteFromLocal("Proof Store Site", { syncSites: false });
  });
}

async function seedStoreEditor(page, productCount) {
  await page.evaluate((productCount) => {
    const state = getWorkwearState();
    state.products = Array.from({ length: productCount }, (_, index) => normalizeStoreProduct({
      id: `proof_product_${index + 1}`,
      name: `Proof artikal ${String(index + 1).padStart(2, "0")}`,
      description: "Proof item za dugi workwear-product-table-wrap.",
      category: index % 2 === 0 ? "Odjeca" : "Obuca",
      subcategory: index % 2 === 0 ? "Majice" : "Zastitne cipele",
      sizes: index % 2 === 0 ? ["M", "L"] : ["42", "43"],
      price: 500,
      creditCost: 500,
      active: true,
      availableSites: ["*"],
      visibleToRoles: [],
      usesBudget: true,
    }));
    state.settings.sizePresetCatalog = {};
    saveWorkwearState(currentSite, { track: false });
    workwearManagerEditorOpen = true;
    workwearManagerTab = "products";
    workwearProductWizardStep = 3;
    workwearResetProductWizard(null);
    workwearProductWizardStep = 3;
    renderWorkwearModule();
  }, productCount);
  await page.waitForSelector("#workwearManagerPanels", { state: "visible" });
  await page.waitForSelector(".workwear-product-wizard", { state: "visible" });
}

async function metrics(page) {
  return page.evaluate(() => {
    const measure = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return { selector, exists: false };
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        selector,
        exists: true,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        position: style.position,
        overflow: style.overflow,
        overflowY: style.overflowY,
        scrollHeight: Math.round(el.scrollHeight),
        clientHeight: Math.round(el.clientHeight),
        insideViewport:
          rect.top >= -2 &&
          rect.left >= -2 &&
          rect.right <= window.innerWidth + 2 &&
          rect.bottom <= window.innerHeight + 2,
      };
    };
    return {
      table: measure(".workwear-product-table-wrap"),
      wizard: measure(".workwear-product-wizard"),
      wizardScroll: measure(".workwear-product-wizard-scroll"),
      actions: measure(".workwear-product-wizard > .workwear-cart-actions"),
      overlay: measure("#workwearManagerPanels"),
      shoeSizesVisible:
        document.body.innerText.includes("35") &&
        document.body.innerText.includes("50") &&
        !document.body.innerText.includes("Obuca (38-48)"),
    };
  });
}

function assertProof(metric, viewport) {
  if (!metric.table.exists || metric.table.scrollHeight <= metric.table.clientHeight) {
    throw new Error(`Product table is not independently scrollable on ${viewport}: ${JSON.stringify(metric.table)}`);
  }
  if (!metric.wizard.exists || !metric.wizard.insideViewport) {
    throw new Error(`Wizard is not stable inside viewport on ${viewport}: ${JSON.stringify(metric.wizard)}`);
  }
  if (!metric.actions.exists || !metric.actions.insideViewport) {
    throw new Error(`Wizard actions are not visible on ${viewport}: ${JSON.stringify(metric.actions)}`);
  }
  if (!metric.shoeSizesVisible) {
    throw new Error(`Shoe preset 35-50 is not visible on ${viewport}`);
  }
}

async function capture(page, items, viewport, label, notes = {}) {
  await delay(160);
  const file = path.join(shotDir, `${safeName(label)}-${viewport}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const itemMetrics = await metrics(page);
  items.push({ viewport, label, file, notes, metrics: itemMetrics });
  return itemMetrics;
}

async function capturePlain(page, items, viewport, label, notes = {}) {
  await delay(160);
  const file = path.join(shotDir, `${safeName(label)}-${viewport}.png`);
  await page.screenshot({ path: file, fullPage: false });
  items.push({ viewport, label, file, notes, metrics: null });
}

async function runScenario(page, items, viewport, width, height) {
  await page.setViewportSize({ width, height });
  await page.route("https://supplier.example/images/**", async (route) => {
    const name = path.basename(new URL(route.request().url()).pathname).replace(/[^a-z0-9-]+/gi, " ");
    const label = name.includes("back") ? "BACK" : name.includes("detail") ? "DETAIL" : "FRONT";
    const fill = label === "FRONT" ? "#1f6feb" : label === "BACK" ? "#16a34a" : "#f59e0b";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" rx="18" fill="${fill}"/><path d="M56 42h68l18 30-18 16v50H56V88L38 72z" fill="rgba(255,255,255,.86)"/><text x="90" y="160" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#fff">${label}</text></svg>`;
    await route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg });
  });
  await page.route("**/api/store/product-link-preview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        preview: {
          sourceUrl: "https://supplier.example/products/proof-jacket-500",
          host: "supplier.example",
          name: "Proof jakna iz linka",
          description: "Opis ucitan iz product metadata preview endpointa.",
          imageUrls: [
            "https://supplier.example/images/proof-jacket-front-900x900.jpg",
            "https://supplier.example/images/proof-jacket-back-900x900.jpg",
            "https://supplier.example/images/proof-jacket-detail-900x900.jpg",
          ],
          price: 500,
          currency: "SEK",
          sku: "SUP-500",
          brand: "CMAX Proof",
          confidence: "product-jsonld",
        },
      }),
    });
  });
  await page.evaluate(() => {
    closeAccountNotificationsPanel?.();
    if (typeof showWorkwear === "function") showWorkwear();
  });
  await delay(450);
  await seedStoreEditor(page, 46);
  await page.selectOption("#workwearWizardSizePreset", "obuca");
  await delay(180);
  const firstMetrics = await capture(page, items, viewport, "many-products-wizard-step-3", {
    changed: "Duga lista proizvoda scrolla u workwear-product-table-wrap, a wizard ostaje u svom panelu sa vidljivim akcijama.",
  });
  assertProof(firstMetrics, viewport);

  await page.fill("#workwearWizardCustomPresetName", "Zimske cipele");
  await page.fill("#workwearWizardCustomPresetSizes", "35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50");
  await page.click('[data-cmax-action="workwear.saveWizardSizePreset"]');
  await delay(220);
  const customPresetOk = await page.evaluate(() => {
    const select = document.getElementById("workwearWizardSizePreset");
    return Boolean(select && Array.from(select.options).some((option) => option.textContent.includes("Zimske cipele")));
  });
  if (!customPresetOk) throw new Error(`Custom size preset was not saved on ${viewport}`);
  const secondMetrics = await capture(page, items, viewport, "custom-size-preset-saved", {
    changed: "Custom preset je spremljen i dostupan u istom dropdownu za sljedece artikle.",
  });
  assertProof(secondMetrics, viewport);

  await page.evaluate(() => workwearSetProductWizardStep(1));
  await page.waitForSelector("#workwearProductLinkInput", { state: "visible" });
  await page.fill("#workwearProductLinkInput", "https://supplier.example/products/proof-jacket-500");
  await page.click('[data-cmax-action="workwear.previewProductLink"]');
  await page.waitForFunction(() => window.workwearProductLinkPreviewState?.data?.name === "Proof jakna iz linka");
  await capturePlain(page, items, viewport, "product-link-preview", {
    changed: "Link preview prikazuje prijedlog bez automatskog spremanja artikla.",
  });
  await page.click('[data-cmax-action="workwear.applyProductLinkPreview"]');
  await page.waitForFunction(() => document.getElementById("workwearProductName")?.value === "Proof jakna iz linka");
  const appliedOk = await page.evaluate(() => ({
    name: document.getElementById("workwearProductName")?.value || "",
    description: document.getElementById("workwearProductDescription")?.value || "",
    primary: document.getElementById("workwearProductImage")?.value || "",
    gallery: document.getElementById("workwearProductGallery")?.value || "",
  }));
  if (
    appliedOk.name !== "Proof jakna iz linka" ||
    !appliedOk.description.includes("metadata") ||
    !appliedOk.primary.includes("proof-jacket-front") ||
    !appliedOk.gallery.includes("proof-jacket-back") ||
    !appliedOk.gallery.includes("proof-jacket-detail")
  ) {
    throw new Error(`Product link preview did not apply on ${viewport}: ${JSON.stringify(appliedOk)}`);
  }
  await capturePlain(page, items, viewport, "product-link-preview-applied", {
    changed: "Nakon potvrde naziv/opis/cijena i sve slike iz previewa su uneseni u wizard; prva slika je glavna, ostale su galerija.",
  });
  await page.evaluate(() => workwearSetProductWizardStep(2));
  await page.waitForSelector("#workwearProductGallery", { state: "visible" });
  const galleryVisible = await page.evaluate(() => ({
    primary: document.getElementById("workwearProductImage")?.value || "",
    gallery: document.getElementById("workwearProductGallery")?.value || "",
    thumbs: document.querySelectorAll(".workwear-image-gallery-preview img").length,
  }));
  if (!galleryVisible.primary.includes("proof-jacket-front") || galleryVisible.thumbs < 2) {
    throw new Error(`Applied gallery images are not visible on ${viewport}: ${JSON.stringify(galleryVisible)}`);
  }
  await capturePlain(page, items, viewport, "product-link-images-in-wizard", {
    changed: "Step 2 odmah prikazuje glavnu sliku i dodatne galerijske slike koje je link preview nasao.",
  });
  await page.click(".workwear-image-gallery-preview .workwear-image-remove-btn");
  await page.waitForFunction(() => {
    const gallery = document.getElementById("workwearProductGallery")?.value || "";
    return !gallery.includes("proof-jacket-back") && document.querySelectorAll(".workwear-image-gallery-preview img").length === 1;
  });
  await capturePlain(page, items, viewport, "product-link-gallery-image-removed", {
    changed: "Svaka dodatna slika ima X i uklanjanje odmah brise taj URL iz galerije prije spremanja artikla.",
  });
  await page.click(".workwear-image-preview-box .workwear-image-remove-btn");
  await page.waitForFunction(() => {
    const primary = document.getElementById("workwearProductImage")?.value || "";
    const gallery = document.getElementById("workwearProductGallery")?.value || "";
    return primary.includes("proof-jacket-detail") && !gallery.trim();
  });
  await capturePlain(page, items, viewport, "product-link-main-image-removed", {
    changed: "Ako se ukloni glavna slika, sljedeca galerijska slika automatski postaje glavna.",
  });

  await page.evaluate(() => {
    workwearSwitchManagerTab("categories");
    renderWorkwearModule();
  });
  await page.waitForSelector("#workwearCategoriesPanel", { state: "visible" });
  await capturePlain(page, items, viewport, "categories-and-size-presets-management", {
    changed: "Kategorije, podkategorije i preseti velicina imaju edit/delete/archive kontrole u editoru.",
  });
  await page.fill("#workwearManagerSizePresetName", "Proof brisanje");
  await page.fill("#workwearManagerSizePresetSizes", "A,B,C");
  await page.click('[data-cmax-action="workwear.addManagerSizePreset"]');
  await page.waitForFunction(() => document.body.innerText.includes("Proof brisanje"));
  await page.evaluate(() => workwearArchiveManagerSizePreset("proof_brisanje"));
  await page.click("#dialogButtons .btn:last-child");
  await page.waitForFunction(() => !Array.from(document.querySelectorAll("#workwearCategoriesPanel strong")).some((el) => el.textContent.includes("Proof brisanje")));
  await capturePlain(page, items, viewport, "size-preset-deleted", {
    changed: "Custom size preset se moze obrisati iz editor tab-a.",
  });
}

function writeReport(items) {
  const rows = items.map((item) => {
    const m = item.metrics;
    return [
      `### PASS - ${item.viewport} - ${item.label}`,
      "",
      `![${item.label}](${rel(item.file)})`,
      "",
      `- Sta je prije bilo lose: duga lista artikala mogla je razvuci editor i sakriti wizard dugmad; preset velicina nije mijenjao checkboxove.`,
      `- Sta je promijenjeno: ${item.notes.changed}`,
      `- Kompromis: tabela i wizard sada imaju odvojene scroll povrsine, pa na manjim ekranima postoji kontrolisan nested scroll unutar modala.`,
      m ? `- Metrics: table ${m.table.clientHeight}/${m.table.scrollHeight}, wizard ${m.wizard.height}px, actions inside viewport ${m.actions.insideViewport}.` : "- Metrics: UI proof screenshot, bez layout guard metrika za ovaj ne-wizard scenario.",
      "",
    ].join("\n");
  }).join("\n");
  const report = [
    "# Store Editor Wizard Proof",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    rows,
  ].join("\n");
  fs.writeFileSync(path.join(outputDir, "REPORT.md"), report, "utf8");
  fs.writeFileSync(path.join(outputDir, "index.html"), `<!doctype html><meta charset="utf-8"><title>Store Editor Wizard Proof</title><style>body{font-family:Arial,sans-serif;margin:24px;background:#f6f8fb;color:#172033}img{max-width:100%;border:1px solid #d8e1ef;border-radius:12px}section{margin-bottom:28px;padding:16px;background:#fff;border-radius:16px}</style><h1>Store Editor Wizard Proof</h1>${items.map((item) => `<section><h2>PASS - ${item.viewport} - ${item.label}</h2><img src="${rel(item.file)}"><p>${item.notes.changed}</p></section>`).join("")}`, "utf8");
}

(async () => {
  const server = startServer();
  const stderr = [];
  server.stderr.on("data", (chunk) => stderr.push(String(chunk)));
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath } : {});
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page);
    const items = [];
    await runScenario(page, items, "desktop-1440x1000", 1440, 1000);
    await runScenario(page, items, "tablet-768x1024", 768, 1024);
    await runScenario(page, items, "mobile-390x844", 390, 844);
    writeReport(items);
    console.log(JSON.stringify({ ok: true, report: path.join(outputDir, "REPORT.md"), screenshots: items.length }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message, stderr: stderr.slice(-6) }, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})();
