const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) {
    throw new Error(`Missing ${label}: ${token}`);
  }
}

try {
  const html = read("public/index.html");
  const admin = read("public/js/admin/admin.js");
  const namespace = read("public/js/core/namespace.js");
  const styles = read("public/styles.css");

  mustContain(html, 'id="adminUserWizardOpenBtn"', "wizard launch button");
  mustContain(html, 'id="adminUserWizardOverlay"', "wizard overlay");
  mustContain(admin, "ADMIN_USER_WIZARD_STEPS", "step model");
  mustContain(admin, "Step 1 - Osnovni podaci", "basic step");
  mustContain(admin, "Funkcija nije isto sto i permissions", "function vs permissions explanation");
  mustContain(admin, "data-wizard-site", "site checkbox cards");
  mustContain(admin, "ADMIN_USER_PERMISSION_GROUPS", "grouped permissions");
  mustContain(admin, "ADMIN_USER_PRESETS", "role presets");
  mustContain(admin, "Opasna prava", "dangerous permission warning");
  mustContain(admin, "saveAdminUserWizard", "wizard save handler");
  mustContain(admin, 'syncModuleState("adminUsers"', "adminUsers scoped save");
  mustContain(admin, "Ne mozete mijenjati vlastita opasna prava", "self-escalation guard");
  mustContain(namespace, "openUserWizard", "namespace open action");
  mustContain(namespace, "saveUserWizard", "namespace save action");
  mustContain(styles, ".admin-user-wizard-overlay", "wizard overlay styles");
  mustContain(styles, "@media (max-width: 720px)", "mobile wizard breakpoint");
  mustContain(styles, "min-height: 100dvh", "mobile fullscreen wizard");

  console.log(JSON.stringify({ ok: true, checks: 17 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
