const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const runId = `phase9-ui-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const profileDir = path.join(os.tmpdir(), runId, "chrome");
const port = Number(process.env.PHASE9_PORT || 3549);
const debugPort = Number(process.env.PHASE9_DEBUG_PORT || 9549);
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });

function isoDateOffset(daysAhead) {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + daysAhead);
  return base.toISOString().slice(0, 10);
}

const TEST_DATE = isoDateOffset(7);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (_) {
          reject(new Error(`Invalid JSON from ${url}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error(`Timeout ${url}`)));
  });
}

async function waitFor(fn, label, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (_) {}
    await delay(150);
  }
  throw new Error(`Timed out waiting for ${label}`);
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
      BOOTSTRAP_ADMIN_EMAIL: "phase9@cmax.test",
      BOOTSTRAP_ADMIN_PASSWORD: "testpass123",
      LOGIN_RATE_LIMIT_MAX: "100",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function startChrome() {
  return childProcess.spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "--disable-gpu",
    "--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function connectCdp() {
  const target = await waitFor(async () => {
    const targets = await requestJson(`http://127.0.0.1:${debugPort}/json/list`);
    return targets.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
  }, "Chrome page target");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result || {});
    }
    if (message.method === "Runtime.consoleAPICalled") {
      const text = (message.params.args || []).map((arg) => arg.value || arg.description || "").join(" ");
      console.log(`[browser] ${text}`);
    }
  });

  return {
    ws,
    send(method, params = {}) {
      const messageId = ++id;
      ws.send(JSON.stringify({ id: messageId, method, params }));
      return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }
  return result.result?.value;
}

function smokeScript() {
  return `
    (async () => {
      const wait = (predicate, label) => new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          try {
            if (predicate()) return resolve(true);
          } catch (_) {}
          if (Date.now() - start > 20000) return reject(new Error("timeout " + label));
          setTimeout(tick, 100);
        };
        tick();
      });
      const assert = (condition, message) => {
        if (!condition) throw new Error(message);
      };

      await wait(() => window.CMAX && typeof CMAX.core?.login === "function" && CMAX.events, "scripts");
      document.getElementById("loginEmail").value = "phase9@cmax.test";
      document.getElementById("loginPassword").value = "testpass123";
      CMAX.core.login();
      await wait(() => appState?.currentUser === "phase9@cmax.test" && freshServerDataLoaded === true, "login");

      appState.isReadonly = false;
      appState.isAdmin = true;
      appState.isSuperAdmin = true;
      appState.currentDate = "${TEST_DATE}";
      currentView = "main";
      sites = ["Site A"];
      currentSite = "Site A";
      localStorage.setItem(SITES_KEY, JSON.stringify(sites));
      localStorage.setItem(CURRENT_SITE_KEY, currentSite);
      initializeSiteStorage(currentSite);
      updateScopedStorageKeysForCurrentSite();
      appState.workers = ["Worker A"];
      appState.lifts = ["Lift A"];
      appState.moments = ["Moment A"];
      appState.plans = ["Plan A"];
      appState.karnas = ["Karna A"];
      appState.dailyData = {
        "${TEST_DATE}": {
          workerAttendance: {},
          liftAvailability: {},
          liftPlans: {},
          planningRows: [{ w1: "Worker A" }],
        },
      };
      warehouseData = getDefaultWarehouseData();
      warehouseData.catalog = [{ id: "item_A", name: "Warehouse A", unit: "kom", minimum: 0, notifyPerson: "" }];
      warehouseData.stock = { item_A: { current: 5, totalIssued: 0, totalReceived: 5 } };
      warehouseData.logs = [
        {
          id: "log_A",
          timestamp: new Date().toISOString(),
          type: "stock",
          worker: "Worker A",
          itemId: "item_A",
          itemName: "Warehouse A",
          quantity: 1,
          direction: "in",
          comment: "phase9",
          balanceAfter: 5,
        },
      ];
      warehouseData.stockForm = { itemId: "item_A", quantity: 1, direction: "in", comment: "" };
      appState.binsData = {};
      ensureBinsDataForDate(appState.currentDate);
      persistCurrentStateToLocalStorage();
      await syncServerState({ includeSites: true, markAsClean: true, skipLog: true });
      stopServerSync();

      const siteBtn = document.getElementById("siteSwitcherBtn");
      assert(siteBtn.dataset.cmaxAction === "sites.toggleDropdown", "site dropdown action missing");
      siteBtn.click();
      assert(document.getElementById("siteDropdown").style.display === "block", "site dropdown did not open");
      siteBtn.click();
      assert(document.getElementById("siteDropdown").style.display === "none", "site dropdown did not close");

      const warehouseBtn = document.getElementById("btnWarehouse");
      assert(warehouseBtn.dataset.cmaxAction === "warehouse.show", "warehouse button action missing");
      warehouseBtn.click();
      await wait(() => currentView === "warehouse", "warehouse delegated navigation");
      assert(document.getElementById("warehouseInventoryBody").textContent.includes("Warehouse A"), "warehouse inventory did not render");

      document.getElementById("warehouseNavLogsBtn").click();
      await wait(() => currentView === "warehouseLogs", "warehouse logs navigation");
      assert(document.getElementById("warehouseLogsBody").textContent.includes("Warehouse A"), "warehouse logs did not render");
      document.getElementById("warehouseLogItem").value = "Warehouse A";
      document.getElementById("warehouseApplyLogFiltersBtn").click();
      assert(warehouseLogFilterState.filterItem === "Warehouse A", "warehouse log filter did not apply");
      document.getElementById("warehouseResetLogFiltersBtn").click();
      assert(warehouseLogFilterState.filterItem === "", "warehouse log filter did not reset");

      document.getElementById("warehouseLogsGraphBtn").click();
      await wait(() => currentView === "warehouseGraph", "warehouse graph navigation from logs");
      document.getElementById("warehouseGraphBackBtn").click();
      await wait(() => currentView === "warehouse", "warehouse graph back navigation");
      document.getElementById("warehouseNavGraphBtn").click();
      await wait(() => currentView === "warehouseGraph", "warehouse graph navigation");
      document.getElementById("warehouseGraphLogsBtn").click();
      await wait(() => currentView === "warehouseLogs", "warehouse graph logs navigation");

      const dropdown = document.getElementById("warehouseExportImportDropdown");
      document.getElementById("btnWarehouseExportImport").click();
      assert(dropdown.style.display === "block", "warehouse export dropdown did not open");
      const oldExportExcel = CMAX.importExport.exportWarehouseExcel;
      const oldExportModule = CMAX.importExport.exportModule;
      let excelCalls = 0;
      let pdfArgs = null;
      CMAX.importExport.exportWarehouseExcel = () => { excelCalls += 1; };
      CMAX.importExport.exportModule = (...args) => { pdfArgs = args; };
      document.getElementById("btnWarehouseExportExcel").click();
      assert(excelCalls === 1, "warehouse excel export action did not dispatch");
      assert(dropdown.style.display === "none", "warehouse export dropdown did not close after excel");
      document.getElementById("btnWarehouseExportImport").click();
      document.getElementById("btnWarehouseExportPdf").click();
      assert(pdfArgs?.[0] === "warehouse" && pdfArgs?.[1] === "pdf", "warehouse pdf export action args wrong");
      assert(dropdown.style.display === "none", "warehouse export dropdown did not close after pdf");
      CMAX.importExport.exportWarehouseExcel = oldExportExcel;
      CMAX.importExport.exportModule = oldExportModule;

      document.querySelector("#warehouse-logs-section [data-cmax-action='tidplan.showPlanner']").click();
      await wait(() => currentView === "main", "warehouse back to planner");

      const binsBtn = document.getElementById("btnBins");
      assert(binsBtn.dataset.cmaxAction === "bins.show", "bins button action missing");
      binsBtn.click();
      await wait(() => currentView === "bins", "bins delegated navigation");

      currentView = "main";
      appState.dailyData[appState.currentDate].planningRows = [{ w1: "Worker A" }];
      showConfirm = (_message, _title, _icon, onYes) => onYes();
      document.getElementById("btnClear").click();
      await wait(() => getCurrentDayData().planningRows.length === 0, "planner clear delegated");
      stopServerSync();

      return {
        ok: true,
        remainingInline: document.querySelectorAll("[onclick],[onchange],[oninput],[onerror]").length,
        actions: {
          site: siteBtn.dataset.cmaxAction,
          warehouse: warehouseBtn.dataset.cmaxAction,
          bins: binsBtn.dataset.cmaxAction,
          clear: document.getElementById("btnClear").dataset.cmaxAction,
          excelCalls,
          pdfArgs,
        },
      };
    })()
  `;
}

(async () => {
  let server;
  let chrome;
  let cdp;
  try {
    console.log("Starting temporary server...");
    server = startServer();
    let serverErr = "";
    server.stderr.on("data", (chunk) => { serverErr += chunk.toString(); });
    await waitFor(async () => {
      const health = await requestJson(`http://127.0.0.1:${port}/api/health`);
      return health.ok === true;
    }, "server health");

    console.log("Starting headless Chrome...");
    chrome = startChrome();
    cdp = await connectCdp();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/login` });
    await waitFor(() => evaluate(cdp, "document.readyState === 'complete'"), "page load");

    console.log("Running Phase 9 warehouse UI smoke...");
    const result = await evaluate(cdp, smokeScript());
    console.log(JSON.stringify({ ok: true, result }, null, 2));
    if (serverErr.trim()) {
      console.error(serverErr.trim());
    }
  } finally {
    try { cdp?.ws?.close(); } catch (_) {}
    try { chrome?.kill(); } catch (_) {}
    try { server?.kill(); } catch (_) {}
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
