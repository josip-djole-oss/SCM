const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

function mustNotContain(source, token, label) {
  if (source.includes(token)) throw new Error(`Unexpected ${label}: ${token}`);
}

try {
  const server = read("server/server.js");
  const dataSync = read("public/js/core/dataSync.js");
  const warehouse = read("public/js/warehouse/warehouse.js");
  const tidplan = read("public/js/tidplan/tidplanRender.js");
  const tidplanState = read("public/js/tidplan/tidplanState.js");
  const bins = read("public/js/bins/bins.js");
  const workwearState = read("public/js/workwear/workwearState.js");
  const admin = read("public/js/admin/admin.js");
  const appState = read("public/js/core/appState.js");
  const reports = read("public/js/reports/reports.js");

  mustContain(server, "apiRouter.post('/state/module'", "module-scoped state endpoint");
  mustContain(server, "MODULE_STATE_ALLOWED_PAYLOAD_KEYS", "module payload allow-list");
  mustContain(server, "MODULE_PAYLOAD_SCOPE_ERROR", "cross-module payload rejection");
  mustContain(server, "MODULE_VERSION_CONFLICT", "module-specific conflict");
  mustContain(server, "bumpModuleStateVersion", "module version bump");

  mustContain(dataSync, "function syncModuleState", "client module sync helper");
  mustContain(dataSync, "function scheduleModuleSync", "client module sync scheduler");
  mustContain(dataSync, 'scheduleModuleSync("planner"', "planner scoped save");
  mustContain(warehouse, 'scheduleModuleSync("warehouse"', "warehouse scoped save");
  mustContain(tidplan, 'syncModuleState("tidplan"', "tidplan scoped save");
  mustContain(tidplanState, 'syncModuleState("tidplan"', "tidplan zones scoped save");
  mustContain(bins, 'scheduleModuleSync("bins"', "bins scoped save");
  mustContain(workwearState, 'scheduleModuleSync(target', "store scoped save");
  mustContain(admin, 'syncModuleState("adminUsers"', "admin scoped save");
  mustContain(appState, 'scheduleModuleSync("adminUsers"', "guest/admin settings scoped save");
  mustContain(reports, 'syncModuleState("adminUsers"', "password/admin scoped save");

  mustNotContain(warehouse, "scheduleServerSync", "warehouse global save");
  mustNotContain(tidplan, "syncServerState().catch", "tidplan global save");
  mustNotContain(bins, "scheduleServerSync()", "bins global save");

  console.log(JSON.stringify({ ok: true, checks: 18 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
