const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const events = read("public/js/workwear/workwearEvents.js");
  const render = read("public/js/workwear/workwearRender.js");

  mustContain(events, "downloadStoreCsv", "CSV export");
  mustContain(events, "downloadStorePdf", "PDF export");
  mustContain(events, "doc.autoTable", "PDF table export");
  mustContain(events, "text/csv", "CSV mime");
  mustContain(events, "storeExportFileName", "export filename with filters");
  mustContain(render, "workwearExportSiteScope", "export site scope filter");
  mustContain(render, "workwearExportOrderScope", "export order scope filter");
  if (events.includes("store-export-${format}-${Date.now()}.json")) throw new Error("Export wizard still writes JSON file");

  console.log(JSON.stringify({ ok: true, checks: 7 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
