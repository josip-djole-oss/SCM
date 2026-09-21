const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStorage } = require('../server/storage');
const { atomicWriteJson, isWithin } = require('../server/storage/atomic-file');
const { resolveStoragePaths } = require('../server/storage/runtime-paths');

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scm-storage-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const storage = createStorage({ storageType: 'json', dataDir: path.join(root, 'data'), uploadsDir: path.join(root, 'uploads') });
  await storage.init();
  return { root, storage };
}

test('concurrent mutations preserve every update and survive adapter restart', async (t) => {
  const { storage } = await fixture(t);
  await storage.ensureJsonFile(storage.files.state, { count: 0 });
  await Promise.all(Array.from({ length: 80 }, () => storage.mutateDocument(storage.files.state, {}, async (data) => {
    await new Promise((resolve) => setImmediate(resolve));
    return { count: data.count + 1 };
  })));
  const reopened = createStorage({ storageType: 'json', dataDir: storage.dataDir, uploadsDir: storage.uploadsDir });
  const doc = await reopened.readDocument(storage.files.state, {});
  assert.equal(doc.data.count, 80);
  assert.equal(doc.version, 81);
});

test('stale version rejects, does not leak rejection, and subsequent writes still work', async (t) => {
  const { storage } = await fixture(t);
  await storage.ensureJsonFile(storage.files.state, { count: 0 });
  await storage.writeDocument(storage.files.state, { count: 1 }, { lastKnownVersion: 1 });
  await assert.rejects(storage.writeDocument(storage.files.state, { count: 99 }, { lastKnownVersion: 1 }), { code: 'VERSION_CONFLICT' });
  await assert.rejects(storage.mutateDocument(storage.files.state, {}, () => { throw new Error('Injected failure'); }), /Injected failure/);
  await new Promise((resolve) => setImmediate(resolve));
  const doc = await storage.writeDocument(storage.files.state, { count: 2 }, { lastKnownVersion: 2 });
  assert.equal(doc.version, 3);
  assert.equal((await storage.readJson(storage.files.state, {})).count, 2);
});

test('failed atomic replacement preserves original bytes and removes temporary files', async (t) => {
  const { storage } = await fixture(t);
  const target = storage.files.state;
  atomicWriteJson(target, { original: true });
  const rename = fs.renameSync;
  fs.renameSync = () => { throw Object.assign(new Error('Injected disk failure'), { code: 'EIO' }); };
  try { assert.throws(() => atomicWriteJson(target, { original: false }), /Injected disk failure/); }
  finally { fs.renameSync = rename; }
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), { original: true });
  assert.equal(fs.readdirSync(storage.dataDir).filter((name) => name.endsWith('.tmp')).length, 0);
});

test('corrupt documents fail visibly; missing documents alone use defaults', async (t) => {
  const { storage } = await fixture(t);
  assert.deepEqual(await storage.readJson(storage.files.state, { missing: true }), { missing: true });
  fs.writeFileSync(storage.files.state, '{broken');
  await assert.rejects(storage.readJson(storage.files.state, {}), SyntaxError);
  await assert.rejects(storage.writeDocument(storage.files.state, {}), SyntaxError);
  assert.equal(fs.readFileSync(storage.files.state, 'utf8'), '{broken');
});

test('initialization cannot overwrite an existing or concurrently created document', async (t) => {
  const { storage } = await fixture(t);
  await Promise.all([storage.writeDocument(storage.files.state, { real: true }), storage.ensureJsonFile(storage.files.state, { empty: true })]);
  assert.deepEqual(await storage.readJson(storage.files.state, {}), { real: true });
});

test('Unicode site keys preserve unique legacy documents and export original names', async (t) => {
  const { storage } = await fixture(t);
  await storage.writeJson(storage.files.state, { sites: ['Kaj 16', 'Gradilište ž'] });
  const legacy = path.join(storage.dataDir, 'reports_Kaj_16.json');
  fs.writeFileSync(legacy, JSON.stringify([{ id: 'old' }]));
  const current = storage.getReportsFilePath('Kaj 16');
  assert.notEqual(current, legacy);
  assert.deepEqual(await storage.readJson(current, []), [{ id: 'old' }]);
  await storage.mutateDocument(current, [], (data) => [...data, { id: 'new' }]);
  assert.deepEqual(JSON.parse(fs.readFileSync(legacy, 'utf8')), [{ id: 'old' }]);
  const exported = await storage.exportAll();
  assert.deepEqual(exported.reports['Kaj 16'], [{ id: 'old' }, { id: 'new' }]);
  assert.equal(Object.keys(exported.reports).length, 1);
  assert.notEqual(storage.getReportsFilePath('Gradilište ž'), storage.getReportsFilePath('Gradilište ć'));
});

test('ambiguous legacy site collisions are preserved and refused instead of shared', async (t) => {
  const { storage } = await fixture(t);
  await storage.writeJson(storage.files.state, { sites: ['Kaj 16', 'Kaj_16'] });
  const legacy = path.join(storage.dataDir, 'reports_Kaj_16.json');
  fs.writeFileSync(legacy, JSON.stringify([{ id: 'ambiguous' }]));
  await assert.rejects(storage.readJson(storage.getReportsFilePath('Kaj 16'), []), { code: 'AMBIGUOUS_LEGACY_SITE_KEY' });
  await assert.rejects(storage.readJson(storage.getReportsFilePath('Kaj_16'), []), { code: 'AMBIGUOUS_LEGACY_SITE_KEY' });
  assert.deepEqual(JSON.parse(fs.readFileSync(legacy, 'utf8')), [{ id: 'ambiguous' }]);
});

test('Railway requires upload persistence even when business data uses PostgreSQL', () => {
  const root = path.resolve('test-app');
  assert.throws(() => resolveStoragePaths(root, { RAILWAY_PROJECT_ID: 'test', STORAGE_TYPE: 'postgres' }), /persistent volume/);
  const mount = path.resolve('test-volume');
  const env = { RAILWAY_PROJECT_ID: 'test', RAILWAY_VOLUME_MOUNT_PATH: mount, STORAGE_TYPE: 'postgres' };
  const resolved = resolveStoragePaths(root, env);
  assert.equal(resolved.uploadsDir, path.join(mount, 'uploads'));
  assert.throws(() => resolveStoragePaths(root, { ...env, UPLOAD_PATH: `${mount}-other` }), /UPLOAD_PATH/);
  assert.throws(() => resolveStoragePaths(root, { ...env, STORAGE_TYPE: 'json', DATA_PATH: `${mount}-other` }), /DATA_PATH/);
  assert.equal(isWithin(mount, `${mount}-other/file`), false);
});

test('parallel backups have unique durable IDs and reject traversal', async (t) => {
  const { storage } = await fixture(t);
  const backups = await Promise.all(Array.from({ length: 8 }, (_, index) => storage.saveBackupSnapshot({ index })));
  assert.equal(new Set(backups.map((backup) => backup.id)).size, 8);
  for (let index = 0; index < backups.length; index++) assert.deepEqual(await storage.readBackupSnapshot(backups[index].id), { index });
  await assert.rejects(storage.readBackupSnapshot('../state.json'), /INVALID_BACKUP_ID/);
});
