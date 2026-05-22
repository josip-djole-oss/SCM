const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.STATE_NORMALIZATION_TEST_PORT || 3298);
const HOST = `http://127.0.0.1:${PORT}`;
const USER = { email: "state-normalize@cmax.test", password: "StateNormalize!123" };
const SITE = "Legacy Site";
const DATE = "2026-05-22";

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function envelope(data, version = 1) { return { version, updatedAt: new Date().toISOString(), data }; }
function parseCookie(setCookieHeader) {
  const value = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(value || "").split(";")[0];
}
function assert(condition, message) { if (!condition) throw new Error(message); }

async function waitHealth() {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    try {
      const res = await fetch(`${HOST}/api/health`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.ok && payload.storageReady) return;
    } catch (_) {}
    await delay(250);
  }
  throw new Error("Server did not become healthy");
}

async function login() {
  const res = await fetch(`${HOST}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: USER.email, password: USER.password }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${JSON.stringify(payload)}`);
  return { cookie: parseCookie(typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : res.headers.get("set-cookie")), csrf: payload.csrfToken };
}

async function api(session, pathname, options = {}) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers || {});
  headers.set("Cookie", session.cookie);
  if (options.json !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) headers.set("x-csrf-token", session.csrf);
  const res = await fetch(`${HOST}${pathname}`, { method, headers, body: options.json !== undefined ? JSON.stringify(options.json) : options.body });
  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch (_) { payload = { raw: text }; }
  return { ok: res.ok, status: res.status, payload };
}

function legacyState() {
  return {
    version: 1,
    sites: [SITE],
    currentSite: SITE,
    workers: ["Legacy Worker"],
    lifts: [],
    moments: [],
    plans: ["Legacy Plan"],
    karnas: [],
    dailyData: {
      [DATE]: {
        planningRows: [{ id: "legacy-row-1", worker: "Legacy Worker", plan: "Legacy Plan", comment: "legacy keep", rowVersion: 1, fieldVersions: {} }],
      },
    },
    tidplan: [{ id: "legacy-activity-1", plan: "Legacy Activity", komentar: "tid keep", activityVersion: 1, fieldVersions: {} }],
    warehouse: { catalog: [{ id: "legacy-wh", name: "Legacy Item" }], stock: {}, logs: [] },
    accountNotifications: {},
  };
}

async function runScenario(name, rawStateEnvelopeFactory) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `cmax-state-normalize-${name}-`));
  const dataDir = path.join(tmp, "data");
  const uploadDir = path.join(tmp, "uploads");
  const backupDir = path.join(tmp, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([{
    email: USER.email,
    password: USER.password,
    fullName: "State Normalize",
    isSuperAdmin: true,
    level: 6,
    active: true,
    permissions: {},
    allowedSites: null,
    storeRoles: ["superadmin"],
  }]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(rawStateEnvelopeFactory(), null, 2));

  const server = spawn(process.execPath, ["server/server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test", STORAGE_TYPE: "json", DATA_PATH: dataDir, UPLOAD_PATH: uploadDir, BACKUP_PATH: backupDir, BOOTSTRAP_ADMIN_EMAIL: USER.email, BOOTSTRAP_ADMIN_PASSWORD: USER.password, LOGIN_RATE_LIMIT_MAX: "100" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitHealth();
    const session = await login();
    const stateRes = await api(session, "/api/state");
    assert(stateRes.ok, `${name}: /api/state failed ${stateRes.status}`);
    const state = stateRes.payload.state;
    assert(state && state.version === 2, `${name}: /api/state did not return version 2 state: ${JSON.stringify(stateRes.payload).slice(0, 500)}`);
    assert(Array.isArray(state.sites) && state.sites.length >= 1, `${name}: sites missing`);
    assert(state.siteData && typeof state.siteData === "object", `${name}: siteData missing`);
    const site = state.sites.includes(SITE) ? SITE : state.sites[0];
    assert(state.siteData[site] && typeof state.siteData[site] === "object", `${name}: site entry missing`);

    const moduleRes = await api(session, "/api/state/module", {
      method: "POST",
      json: {
        target: "warehouse",
        siteId: site,
        baseVersion: state.moduleVersions?.warehouse?.[site] || 1,
        payload: { warehouse: { catalog: [{ id: "new-wh", name: "New Item" }], stock: {}, logs: [] } },
      },
    });
    assert(moduleRes.ok, `${name}: module save failed ${moduleRes.status} ${JSON.stringify(moduleRes.payload)}`);
    const after = (await api(session, "/api/state")).payload.state;
    assert(after.version === 2, `${name}: module save broke state version`);
    assert(after.siteData[site]?.warehouse?.catalog?.some((item) => item.id === "new-wh"), `${name}: warehouse module save missing`);
    return { name, site, version: stateRes.payload.version, bodyExample: { version: state.version, sites: state.sites, siteDataKeys: Object.keys(state.siteData) } };
  } finally {
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(4000)]);
    if (!server.killed) server.kill("SIGKILL");
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function main() {
  const checks = [];
  checks.push(await runScenario("embedded-envelope", () => envelope(envelope(legacyState(), 9), 3)));
  checks.push(await runScenario("json-null", () => envelope(null, 4)));
  checks.push(await runScenario("legacy-top-level", () => envelope(legacyState(), 5)));
  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
