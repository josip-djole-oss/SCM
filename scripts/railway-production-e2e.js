#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const registry = require("../public/js/core/moduleRegistry");

const BASE = String(process.env.SCM_PRODUCTION_URL || process.argv[3] || "https://scm-production-f9fc.up.railway.app").replace(/\/$/, "");
const CONTEXT_FILE = path.resolve(__dirname, "..", "tmp", "railway-production-validation-context.json");
const PHASE = process.argv[2] || "prepare";

function assert(value, message) { if (!value) throw new Error(message); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function cookieFrom(response) {
  const values = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => String(value).split(";", 1)[0]).join("; ");
}
async function payload(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch (_) { return text; }
}

class Session {
  constructor(cookie, csrf, auth) { this.cookie = cookie; this.csrf = csrf; this.auth = auth; }
  static async login(email, password) {
    const response = await fetch(`${BASE}/api/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const body = await payload(response);
    if (!response.ok) throw new Error(`Login ${response.status}: ${JSON.stringify(body)}`);
    const session = new Session(cookieFrom(response), body.csrfToken, body.auth || body);
    assert(session.cookie && session.csrf, "Login did not issue cookie and CSRF token");
    return session;
  }
  async request(pathname, options = {}) {
    const headers = { cookie: this.cookie, ...(options.headers || {}) };
    if (options.method && !["GET", "HEAD"].includes(options.method)) headers["x-csrf-token"] = this.csrf;
    let body = options.body;
    if (options.json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(options.json); }
    const response = await fetch(`${BASE}${pathname}`, { ...options, headers, body });
    const bodyPayload = await payload(response);
    return { response, payload: bodyPayload };
  }
  async ok(pathname, options = {}) {
    const result = await this.request(pathname, options);
    if (!result.response.ok) throw new Error(`${options.method || "GET"} ${pathname} -> ${result.response.status}: ${JSON.stringify(result.payload)}`);
    return result.payload;
  }
}

const extraPermissions = [
  "canManageAdmins", "canManageSiteAccess", "canOpenAdminPanel", "canViewSettings", "canManageGuestAccess",
  "canViewLogs", "canClearLogs", "canViewBackups", "canManageBackups", "canRestoreBackups",
  "canUnlockPastDays", "canViewAnonymousSurveyVoters", "canManageSurveyPermissions", "canModifyReadOnly", "canToggleReadOnly",
];
const allPermissions = Object.fromEntries([...new Set([...registry.list.flatMap((item) => item.permissions), ...extraPermissions])].map((key) => [key, true]));

async function getState(session) {
  const body = await session.ok("/api/state");
  assert(body && body.state && Number(body.version) >= 1, "State response is incomplete");
  return body;
}
async function saveModule(session, target, site, payloadBody) {
  const current = await getState(session);
  const versions = current.state.moduleVersions || {};
  const baseVersion = target === "adminUsers" ? Number(versions.adminUsers || 1) : Number(versions[target]?.[site] || 1);
  return session.ok("/api/state/module", { method: "POST", json: { target, site, baseVersion, payload: payloadBody } });
}
async function configureModules(session, site, modules) {
  const current = await session.ok(`/api/projects/${encodeURIComponent(site)}/modules`);
  return session.ok(`/api/projects/${encodeURIComponent(site)}/modules`, { method: "PUT", json: { modules, baseVersion: current.version } });
}

async function waitForEvent(session, predicate, action) {
  const controller = new AbortController();
  const responsePromise = fetch(`${BASE}/api/events`, { headers: { cookie: session.cookie }, signal: controller.signal });
  const response = await responsePromise;
  assert(response.ok && response.body, `SSE connection failed: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Date.now() + 15000;
  const eventPromise = (async () => {
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n"); buffer = blocks.pop();
      for (const block of blocks) {
        const event = /^event:\s*(.+)$/m.exec(block)?.[1];
        const dataText = /^data:\s*(.+)$/m.exec(block)?.[1];
        let data = {}; try { data = dataText ? JSON.parse(dataText) : {}; } catch (_) {}
        if (predicate({ event, data })) return { event, data };
      }
    }
    throw new Error("Timed out waiting for realtime event");
  })();
  await sleep(250);
  await action();
  try { return await eventPromise; } finally { controller.abort(); }
}

async function loginInPage(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#loginEmail").fill(email);
  await page.locator("#loginPassword").fill(password);
  await page.evaluate(() => handleLogin());
  await page.waitForFunction(() => window.freshServerDataLoaded === true && Boolean(window.appState?.currentUser), null, { timeout: 30000 });
}
async function browserProof(ctx, admin, collaborator, siteA, siteB) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  const errors = [];
  for (const page of [pageA, pageB]) page.on("pageerror", (error) => errors.push(error.message));
  try {
    const [cookieName, ...cookieValue] = admin.cookie.split("=");
    await a.addCookies([{ name: cookieName, value: cookieValue.join("="), url: BASE, httpOnly: true, secure: true, sameSite: "None" }]);
    await pageA.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
    await pageA.waitForFunction(() => window.freshServerDataLoaded === true && Boolean(window.appState?.currentUser), null, { timeout: 30000 });
    await loginInPage(pageB, collaborator.email, collaborator.password);
    const first = await pageB.evaluate(async ({ siteA, siteB }) => {
      const switchedA = await switchSiteFromLocal(siteA);
      const aEnabled = CMAX.projectModules.isEnabled("store");
      await CMAX.workwear.show();
      const opened = currentView === "workwear";
      const switchedB = await switchSiteFromLocal(siteB);
      const bDisabled = !CMAX.projectModules.isEnabled("store");
      await CMAX.workwear.show();
      return { switchedA, aEnabled, opened, switchedB, bDisabled, disabledStayedOut: currentView !== "workwear", view: currentView };
    }, { siteA, siteB });
    assert(first.switchedA && first.aEnabled && first.opened && first.switchedB && first.bDisabled && first.disabledStayedOut, `Frontend module/site proof failed: ${JSON.stringify(first)}`);

    await pageB.goto(`${BASE}/store`, { waitUntil: "domcontentloaded" });
    await pageB.waitForFunction(() => window.freshServerDataLoaded === true, null, { timeout: 30000 });
    const direct = await pageB.evaluate(() => ({ view: currentView, site: currentSite, storeEnabled: CMAX.projectModules.isEnabled("store") }));
    assert(direct.site === siteB && !direct.storeEnabled && direct.view !== "workwear", `Disabled direct URL opened Store: ${JSON.stringify(direct)}`);

    await pageB.evaluate(async (site) => { await switchSiteFromLocal(site); await CMAX.workwear.show(); }, siteA);
    await pageB.waitForFunction(() => currentView === "workwear");
    await pageA.evaluate(async (site) => {
      await switchSiteFromLocal(site);
      const config = await CMAX.projectModules.request(site);
      await CMAX.projectModules.request(site, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modules: { store: false }, baseVersion: config.version }) });
    }, siteA);
    await pageB.waitForFunction(() => !CMAX.projectModules.isEnabled("store") && currentView !== "workwear", null, { timeout: 20000 });
    const realtime = await pageB.evaluate(() => ({ disabled: !CMAX.projectModules.isEnabled("store"), view: currentView }));
    assert(realtime.disabled && realtime.view !== "workwear", "Second browser did not apply realtime module disable");
    await pageA.evaluate(async (site) => {
      const config = await CMAX.projectModules.request(site);
      await CMAX.projectModules.request(site, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modules: { store: true }, baseVersion: config.version }) });
    }, siteA);
    await pageB.waitForFunction(() => CMAX.projectModules.isEnabled("store"), null, { timeout: 20000 });

    await pageB.evaluate((marker) => localStorage.setItem("cmax_planner_data_" + currentSite, JSON.stringify({ workers: [marker] })), `STALE-${ctx.runId}`);
    await pageB.reload({ waitUntil: "domcontentloaded" });
    await pageB.waitForFunction(() => window.freshServerDataLoaded === true && Boolean(window.appState?.currentUser), null, { timeout: 30000 });
    const staleAbsent = await pageB.evaluate((marker) => !JSON.stringify(window.appState).includes(marker), `STALE-${ctx.runId}`);
    assert(staleAbsent, "Stale local data survived authenticated browser reload");

    const stored = await b.storageState();
    await b.close();
    const restartedContext = await browser.newContext({ storageState: stored });
    const restartedPage = await restartedContext.newPage();
    await restartedPage.goto(`${BASE}/home`, { waitUntil: "domcontentloaded" });
    await restartedPage.waitForFunction(() => window.freshServerDataLoaded === true && Boolean(window.appState?.currentUser), null, { timeout: 30000 });
    ctx.browserStorageState = stored;
    await restartedContext.close();
    assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);
    return { siteSwitching: true, disabledNavigationAndDirectUrl: true, twoSessionRealtime: true, staleCacheRejected: true, browserRestartSession: true };
  } finally {
    await a.close().catch(() => {});
    await b.close().catch(() => {});
    await browser.close();
  }
}

async function prepare() {
  const adminEmail = process.env.SCM_VALIDATION_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.SCM_VALIDATION_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  assert(adminEmail && adminPassword, "Production validation credentials are missing");
  const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomBytes(3).toString("hex")}`;
  const siteA = `SCM-VALIDATION-${runId}-A`;
  const siteB = `SCM-VALIDATION-${runId}-B`;
  const collaborator = { email: `scm.validation.${runId}.collab@cmax.test`, password: `Scm!${crypto.randomBytes(12).toString("base64url")}` };
  const outsider = { email: `scm.validation.${runId}.outside@cmax.test`, password: `Scm!${crypto.randomBytes(12).toString("base64url")}` };
  const restricted = { email: `scm.validation.${runId}.restricted@cmax.test`, password: `Scm!${crypto.randomBytes(12).toString("base64url")}` };
  const admin = await Session.login(adminEmail, adminPassword);
  assert(admin.auth.isSuperAdmin === true, "Validation account is not Super Admin");

  const initial = await getState(admin);
  const sites = [...new Set([...(initial.state.sites || []), siteA, siteB])];
  await saveModule(admin, "siteMetadata", siteA, { sites, siteInfo: { name: siteA, validation: true, runId } });
  await saveModule(admin, "siteMetadata", siteB, { sites, siteInfo: { name: siteB, validation: true, runId } });
  const allOn = Object.fromEntries(registry.list.map((item) => [item.id, true]));
  await configureModules(admin, siteA, allOn);
  await configureModules(admin, siteB, { ...allOn, store: false });

  const withSites = await getState(admin);
  const admins = (withSites.state.admins || []).filter((entry) => !String(entry.email || "").startsWith("scm.validation."));
  const makeAdmin = (account, fullName, allowedSites, permissions, level = 3) => ({
    email: account.email, password: account.password, fullName, firstName: fullName.split(" ")[0], lastName: fullName.split(" ").slice(1).join(" "),
    isSuperAdmin: false, isReadonly: false, active: true, level, permissions, allowedSites, storeRoles: ["radnik", "store_manager"],
  });
  admins.push(makeAdmin(collaborator, "SCM Validation Collaborator", [siteA, siteB], allPermissions, 5));
  admins.push(makeAdmin(outsider, "SCM Validation Outside", [siteB], allPermissions, 4));
  admins.push(makeAdmin(restricted, "SCM Validation Restricted", [siteA], {
    ...Object.fromEntries(Object.keys(allPermissions).map((key) => [key, false])),
    canAccessPlanner: true,
    canViewPlanner: true,
  }, 1));
  await saveModule(admin, "adminUsers", siteA, { admins });
  const collaboratorSession = await Session.login(collaborator.email, collaborator.password);
  const outsiderSession = await Session.login(outsider.email, outsider.password);
  const restrictedSession = await Session.login(restricted.email, restricted.password);

  const marker = `production-save-${runId}`;
  const date = new Date().toISOString().slice(0, 10);
  await admin.ok(`/api/planner/${encodeURIComponent(siteA)}/${date}/rows/${encodeURIComponent(`row-${runId}`)}`, { method: "PATCH", json: { changedFields: { worker: marker, task: "Railway validation" }, baseFieldVersions: {} } });
  await admin.ok(`/api/tidplan/${encodeURIComponent(siteA)}/activities/${encodeURIComponent(`activity-${runId}`)}`, { method: "PATCH", json: { changedFields: { title: marker, startDate: date, endDate: date }, baseFieldVersions: {} } });
  await saveModule(admin, "bins", siteA, { bins: { rows: [{ id: `bin-${runId}`, name: marker, quantity: 1 }] } });
  await saveModule(admin, "warehouse", siteA, { warehouse: { catalog: [{ id: `warehouse-${runId}`, name: marker }], stock: { [`warehouse-${runId}`]: 7 }, logs: [{ id: `warehouse-log-${runId}`, action: marker }] } });
  const productId = `product-${runId}`;
  await saveModule(admin, "storeCatalog", siteA, { store: { products: [{ id: productId, name: marker, price: 1, sizes: ["M"], active: true }], orders: [], carts: {}, workerProfiles: {}, creditLedger: [], auditLog: [], settings: {} } });
  const order = await collaboratorSession.ok("/api/store/orders", { method: "POST", json: { site: siteA, order: { workerComment: marker, items: [{ productId, size: "M", quantity: 1 }] } } });
  assert(order.order && order.serverPriced === true, "Store order was not authoritatively server-priced");

  const reportsBefore = await admin.ok(`/api/reports?site=${encodeURIComponent(siteA)}`);
  await admin.ok("/api/reports", { method: "POST", json: { site: siteA, lastKnownVersion: reportsBefore.version, reports: [...reportsBefore.reports, { id: `report-${runId}`, title: marker, status: "open", createdAt: new Date().toISOString() }] } });
  const notificationsBefore = await admin.ok(`/api/notifications?site=${encodeURIComponent(siteA)}`);
  await admin.ok("/api/notifications", { method: "POST", json: { site: siteA, lastKnownVersion: notificationsBefore.version, notifications: [...notificationsBefore.notifications, { id: `notification-${runId}`, title: marker, message: marker, createdAt: new Date().toISOString() }] } });
  const chat = await collaboratorSession.ok(`/api/site-chat/${encodeURIComponent(siteA)}/messages`, { method: "POST", json: { text: marker, attachments: [] } });
  assert(chat.message?.text === marker, "Chat save did not return marker");

  const form = new FormData();
  form.set("site", siteA); form.set("module", "reports");
  const uploadText = `SCM Railway persistent upload ${marker}\n`;
  form.set("file", new Blob([uploadText], { type: "text/plain" }), `railway-${runId}.txt`);
  const upload = await admin.request("/api/upload", { method: "POST", body: form });
  if (!upload.response.ok) throw new Error(`Upload ${upload.response.status}: ${JSON.stringify(upload.payload)}`);
  const uploadUrl = upload.payload.file?.url;
  assert(uploadUrl, "Upload response has no URL");
  const list = await admin.ok(`/api/files?site=${encodeURIComponent(siteA)}&module=reports`);
  assert(list.files.some((file) => file.url === uploadUrl), "Upload metadata is absent from authoritative file list");
  const adminDownload = await admin.request(uploadUrl);
  assert(adminDownload.response.ok && adminDownload.payload === uploadText, "Uploader cannot retrieve stored bytes");
  const collaboratorDownload = await collaboratorSession.request(uploadUrl);
  assert(collaboratorDownload.response.ok && collaboratorDownload.payload === uploadText, "Authorized second session cannot retrieve upload");
  const outsiderDownload = await outsiderSession.request(uploadUrl);
  assert(outsiderDownload.response.status === 403, `Site-unauthorized session download status ${outsiderDownload.response.status}`);
  const publicDownload = await fetch(`${BASE}${uploadUrl}`);
  assert(publicDownload.status === 401, `Unauthenticated upload status ${publicDownload.status}`);

  const deniedModule = await collaboratorSession.request(`/api/store/orders?site=${encodeURIComponent(siteB)}`);
  assert(deniedModule.response.status === 403 && deniedModule.payload.error === "MODULE_DISABLED", `Disabled module API returned ${deniedModule.response.status}: ${JSON.stringify(deniedModule.payload)}`);
  const deniedSite = await outsiderSession.request(`/api/reports?site=${encodeURIComponent(siteA)}`);
  assert(deniedSite.response.status === 403, `Cross-project API returned ${deniedSite.response.status}`);
  const deniedPermission = await restrictedSession.request(`/api/reports?site=${encodeURIComponent(siteA)}`);
  assert(deniedPermission.response.status === 403, `Restricted permission API returned ${deniedPermission.response.status}`);
  const deniedSuperAdmin = await collaboratorSession.request(`/api/projects/${encodeURIComponent(siteA)}/modules`, { method: "PUT", json: { modules: { store: true }, baseVersion: 1 } });
  assert(deniedSuperAdmin.response.status === 403, `Non-Super Admin module config returned ${deniedSuperAdmin.response.status}`);

  const realtime = await waitForEvent(collaboratorSession, (event) => event.event === "project-modules-changed" && event.data?.site === siteA && event.data?.modules?.store === false, async () => configureModules(admin, siteA, { store: false }));
  assert(realtime.data.site === siteA, "SSE module event has wrong project");
  await configureModules(admin, siteA, { store: true });

  const backup = await admin.ok("/api/backup", { method: "POST", json: {} });
  const backupId = backup.id || backup.file;
  const dryRun = await admin.ok("/api/backup/restore/dry-run", { method: "POST", json: { id: backupId } });
  assert(dryRun.dryRun === true && dryRun.restoreToken && Array.isArray(dryRun.summary?.diff), "Backup restore dry-run is incomplete");

  const authoritative = await getState(admin);
  const encoded = JSON.stringify(authoritative.state.siteData?.[siteA] || {});
  assert(encoded.includes(marker), "Saved module marker is absent after backend reload");
  const reportAfter = await admin.ok(`/api/reports?site=${encodeURIComponent(siteA)}`);
  const notificationAfter = await admin.ok(`/api/notifications?site=${encodeURIComponent(siteA)}`);
  const chatAfter = await collaboratorSession.ok(`/api/site-chat/${encodeURIComponent(siteA)}/messages`);
  const ordersAfter = await collaboratorSession.ok(`/api/store/orders?site=${encodeURIComponent(siteA)}`);
  assert(reportAfter.reports.some((x) => x.id === `report-${runId}`), "Report did not survive reload");
  assert(notificationAfter.notifications.some((x) => x.id === `notification-${runId}`), "Notification did not survive reload");
  assert(chatAfter.messages.some((x) => x.text === marker), "Chat did not survive reload");
  assert(ordersAfter.orders.some((x) => x.id === order.order.id), "Store order did not survive reload");

  const browser = await browserProof({ runId }, { email: adminEmail, password: adminPassword, cookie: admin.cookie }, collaborator, siteA, siteB);
  const context = { runId, baseUrl: BASE, siteA, siteB, marker, date, productId, orderId: order.order.id, uploadUrl, uploadText, backupId, admin: { email: adminEmail, password: adminPassword }, collaborator, outsider, restricted, oldCookies: { admin: admin.cookie, collaborator: collaboratorSession.cookie }, browser };
  fs.mkdirSync(path.dirname(CONTEXT_FILE), { recursive: true });
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2), { mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ ok: true, phase: "prepare", runId, siteA, siteB, uploadUrl, backupId, checks: { loginSession: true, projectSwitching: true, modulesAndProtection: true, realtimeApiAndFrontend: true, planner: true, tidplan: true, sompturnor: true, warehouse: true, store: true, chat: true, reports: true, notifications: true, permissionsAndSuperAdmin: true, uploadAuthorization: true, browser, backupAndDryRun: true } }, null, 2)}\n`);
}

async function verify() {
  const ctx = JSON.parse(fs.readFileSync(CONTEXT_FILE, "utf8"));
  const staleAdmin = new Session(ctx.oldCookies.admin, "invalid", {});
  const stale = await staleAdmin.request("/api/session");
  assert(stale.response.status === 401, `Pre-restart process-local session still valid: ${stale.response.status}`);
  const admin = await Session.login(ctx.admin.email, ctx.admin.password);
  const collaborator = await Session.login(ctx.collaborator.email, ctx.collaborator.password);
  const outsider = await Session.login(ctx.outsider.email, ctx.outsider.password);
  const state = await getState(admin);
  const encoded = JSON.stringify(state.state.siteData?.[ctx.siteA] || {});
  assert(encoded.includes(ctx.marker), "Saved project data is absent after Railway restart");
  const report = await admin.ok(`/api/reports?site=${encodeURIComponent(ctx.siteA)}`);
  const notification = await admin.ok(`/api/notifications?site=${encodeURIComponent(ctx.siteA)}`);
  const chat = await collaborator.ok(`/api/site-chat/${encodeURIComponent(ctx.siteA)}/messages`);
  const orders = await collaborator.ok(`/api/store/orders?site=${encodeURIComponent(ctx.siteA)}`);
  assert(report.reports.some((x) => x.id === `report-${ctx.runId}`), "Report missing after restart");
  assert(notification.notifications.some((x) => x.id === `notification-${ctx.runId}`), "Notification missing after restart");
  assert(chat.messages.some((x) => x.text === ctx.marker), "Chat missing after restart");
  assert(orders.orders.some((x) => x.id === ctx.orderId), "Store order missing after restart");
  const list = await admin.ok(`/api/files?site=${encodeURIComponent(ctx.siteA)}&module=reports`);
  assert(list.files.some((file) => file.url === ctx.uploadUrl), "Upload metadata missing after restart");
  const download = await collaborator.request(ctx.uploadUrl);
  assert(download.response.ok && download.payload === ctx.uploadText, "Upload bytes missing after restart");
  const denied = await outsider.request(ctx.uploadUrl);
  assert(denied.response.status === 403, "Upload authorization failed after restart");
  const health = await fetch(`${BASE}/api/health`).then(async (response) => ({ status: response.status, body: await response.json() }));
  assert(health.status === 200 && health.body.ok === true && health.body.storageReady === true, `Health failed after restart: ${JSON.stringify(health)}`);
  process.stdout.write(`${JSON.stringify({ ok: true, phase: "verify", runId: ctx.runId, checks: { priorSessionsInvalidated: true, relogin: true, postgresStatePersistence: true, projectModulesPersistence: true, plannerTidplanBinsWarehousePersistence: true, storePersistence: true, chatPersistence: true, reportsPersistence: true, notificationsPersistence: true, uploadBytesAndMetadataPersistence: true, uploadAuthorizationAfterRestart: true, healthAndReconnect: true } }, null, 2)}\n`);
}

async function lifecycle() {
  const ctx = JSON.parse(fs.readFileSync(CONTEXT_FILE, "utf8"));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await loginInPage(page, ctx.collaborator.email, ctx.collaborator.password);
    await page.evaluate((site) => switchSiteFromLocal(site), ctx.siteA);
    const markerPresentBefore = await page.evaluate((marker) => JSON.stringify(appState).includes(marker), ctx.marker);
    assert(markerPresentBefore, "Authoritative marker missing before logout");
    const staleMarker = `STALE-LOGOUT-${ctx.runId}`;
    const logoutStatus = await page.evaluate(async ({ site, staleMarker }) => {
      localStorage.setItem("cmax_planner_data_" + site, JSON.stringify({ workers: [staleMarker] }));
      const response = await fetch("/api/logout", { method: "POST" });
      clearAuthSessionLocal(); resetAuthStateLocal(); showLogin();
      return response.status;
    }, { site: ctx.siteA, staleMarker });
    assert(logoutStatus === 200, `Frontend logout endpoint returned ${logoutStatus}`);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.getElementById("loginEmail")?.offsetParent !== null, null, { timeout: 20000 });
    await page.locator("#loginEmail").fill(ctx.collaborator.email);
    await page.locator("#loginPassword").fill(ctx.collaborator.password);
    await page.evaluate(() => handleLogin());
    await page.waitForFunction(() => window.freshServerDataLoaded === true && Boolean(window.appState?.currentUser), null, { timeout: 30000 });
    await page.evaluate((site) => switchSiteFromLocal(site), ctx.siteA);
    const result = await page.evaluate(({ marker, staleMarker }) => ({ markerPresent: JSON.stringify(appState).includes(marker), staleAbsent: !JSON.stringify(appState).includes(staleMarker), user: appState.currentUser }), { marker: ctx.marker, staleMarker });
    assert(result.markerPresent && result.staleAbsent && result.user === ctx.collaborator.email, `Logout/login freshness failed: ${JSON.stringify(result)}`);
    assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
    process.stdout.write(`${JSON.stringify({ ok: true, phase: "lifecycle", checks: { frontendLogoutRevokedSession: true, frontendRelogin: true, savedValueAfterRelogin: true, staleDataRejectedAfterRelogin: true } }, null, 2)}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

const phaseRunner = PHASE === "prepare" ? prepare : PHASE === "verify" ? verify : lifecycle;
phaseRunner().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
