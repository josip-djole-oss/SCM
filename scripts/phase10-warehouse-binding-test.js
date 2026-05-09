#!/usr/bin/env node
/**
 * Phase 10: Warehouse mutation binding smoke test
 *
 * Covers:
 * 1) Warehouse import modal UI (open/close, chooser change, reset/cancel) without upload
 * 2) Warehouse stock form delegated change handlers + submit/cancel behavior
 * 3) Warehouse catalog add/limit/delete delegated flow
 * 4) Warehouse log filter/delete/clear delegated flow
 * 5) Generated warehouse controls bound via dispatcher (issue/procurement)
 */

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const runId = `phase10-ui-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const profileDir = path.join(os.tmpdir(), runId, "chrome");
const port = Number(process.env.PHASE10_PORT || 3550);
const debugPort = Number(process.env.PHASE10_DEBUG_PORT || 9550);
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
      BOOTSTRAP_ADMIN_EMAIL: "phase10@cmax.test",
      BOOTSTRAP_ADMIN_PASSWORD: "testpass123",
      LOGIN_RATE_LIMIT_MAX: "100",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function startChrome() {
  return childProcess.spawn(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      "--disable-gpu",
      "--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
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
      if (text) console.log(`[browser] ${text}`);
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

      await wait(() => typeof handleLogin === "function" && window.CMAX && CMAX.events, "scripts");
      document.getElementById("loginEmail").value = "phase10@cmax.test";
      document.getElementById("loginPassword").value = "testpass123";
      handleLogin();
      await wait(() => appState?.currentUser === "phase10@cmax.test" && freshServerDataLoaded === true, "login");

      appState.isReadonly = false;
      appState.isAdmin = true;
      appState.isSuperAdmin = true;
      appState.currentDate = "2026-05-09";
      currentView = "main";
      sites = ["Site A"];
      currentSite = "Site A";
      localStorage.setItem(SITES_KEY, JSON.stringify(sites));
      localStorage.setItem(CURRENT_SITE_KEY, currentSite);
      initializeSiteStorage(currentSite);
      updateScopedStorageKeysForCurrentSite();
      appState.workers = ["Worker A", "Worker B"];
      appState.lifts = ["Lift A"];
      appState.moments = ["Moment A"];
      appState.plans = ["Plan A"];
      appState.karnas = ["Karna A"];
      appState.dailyData = {
        "2026-05-09": {
          workerAttendance: {},
          liftAvailability: {},
          liftPlans: {},
          planningRows: [{ w1: "Worker A" }],
        },
      };

      warehouseData = getDefaultWarehouseData();
      warehouseData.catalog = [
        { id: "item_A", name: "Tool A", unit: "kom", minimum: 2, notifyPerson: "" },
        { id: "item_B", name: "Material B", unit: "pcs", minimum: 1, notifyPerson: "" },
      ];
      warehouseData.stock = {
        item_A: { current: 10, totalIssued: 0, totalReceived: 10 },
        item_B: { current: 5, totalIssued: 0, totalReceived: 5 },
      };
      warehouseData.logs = [
        {
          id: "log_A",
          timestamp: new Date().toISOString(),
          type: "stock",
          worker: "Worker A",
          itemId: "item_A",
          itemName: "Tool A",
          quantity: 1,
          direction: "in",
          comment: "seed",
          balanceAfter: 10,
          performedBy: "phase10@cmax.test",
        },
        {
          id: "log_B",
          timestamp: new Date().toISOString(),
          type: "issue",
          worker: "Worker B",
          itemId: "item_B",
          itemName: "Material B",
          quantity: 1,
          direction: "out",
          comment: "seed-2",
          balanceAfter: 4,
          performedBy: "phase10@cmax.test",
        },
      ];
      warehouseData.stockForm = { itemId: "item_A", quantity: 1, direction: "in", comment: "" };
      appState.binsData = {};
      ensureBinsDataForDate(appState.currentDate);
      persistCurrentStateToLocalStorage();
      await syncServerState({ includeSites: true, markAsClean: true, skipLog: true });
      stopServerSync();

      document.getElementById("btnWarehouse").click();
      await wait(() => currentView === "warehouse", "warehouse view");

      const stockItem = document.getElementById("warehouseStockItem");
      const stockDir = document.getElementById("warehouseStockDirection");
      const stockQty = document.getElementById("warehouseStockQuantity");
      const stockComment = document.getElementById("warehouseStockComment");
      assert(stockItem.dataset.cmaxAction === "warehouse.updateStockFormFromEvent", "stock item action missing");
      assert(stockDir.dataset.cmaxAction === "warehouse.updateStockFormFromEvent", "stock direction action missing");
      assert(stockQty.dataset.cmaxAction === "warehouse.updateStockFormFromEvent", "stock quantity action missing");
      assert(stockComment.dataset.cmaxAction === "warehouse.updateStockFormFromEvent", "stock comment action missing");

      const issueWorker = document.querySelector('[data-cmax-action="warehouse.updateIssueDraftWorker"]');
      const issueSlotItem = document.querySelector('[data-cmax-action="warehouse.updateIssueDraftSlotItem"]');
      const issueSlotQty = document.querySelector('[data-cmax-action="warehouse.updateIssueDraftSlotQuantity"]');
      const issueComment = document.querySelector('[data-cmax-action="warehouse.updateIssueDraftComment"]');
      const issueSave = document.querySelector('[data-cmax-action="warehouse.saveIssueRow"]');
      assert(issueWorker && issueSlotItem && issueSlotQty && issueComment && issueSave, "issue row generated dispatcher bindings missing");

      const procurementToggle = document.querySelector('#warehouseProcurementOptions input[type="checkbox"]');
      if (procurementToggle) {
        assert(procurementToggle.dataset.cmaxAction === "warehouse.toggleProcurementUser", "procurement checkbox action missing");
      }

      const initialItemA = warehouseData.stock.item_A.current;
      stockItem.value = "item_A";
      stockItem.dispatchEvent(new Event("change", { bubbles: true }));
      stockDir.value = "out";
      stockDir.dispatchEvent(new Event("change", { bubbles: true }));
      stockQty.value = "2";
      stockQty.dispatchEvent(new Event("change", { bubbles: true }));
      stockComment.value = "pending-cancel";
      stockComment.dispatchEvent(new Event("change", { bubbles: true }));
      assert(warehouseData.stockForm.quantity === 2, "stock form quantity delegated change failed");
      assert(warehouseData.stockForm.comment === "pending-cancel", "stock form comment delegated change failed");

      document.querySelector('#warehouse-section [data-cmax-action="tidplan.showPlanner"]').click();
      await wait(() => currentView === "main", "back to planner from warehouse");
      document.getElementById("btnWarehouse").click();
      await wait(() => currentView === "warehouse", "warehouse reopen");
      assert(warehouseData.stock.item_A.current === initialItemA, "stock changed without submit");

      document.getElementById("warehouseStockItem").value = "item_A";
      document.getElementById("warehouseStockItem").dispatchEvent(new Event("change", { bubbles: true }));
      document.getElementById("warehouseStockDirection").value = "out";
      document.getElementById("warehouseStockDirection").dispatchEvent(new Event("change", { bubbles: true }));
      document.getElementById("warehouseStockQuantity").value = "3";
      document.getElementById("warehouseStockQuantity").dispatchEvent(new Event("change", { bubbles: true }));
      document.getElementById("warehouseStockComment").value = "submit-ok";
      document.getElementById("warehouseStockComment").dispatchEvent(new Event("change", { bubbles: true }));
      const logsBeforeSubmit = warehouseData.logs.length;
      document.getElementById("warehouseStockSaveBtn").click();
      assert(warehouseData.stock.item_A.current === initialItemA - 3, "stock submit did not change inventory");
      assert(warehouseData.logs.length === logsBeforeSubmit + 1, "stock submit did not append log");

      document.getElementById("btnWarehouseExportImport").click();
      document.getElementById("btnWarehouseImportExcel").click();
      await wait(() => document.getElementById("moduleImportModal").style.display === "flex", "module import modal open");
      const importInput = document.getElementById("moduleImportFile");
      const importState = document.getElementById("moduleImportFileState");
      assert(importInput.dataset.cmaxAction === "importExport.handleImportFileChange", "module import file chooser action missing");
      assert(importState && importState.textContent.includes("Nije odabrana"), "import state reset text missing");

      const dt = new DataTransfer();
      dt.items.add(new File(["x"], "warehouse-phase10.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      importInput.files = dt.files;
      importInput.dispatchEvent(new Event("change", { bubbles: true }));
      assert(importState.textContent.includes("warehouse-phase10.xlsx"), "import chooser change did not update UI state");
      document.querySelector('#moduleImportModal [data-cmax-action="importExport.resetImportFile"]').click();
      assert(importState.textContent.includes("Nije odabrana"), "import reset did not reset UI state");
      assert(importInput.files.length === 0, "import reset did not clear file input");

      const dt2 = new DataTransfer();
      dt2.items.add(new File(["x"], "warehouse-phase10-2.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      importInput.files = dt2.files;
      importInput.dispatchEvent(new Event("change", { bubbles: true }));
      document.querySelector('#moduleImportModal [data-cmax-action="importExport.closeImportModal"]').click();
      await wait(() => document.getElementById("moduleImportModal").style.display === "none", "module import modal close");
      assert(importState.textContent.includes("Nije odabrana"), "import cancel did not reset UI state");

      const oldPrompt = showPromptDialog;
      const oldConfirm = showConfirm;
      const promptQueue = ["Phase10 Added Item", "kg", "7"];
      showPromptDialog = (_message, _icon, _defaultValue, onSubmit) => {
        onSubmit(promptQueue.shift() || "");
      };
      showConfirm = (_message, _title, _icon, onYes) => onYes();

      document.getElementById("warehouseCatalogAddBtn").click();
      const added = warehouseData.catalog.find((item) => item.name === "Phase10 Added Item");
      assert(added, "catalog add flow failed");

      renderWarehousePage();
      const limitBtn = Array.from(document.querySelectorAll('[data-cmax-action="warehouse.setCatalogItemLimit"]')).find((btn) => {
        const args = JSON.parse(btn.getAttribute("data-cmax-args") || "[]");
        return args[0] === added.id;
      });
      assert(limitBtn, "catalog limit button for added item missing");
      limitBtn.click();
      assert((warehouseData.catalog.find((item) => item.id === added.id)?.minimum || 0) === 7, "catalog limit edit flow failed");

      renderWarehousePage();
      const removeBtn = Array.from(document.querySelectorAll('[data-cmax-action="warehouse.removeCatalogItem"]')).find((btn) => {
        const args = JSON.parse(btn.getAttribute("data-cmax-args") || "[]");
        return args[0] === added.id;
      });
      assert(removeBtn, "catalog remove button for added item missing");
      removeBtn.click();
      assert(!warehouseData.catalog.some((item) => item.id === added.id), "catalog delete flow failed");
      showPromptDialog = oldPrompt;
      showConfirm = oldConfirm;

      document.getElementById("warehouseNavLogsBtn").click();
      await wait(() => currentView === "warehouseLogs", "warehouse logs open");
      document.getElementById("warehouseLogItem").value = "Tool A";
      document.getElementById("warehouseApplyLogFiltersBtn").click();
      assert(warehouseLogFilterState.filterItem === "Tool A", "warehouse log filter apply failed");
      document.getElementById("warehouseResetLogFiltersBtn").click();
      assert(warehouseLogFilterState.filterItem === "", "warehouse log filter reset failed");

      showConfirm = (_message, _title, _icon, onYes) => onYes();
      renderWarehouseLogsPage();
      let deleteBtn = document.querySelector('[data-cmax-action="warehouse.deleteLog"]');
      assert(deleteBtn, "warehouse delete log button missing");
      const deleteArgs = JSON.parse(deleteBtn.getAttribute("data-cmax-args") || "[]");
      assert(deleteArgs.length === 1 && typeof deleteArgs[0] === "string", "warehouse delete log args are not valid JSON args");
      const logsBeforeDelete = warehouseData.logs.length;
      deleteBtn.click();
      assert(warehouseData.logs.length === logsBeforeDelete - 1, "warehouse delete log flow failed");

      if (!warehouseData.logs.length) {
        warehouseData.logs.push({
          id: "log_clear_seed",
          timestamp: new Date().toISOString(),
          type: "stock",
          worker: "Worker A",
          itemId: "item_A",
          itemName: "Tool A",
          quantity: 1,
          direction: "in",
          comment: "seed-clear",
          balanceAfter: warehouseData.stock.item_A.current,
          performedBy: "phase10@cmax.test",
        });
      }
      renderWarehouseLogsPage();
      document.getElementById("warehouseClearLogsBtn").click();
      assert(warehouseData.logs.length === 0, "warehouse clear logs flow failed");
      showConfirm = oldConfirm;

      const warehouseInline = document.querySelectorAll("#warehouse-section [onclick], #warehouse-section [onchange], #warehouse-section [onsubmit], #warehouse-section [oninput], #warehouse-section [onerror]").length;
      const importModalInline = document.querySelectorAll("#moduleImportModal [onclick], #moduleImportModal [onchange], #moduleImportModal [onsubmit], #moduleImportModal [oninput], #moduleImportModal [onerror]").length;
      assert(warehouseInline === 0, "warehouse section still has inline handlers");
      assert(importModalInline === 0, "module import modal still has inline handlers");

      const totalInline = document.querySelectorAll("[onclick],[onchange],[onsubmit],[oninput],[onerror]").length;
      return {
        ok: true,
        warehouseInline,
        importModalInline,
        totalInline,
        remainingInlineIds: Array.from(document.querySelectorAll("[onclick],[onchange],[onsubmit],[oninput],[onerror]"))
          .map((el) => ({ id: el.id || null, onclick: el.getAttribute("onclick"), onchange: el.getAttribute("onchange") })),
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
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/login` });
    await waitFor(() => evaluate(cdp, "document.readyState === 'complete'"), "page load");

    console.log("Running Phase 10 warehouse binding smoke...");
    const result = await evaluate(cdp, smokeScript());
    if (!result?.ok) {
      throw new Error("Phase 10 smoke returned non-ok result");
    }
    console.log(JSON.stringify({ ok: true, result }, null, 2));
    if (serverErr.trim()) {
      console.error(serverErr.trim());
    }
  } finally {
    try {
      cdp?.ws?.close();
    } catch (_) {}
    try {
      chrome?.kill();
    } catch (_) {}
    try {
      server?.kill();
    } catch (_) {}
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
