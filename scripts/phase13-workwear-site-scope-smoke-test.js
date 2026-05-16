const fs = require("fs");
const path = require("path");

const state = fs.readFileSync(path.join(process.cwd(), "public/js/workwear/workwearState.js"), "utf8");
const sites = fs.readFileSync(path.join(process.cwd(), "public/js/sites/sites.js"), "utf8");

try {
  if (!state.includes("getSiteStorageKey(WORKWEAR_STORAGE_PREFIX")) throw new Error("state key not site scoped");
  if (!sites.includes("cmax_workwear_data")) throw new Error("site add/remove not aware of workwear key");
  console.log(JSON.stringify({ ok: true, check: "site_scoped_storage_only" }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
