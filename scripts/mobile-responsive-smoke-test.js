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
  const styles = read("public/styles.css");
  const dashboard = read("public/js/dashboard/dashboard.js");
  const tidplanRender = read("public/js/tidplan/tidplanRender.js");
  const admin = read("public/js/admin/admin.js");

  mustContain(html, 'id="sidebarMobileToggleBtn"', "mobile sidebar toggle button");
  mustContain(html, 'id="appSidebarBackdrop"', "sidebar backdrop element");
  mustContain(styles, ".app-sidebar-backdrop", "sidebar backdrop styles");
  mustContain(styles, ".container.sidebar-overlay-open .app-sidebar-backdrop", "sidebar open backdrop state");
  mustContain(dashboard, 'event.key === "Escape"', "sidebar escape close handler");
  mustContain(styles, "@media (max-width: 640px)", "mobile breakpoint");
  mustContain(styles, ".planning-table th:first-child", "planner sticky first column mobile");
  mustContain(html, 'id="tidplanMobileList"', "tidplan mobile list markup");
  mustContain(tidplanRender, "function renderTidplanMobileList()", "tidplan mobile list renderer");
  mustContain(html, 'id="tidplanMobileTimelineDetails"', "tidplan mobile timeline details toggle");
  mustContain(styles, ".store-cart-drawer", "store cart drawer responsive styles");
  mustContain(styles, "width: 100vw !important;", "mobile full-width cart drawer");
  mustContain(styles, "#workwearManagerPanels", "mobile store manager overlay styles");
  mustContain(admin, "syncAdminResponsiveSections()", "admin mobile accordion sync");
  mustContain(styles, "#settings-section.admin-mobile-stack .tab-bar", "admin mobile stacked tabs styles");

  console.log(JSON.stringify({ ok: true, checks: 15 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
