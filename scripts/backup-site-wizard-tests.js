const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const backups = read("public/js/admin/backups.js");
  const sites = read("public/js/sites/sites.js");
  const dashboard = read("public/js/dashboard/dashboard.js");
  const dataSync = read("public/js/core/dataSync.js");
  const namespace = read("public/js/core/namespace.js");
  const server = read("server/server.js");
  const styles = read("public/styles.css");

  mustContain(backups, "BACKUP_RESTORE_WIZARD_STEPS", "backup wizard steps");
  mustContain(backups, "/api/backup/restore/dry-run", "backup dry-run endpoint");
  mustContain(backups, "restoreToken", "restore token handling");
  mustContain(backups, "confirmationText: \"RESTORE\"", "typed restore confirmation");
  mustContain(backups, "/api/store/confirm-password", "password confirmation before restore");
  mustContain(backups, "Backend trenutno podrzava samo full restore", "restore scope safety copy");
  mustContain(backups, "/api/backup/restore", "restore API call");
  mustContain(sites, "NEW_SITE_WIZARD_STEPS", "new site wizard steps");
  mustContain(sites, "siteWizard_address", "site address field");
  mustContain(sites, "siteWizardMapPicker", "map picker container");
  mustContain(sites, "findSiteWizardLocation", "address geocode action");
  mustContain(sites, "setSiteWizardPin", "draggable/clickable pin setter");
  mustContain(sites, "normalizeSiteWizardCoordinate", "lat/lng validation");
  mustContain(sites, "siteWizard_latitude\" type=\"hidden", "latitude hidden field");
  mustContain(sites, "siteWizard_longitude\" type=\"hidden", "longitude hidden field");
  mustContain(sites, "extractSiteWizardCoordinatesFromLink", "Google Maps link coordinate fallback");
  mustContain(sites, "https://www.google.com/maps/search/?api=1&query=${navQuery}", "exact navigation link");
  mustContain(sites, "SITE_CONTACT_ROLES", "site contact role definitions");
  mustContain(sites, "siteWizard_workHours", "work hours field");
  mustContain(sites, "data-site-safety", "safety rule checkboxes");
  mustContain(sites, "siteWizard_parking", "parking field");
  mustContain(sites, "siteWizard_documents", "documents field");
  mustContain(sites, "siteWizard_defibrillator", "defibrillator field");
  mustContain(sites, "data-site-user", "user assignment cards");
  mustContain(sites, "data-site-module", "module selection cards");
  mustContain(sites, "createSiteWithMetadata", "site metadata creation");
  mustContain(sites, "syncModuleState(\"siteMetadata\"", "siteMetadata scoped save");
  mustContain(server, "'siteMetadata'", "server siteMetadata target");
  mustContain(server, "siteInfo", "server siteInfo payload");
  mustContain(dataSync, "cmax_site_info", "site info snapshot storage");
  mustContain(dashboard, "renderHomeSiteInfo", "home site information panel");
  mustContain(dashboard, "hasExactPin", "exact pin navigation guard");
  mustContain(dashboard, "Apple Maps", "apple maps navigation link");
  mustContain(dashboard, "home-site-contact-card", "home contact role cards");
  mustContain(dashboard, "Logistika i dokumenti", "logistics/document accordion");
  mustContain(dashboard, "isSiteModuleEnabled", "site module visibility");
  mustContain(namespace, "createFromWizard", "site wizard namespace");
  mustContain(namespace, "runBackupWizardRestore", "backup wizard namespace");
  mustContain(styles, ".backup-wizard-overlay", "backup wizard CSS");
  mustContain(styles, ".site-wizard-overlay", "site wizard CSS");
  mustContain(styles, ".home-site-info-panel", "site info CSS");

  console.log(JSON.stringify({ ok: true, checks: 41 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
