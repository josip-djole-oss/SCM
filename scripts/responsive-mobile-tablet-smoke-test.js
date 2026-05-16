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

  mustContain(styles, "@media (max-width: 640px)", "mobile breakpoint");
  mustContain(styles, "@media (min-width: 641px) and (max-width: 1024px)", "tablet breakpoint");
  mustContain(styles, ".store-products-grid", "store grid responsive styles");
  mustContain(styles, ".store-cart-drawer", "cart drawer responsive styles");
  mustContain(styles, ".header", "header responsive styles");
  mustContain(styles, "overflow-x: hidden", "global horizontal overflow guard");
  mustContain(html, 'id="workwearCartOverlay"', "store cart overlay markup");
  mustContain(html, 'id="tidplan-section"', "tidplan section markup");
  mustContain(html, 'id="settings-section"', "admin/settings section markup");

  console.log(JSON.stringify({ ok: true, checks: 9 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
