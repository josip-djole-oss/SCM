const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const runId = `site-isolation-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const profileDir = path.join(os.tmpdir(), runId, "chrome");
const port = 3407;
const debugPort = 9407;
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
      res.on("data", (chunk) => { body += chunk; });
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

async function waitFor(fn, label, timeoutMs = 15000) {
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
    BOOTSTRAP_ADMIN_EMAIL: "browser-test@cmax.test",
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
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result?.value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function siteScript() {
  return `
    (async () => {
      const wait = (predicate, label) => new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          try {
            if (predicate()) return resolve(true);
          } catch (_) {}
          if (Date.now() - start > 15000) return reject(new Error("timeout " + label));
          setTimeout(tick, 100);
        };
        tick();
      });

      await wait(() => typeof handleLogin === "function", "app scripts");
      console.log("flow: scripts ready");
      document.getElementById("loginEmail").value = "browser-test@cmax.test";
      document.getElementById("loginPassword").value = "testpass123";
      handleLogin();
      await wait(() => typeof appState !== "undefined" && appState.currentUser === "browser-test@cmax.test" && freshServerDataLoaded === true, "login");
      console.log("flow: logged in");

      const sync = async () => {
        const ok = await syncServerState({ includeSites: true, markAsClean: true, skipLog: true });
        if (!ok) throw new Error("sync failed");
        await new Promise((resolve) => setTimeout(resolve, 250));
      };
      const ensureSite = (site) => {
        if (!sites.includes(site)) {
          persistCurrentStateToLocalStorage();
          sites.push(site);
          markLocalSiteMutation();
          localStorage.setItem(SITES_KEY, JSON.stringify(sites));
          initializeSiteStorage(site);
        }
      };
      const go = (site) => switchSiteFromLocal(site, { syncSites: false });
      const setSitePayload = (site, marker) => {
        ensureSite(site);
        go(site);
        appState.workers = ["Worker " + marker];
        appState.lifts = ["Lift " + marker];
        appState.moments = ["Moment " + marker];
        appState.plans = ["Plan " + marker];
        appState.karnas = ["Karna " + marker];
        appState.dailyData = {};
        appState.resourceHistory = [];
        recordResourceAdded("workers", "Worker " + marker);
        recordResourceAdded("lifts", "Lift " + marker);
        recordResourceAdded("moments", "Moment " + marker);
        recordResourceAdded("plans", "Plan " + marker);
        recordResourceAdded("karnas", "Karna " + marker);
        tidplanData = [{
          plan: "Plan " + marker,
          zona: "Zona A",
          karna: "Karna " + marker,
          moment: "Moment " + marker,
          resursi: 1,
          start: "2026-05-04",
          end: "2026-05-05",
          komentar: "Tidplan " + marker,
          active: true,
        }];
        warehouseData = getDefaultWarehouseData();
        warehouseData.catalog = [{ id: "item_" + marker, name: "Warehouse " + marker, unit: "kom", minimum: 0, notifyPerson: "" }];
        warehouseData.stock = { ["item_" + marker]: { current: 1, totalIssued: 0, totalReceived: 1 } };
        persistCurrentStateToLocalStorage();
      };
      const summary = (site) => {
        const planner = JSON.parse(localStorage.getItem(getSiteStorageKey("cmax_planner_data", site)) || "{}");
        const tid = JSON.parse(localStorage.getItem(getSiteStorageKey("tidplan", site)) || "[]");
        const wh = JSON.parse(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", site)) || "{}");
        return {
          workers: planner.workers || [],
          lifts: planner.lifts || [],
          moments: planner.moments || [],
          plans: planner.plans || [],
          karnas: planner.karnas || [],
          tidplan: tid.map((entry) => entry.komentar || entry.plan || ""),
          warehouse: (wh.catalog || []).map((entry) => entry.name),
        };
      };
      const expectOnly = (site, marker) => {
        go(site);
        const s = summary(site);
        if (s.workers.join() !== "Worker " + marker) throw new Error(site + " workers wrong " + JSON.stringify(s));
        if (s.lifts.join() !== "Lift " + marker) throw new Error(site + " lifts wrong " + JSON.stringify(s));
        if (s.moments.join() !== "Moment " + marker) throw new Error(site + " moments wrong " + JSON.stringify(s));
        if (s.plans.join() !== "Plan " + marker) throw new Error(site + " plans wrong " + JSON.stringify(s));
        if (s.karnas.join() !== "Karna " + marker) throw new Error(site + " karnas wrong " + JSON.stringify(s));
        if (s.tidplan.join() !== "Tidplan " + marker) throw new Error(site + " tidplan wrong " + JSON.stringify(s));
        if (s.warehouse.join() !== "Warehouse " + marker) throw new Error(site + " warehouse wrong " + JSON.stringify(s));
      };

      sites = ["Site A"];
      markLocalSiteMutation();
      console.log("flow: set Site A");
      localStorage.setItem(SITES_KEY, JSON.stringify(sites));
      initializeSiteStorage("Site A");
      go("Site A");
      setSitePayload("Site A", "A");
      console.log("flow: Site A payload");
      ensureSite("Site B");
      go("Site B");
      const emptyB = summary("Site B");
      if (emptyB.workers.length || emptyB.lifts.length || emptyB.tidplan.length) {
        throw new Error("Site B was not empty: " + JSON.stringify(emptyB));
      }
      console.log("flow: Site B empty");
      setSitePayload("Site B", "B");
      console.log("flow: Site B payload");
      setSitePayload("Site C", "C");
      console.log("flow: Site C payload");
      await sync();
      console.log("flow: initial sync");

      expectOnly("Site A", "A");
      expectOnly("Site B", "B");
      console.log("flow: switch validation");
      expectOnly("Site C", "C");
      expectOnly("Site A", "A");
      expectOnly("Site B", "B");

      go("Site A");
      showConfirm = (_message, _title, _icon, onYes) => onYes();
      removeSite();
      await wait(() => !sites.includes("Site A"), "delete Site A");
      await sync();
      console.log("flow: deleted Site A");

      expectOnly("Site B", "B");
      expectOnly("Site C", "C");

      go("Site C");
      tidplanData = JSON.parse(localStorage.getItem(getSiteStorageKey("tidplan", "Site C")) || "[]");
      if (!tidplanData[0]) {
        throw new Error("Site C tidplan missing before edit: " + JSON.stringify(summary("Site C")));
      }
      tidplanData[0].komentar = "Tidplan C edited";
      persistCurrentStateToLocalStorage();
      await sync();
      console.log("flow: edited Site C");
      go("Site B");
      if (summary("Site B").tidplan.join() !== "Tidplan B") {
        throw new Error("Editing Site C changed Site B tidplan: " + JSON.stringify(summary("Site B")));
      }

      appState.workers.push("Worker B2");
      recordResourceAdded("workers", "Worker B2");
      persistCurrentStateToLocalStorage();
      await sync();
      console.log("flow: added Worker B2");
      go("Site C");
      if (summary("Site C").workers.includes("Worker B2")) {
        throw new Error("Adding resource in Site B leaked to Site C");
      }

      return { sitesBeforeReload: sites, siteBBeforeReload: summary("Site B"), siteCBeforeReload: summary("Site C") };
    })()
  `;
}

function reloadValidationScript() {
  return `
    (async () => {
      const wait = (predicate, label) => new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          try {
            if (predicate()) return resolve(true);
          } catch (_) {}
          if (Date.now() - start > 15000) return reject(new Error("timeout " + label));
          setTimeout(tick, 100);
        };
        tick();
      });
      await wait(() => typeof switchSiteFromLocal === "function" && freshServerDataLoaded === true, "reload app");
      const summary = (site) => {
        const planner = JSON.parse(localStorage.getItem(getSiteStorageKey("cmax_planner_data", site)) || "{}");
        const tid = JSON.parse(localStorage.getItem(getSiteStorageKey("tidplan", site)) || "[]");
        const wh = JSON.parse(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", site)) || "{}");
        return {
          workers: planner.workers || [],
          lifts: planner.lifts || [],
          moments: planner.moments || [],
          plans: planner.plans || [],
          karnas: planner.karnas || [],
          tidplan: tid.map((entry) => entry.komentar || entry.plan || ""),
          warehouse: (wh.catalog || []).map((entry) => entry.name),
        };
      };
      switchSiteFromLocal("Site B", { syncSites: false });
      const bAfterReload = summary("Site B");
      switchSiteFromLocal("Site C", { syncSites: false });
      const cAfterReload = summary("Site C");
      if (!bAfterReload.workers.includes("Worker B") || !bAfterReload.workers.includes("Worker B2")) {
        throw new Error("Site B did not persist after reload: " + JSON.stringify(bAfterReload));
      }
      if (cAfterReload.tidplan.join() !== "Tidplan C edited") {
        throw new Error("Site C did not persist edited tidplan after reload: " + JSON.stringify(cAfterReload));
      }
      if (sites.includes("Site A")) {
        throw new Error("Site A returned after reload");
      }
      return { sites, bAfterReload, cAfterReload };
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
    console.log("Connected to Chrome page target.");
    const state409s = [];
    const consoleMessages = [];
    await cdp.send("Network.enable");
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    cdp.events.length = 0;
    const eventPoll = setInterval(() => {
      for (const event of cdp.events.splice(0)) {
        if (event.method === "Network.responseReceived") {
          const response = event.params.response;
          if (response.url.includes("/api/state") && response.status === 409) {
            state409s.push(response.url);
          }
        }
        if (event.method === "Runtime.consoleAPICalled") {
          consoleMessages.push((event.params.args || []).map((arg) => arg.value || arg.description || "").join(" "));
        }
      }
    }, 50);

    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/login` });
    await waitFor(() => evaluate(cdp, "document.readyState === 'complete'"), "page load");
    console.log("Running browser Site A/B/C isolation flow...");
    const result = await evaluate(cdp, siteScript());
    console.log("Running hard refresh isolation verification...");
    await cdp.send("Page.reload", { ignoreCache: true });
    await delay(1000);
    const reloadResult = await evaluate(cdp, reloadValidationScript());
    await delay(1000);
    clearInterval(eventPoll);
    assert(state409s.length === 0, `Expected no /api/state 409s, saw ${state409s.length}`);
    console.log(JSON.stringify({ ok: true, result, reloadResult, state409s: state409s.length, siteScopeLogs: consoleMessages.filter((line) => line.includes("[site-scope]")).length }, null, 2));
  } finally {
    try { cdp?.ws?.close(); } catch (_) {}
    try { chrome?.kill(); } catch (_) {}
    try { server?.kill(); } catch (_) {}
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
