const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const runId = `ui-shots-${Date.now()}`;
const rootTmp = path.join(os.tmpdir(), runId);
const dataDir = path.join(rootTmp, "data");
const uploadDir = path.join(rootTmp, "uploads");
const profileDir = path.join(rootTmp, "chrome");
const shotsDir = path.join(appRoot, "tmp", "screenshots");
const port = Number(process.env.SHOTS_PORT || 3651);
const debugPort = Number(process.env.SHOTS_DEBUG_PORT || 9651);
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(shotsDir, { recursive: true });

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

async function waitFor(fn, label, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (_) {}
    await delay(120);
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
      BOOTSTRAP_ADMIN_EMAIL: "shots@cmax.test",
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

async function capture(cdp, filename) {
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    fromSurface: true,
  });
  const outPath = path.join(shotsDir, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
  console.log(outPath);
  return outPath;
}

async function main() {
  let server;
  let chrome;
  let cdp;
  try {
    server = startServer();
    server.stdout.on("data", () => {});
    server.stderr.on("data", () => {});
    await waitFor(async () => {
      try {
        const res = await requestJson(`http://127.0.0.1:${port}/api/health`);
        return res && (res.ok === true || res.storageReady === true || res.storage?.ready === true);
      } catch (_) {
        return false;
      }
    }, "server health", 30000);

    chrome = startChrome();
    chrome.stdout.on("data", () => {});
    chrome.stderr.on("data", () => {});

    cdp = await connectCdp();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1536,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/login` });
    await waitFor(() => evaluate(cdp, "document.readyState === 'complete'"), "page ready");

    await evaluate(
      cdp,
      `(() => {
        document.getElementById('loginEmail').value = 'shots@cmax.test';
        document.getElementById('loginPassword').value = 'testpass123';
        CMAX.core.login();
        return true;
      })()`
    );

    await waitFor(() => evaluate(cdp, "document.getElementById('mainContainer')?.style.display === 'block'"), "main container");
    await waitFor(() => evaluate(cdp, "currentView === 'home'"), "home view");
    await delay(350);

    await capture(cdp, "01-home-after-login.png");

    await evaluate(cdp, "CMAX.tidplan.showPlanner(); true;");
    await waitFor(() => evaluate(cdp, "currentView === 'main'"), "planner view");
    await delay(350);
    await capture(cdp, "02-planner.png");

    await evaluate(cdp, "CMAX.tidplan.show(); true;");
    await waitFor(() => evaluate(cdp, "currentView === 'tidplan'"), "tidplan view");
    await delay(350);
    await capture(cdp, "03-tidplan.png");

    await evaluate(cdp, "CMAX.warehouse.show(); true;");
    await waitFor(() => evaluate(cdp, "currentView === 'warehouse'"), "warehouse view");
    await delay(350);
    await capture(cdp, "04-skladiste.png");

    await evaluate(cdp, "CMAX.notifications.show(); true;");
    await waitFor(() => evaluate(cdp, "currentView === 'notifications'"), "notifications view");
    await delay(350);
    await capture(cdp, "05-obavijesti.png");

    await evaluate(cdp, "CMAX.surveys.show(); true;");
    await waitFor(() => evaluate(cdp, "currentView === 'surveys'"), "surveys view");
    await delay(350);
    await capture(cdp, "06-ankete-pitanja.png");

    await evaluate(cdp, "CMAX.admin.open(); true;");
    await waitFor(() => evaluate(cdp, "document.getElementById('adminModal')?.style.display === 'flex'"), "admin modal");
    await delay(350);
    await capture(cdp, "07-admin-panel.png");

    await evaluate(cdp, "CMAX.admin.close(); true;");
    await delay(200);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await evaluate(cdp, "CMAX.core.showHome(); true;");
    await waitFor(() => evaluate(cdp, "currentView === 'home'"), "mobile home");
    await delay(450);
    await capture(cdp, "08-mobile-home.png");

    console.log(`DONE:${shotsDir}`);
  } finally {
    if (cdp && cdp.ws) cdp.ws.close();
    if (chrome && !chrome.killed) chrome.kill("SIGKILL");
    if (server && !server.killed) server.kill("SIGKILL");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
