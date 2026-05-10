const fs = require('fs');
const path = require('path');

const root = process.cwd();
const namespacePath = path.join(root, 'public/js/core/namespace.js');
const htmlPath = path.join(root, 'public/index.html');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function listFilesRec(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRec(full));
    } else if (entry.isFile() && full.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function extractNamespaceActions(namespaceSource) {
  const actions = [];
  const blockRe = /assignNamespace\("([^"]+)",\s*\{([\s\S]*?)\}\);/g;
  let blockMatch;
  while ((blockMatch = blockRe.exec(namespaceSource))) {
    const ns = blockMatch[1];
    const body = blockMatch[2];
    const methodRe = /^\s*([A-Za-z0-9_]+)\s*:/gm;
    let methodMatch;
    while ((methodMatch = methodRe.exec(body))) {
      actions.push(`${ns}.${methodMatch[1]}`);
    }
  }
  return Array.from(new Set(actions)).sort();
}

function extractUsedActions(text) {
  const used = new Set();
  const dataAttrRe = /data-cmax-action\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = dataAttrRe.exec(text))) used.add(m[1]);

  const cmaxCallRe = /CMAX\.([A-Za-z0-9_]+\.[A-Za-z0-9_]+)/g;
  while ((m = cmaxCallRe.exec(text))) used.add(m[1]);

  return used;
}

function main() {
  const namespaceSource = read(namespacePath);
  const namespaceActions = extractNamespaceActions(namespaceSource);

  const jsFiles = listFilesRec(path.join(root, 'public/js')).filter((f) => !f.endsWith(path.normalize('core/namespace.js')));
  const scriptFiles = listFilesRec(path.join(root, 'scripts'));

  const usageCorpus = [read(htmlPath), ...jsFiles.map(read), ...scriptFiles.map(read)].join('\n');
  const used = extractUsedActions(usageCorpus);

  const directUnused = namespaceActions.filter((a) => !used.has(a));

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      namespaceActions: namespaceActions.length,
      usedActions: namespaceActions.filter((a) => used.has(a)).length,
      suspiciousActions: directUnused.length,
    },
    suspiciousActions: directUnused,
  };

  const outPath = path.join(root, 'docs/phase-d-dead-code-audit.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(root, outPath)}`);
  console.log(`Namespace actions: ${report.totals.namespaceActions}`);
  console.log(`Used actions: ${report.totals.usedActions}`);
  console.log(`Suspicious actions: ${report.totals.suspiciousActions}`);
}

main();
