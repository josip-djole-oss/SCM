const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const bcrypt = require('bcryptjs');
const registry = require('../public/js/core/moduleRegistry');

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('module configuration, project isolation, persistence, SSE and authorization through HTTP', { timeout: 60000 }, async (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'scm-backend-test-'));
  const data = path.join(temporary, 'data');
  fs.mkdirSync(data);
  const password = 'Integration-test-password-123';
  const hash = await bcrypt.hash(password, 4);
  const permissionKeys = registry.list.flatMap((item) => item.permissions);
  const permissions = Object.fromEntries(permissionKeys.map((key) => [key, true]));
  permissions.canManageAdmins = true;
  permissions.canManageSiteAccess = true;
  const admins = [
    { email: 'owner@example.test', password: hash, isSuperAdmin: true, level: 6, allowedSites: null, permissions },
    { email: 'admin@example.test', password: hash, isSuperAdmin: false, level: 6, allowedSites: ['A', 'B'], permissions },
    { email: 'worker@example.test', password: hash, isSuperAdmin: false, level: 1, allowedSites: ['A'], permissions: { ...permissions, canManageAdmins: false } },
  ];
  fs.writeFileSync(path.join(data, 'admins.json'), JSON.stringify(admins));
  const entry = (site) => ({ planner: { dailyData: {}, workers: [] }, tidplan: [], bins: { retained: site }, store: { products: [{ id: site, name: 'Product ' + site }], orders: [] } });
  fs.writeFileSync(path.join(data, 'state.json'), JSON.stringify({ version: 2, sites: ['A', 'B'], currentSite: 'A', siteData: { A: entry('A'), B: entry('B') } }));
  const port = await unusedPort();
  const base = `http://127.0.0.1:${port}`;
  let logs = '';
  let child;
  async function start() {
    child = spawn(process.execPath, ['server/server.js'], { cwd: path.resolve(__dirname, '..'), windowsHide: true, env: { ...process.env, PORT: String(port), NODE_ENV: 'test', STORAGE_TYPE: 'json', DATA_PATH: data, UPLOAD_PATH: path.join(temporary, 'uploads'), BACKUP_PATH: path.join(temporary, 'backups'), BCRYPT_ROUNDS: '4', AUTO_BACKUP_INTERVAL_MS: '36000000', RAILWAY_ENVIRONMENT: '', RAILWAY_ENVIRONMENT_NAME: '', RAILWAY_VOLUME_MOUNT_PATH: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (buffer) => { logs += buffer; });
    child.stderr.on('data', (buffer) => { logs += buffer; });
    for (let count = 0; count < 100; count++) {
      if (child.exitCode !== null) throw new Error(logs);
      const ready = await fetch(base + '/api/health').then((response) => response.json()).catch(() => null);
      if (ready?.storageReady) return;
      await new Promise((resolve) => setTimeout(resolve, 75));
    }
    throw new Error('Server did not start: ' + logs);
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await exited;
  }
  t.after(async () => { await stop(); fs.rmSync(temporary, { recursive: true, force: true }); });
  await start();
  async function login(email, secret = password) {
    const response = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: secret }) });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: body.csrfToken, auth: body.auth };
  }
  async function request(session, route, method = 'GET', body) {
    const response = await fetch(base + '/api' + route, { method, headers: { Cookie: session.cookie, 'X-CSRF-Token': session.csrf, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json().catch(() => null);
    return { status: response.status, body: result, response };
  }
  let owner = await login('owner@example.test');
  const admin = await login('admin@example.test');
  const worker = await login('worker@example.test');
  const abort = new AbortController();
  const eventResponse = await fetch(base + '/api/events', { headers: { Cookie: admin.cookie }, signal: abort.signal });
  const reader = eventResponse.body.getReader();
  const initial = await reader.read();
  assert.match(Buffer.from(initial.value).toString(), /event: connected/);
  t.after(() => abort.abort());

  await t.test('only Super Admin can configure a project and Level 6 is not Super Admin', async () => {
    assert.equal(admin.auth.isSuperAdmin, false);
    const denied = await request(admin, '/projects/A/modules', 'PUT', { modules: { store: false }, baseVersion: 1 });
    assert.equal(denied.status, 403);
    assert.equal((await request(worker, '/projects/B/modules')).status, 403);
  });

  await t.test('disable takes effect in every route and aggregate, preserves data and sends SSE', async () => {
    const disabled = Object.fromEntries(registry.list.map((item) => [item.id, false]));
    const saved = await request(owner, '/projects/A/modules', 'PUT', { modules: disabled, baseVersion: 1 });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.version, 2);
    const event = await reader.read();
    assert.match(Buffer.from(event.value).toString(), /project-modules-changed/);
    const checks = ['/store/orders?site=A', '/planner/export/excel?site=A', '/tidplan/export/pdf?site=A', '/site-chat/A/messages', '/warehouse?site=A', '/toolroom?site=A', '/reports?site=A', '/notifications?site=A', '/surveys?site=A'];
    for (const route of checks) assert.equal((await request(owner, route)).status, 403, route);
    const denied = await request(owner, '/state/module', 'POST', { target: 'bins', site: 'A', baseVersion: 1, payload: { bins: {} } });
    assert.equal(denied.status, 403);
    const state = await request(owner, '/state');
    for (const definition of registry.list) for (const key of definition.stateKeys) assert.equal(Object.hasOwn(state.body.state.siteData.A, key), false, key);
    assert.equal(state.body.state.siteData.B.bins.retained, 'B');
    assert.equal((await request(owner, '/store/orders?site=B')).status, 200);
    const changedState = { ...state.body.state, siteData: { A: { store: { products: [] } } } };
    assert.equal((await request(owner, '/state', 'POST', { state: changedState, lastKnownVersion: state.body.version })).status, 403);
    const chats = await request(owner, '/site-chat/sites');
    assert.deepEqual(chats.body.sites.map((row) => row.siteId || row.site || row.id), ['B']);
    const raw = JSON.parse(fs.readFileSync(path.join(data, 'state.json'), 'utf8'));
    assert.equal(raw.data.siteData.A.bins.retained, 'A');
    assert.equal(raw.data.siteData.A.store.products[0].name, 'Product A');
    assert.doesNotMatch(logs, /Error: (MODULE_DISABLED|SITE_ACCESS_DENIED|MODULE_ACCESS_DENIED)/);
  });

  await t.test('configuration conflict and repeat save are safe', async () => {
    const stale = await request(owner, '/projects/A/modules', 'PUT', { modules: { store: true }, baseVersion: 1 });
    assert.equal(stale.status, 409);
    const same = await request(owner, '/projects/A/modules', 'PUT', { modules: { store: false }, baseVersion: 2 });
    assert.equal(same.body.version, 2);
    const restored = await request(owner, '/projects/A/modules', 'PUT', { modules: registry.normalize(), baseVersion: 2 });
    assert.equal(restored.status, 200);
    const state = await request(owner, '/state');
    assert.equal(state.body.state.siteData.A.bins.retained, 'A');
    const staleState = await request(owner, '/state', 'POST', { state: state.body.state, lastKnownVersion: state.body.version - 1 });
    assert.equal(staleState.status, 409);
  });

  await t.test('Super Admin can demote Level 6; sessions update and hashes are never returned', async () => {
    const state = (await request(owner, '/state')).body.state;
    const nextAdmins = state.admins.map((row) => row.email === 'admin@example.test' ? { ...row, level: 2, permissions: { ...row.permissions, canManageAdmins: false } } : row);
    const save = await request(owner, '/state/module', 'POST', { target: 'adminUsers', baseVersion: 1, payload: { admins: nextAdmins } });
    assert.equal(save.status, 200, JSON.stringify(save.body));
    assert.ok(save.body.admins.every((row) => !Object.hasOwn(row, 'password')));
    const session = await request(admin, '/session');
    assert.equal(session.body.auth.level, 2);
    assert.equal(session.body.auth.permissions.canManageAdmins, false);
    assert.equal((await request(admin, '/state/module', 'POST', { target: 'adminUsers', baseVersion: save.body.moduleVersion, payload: { admins: nextAdmins } })).status, 403);
    const baseline = session.body.auth.authorizationVersion;
    const unchanged = await request(owner, '/state/module', 'POST', { target: 'adminUsers', baseVersion: save.body.moduleVersion, payload: { admins: nextAdmins } });
    assert.equal(unchanged.status, 200);
    assert.equal((await request(admin, '/session')).body.auth.authorizationVersion, baseline);
    const withoutOwner = nextAdmins.filter((row) => row.email !== owner.auth.email);
    assert.equal((await request(owner, '/state/module', 'POST', { target: 'adminUsers', baseVersion: unchanged.body.moduleVersion, payload: { admins: withoutOwner } })).status, 403);
  });

  await t.test('real password persistence revokes other sessions and survives restart', async () => {
    const secondOwner = await login('owner@example.test');
    const newPassword = 'Replacement-password-456';
    assert.equal((await request(owner, '/account/password', 'POST', { oldPassword: 'wrong', newPassword })).status, 403);
    assert.equal((await request(owner, '/account/password', 'POST', { oldPassword: password, newPassword })).status, 200);
    assert.equal((await request(secondOwner, '/session')).status, 401);
    abort.abort();
    await stop();
    await start();
    owner = await login('owner@example.test', newPassword);
    const config = await request(owner, '/projects/A/modules');
    assert.equal(config.body.version, 3);
    assert.equal((await request(owner, '/state')).body.state.siteData.A.bins.retained, 'A');
  });
});
