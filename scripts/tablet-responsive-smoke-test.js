const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const styles = read("public/styles.css");
  const html = read("public/index.html");
  const auth = read("public/js/core/auth.js");

  mustContain(styles, "@media (min-width: 641px) and (max-width: 1024px)", "tablet breakpoint");
  mustContain(styles, ".home-module-grid {", "tablet home grid rules");
  mustContain(styles, "repeat(2, minmax(0, 1fr))", "tablet 2-column layouts");
  mustContain(styles, ".header-right {\n    display: grid;", "tablet topbar grid");
  mustContain(styles, ".tidplan-controls {\n    grid-template-columns: repeat(2, minmax(0, 1fr));", "tablet tidplan controls grid");
  mustContain(styles, ".store-products-grid {", "tablet store product grid");
  mustContain(styles, ".warehouse-grid,", "tablet warehouse grid rule block");
  mustContain(styles, "min-width: 760px;", "table-local horizontal scroll min width");
  mustContain(html, 'class="warehouse-table-wrapper"', "warehouse table wrapper markup");
  mustContain(auth, 'if (typeof closeSidebarOnMobile === "function") closeSidebarOnMobile();', "route-change sidebar cleanup");

  console.log(JSON.stringify({ ok: true, checks: 10 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
