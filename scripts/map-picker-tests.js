const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const sites = read("public/js/sites/sites.js");
  const dashboard = read("public/js/dashboard/dashboard.js");
  const namespace = read("public/js/core/namespace.js");
  const styles = read("public/styles.css");

  mustContain(sites, "normalizeSiteWizardCoordinate(value, min, max)", "coordinate validation helper");
  mustContain(sites, "normalizeSiteWizardCoordinate(info?.latitude, -90, 90)", "latitude range validation");
  mustContain(sites, "normalizeSiteWizardCoordinate(info?.longitude, -180, 180)", "longitude range validation");
  mustContain(sites, "siteWizardMapPicker", "map picker DOM");
  mustContain(sites, "window.L.map", "Leaflet/OpenStreetMap map");
  mustContain(sites, "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", "OpenStreetMap tile layer");
  mustContain(sites, "draggable: true", "draggable marker");
  mustContain(sites, "map.on(\"click\"", "click to drop pin");
  mustContain(sites, "fetch(`https://nominatim.openstreetmap.org/search", "address geocoding");
  mustContain(sites, "siteWizardGoogleMapsLink", "Google Maps link fallback input");
  mustContain(sites, "extractSiteWizardCoordinatesFromLink", "coordinate extraction fallback");
  mustContain(sites, "Postavite pin lokacije prije kreiranja gradilista.", "missing pin warning");
  mustContain(dashboard, "hasExactPin ? `${lat.toFixed(6)},${lng.toFixed(6)}`", "exact coordinate navigation");
  mustContain(dashboard, "https://www.google.com/maps/search/?api=1&query=${navQuery}", "Google Maps navigation link");
  mustContain(namespace, "findWizardLocation", "map finder namespace action");
  mustContain(namespace, "useMapsLink", "maps link namespace action");
  mustContain(namespace, "useWizardLocation", "confirm pin namespace action");
  mustContain(styles, ".site-map-picker", "map picker CSS");
  mustContain(styles, ".site-map-fallback", "map fallback CSS");

  console.log(JSON.stringify({ ok: true, checks: 19 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
