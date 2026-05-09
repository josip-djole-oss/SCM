#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const indexPath = path.join(appRoot, "public", "index.html");

function collectInlineHandlers(html) {
  const handlers = [];
  const tagRegex = /<[^>]+>/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(html)) !== null) {
    const tag = tagMatch[0];
    const attrRegex = /\s(on[a-z]+)\s*=\s*(['"])([\s\S]*?)\2/gi;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(tag)) !== null) {
      handlers.push({
        attr: attrMatch[1],
        value: attrMatch[3],
        tag: tag.slice(0, 200),
      });
    }
  }
  return handlers;
}

function main() {
  const html = fs.readFileSync(indexPath, "utf8");
  const handlers = collectInlineHandlers(html);
  if (handlers.length > 0) {
    console.error("Inline on* attributes found in public/index.html:");
    handlers.forEach((entry, i) => {
      console.error(`${i + 1}. ${entry.attr}="${entry.value}" in ${entry.tag}`);
    });
    process.exit(1);
    return;
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        file: "public/index.html",
        inlineHandlerCount: 0,
      },
      null,
      2,
    ),
  );
}

main();
