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
  const accountNotifications = read("public/js/core/accountNotifications.js");
  const render = read("public/js/workwear/workwearRender.js");

  mustContain(html, 'id="workwearCartOverlay"', "cart overlay");
  mustContain(html, 'class="store-cart-icon"', "cart icon span");
  mustContain(styles, ".store-cart-drawer", "cart drawer class");
  mustContain(styles, "background: #ffffff;", "non-transparent cart drawer background");
  mustContain(styles, "backdrop-filter: blur(3px);", "cart overlay blur backdrop");
  mustContain(accountNotifications, 'count > 99 ? "99+" : String(count)', "99+ topbar badge");
  mustContain(accountNotifications, 'button.classList.toggle("has-badge", count > 0)', "topbar badge class toggle");
  mustContain(styles, ".topbar-bell.has-badge", "topbar bell expanded style");
  mustContain(styles, ".account-notifications-panel", "account notifications panel style");
  mustContain(styles, "position: fixed;", "mobile fixed overlay support");
  mustContain(styles, "left: 12px;", "mobile in-screen left clamp");
  mustContain(styles, "right: 12px;", "mobile in-screen right clamp");
  mustContain(styles, ".logo-section", "logo section alignment styles");
  mustContain(styles, "margin-top: -10px;", "logo raised upward");
  mustContain(render, "workwearSettingsRenewalAmount", "renewal amount settings field");
  mustContain(render, "workwearSettingsRenewalMonths", "renewal months settings field");
  mustContain(render, "Koliko budzeta se automatski dodaje korisniku pri obnovi", "renewal amount description");

  console.log(JSON.stringify({ ok: true, checks: 17 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
