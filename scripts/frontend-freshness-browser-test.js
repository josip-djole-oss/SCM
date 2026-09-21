const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const runId = `frontend-freshness-${Date.now()}`;
const dataDir = path.join(os.tmpdir(), runId, "data");
const uploadDir = path.join(os.tmpdir(), runId, "uploads");
const profileDir = path.join(os.tmpdir(), runId, "chrome");
const port = Number(process.env.FRONTEND_BROWSER_PORT || 3417);
const debugPort = Number(process.env.FRONTEND_BROWSER_DEBUG_PORT || 9417);
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
    BACKUP_PATH: path.join(dataDir, "backups"),
    BCRYPT_ROUNDS: "4",
    API_RATE_LIMIT_MAX: "5000",
    BOOTSTRAP_ADMIN_EMAIL: "browser-test@cmax.test",
    BOOTSTRAP_ADMIN_PASSWORD: "testpass123",
    LOGIN_RATE_LIMIT_MAX: "100",
  };
  return childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: appRoot,
    env,
    windowsHide: true,
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
    windowsHide: true,
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
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result?.value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}


function seed() {
  const entry = (marker) => ({ planner: { workers: [marker], lifts: [], moments: [], plans: [], karnas: [], dailyData: {}, resourceHistory: {} }, bins: {}, tidplan: [], tidplanZones: [], warehouse: { catalog: [], logs: [], stock: {} }, store: { products: [], orders: [] }, reports: [], notifications: [], surveys: [] });
  const state = { version: 2, sites: ['Fresh A', 'Fresh B'], currentSite: 'Fresh A', siteData: { 'Fresh A': entry('AUTHORITATIVE_A'), 'Fresh B': entry('AUTHORITATIVE_B') }, projectModules: { 'Fresh A': { version: 1, modules: { store: false } }, 'Fresh B': { version: 1, modules: { store: true } } } };
  fs.writeFileSync(path.join(dataDir, 'state.json'), JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), data: state }));
}
function browserFlow() { return `
(async () => {
  const wait = async (predicate, label) => {
    const end = Date.now() + 20000;
    while (Date.now() < end) { if (predicate()) return; await new Promise(r => setTimeout(r, 100)); }
    throw new Error('Timeout: ' + label);
  };
  await wait(() => typeof handleLogin === 'function' && document.getElementById('loginEmail'), 'scripts');
  localStorage.setItem('cmax_planner_data_Fresh A', JSON.stringify({ workers: ['STALE_THREE_MONTHS'] }));
  localStorage.setItem('cmax_planner_data_Fresh B', JSON.stringify({ workers: ['STALE_OTHER_PROJECT'] }));
  const flashes = [];
  const monitor = setInterval(() => {
    if (document.getElementById('mainContainer').style.display !== 'none' && appState.workers.some(x => /STALE_/.test(x))) flashes.push([...appState.workers]);
  }, 1);
  document.getElementById('loginEmail').value = 'browser-test@cmax.test';
  document.getElementById('loginPassword').value = 'testpass123';
  handleLogin();
  await wait(() => freshServerDataLoaded && appState.currentUser === 'browser-test@cmax.test' && CMAX.projectModules.configuration, 'fresh login');
  if (!appState.workers.includes('AUTHORITATIVE_A')) throw new Error('Authoritative login data missing: ' + JSON.stringify(appState.workers));
  if (CMAX.projectModules.isEnabled('store')) throw new Error('Disabled Store is available on A');
  if (!(await switchSiteFromLocal('Fresh B'))) throw new Error('Project switch failed');
  if (!appState.workers.includes('AUTHORITATIVE_B') || !CMAX.projectModules.isEnabled('store')) throw new Error('Project B config/data mismatch');
  await CMAX.workwear.show();
  await wait(() => currentView === 'workwear', 'Store opened');
  const config = await CMAX.projectModules.request(currentSite);
  const saved = await CMAX.projectModules.request(currentSite, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({modules:{store:false},baseVersion:config.version}) });
  await wait(() => !CMAX.projectModules.isEnabled('store') && currentView !== 'workwear', 'SSE Store disabled and routed away');
  const direct = await fetch('/api/store?site=' + encodeURIComponent(currentSite));
  if (direct.status !== 403) throw new Error('Disabled direct API status ' + direct.status);
  await CMAX.workwear.show();
  if (currentView === 'workwear') throw new Error('Disabled Store reopened');
  const noticesBefore = JSON.parse(localStorage.getItem('cmax_account_notifications_browser-test@cmax.test') || '[]').filter(x => x.type === 'permissions').length;
  await resynchronizeApplication({notifyPermissions:false});
  const noticesAfter = JSON.parse(localStorage.getItem('cmax_account_notifications_browser-test@cmax.test') || '[]').filter(x => x.type === 'permissions').length;
  if (noticesBefore !== noticesAfter) throw new Error('Reconnect emitted permission notification');
  if (!(await switchSiteFromLocal('Fresh A'))) throw new Error('Return switch failed');
  clearInterval(monitor);
  if (flashes.length) throw new Error('Stale data was visibly rendered');
  return {flashCount:flashes.length,site:currentSite,workers:[...appState.workers],noticesBefore,noticesAfter,storeDisabled:!CMAX.projectModules.isEnabled('store')};
})()`; }
(async () => {
  seed(); let server, chrome, cdp; let serverLog = '';
  try {
    server = startServer();
    server.stderr.on('data', chunk => {serverLog += chunk;});
    await waitFor(async () => (await requestJson('http://127.0.0.1:' + port + '/api/health')).storageReady, 'server health', 45000);
    chrome = startChrome(); cdp = await connectCdp();
    await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Network.enable');
    await cdp.send('Page.navigate', {url:'http://127.0.0.1:' + port + '/login'});
    await waitFor(() => evaluate(cdp, "document.readyState === 'complete'"), 'page load');
    const flow = await evaluate(cdp, browserFlow());
    await evaluate(cdp, "localStorage.removeItem(AUTH_KEY); localStorage.setItem(getSiteStorageKey('cmax_planner_data',currentSite), JSON.stringify({workers:['STALE_RELOAD']}));");
    await cdp.send('Page.reload', {ignoreCache:true});
    await delay(500);
    await waitFor(() => evaluate(cdp, "typeof freshServerDataLoaded !== 'undefined' && freshServerDataLoaded && !!appState.currentUser"), 'cookie-only reload', 25000);
    const reload = await evaluate(cdp, "({site:currentSite,workers:appState.workers,ready:freshServerDataLoaded})");
    assert(reload.workers.includes('AUTHORITATIVE_A'), 'Cookie-only reload did not replace stale cache');
    const errors = cdp.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text);
    assert(!errors.length, 'Uncaught browser errors: ' + errors.join('\n'));
    console.log(JSON.stringify({ok:true, flow, reload, uncaughtErrors:errors},null,2));
  } catch (error) { console.error(serverLog); throw error; }
  finally { try {cdp?.ws?.close();} catch(_){} chrome?.kill(); server?.kill(); }
})().catch(error => {console.error(error.stack); process.exitCode = 1;});
