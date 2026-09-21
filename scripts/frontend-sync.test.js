const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function storage() {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
function harness(files = []) {
  const timers = new Map(); let id = 0;
  const nodes = new Map();
  const node = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, removeAttribute() {}, addEventListener() {}, remove() {}, querySelector() { return null; } });
  const c = {
    console: { error() {}, warn() {}, log() {} }, Promise, URL, Headers, Date, Set, Map,
    localStorage: storage(), sessionStorage: storage(), AUTH_KEY: 'auth',
    currentSite: 'A', currentView: 'main', appRuntimeGeneration: 1, stateLoadSequence: 0,
    appState: { currentUser: 'a@example.test', currentUserName: 'A', isReadonly: false, isSuperAdmin: false, adminLevel: 3, permissions: { read: true, write: false }, hasUnsavedChanges: false, editRevision: 0 },
    DEFAULT_PERMISSIONS: { read: true, write: false }, BACKEND_ENABLED: true,
    freshServerDataLoaded: true, appLoadingDepth: 0, tidplanDataChanged: false, tidplanData: [], localEditKeys: new Set(),
    moduleStateVersions: {}, pendingServerSyncOptions: {}, permissionRefreshInFlight: null,
    lastServerStateSnapshot: null, lastAppliedRemoteStateKey: '', ignoredRemoteStateKey: '',
    CMAX_PERF: null, CMAX: { projectModules: { isEnabled: () => true } },
    document: { getElementById(key) { if (!nodes.has(key)) nodes.set(key, node()); return nodes.get(key); }, body: { ...node(), appendChild() {} }, createElement: node, addEventListener() {}, querySelectorAll: () => [] },
    setTimeout(fn) { timers.set(++id, fn); return id; }, clearTimeout(key) { timers.delete(key); }, setInterval() {}, clearInterval() {},
    getSiteInfoStorage: () => ({}), isSiteModuleEnabled: () => true,
    t: (s) => s, showToast: (...args) => c.toasts.push(args), toasts: [],
    fetch: () => { throw new Error('Unexpected fetch'); },
    getCachedStorageJson: () => ({}), setCachedStorageJson() {},
    setCsrfToken() {}, applyPermissionVisibility() {}, updateAccountNotificationsBadge() {},
  };
  c.window = c; c.addEventListener = () => {};
  c.captureAppContext = () => ({ generation: c.appRuntimeGeneration, user: c.appState.currentUser, site: c.currentSite });
  c.isAppContextCurrent = (ctx, includeSite = true) => ctx.generation === c.appRuntimeGeneration && ctx.user === c.appState.currentUser && (!includeSite || ctx.site === c.currentSite);
  c.runTimers = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach((fn) => fn()); };
  vm.createContext(c);
  files.forEach((name) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public/js', name), 'utf8'), c, { filename: name }));
  return c;
}
const ok = (data) => ({ ok: true, status: 200, json: async () => data });

test('session cookie is verified even with no cached auth', async () => {
  const c = harness(['core/auth.js']); let applied;
  c.fetch = async () => ok({ auth: { email: 'fresh@example.test' }, csrfToken: 'fresh' });
  c.applyAuthData = (auth) => { applied = auth; };
  assert.equal(await c.checkAuth({ deferShow: true }), true);
  assert.equal(applied.email, 'fresh@example.test');
});

test('old project state response cannot hydrate a new project', async () => {
  const c = harness(['core/dataSync.js']); const response = deferred(); let applied = false;
  c.fetch = () => response.promise;
  c.applyServerStateSnapshot = () => { applied = true; return true; };
  const pending = c.loadData({ strict: true });
  c.currentSite = 'B'; c.appRuntimeGeneration += 1;
  response.resolve(ok({ state: { version: 2 }, version: 10 }));
  await assert.rejects(pending, /STALE_APP_CONTEXT/);
  assert.equal(applied, false);
});

test('failed authoritative reads reject without loading cached modules', async () => {
  const c = harness(['core/dataSync.js']); let cacheLoads = 0;
  c.fetch = async () => ({ ok: false, status: 503 });
  c.loadBinsData = () => { cacheLoads += 1; };
  await assert.rejects(c.loadAllData(), /STATE_LOAD_503/);
  assert.equal(cacheLoads, 0);
});

test('project module config loads before optional module data', async () => {
  const c = harness(['core/dataSync.js']); const order = [];
  c.loadData = async () => order.push('state');
  c.CMAX.projectModules.load = async () => order.push('config');
  c.loadBinsData = () => order.push('bins'); c.loadTidplanData = () => {}; c.loadWarehouseData = () => {};
  c.hasPermission = () => false; c.canAccessNotificationsModule = () => false;
  await c.loadAllData({ strict: true });
  assert.deepEqual(order, ['state', 'config', 'bins']);
});

test('delayed saves snapshot content and never execute for another project', async () => {
  const c = harness(['core/dataSync.js']); let writes = 0;
  const payload = { planner: { workers: ['A'] } };
  c.syncModuleState = async () => { writes += 1; return true; };
  c.scheduleModuleSync('planner', 600, payload);
  payload.planner.workers.push('changed');
  assert.equal(c.pendingModuleSaves['planner:A'].payload.planner.workers.length, 1);
  c.currentSite = 'B'; c.appRuntimeGeneration += 1; c.runTimers();
  assert.equal(writes, 0);
});

test('module persistence requires an authoritative version acknowledgement', async () => {
  const c = harness(['core/dataSync.js']); c.fetch = async () => ok({});
  assert.equal(await c.syncModuleState('planner', { planner: {} }), false);
  assert.equal(c.toasts.some(([,kind]) => kind === 'success'), false);
  assert.equal(c.moduleSaveFailures['planner:A'], true);
});

test('module conflict keeps old base version and returns failure', async () => {
  const c = harness(['core/dataSync.js']); c.moduleStateVersions = { planner: { A: 4 } };
  c.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'MODULE_VERSION_CONFLICT', moduleVersion: 7 }) });
  c.showServerConflictNotice = () => {};
  assert.equal(await c.syncModuleState('planner', { planner: {} }), false);
  assert.equal(c.getModuleStateVersion('planner', 'A'), 4);
});

test('permission signatures ignore object ordering and role-only changes', () => {
  const c = harness(['core/sync.js']); const first = c.effectivePermissionSignature();
  c.appState.permissions = { write: false, read: true }; c.appState.adminLevel = 6;
  assert.equal(c.effectivePermissionSignature(), first);
  c.appState.permissions.write = true;
  assert.notEqual(c.effectivePermissionSignature(), first);
});

test('login establishes a notification baseline without permission-change spam', () => {
  const c = harness(['core/sync.js', 'core/accountNotifications.js']);
  c.safeParseStoredJson = (text, fallback) => { try { return text ? JSON.parse(text) : fallback; } catch (_) { return fallback; } };
  c.BACKEND_ENABLED = false;
  c.localStorage.setItem('cmax_account_notification_perm_a@example.test', 'three months old');
  c.syncAccountNotifications();
  assert.equal(c.localStorage.getItem('cmax_account_notifications_a@example.test'), null);
  c.appState.permissions = { write: false, read: true }; c.syncAccountNotifications();
  assert.equal(c.localStorage.getItem('cmax_account_notifications_a@example.test'), null);
  c.getCurrentLocale = () => 'en'; c.escapeHtml = String;
  c.appState.permissions.write = true; c.syncAccountNotifications();
  assert.equal(JSON.parse(c.localStorage.getItem('cmax_account_notifications_a@example.test')).length, 1);
});

test('manual save only reports success after persistence and preserves edits made during request', async () => {
  const c = harness(['core/dataSync.js', 'importExport/importExport.js']); const response = deferred();
  c.persistCurrentStateToLocalStorage = () => {};
  c.syncModuleState = () => response.promise;
  c.appState.hasUnsavedChanges = true;
  const pending = c.saveAllData();
  assert.equal(c.toasts.length, 0);
  c.appState.editRevision += 1;
  response.resolve(true); assert.equal(await pending, true);
  assert.equal(c.appState.hasUnsavedChanges, true);
  assert.equal(c.toasts.filter(([, kind]) => kind === 'success').length, 1);
});

test('manual failed save preserves dirty state without a success message', async () => {
  const c = harness(['core/dataSync.js', 'importExport/importExport.js']);
  c.persistCurrentStateToLocalStorage = () => {}; c.syncModuleState = async () => false; c.appState.hasUnsavedChanges = true;
  assert.equal(await c.saveAllData(), false);
  assert.equal(c.appState.hasUnsavedChanges, true);
  assert.equal(c.toasts.length, 0);
});

test('overlapping global loaders remain visible until every operation finishes', async () => {
  const c = harness(['core/auth.js']); const first = deferred(), second = deferred();
  const a = c.withLoadingPromise('loading', () => first.promise);
  const b = c.withLoadingPromise('loading', () => second.promise);
  first.resolve(); await a;
  assert.equal(c.document.getElementById('loadingOverlay').style.display, 'flex');
  second.resolve(); await b;
  assert.equal(c.document.getElementById('loadingOverlay').style.display, 'none');
});
