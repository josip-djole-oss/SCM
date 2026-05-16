const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const html = read("public/index.html");
  const admin = read("public/js/admin/admin.js");
  const state = read("public/js/workwear/workwearState.js");
  const styles = read("public/styles.css");

  mustContain(html, 'id="newAdminRolePanel"', "admin role/function panel");
  mustContain(admin, "renderNewAdminRolePanel", "admin role panel renderer");
  mustContain(admin, "storeRoles", "store roles persistence on user");
  mustContain(admin, "admin-function-badge", "function badge rendering");
  mustContain(styles, ".admin-function-badge", "function badge styles");
  mustContain(state, "getCurrentStoreRoleKeys", "store visibility role resolver");
  mustContain(state, "matchedUser.storeRoles", "store visibility uses global user function");

  console.log(JSON.stringify({ ok: true, checks: 7 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
