const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const assets = {
  'jspdf/dist/jspdf.umd.min.js': 'jspdf.umd.min.js',
  'jspdf-autotable/dist/jspdf.plugin.autotable.min.js': 'jspdf.plugin.autotable.min.js',
  'flatpickr/dist/flatpickr.min.js': 'flatpickr.min.js',
  'flatpickr/dist/flatpickr.min.css': 'flatpickr.min.css',
  'flatpickr/dist/l10n/hr.js': 'flatpickr-hr.js',
  'flatpickr/dist/l10n/sv.js': 'flatpickr-sv.js',
};
fs.mkdirSync(path.join(root, 'public/vendor'), { recursive: true });
for (const [source, target] of Object.entries(assets)) {
  fs.copyFileSync(path.join(root, 'node_modules', source), path.join(root, 'public/vendor', target));
}

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['vendor', 'backups'].includes(entry.name)) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : full.endsWith('.js') ? [full] : [];
  });
}
const sources = ['server', 'public'].flatMap((dir) => files(path.join(root, dir)));
for (const source of sources) {
  const result = spawnSync(process.execPath, ['--check', source], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
}
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
for (const [, source] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
  if (!/^https?:/.test(source) && !fs.existsSync(path.join(root, 'public', source.replace(/^\//, '')))) {
    throw new Error(`Missing browser script: ${source}`);
  }
}
console.log(`Build passed: ${sources.length} JavaScript files checked; ${Object.keys(assets).length} locked browser assets copied.`);
