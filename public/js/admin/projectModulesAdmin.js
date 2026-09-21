(function (global) {
  "use strict";
  const app = global.CMAX = global.CMAX || {};
  let requestId = 0;
  let loaded = null;

  async function loadEditor() {
    const host = document.getElementById("projectModuleOptions");
    const save = document.getElementById("saveProjectModules");
    const status = document.getElementById("projectModulesStatus");
    const site = document.getElementById("projectModulesSite").value;
    const ticket = ++requestId;
    loaded = null;
    save.disabled = true;
    host.replaceChildren();
    status.textContent = "Ucitavanje modula...";
    try {
      const payload = await app.projectModules.request(site);
      if (ticket !== requestId) return;
      loaded = payload;
      global.SCMModuleRegistry.list.forEach((definition) => {
        const label = document.createElement("label");
        label.className = "project-module-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.moduleId = definition.id;
        checkbox.checked = global.SCMModuleRegistry.isEnabled(payload, definition.id);
        const name = document.createElement("span");
        name.textContent = definition.label || definition.name;
        label.append(checkbox, name);
        if (definition.dependencies?.length) {
          const note = document.createElement("small");
          note.textContent = `Zahtijeva: ${definition.dependencies.map((id) => global.SCMModuleRegistry.get(id).label).join(", ")}`;
          label.append(note);
        }
        host.append(label);
      });
      save.disabled = false;
      status.textContent = "Iskljucivanje modula cuva sve postojece podatke.";
    } catch (error) {
      if (ticket === requestId) status.textContent = `${error.message} Ponovno odaberite gradiliste za pokusaj.`;
    }
  }

  async function saveEditor() {
    if (!loaded) return;
    const save = document.getElementById("saveProjectModules");
    if (save.disabled) return;
    const select = document.getElementById("projectModulesSite");
    const status = document.getElementById("projectModulesStatus");
    const modules = {};
    document.querySelectorAll("#projectModuleOptions input").forEach((input) => { modules[input.dataset.moduleId] = input.checked; });
    save.disabled = true;
    select.disabled = true;
    status.textContent = "Spremanje...";
    try {
      const payload = await app.projectModules.request(loaded.site, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules, baseVersion: loaded.version }),
      });
      loaded = payload;
      app.projectModules.apply(payload);
      status.textContent = "Moduli su spremljeni. Povezani korisnici primaju novu konfiguraciju.";
    } catch (error) {
      status.textContent = error.status === 409
        ? "Drugi administrator je promijenio module. Ponovno odaberite gradiliste i pregledajte promjene."
        : `Nije spremljeno: ${error.message}`;
    } finally {
      select.disabled = false;
      save.disabled = false;
    }
  }

  function render() {
    const panel = document.getElementById("projectModulesAdmin");
    if (!panel) return;
    panel.hidden = !appState.isSuperAdmin;
    if (!appState.isSuperAdmin) return;
    const select = document.getElementById("projectModulesSite");
    select.replaceChildren();
    (typeof getAccessibleSites === "function" ? getAccessibleSites() : []).forEach((site) => {
      const option = document.createElement("option");
      option.value = site;
      option.textContent = site;
      option.selected = site === currentSite;
      select.append(option);
    });
    select.onchange = loadEditor;
    document.getElementById("saveProjectModules").onclick = saveEditor;
    if (select.value) loadEditor();
  }
  app.projectModulesAdmin = { render };
})(window);
