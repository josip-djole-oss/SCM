const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

try {
  const state = read("public/js/workwear/workwearState.js");
  const sites = read("public/js/sites/sites.js");

  if (!state.includes("getSiteStorageKey(WORKWEAR_STORAGE_PREFIX")) {
    throw new Error("workwear state is not site-scoped");
  }

  if (!sites.includes("cmax_workwear_data")) {
    throw new Error("site add/remove logic missing cmax_workwear_data");
  }

  console.log(JSON.stringify({ ok: true, scoped: true }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
