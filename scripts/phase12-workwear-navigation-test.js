const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}

try {
  const html = read("public/index.html");
  const routing = read("public/js/core/routing.js");
  const ns = read("public/js/core/namespace.js");

  mustContain(html, 'id="navWorkwearBtn"', "sidebar nav button");
  mustContain(html, 'data-cmax-action="workwear.show"', "workwear nav action");
  mustContain(html, 'id="workwear-section"', "workwear section");
  mustContain(routing, '"/workwear"', "workwear route");
  mustContain(ns, 'assignNamespace("workwear"', "workwear namespace");

  console.log(JSON.stringify({ ok: true, checks: ["nav", "route", "namespace", "section"] }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
