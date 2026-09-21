const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function context(files, extras = {}) {
  const values = new Map();
  const scope = vm.createContext({
    console, AbortController, Promise, JSON, Number, String, Array,
    BACKEND_ENABLED: true, currentSite: 'A',
    appState: { currentUser: 'worker@test.local' },
    captureAppContext: () => ({ site: 'A' }), isAppContextCurrent: () => true,
    localStorage: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) },
    getSiteStorageKey: (key, site) => `${key}:${site}`, getCachedStorageJson: (key, fallback) => values.get(key) || fallback,
    setCachedStorageJson: (key, value) => { values.set(key, value); return true; },
    ...extras,
  });
  scope.window = scope;
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope, { filename: file });
  return { scope, values };
}

test('failed report persistence leaves confirmed browser state untouched', async () => {
  const { scope, values } = context(['public/js/admin/adminStorage.js'], {
    REPORTS_KEY: 'reports', reportsStateVersionBySite: { A: 1 },
    fetch: async () => ({ ok: false, json: async () => ({ error: 'disk full' }) }),
  });
  await assert.rejects(scope.saveReports([{ id: 1 }]), /disk full/);
  assert.equal(values.size, 0);
});

test('reports cache commits only after acknowledgement and preserves version', async () => {
  let finish;
  const { scope, values } = context(['public/js/admin/adminStorage.js'], {
    REPORTS_KEY: 'reports', reportsStateVersionBySite: { A: 1 },
    fetch: () => new Promise((resolve) => { finish = resolve; }),
  });
  const pending = scope.saveReports([{ id: 1 }]);
  assert.equal(values.size, 0);
  finish({ ok: true, json: async () => ({ version: 2 }) });
  assert.equal(await pending, true);
  assert.equal(scope.reportsStateVersionBySite.A, 2);
  assert.equal(JSON.parse(values.get('reports'))[0].id, 1);
});

test('failed notification saves reject and identical retries still hit the backend', async () => {
  let calls = 0;
  const { scope, values } = context(['public/js/notifications/notifications.js'], {
    NOTIFICATIONS_KEY: 'notifications', notificationsStateVersionBySite: { A: 1 },
    fetch: async () => { calls++; return { ok: false, json: async () => ({ error: 'write failed' }) }; },
  });
  await assert.rejects(scope.saveNotificationsForSite('A', [{ id: 1 }]), /write failed/);
  await assert.rejects(scope.saveNotificationsForSite('A', [{ id: 1 }]), /write failed/);
  assert.equal(calls, 2);
  assert.equal(values.size, 0);
});

test('notification transfer failure rejects instead of returning an empty successful URL', async () => {
  const { scope } = context(['public/js/notifications/notifications.js'], {
    FormData: class { append() {} },
    fetch: async () => ({ ok: false, json: async () => ({ error: 'UPLOAD_INCOMPLETE' }) }),
  });
  await assert.rejects(scope.uploadNotificationImages([{ name: 'photo.png' }]), /UPLOAD_INCOMPLETE/);
});

test('Store product save waits for authoritative persistence and rejects failure', async () => {
  const state = { products: [] };
  let finish;
  const { scope } = context(['public/js/workwear/workwearApi.js'], {
    getWorkwearState: () => state, normalizeStoreProduct: (p) => p,
    persistWorkwearState: () => new Promise((resolve) => { finish = resolve; }),
  });
  let finished = false;
  const pending = scope.workwearApiSaveProduct({ id: 'one', name: 'Helmet' });
  pending.then(() => { finished = true; }, () => {});
  await Promise.resolve();
  assert.equal(finished, false);
  finish(false);
  await assert.rejects(pending, /STORE_PRODUCT_NOT_SAVED/);
  assert.equal(state.products[0].name, 'Helmet', 'failed draft remains recoverable');
});

test('Store malformed acknowledgement never becomes a saved order', async () => {
  const { scope } = context(['public/js/workwear/workwearApi.js'], {
    fetch: async () => ({ ok: true, json: async () => ({}) }),
  });
  await assert.rejects(scope.workwearApiSaveOrder({ items: [] }), /UNCONFIRMED/);
});

test('Store load errors cannot fall back to cached orders', async () => {
  const { scope } = context(['public/js/workwear/workwearApi.js'], {
    fetch: async () => { throw new Error('offline'); },
    getWorkwearState: () => ({ orders: [{ id: 'three-month-old' }] }),
  });
  await assert.rejects(scope.workwearApiListOrders(), /offline/);
});

test('authoritative zero budget replaces previous balance', () => {
  const profile = { creditBalance: 500, reservedCredit: 250 };
  const { scope } = context(['public/js/workwear/workwearEvents.js'], { ensureWorkerWorkwearProfile: () => profile });
  scope.workwearApplyBudgetSnapshot('worker', { creditBalance: 0, reservedCredit: 0 });
  assert.deepEqual(profile, { creditBalance: 0, reservedCredit: 0 });
});
