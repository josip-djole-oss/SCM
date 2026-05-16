const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.cwd(), "public");
const NEEDLES = [
  "Odjeca, obuca, PPE i alati po aktivnom gradilistu.",
  "Velike kartice za ulaz u glavne operativne tokove.",
  "Samo najbitnije, bez dodatnih analitickih panela.",
  "Brzi pregled dostupnih lokacija za ovaj profil.",
  "Kratki pregled bez pretrpavanja ekrana.",
  "8 kolumner för verktyg eller material",
  "8 columns for tools or materials",
  "8 stupaca za alat ili materijal",
];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next, out);
    if (!/\.(html|js|css)$/i.test(entry.name)) return;
    out.push(next);
  });
  return out;
}

try {
  const files = walk(ROOT);
  const hits = [];
  files.forEach((file) => {
    const text = fs.readFileSync(file, "utf8");
    NEEDLES.forEach((needle) => {
      if (text.includes(needle)) {
        hits.push({ file: path.relative(process.cwd(), file).replace(/\\/g, "/"), needle });
      }
    });
  });

  if (hits.length) {
    throw new Error(`Found disallowed literals: ${JSON.stringify(hits, null, 2)}`);
  }

  console.log(JSON.stringify({ ok: true, scannedFiles: files.length, blockedLiterals: 0 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
