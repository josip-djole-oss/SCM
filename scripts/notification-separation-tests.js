const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const state = read("public/js/workwear/workwearState.js");
  const events = read("public/js/workwear/workwearEvents.js");
  const account = read("public/js/core/accountNotifications.js");
  const planner = read("public/js/planner/resourceManagement.js");
  const html = read("public/index.html");

  mustContain(state, "syncWorkwearAccountNotifications", "store->account notification bridge");
  mustContain(state, "pushAccountNotification", "account notification push usage");
  mustContain(state, "notificationEvents", "store notification event queue");
  mustContain(account, "topbarNotificationsBadge", "topbar account badge element wiring");
  mustContain(account, "markAllAccountNotificationsRead", "account read/unread action");
  mustContain(account, "getUnreadAccountNotificationsCount", "account unread counter");
  mustContain(planner, "notificationsSidebarBadge", "site notifications sidebar badge");
  mustContain(events, "addWorkwearNotification", "store notification emitter");
  mustContain(html, "accountNotificationsPanel", "account notifications panel");
  mustContain(html, "notificationsSidebarBadge", "site notifications sidebar badge element");

  if (events.includes("saveNotificationsForSite(")) {
    throw new Error("Store module still writes site notifications directly");
  }
  if (events.includes("getNotificationsForSite(")) {
    throw new Error("Store module still reads site notifications directly");
  }

  console.log(JSON.stringify({
    ok: true,
    checks: [
      "store_notifications_to_account_layer",
      "site_notifications_sidebar_badge_preserved",
      "account_unread_badge_wired",
      "store_not_writing_site_notifications",
    ],
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
