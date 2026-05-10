#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const publicDir = path.join(appRoot, "public");
const SCAN_EXTENSIONS = new Set([".html", ".js"]);

function walkFiles(rootDir) {
  const queue = [rootDir];
  const files = [];
  while (queue.length) {
    const current = queue.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(nextPath);
        return;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (SCAN_EXTENSIONS.has(ext)) files.push(nextPath);
    });
  }
  return files.sort();
}

function toRel(filePath) {
  return path.relative(appRoot, filePath).replace(/\\/g, "/");
}

function lineNumberForIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function collectMatches(filePath, text, regex, rule) {
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const snippet = match[0].replace(/\s+/g, " ").slice(0, 180);
    matches.push({
      file: toRel(filePath),
      line: lineNumberForIndex(text, match.index),
      rule,
      snippet,
    });
  }
  return matches;
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return [
    ...collectMatches(filePath, text, /\bonclick\s*=/gi, "inline-onclick"),
    ...collectMatches(filePath, text, /\bonsubmit\s*=/gi, "inline-onsubmit"),
    ...collectMatches(filePath, text, /\bonchange\s*=/gi, "inline-onchange"),
    ...collectMatches(filePath, text, /\boninput\s*=/gi, "inline-oninput"),
    ...collectMatches(filePath, text, /\bonerror\s*=/gi, "inline-onerror"),
    ...collectMatches(
      filePath,
      text,
      /\.\s*on(?:click|submit|change|input|error)\s*=/gi,
      "dom-property-on*",
    ),
    ...collectMatches(
      filePath,
      text,
      /setAttribute\(\s*["']on(?:click|submit|change|input|error)["']/gi,
      "setAttribute-on*",
    ),
  ];
}

function main() {
  const files = walkFiles(publicDir);
  const findings = files.flatMap((filePath) => scanFile(filePath));
  if (findings.length > 0) {
    console.error("Inline/event-handler patterns found under public/:");
    findings.forEach((entry, i) => {
      console.error(
        `${i + 1}. [${entry.rule}] ${entry.file}:${entry.line} -> ${entry.snippet}`,
      );
    });
    process.exit(1);
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scannedDir: "public/",
        scannedFiles: files.length,
        inlineHandlerCount: 0,
      },
      null,
      2,
    ),
  );
}

main();
