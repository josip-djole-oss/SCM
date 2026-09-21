(function (global) {
  "use strict";
  const app = global.CMAX = global.CMAX || {};
  let configuration = null;
  let generation = 0;
  let events = null;
  let polling = null;
  let refreshing = null;
  let connected = false;
  const registry = () => global.SCMModuleRegistry;
  const activeSite = () => typeof currentSite === "undefined" ? "" : String(currentSite);

  function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(`scm:${name}`, { detail }));
  }

  function isEnabled(id, site = activeSite()) {
    return Boolean(configuration && configuration.site === String(site) && registry().isEnabled(configuration, id));
  }

  function allowsPermission(permission) {
    const definition = registry().forPermission(permission);
    return !definition || isEnabled(definition.id);
  }

  function allowsView(view) {
    const definition = registry().forScreen(view);
    return !definition || isEnabled(definition.id);
  }

  function updateVisibility() {
    if (typeof currentView !== "undefined" && !allowsView(currentView)) {
      if (typeof showHomeDashboard === "function") showHomeDashboard({ fresh: false, replaceRoute: true });
      if (typeof showToast === "function") showToast("Ovaj modul vise nije dostupan za trenutno gradiliste.", "info");
    }
    if (typeof applyPermissionVisibility === "function") applyPermissionVisibility();
    if (typeof renderHomeModuleCards === "function") renderHomeModuleCards();
    if (typeof startReportsPolling === "function") startReportsPolling();
    if (typeof startNotificationsPolling === "function") startNotificationsPolling();
    if (!isEnabled("chat") && typeof siteChatStopPolling === "function") siteChatStopPolling();
    if (!isEnabled("store") && typeof hideWorkwearSection === "function") hideWorkwearSection();
    if (typeof updateNotifBadge === "function") updateNotifBadge();
    document.querySelectorAll("[data-cmax-action]").forEach((element) => {
      const action = element.getAttribute("data-cmax-action") || "";
      const namespace = action === "tidplan.showPlanner" ? "planner" : action.split(".")[0];
      const definition = registry().get(namespace);
      if (definition) element.classList.toggle("project-module-disabled", !isEnabled(definition.id));
    });
    registry().list.forEach((definition) => {
      const selectors = definition.navSelectors || [];
      selectors.forEach((selector) => document.querySelectorAll(selector).forEach((element) => {
        element.classList.toggle("project-module-disabled", !isEnabled(definition.id));
      }));
    });
  }

  function apply(payload, options = {}) {
    if (!payload || payload.site !== activeSite() || !payload.modules || !Number.isFinite(Number(payload.version))) return false;
    if (configuration?.site === payload.site && Number(payload.version) < Number(configuration.version)) return false;
    const changed = !configuration || configuration.site !== payload.site || JSON.stringify(registry().normalize(configuration)) !== JSON.stringify(registry().normalize(payload));
    configuration = { site: payload.site, modules: registry().normalize(payload), version: Number(payload.version) };
    if (options.render !== false && changed) updateVisibility();
    if (changed) dispatch("modules-changed", configuration);
    return true;
  }

  async function request(site, options = {}) {
    const response = await fetch(`/api/projects/${encodeURIComponent(site)}/modules`, { cache: "no-store", ...options });
    const payload = await response.json();
    if (!response.ok) throw Object.assign(new Error(payload.error || "Ne mogu ucitati module gradilista."), { status: response.status });
    if (!payload.modules || payload.site !== site || !Number.isFinite(Number(payload.version))) throw new Error("Neispravna konfiguracija modula.");
    return payload;
  }

  async function load(site = activeSite()) {
    const ticket = ++generation;
    if (configuration?.site !== site) configuration = null;
    const payload = await request(site);
    if (ticket !== generation || site !== activeSite()) return null;
    apply(payload, { render: false });
    startRealtime();
    return payload;
  }

  function refresh() {
    if (refreshing) return refreshing;
    const site = activeSite();
    const ticket = generation;
    refreshing = request(site).then((payload) => {
      if (ticket === generation && site === activeSite()) apply(payload);
      return payload;
    }).finally(() => { refreshing = null; });
    return refreshing;
  }

  function startRealtime() {
    if (!polling) polling = setInterval(() => {
      if (!document.hidden) refresh().catch(() => dispatch("connection-lost"));
    }, 15000);
    if (events || typeof EventSource !== "function") return;
    events = new EventSource("/api/events");
    events.addEventListener("connected", () => {
      if (connected) {
        refresh().then(() => dispatch("reconnected")).catch(() => dispatch("connection-lost"));
      }
      connected = true;
    });
    events.addEventListener("error", () => dispatch("connection-lost"));
    ["project-modules-changed", "state-changed", "permissions-changed"].forEach((name) => {
      events.addEventListener(name, (event) => {
        let payload;
        try { payload = JSON.parse(event.data); } catch (_) { return; }
        if (payload.site && payload.site !== activeSite()) return;
        if (name === "project-modules-changed") {
          refresh().catch(() => dispatch("connection-lost"));
        } else dispatch(name, payload);
      });
    });
  }

  function reset() {
    ++generation;
    configuration = null;
    refreshing = null;
    if (events) events.close();
    if (polling) clearInterval(polling);
    events = null;
    polling = null;
    connected = false;
  }

  app.projectModules = { load, apply, reset, refresh, isEnabled, allowsPermission, allowsView, updateVisibility, request,
    get configuration() { return configuration; } };
})(window);
