function collectPlans() {
  const once = new Set();
  const onceM = new Set();
  const onceK = new Set();

  // Base lists from main planner state
  (appState.plans || []).forEach((p) => once.add(p));
  (appState.moments || []).forEach((m) => onceM.add(m));
  (appState.karnas || []).forEach((k) => onceK.add(k));

  // Also include anything defined directly in tidplan activity rows
  (tidplanData || []).forEach((row) => {
    if (row.plan) once.add(row.plan);
    if (row.moment) onceM.add(row.moment);
    if (row.karna) onceK.add(row.karna);
  });

  availablePlans = sortNaturally(Array.from(once));
  availableMoments = sortNaturally(Array.from(onceM));
  availableKarne = sortNaturally(Array.from(onceK));
}

function loadTidplanZones() {
  const storedZones = safeParseStoredJson(
    localStorage.getItem(getStorageKey("tidplan_zones")),
    null,
  );
  if (Array.isArray(storedZones) && storedZones.length) {
    tidplanZones = storedZones;
  } else {
    tidplanZones = [
      { name: "Zona A", color: "#8fbc8f" },
      { name: "Zona B", color: "#add8e6" },
      { name: "Zona C", color: "#f4a460" },
    ];
  }
}

function saveTidplanZones() {
  localStorage.setItem(
    getStorageKey("tidplan_zones"),
    JSON.stringify(tidplanZones),
  );
  syncModuleState("tidplan", { tidplan: tidplanData || [], tidplanZones: tidplanZones || [] }).catch(() => {});
}


function addTidplanZoneFromInputs() {
  if (!canEditTidplan()) return;
  const nameInput = document.getElementById("newZoneName");
  const colorInput = document.getElementById("newZoneColor");
  if (!nameInput || !colorInput) return;
  const name = nameInput.value.trim();
  const color = colorInput.value;
  if (!name) {
    showAlert("Unesite naziv zone.", "⚠️");
    return;
  }
  if (
    tidplanZones.some((z) => z.name.toLowerCase() === name.toLowerCase())
  ) {
    showAlert("Zona s tim nazivom već postoji.", "⚠️");
    return;
  }
  tidplanZones.push({ name, color });
  tidplanZones.sort((a, b) => compareNaturally(a.name, b.name));
  saveTidplanZones();
  CMAX.tidplan.update();
  renderZoneList();
  nameInput.value = "";
}

function clearAllTidplanZones() {
  if (!canEditTidplan()) return;
  showConfirm("Jeste li sigurni da želite obrisati sve zone?", null, "⚠️", () => {
    tidplanZones = [];
    saveTidplanZones();
    CMAX.tidplan.update();
    renderZoneList();
  });
}

function renderZoneList() {
  const editableTidplan = canEditTidplan();
  const locale = getCurrentLocale();
  const zoneList = document.getElementById("zoneList");
  if (!zoneList) return;
  zoneList.innerHTML = "";
  tidplanZones
    .slice()
    .sort((a, b) => compareNaturally(a.name, b.name))
    .forEach((zone) => {
      const btn = document.createElement("button");
      btn.className = "zone-btn";
      btn.disabled = !editableTidplan;
      const colorDot = document.createElement("div");
      colorDot.className = "zone-btn-color";
      colorDot.style.backgroundColor = zone.color;
      const nameSpan = document.createElement("span");
      nameSpan.textContent = zone.name;
      btn.appendChild(colorDot);
      btn.appendChild(nameSpan);
      btn.addEventListener("click", () => {
        if (!editableTidplan) return;
        showConfirm(`Želite li ukloniti zonu '${zone.name}'?`, null, "⚠️", () => {
          tidplanZones = tidplanZones.filter((z) => z.name !== zone.name);
          saveTidplanZones();
          CMAX.tidplan.update();
          renderZoneList();
        });
      });
      zoneList.appendChild(btn);
    });
}

function toggleZoneManager() {
  if (!canEditTidplan() || !hasPermission("canManageTidplanZones")) return;
  const panel = document.getElementById("zoneManagerPanel");
  if (!panel) return;
  panel.style.display =
    panel.style.display === "block" ? "none" : "block";
}

function getZonaColor(name) {
  const zone = tidplanZones.find((z) => z.name === name);
  if (zone) return zone.color;

  switch (name) {
    case "Zona A":
      return "#8fbc8f";
    case "Zona B":
      return "#add8e6";
    case "Zona C":
      return "#f4a460";
    default:
      return "#d3d3d3";
  }
}

function loadTidplanData() {
  tidplanData =
    safeParseStoredJson(localStorage.getItem(getStorageKey("tidplan")), []) || [];

  loadTidplanZones();

  // Resource options come from the fresh server snapshot mirrored into appState.
  availablePlans = getActiveResourceList("plans", appState.currentDate);
  availableMoments = getActiveResourceList("moments", appState.currentDate);
  availableKarne = getActiveResourceList("karnas", appState.currentDate);

  collectPlans();
}



