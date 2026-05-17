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
  const render = read("public/js/workwear/workwearRender.js");
  const accountNotifications = read("public/js/core/accountNotifications.js");

  mustContain(styles, "@media (max-width: 640px)", "mobile breakpoint");
  mustContain(styles, "overflow-x: hidden", "global horizontal overflow guard");
  mustContain(styles, ".account-notifications-panel", "account notifications panel styles");
  mustContain(styles, "width: 100vw;", "mobile full-width sheet sizing");
  mustContain(styles, "grid-template-columns: repeat(2, minmax(0, 1fr)) !important;", "compact summary grid layout");
  mustContain(styles, "min-height: 44px;", "touch target minimum size");
  mustContain(styles, ".store-manager-overlay .store-modal-shell", "manager editor mobile overlay styles");
  mustContain(styles, ".store-orders-launcher-card", "orders launcher card styles");
  mustContain(styles, ".store-search-row", "store search row mobile stack");
  mustContain(html, 'id="accountNotificationsBackdrop"', "account notifications backdrop markup");
  mustContain(html, 'id="workwearManagerOverlay"', "store manager overlay markup");
  mustContain(html, 'id="workwearOrdersOverlay"', "store orders overlay markup");
  mustContain(render, "document.body.classList.toggle(\"workwear-orders-open\", shouldShow);", "orders overlay body lock");
  mustContain(accountNotifications, "document.body.classList.add(\"account-notifications-open\")", "account notifications open body class");

  console.log(JSON.stringify({ ok: true, checks: 14 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
