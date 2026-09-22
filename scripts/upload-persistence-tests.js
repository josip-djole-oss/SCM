const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');
const { createUploadService } = require('../server/services/uploads');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9x8AAAAASUVORK5CYII=', 'base64');

async function fixture(t, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scm-upload-test-'));
  const disabled = new Set();
  const authorize = async (req, metadata) => {
    if (req.session.site !== metadata.site || disabled.has(metadata.site)) throw Object.assign(new Error('FILE_ACCESS_DENIED'), { statusCode: 403 });
  };
  let server;
  const start = async () => {
    const service = createUploadService({ uploadsDir: root, authorize, maxBytes: options.maxBytes || 1024 * 1024 });
    const app = express();
    app.use((req, res, next) => {
      req.session = { email: req.get('x-user') || 'test@example.invalid', site: req.get('x-site') || 'A', isReadonly: req.get('x-readonly') === 'true' };
      next();
    });
    app.post('/upload', service.upload.single('file'), (req, res) => res.json({ file: { url: service.urlFor(req.file.path), name: req.file.originalname } }));
    app.post('/planner/import/excel', service.upload.single('file'), (req, res) => res.status(400).json({ error: 'INVALID_DOCUMENT' }));
    app.get('/uploads/*', service.download);
    app.get('/files', service.list);
    app.use((error, req, res, next) => res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : error.statusCode || (error.name === 'MulterError' ? 400 : 500)).json({ error: error.code || error.message }));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { service, base: `http://127.0.0.1:${server.address().port}` };
  };
  const close = async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); };
  t.after(async () => { await close(); fs.rmSync(root, { recursive: true, force: true }); });
  const active = await start();
  return { root, disabled, ...active, restart: async () => { await close(); return start(); } };
}

async function upload(base, { content = PNG, name = 'image.png', type = 'image/png', site = 'A', userSite = 'A', module = 'notifications', operationId = '', extraFiles = false, route = '/upload', headers = {} } = {}) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  form.append('site', site);
  form.append('module', module);
  if (operationId) form.append('operationId', operationId);
  if (extraFiles) form.append('file', new Blob([content], { type }), name);
  return fetch(`${base}${route}`, { method: 'POST', headers: { 'x-site': userSite, ...headers }, body: form });
}

test('upload retry with one operation id returns one persistent file', async (t) => {
  const f = await fixture(t);
  const operationId = 'lost-upload-response';
  const first = await upload(f.base, { operationId });
  assert.equal(first.status, 200);
  const firstFile = (await first.json()).file;
  const retry = await upload(f.base, { operationId });
  assert.equal(retry.status, 200);
  const retryFile = (await retry.json()).file;
  assert.equal(retryFile.url, firstFile.url);
  const list = await (await fetch(f.base + '/files?site=A')).json();
  assert.equal(list.files.length, 1);
  const mismatch = await upload(f.base, { operationId, name: 'different.png' });
  assert.equal(mismatch.status, 409);
});

test('real multipart Unicode/duplicate names persist and remain retrievable after service restart', async (t) => {
  const f = await fixture(t);
  const name = 'Gradilište žć č 你好 #1.png';
  const first = await upload(f.base, { name });
  assert.equal(first.status, 200);
  const a = (await first.json()).file;
  const second = await upload(f.base, { name });
  const b = (await second.json()).file;
  assert.equal(a.name, name);
  assert.notEqual(a.url, b.url);
  const restarted = await f.restart();
  const response = await fetch(restarted.base + a.url);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
  const list = await (await fetch(restarted.base + '/files?site=A')).json();
  assert.equal(list.files.length, 2);
});

test('site isolation and module disable apply to direct downloads and file listing', async (t) => {
  const f = await fixture(t);
  const body = await (await upload(f.base)).json();
  assert.equal((await fetch(f.base + body.file.url, { headers: { 'x-site': 'B' } })).status, 403);
  assert.equal((await (await fetch(f.base + '/files', { headers: { 'x-site': 'B' } })).json()).files.length, 0);
  f.disabled.add('A');
  assert.equal((await fetch(f.base + body.file.url)).status, 403);
  f.disabled.delete('A');
  assert.equal((await fetch(f.base + body.file.url)).status, 200);
});

test('invalid content, active types, duplicate parts, large and read-only uploads reject without files', async (t) => {
  const f = await fixture(t, { maxBytes: 100 });
  assert.equal((await upload(f.base, { name: 'malicious.html', type: 'text/html', content: '<script>alert(1)</script>' })).status, 415);
  assert.equal((await upload(f.base, { content: '<script>fake png</script>' })).status, 415);
  assert.equal((await upload(f.base, { content: Buffer.alloc(110), name: 'file.txt', type: 'text/plain' })).status, 413);
  assert.equal((await upload(f.base, { extraFiles: true })).status, 400);
  assert.equal((await upload(f.base, { headers: { 'x-readonly': 'true' } })).status, 403);
  assert.equal((await upload(f.base, { site: 'B' })).status, 403);
  assert.equal((await upload(f.base, { module: '' })).status, 400);
  assert.equal((await (await fetch(f.base + '/files')).json()).files.length, 0);
  const physicalFiles = fs.readdirSync(f.root, { recursive: true }).filter((name) => fs.statSync(path.join(f.root, name)).isFile());
  assert.equal(physicalFiles.length, 0);
});

test('PDF/document bytes download as attachments and traversal/metadata paths are rejected', async (t) => {
  const f = await fixture(t);
  const response = await upload(f.base, { content: '%PDF-1.7\n%%EOF', name: 'document #1.pdf', type: 'application/pdf' });
  assert.equal(response.status, 200);
  const { file } = await response.json();
  const download = await fetch(f.base + file.url);
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-disposition'), /attachment/);
  assert.equal(await download.text(), '%PDF-1.7\n%%EOF');
  await assert.rejects(f.service.resolveDownload({ session: { site: 'A' } }, '../uploads-other/file.txt'), /INVALID_FILE_PATH/);
  await assert.rejects(f.service.resolveDownload({ session: { site: 'A' } }, '.metadata/test.json'), /INVALID_FILE_PATH/);
});

test('metadata persistence failure rejects upload and removes partial file', async (t) => {
  const f = await fixture(t);
  fs.writeFileSync(path.join(f.root, '.metadata'), 'blocks metadata directory');
  const response = await upload(f.base);
  assert.equal(response.status, 500);
  const physicalFiles = fs.readdirSync(f.root, { recursive: true }).filter((name) => name.endsWith('.png'));
  assert.equal(physicalFiles.length, 0);
});

test('temporary import files and metadata are removed on validation rejection', async (t) => {
  const f = await fixture(t);
  assert.equal((await upload(f.base, { route: '/planner/import/excel' })).status, 400);
  const files = fs.readdirSync(f.root, { recursive: true }).filter((name) => fs.statSync(path.join(f.root, name)).isFile());
  assert.equal(files.length, 0);
});

test('an interrupted multipart upload is cleaned and a retry succeeds', async (t) => {
  const f = await fixture(t);
  await new Promise((resolve) => {
    const req = http.request(f.base + '/upload?site=A&module=notifications', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=interrupted', 'content-length': '9999' } });
    req.on('error', resolve);
    req.write('--interrupted\r\nContent-Disposition: form-data; name="file"; filename="partial.png"\r\nContent-Type: image/png\r\n\r\n');
    req.write(PNG);
    setTimeout(() => { req.destroy(); resolve(); }, 30);
  });
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal((await upload(f.base)).status, 200);
  const images = fs.readdirSync(f.root, { recursive: true }).filter((name) => name.endsWith('.png'));
  assert.equal(images.length, 1);
});

test('safe dependency upgrades still export/reimport an Excel workbook and parse a PDF', async () => {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('SCM');
  sheet.addRow(['Project', 'Count']);
  sheet.addRow(['Gradilište ž', 12]);
  sheet.addConditionalFormatting({ ref: 'B2', rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF0000FF' }, showValue: true }] });
  const bytes = await workbook.xlsx.writeBuffer();
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(bytes);
  assert.equal(reopened.getWorksheet('SCM').getCell('A2').value, 'Gradilište ž');
  const { jsPDF } = require('jspdf');
  const { autoTable } = require('jspdf-autotable');
  const doc = new jsPDF();
  autoTable(doc, { head: [['Project']], body: [['SCM test']] });
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = pdfjs.getDocument({ data: new Uint8Array(doc.output('arraybuffer')), isEvalSupported: false, useWorkerFetch: false, disableFontFace: true });
  const pdf = await loading.promise;
  try {
    const text = await (await pdf.getPage(1)).getTextContent();
    assert.ok(text.items.some((item) => item.str === 'SCM test'));
  } finally { await loading.destroy(); }
});
