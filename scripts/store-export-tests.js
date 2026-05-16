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
  const server = read("server/server.js");

  mustContain(events, "downloadStoreCsv", "CSV export");
  mustContain(events, "downloadStorePdf", "PDF export");
  mustContain(events, "doc.autoTable", "PDF table export");
  mustContain(events, "text/csv", "CSV mime");
  mustContain(events, "storeExportFileName", "export filename with filters");
  mustContain(render, "workwearExportSiteScope", "export site scope filter");
  mustContain(render, "workwearExportOrderScope", "export order scope filter");
  mustContain(server, "apiRouter.get('/store/export/:format(csv|excel|pdf)'", "server store export endpoint");
  mustContain(server, "canExportStoreData", "server export permission guard");
  mustContain(server, "FORBIDDEN", "server export forbidden response");
  mustContain(server, "export_store_csv", "store export audit csv");
  mustContain(server, "export_store_excel", "store export audit excel");
  mustContain(server, "export_store_pdf", "store export audit pdf");
  if (events.includes("store-export-${format}-${Date.now()}.json")) throw new Error("Export wizard still writes JSON file");

  console.log(JSON.stringify({ ok: true, checks: 13 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
