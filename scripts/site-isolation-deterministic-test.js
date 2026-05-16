const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const server = read("server/server.js");

  mustContain(server, "function canAccessSite(session, site)", "site access helper");
  mustContain(server, "responseState.sites = allowedSites", "site list scoping");
  mustContain(server, "allowedSites.forEach((site)", "siteData scoping loop");
  mustContain(server, "if (!site || !canAccessSite(session, site)) return;", "state merge site access guard");
  mustContain(server, "if (Array.isArray(merged.sites) && !merged.sites.includes(site)) return;", "site allowlist guard");
  mustContain(server, "responseState.accountNotifications = {", "account notification per-user scoping");
  mustContain(server, "if (sessionHasPermission(session, 'canManageAdmins'))", "admin-only global visibility guard");

  console.log(JSON.stringify({
    ok: true,
    checks: [
      "site_list_scoped",
      "site_data_scoped",
      "state_merge_site_guard",
      "account_notifications_scoped",
    ],
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
