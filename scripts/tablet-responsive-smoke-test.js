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
  const accountNotifications = read("public/js/core/accountNotifications.js");
  const auth = read("public/js/core/auth.js");

  mustContain(styles, "@media (min-width: 641px) and (max-width: 1024px)", "tablet breakpoint");
  mustContain(styles, "left: 50%;", "tablet centered notifications positioning");
  mustContain(styles, "transform: translateX(-50%);", "tablet centered panel transform");
  mustContain(styles, "width: min(540px, calc(100vw - 32px));", "tablet notifications width guard");
  mustContain(styles, "grid-template-columns: repeat(2, minmax(0, 1fr));", "tablet store grid");
  mustContain(styles, "width: min(560px, 94vw);", "tablet cart drawer width");
  mustContain(styles, "justify-content: flex-end;", "tablet header wrapping");
  mustContain(styles, "flex-wrap: wrap;", "legacy tablet header wrapping");
  mustContain(html, 'id="topbarNotificationsBtn"', "notifications trigger markup");
  mustContain(accountNotifications, "backdrop.addEventListener(\"click\", closeAccountNotificationsPanel);", "notifications backdrop close");
  mustContain(auth, "if (typeof closeSidebarOnMobile === \"function\") closeSidebarOnMobile();", "route change closes mobile sidebar");

  console.log(JSON.stringify({ ok: true, checks: 10 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
