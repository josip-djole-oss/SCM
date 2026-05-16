const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(src, token, label) {
  if (!src.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const events = read("public/js/workwear/workwearEvents.js");
  const render = read("public/js/workwear/workwearRender.js");

  mustContain(events, "function workwearSetBulkSelection(", "bulk selection handler");
  mustContain(events, "function workwearApplyBulkEdit(", "bulk apply handler");
  mustContain(events, "pushWorkwearAudit(\"bulk_edit_applied\"", "bulk edit audit log");
  mustContain(events, "workwearBulkSelection[id] = false", "bulk selection reset after apply");
  mustContain(render, "Odabrano: ${selectedIds.length}", "selected product count in bulk panel");
  mustContain(render, "data-cmax-action=\"workwear.applyBulkEdit\"", "bulk apply button");

  console.log(JSON.stringify({ ok: true, checks: 6 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
