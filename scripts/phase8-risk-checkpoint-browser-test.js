const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const runId = `phase8-risk-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const profileDir = path.join(os.tmpdir(), runId, "chrome");
const port = Number(process.env.PHASE8_PORT || 3538);
const debugPort = Number(process.env.PHASE8_DEBUG_PORT || 9538);
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Invalid JSON from ${url}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Timeout requesting ${url}`));
    });
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
  const env = {
    ...process.env,
    PORT: String(port),
    DATA_PATH: dataDir,
    UPLOAD_PATH: uploadDir,
    STORAGE_TYPE: "json",
    BOOTSTRAP_ADMIN_EMAIL: "phase8@cmax.test",
    BOOTSTRAP_ADMIN_PASSWORD: "testpass123",
    LOGIN_RATE_LIMIT_MAX: "100",
  };
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: appRoot,
    env,
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
  const events = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result || {});
      return;
    }
    if (message.method === "Runtime.consoleAPICalled") {
      const text = (message.params.args || []).map((arg) => arg.value || arg.description || "").join(" ");
      console.log(`[browser] ${text}`);
    }
    events.push(message);
  });

  const send = (method, params = {}) => {
    const messageId = ++id;
    ws.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(messageId, { resolve, reject });
    });
  };

  return { ws, send, events };
}

async function evaluate(cdp, expression, awaitPromise = true) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }
  return result.result?.value;
}

function checkpointScript() {
  return `
    (async () => {
      const wait = (predicate, label, timeoutMs = 20000) => new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          try {
            if (predicate()) return resolve(true);
          } catch (_) {}
          if (Date.now() - start > timeoutMs) return reject(new Error("timeout " + label));
          setTimeout(tick, 100);
        };
        tick();
      });
      const assert = (condition, message) => {
        if (!condition) throw new Error(message);
      };
      const change = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
      const setAllAccess = () => {
        appState.isReadonly = false;
        appState.isAdmin = true;
        appState.isSuperAdmin = true;
        appState.permissions = { ...(appState.permissions || {}) };
      };
      const go = (site) => switchSiteFromLocal(site, { syncSites: false });
      const siteSummary = (site) => {
        const planner = JSON.parse(localStorage.getItem(getSiteStorageKey("cmax_planner_data", site)) || "{}");
        const tid = JSON.parse(localStorage.getItem(getSiteStorageKey("tidplan", site)) || "[]");
        const bins = JSON.parse(localStorage.getItem(getSiteStorageKey("cmax_planner_bins", site)) || "{}");
        const wh = JSON.parse(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", site)) || "{}");
        return {
          workers: planner.workers || [],
          plans: planner.plans || [],
          tidplanComments: tid.map((entry) => entry.komentar || ""),
          binFirstTotal: bins["2026-05-09"]?.rows?.[0]?.totalAvailable ?? null,
          warehouseNames: (wh.catalog || []).map((entry) => entry.name),
          warehouseStock: wh.stock || {},
          warehouseLogs: (wh.logs || []).map((entry) => entry.itemName || entry.comment || entry.type || ""),
        };
      };
      const setSitePayload = (site, marker) => {
        go(site);
        appState.currentDate = "2026-05-09";
        appState.workers = ["Worker " + marker];
        appState.lifts = ["Lift " + marker];
        appState.moments = ["Moment " + marker];
        appState.plans = ["Plan " + marker, "Plan " + marker + " 2"];
        appState.karnas = ["Karna " + marker];
        appState.dailyData = {
          "2026-05-09": {
            workerAttendance: {},
            liftAvailability: {},
            liftPlans: {},
            planningRows: [],
          },
        };
        appState.resourceHistory = [];
        recordResourceAdded("workers", "Worker " + marker);
        recordResourceAdded("lifts", "Lift " + marker);
        recordResourceAdded("moments", "Moment " + marker);
        recordResourceAdded("plans", "Plan " + marker);
        recordResourceAdded("plans", "Plan " + marker + " 2");
        recordResourceAdded("karnas", "Karna " + marker);
        tidplanZones = [{ name: "Zone " + marker, color: "#5b8def" }];
        tidplanData = [{
          plan: "Plan " + marker,
          zona: "Zone " + marker,
          karna: "Karna " + marker,
          moment: "Moment " + marker,
          resursi: 1,
          start: "2026-05-09",
          end: "2026-05-10",
          komentar: "Tidplan " + marker,
          active: true,
        }];
        appState.binsData = {};
        ensureBinsDataForDate(appState.currentDate);
        getBinsDataForDate(appState.currentDate).rows[0].totalAvailable = marker.charCodeAt(0);
        warehouseData = getDefaultWarehouseData();
        warehouseData.catalog = [{ id: "item_" + marker, name: "Warehouse " + marker, unit: "kom", minimum: 0, notifyPerson: "" }];
        warehouseData.stock = { ["item_" + marker]: { current: marker === "A" ? 5 : marker === "B" ? 9 : 13, totalIssued: 0, totalReceived: marker === "A" ? 5 : marker === "B" ? 9 : 13 } };
        warehouseData.logs = [{
          id: "log_" + marker,
          timestamp: new Date().toISOString(),
          type: "stock",
          worker: "",
          itemId: "item_" + marker,
          itemName: "Warehouse " + marker,
          quantity: 1,
          direction: "in",
          comment: "Log " + marker,
          balanceAfter: warehouseData.stock["item_" + marker].current,
        }];
        warehouseData.stockForm = { itemId: "item_" + marker, quantity: 1, direction: "in", comment: "" };
        persistCurrentStateToLocalStorage();
      };
      let siteBStockAfterAdjustment = null;
      let siteBStoredStockAfterAdjustment = null;

      await wait(() => typeof handleLogin === "function" && window.CMAX && typeof switchSiteFromLocal === "function", "scripts");
      document.getElementById("loginEmail").value = "phase8@cmax.test";
      document.getElementById("loginPassword").value = "testpass123";
      handleLogin();
      await wait(() => appState?.currentUser === "phase8@cmax.test" && freshServerDataLoaded === true, "login");
      setAllAccess();
      appState.currentDate = "2026-05-09";

      sites = ["Site A", "Site B", "Site C"];
      markLocalSiteMutation();
      localStorage.setItem(SITES_KEY, JSON.stringify(sites));
      sites.forEach((site) => initializeSiteStorage(site));
      currentSite = "Site A";
      localStorage.setItem(CURRENT_SITE_KEY, currentSite);
      updateScopedStorageKeysForCurrentSite();
      setSitePayload("Site A", "A");
      setSitePayload("Site B", "B");
      setSitePayload("Site C", "C");
      const synced = await syncServerState({ includeSites: true, markAsClean: true, skipLog: true });
      assert(synced === true, "initial sync failed");

      const siteSwitch = {};
      ["Site A", "Site B", "Site C", "Site A"].forEach((site) => {
        go(site);
        siteSwitch[site] = siteSummary(site);
      });
      assert(siteSwitch["Site A"].workers.join() === "Worker A", "Site A worker isolation failed");
      assert(siteSwitch["Site B"].workers.join() === "Worker B", "Site B worker isolation failed");
      assert(siteSwitch["Site C"].workers.join() === "Worker C", "Site C worker isolation failed");
      assert(siteSwitch["Site A"].warehouseNames.join() === "Warehouse A", "Site A warehouse summary failed");
      assert(siteSwitch["Site B"].warehouseNames.join() === "Warehouse B", "Site B warehouse summary failed");
      assert(siteSwitch["Site C"].warehouseNames.join() === "Warehouse C", "Site C warehouse summary failed");

      go("Site A");
      showWarehouse();
      await wait(() => currentView === "warehouse", "show warehouse A");
      assert(document.getElementById("warehouseInventoryBody").textContent.includes("Warehouse A"), "Warehouse A UI missing");
      assert(!document.getElementById("warehouseInventoryBody").textContent.includes("Warehouse B"), "Warehouse B leaked into A UI");
      go("Site B");
      showWarehouse();
      await wait(() => currentView === "warehouse", "show warehouse B");
      assert(document.getElementById("warehouseInventoryBody").textContent.includes("Warehouse B"), "Warehouse B UI missing");
      assert(!document.getElementById("warehouseInventoryBody").textContent.includes("Warehouse A"), "Warehouse A leaked into B UI");
      updateWarehouseStockForm("itemId", "item_B");
      updateWarehouseStockForm("direction", "in");
      updateWarehouseStockForm("quantity", 3);
      updateWarehouseStockForm("comment", "phase8 stock");
      saveWarehouseStockAdjustment();
      assert(warehouseData.stock.item_B.current === 12, "Warehouse B stock adjustment failed");
      siteBStockAfterAdjustment = warehouseData.stock.item_B.current;
      siteBStoredStockAfterAdjustment = JSON.parse(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", "Site B")) || "{}").stock?.item_B?.current;
      assert(siteBStoredStockAfterAdjustment === 12, "Warehouse B adjusted stock was not persisted locally");
      go("Site A");
      assert(warehouseData.stock.item_A.current === 5, "Warehouse B stock leaked into Site A");

      stopServerSync();
      go("Site B");
      currentView = "main";
      appState.workers.push("Worker B save");
      markDirty();
      let injectedConflict = false;
      let statePostCount = 0;
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init = {}) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.includes("/api/state") && String(init.method || "GET").toUpperCase() === "POST") {
          statePostCount += 1;
          if (!injectedConflict) {
            injectedConflict = true;
            const latest = await originalFetch("/api/state", { cache: "no-store" }).then((res) => res.json());
            return new Response(JSON.stringify({ error: "VERSION_CONFLICT", latest }), {
              status: 409,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
        return originalFetch(input, init);
      };
      saveAllData();
      await wait(() => injectedConflict && statePostCount >= 2 && serverSyncInFlight === null, "saveAllData conflict retry");
      window.fetch = originalFetch;
      assert(appState.hasUnsavedChanges === false, "saveAllData did not mark clean after conflict retry");

      go("Site B");
      tidplanData = [{
        plan: "Plan B",
        zona: "Zone B",
        karna: "Karna B",
        moment: "Moment B",
        resursi: 1,
        start: "2026-05-09",
        end: "2026-05-10",
        komentar: "Tidplan B",
        active: true,
      }];
      tidplanZones = [{ name: "Zone B", color: "#5b8def" }];
      tidplanDataChanged = false;
      updateTidplan();
      const tidplanComment = document.querySelector("#tidplanTbody tr[data-activity-index='0'] td:nth-child(8) input");
      assert(tidplanComment, "Tidplan comment input missing");
      tidplanComment.value = "Tidplan B changed";
      change(tidplanComment);
      assert(tidplanData[0].komentar === "Tidplan B changed", "Tidplan row comment did not update state");
      assert(tidplanDataChanged === true, "Tidplan row change did not mark dirty");

      currentView = "main";
      appState.currentDate = "2026-05-09";
      appState.workers = ["Worker B", "Worker B2"];
      appState.lifts = ["Lift B"];
      appState.moments = ["Moment B"];
      appState.plans = ["Plan B"];
      appState.karnas = ["Karna B"];
      appState.dailyData[appState.currentDate] = {
        workerAttendance: {},
        liftAvailability: {},
        liftPlans: {},
        planningRows: [],
      };
      renderPlanningTable();
      const plannerWorkerSelect = document.querySelector("#planningTableBody tr[data-row-index='0'] td[data-field='w1'] select");
      assert(plannerWorkerSelect, "Planner worker select missing");
      plannerWorkerSelect.value = "Worker B";
      change(plannerWorkerSelect);
      assert(getCurrentDayData().planningRows[0]?.w1 === "Worker B", "Planner row cell did not update state");
      assert(appState.hasUnsavedChanges === true, "Planner row cell did not mark unsaved");

      appState.binsData = {};
      ensureBinsDataForDate(appState.currentDate);
      renderBinsTable();
      const binSelect = document.querySelector("#binsTableBody select[data-idx='0'][data-field='totalAvailable']");
      assert(binSelect, "Bins totalAvailable select missing");
      binSelect.value = "7";
      change(binSelect);
      assert(getBinsDataForDate(appState.currentDate).rows[0].totalAvailable === 7, "Bins cell did not update state");
      assert(appState.hasUnsavedChanges === true, "Bins cell did not mark unsaved");
      stopServerSync();

      return {
        ok: true,
        siteSwitch,
        warehouse: {
          siteAStock: warehouseData.stock.item_A?.current || 5,
          siteBStockAfterAdjustment,
          siteBStoredStockAfterAdjustment,
        },
        saveAllDataConflict: { injectedConflict, statePostCount },
        tidplan: { comment: tidplanData[0].komentar, changed: tidplanDataChanged },
        planner: { row: getCurrentDayData().planningRows[0] },
        bins: { totalAvailable: getBinsDataForDate(appState.currentDate).rows[0].totalAvailable },
      };
    })()
  `;
}

(async () => {
  let server;
  let chrome;
  let cdp;
  let eventPoll;
  try {
    console.log("Starting temporary server...");
    server = startServer();
    let serverErr = "";
    server.stderr.on("data", (chunk) => {
      serverErr += chunk.toString();
    });
    await waitFor(async () => {
      const health = await requestJson(`http://127.0.0.1:${port}/api/health`);
      return health.ok === true;
    }, "server health");

    console.log("Starting headless Chrome...");
    chrome = startChrome();
    cdp = await connectCdp();
    console.log("Connected to Chrome page target.");

    const state409s = [];
    await cdp.send("Network.enable");
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    cdp.events.length = 0;
    eventPoll = setInterval(() => {
      for (const event of cdp.events.splice(0)) {
        if (event.method === "Network.responseReceived") {
          const response = event.params.response;
          if (response.url.includes("/api/state") && response.status === 409) {
            state409s.push(response.url);
          }
        }
      }
    }, 50);

    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/login` });
    await waitFor(() => evaluate(cdp, "document.readyState === 'complete'"), "page load");
    console.log("Running Phase 8 risk checkpoint flow...");
    const result = await evaluate(cdp, checkpointScript());
    clearInterval(eventPoll);
    eventPoll = null;

    console.log(JSON.stringify({ ok: true, result, networkState409s: state409s.length }, null, 2));
    if (serverErr.trim()) {
      console.error(serverErr.trim());
    }
  } finally {
    if (eventPoll) clearInterval(eventPoll);
    try { cdp?.ws?.close(); } catch (_) {}
    try { chrome?.kill(); } catch (_) {}
    try { server?.kill(); } catch (_) {}
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
