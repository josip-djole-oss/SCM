function populateSiteSelect() {
  const select = document.getElementById("siteSelect");
  const accessibleSites = getAccessibleSites();
  if (accessibleSites.length && !accessibleSites.includes(currentSite)) {
    persistCurrentStateToLocalStorage();
    currentSite = accessibleSites[0];
    setStoredCurrentSitePreference(currentSite);
    updateScopedStorageKeysForCurrentSite();
    loadCurrentSiteRuntimeFromLocalStorage();
  }
  if (select) {
    select.innerHTML = "";
    accessibleSites
      .slice()
      .sort((a, b) => a.localeCompare(b, "hr"))
      .forEach((site) => {
        const option = document.createElement("option");
        option.value = site;
        option.textContent = site;
        if (site === currentSite) option.selected = true;
        select.appendChild(option);
      });
    // Add event listener for site selection changes
    select.removeEventListener("change", changeSite);
    select.addEventListener("change", changeSite);
  }
  renderSiteSwitcher();
  renderNotificationSiteOptions();
}

function renderSiteSwitcher() {
  const label = document.getElementById("siteSwitcherLabel");
  if (label)
    label.textContent = `${t("tidplanSiteSelector")} ${currentSite}`;

  const addBtn = document.querySelector(
    "#siteDropdown .site-dropdown-actions button:nth-child(1)",
  );
  if (addBtn) addBtn.textContent = t("tidplanAddSite");
  const removeBtn = document.querySelector(
    "#siteDropdown .site-dropdown-actions button:nth-child(2)",
  );
  if (removeBtn) removeBtn.textContent = t("tidplanRemoveSite");

  const container = document.getElementById("siteListContainer");
  if (!container) return;
  container.innerHTML = "";
  getAccessibleSites()
    .slice()
    .sort((a, b) => a.localeCompare(b, "hr"))
    .forEach((site) => {
      const item = document.createElement("button");
      item.className = "btn btn-small site-option";
      item.style.margin = "2px";
      item.textContent = site;
      item.addEventListener("click", () => {
        withLoadingPromise("loadingSiteChange", () => {
          switchSiteFromLocal(site);
          closeSiteDropdown();
          return Promise.resolve();
        });
      });
      container.appendChild(item);
    });
}

function toggleSiteDropdown() {
  const dropdown = document.getElementById("siteDropdown");
  if (!dropdown) return;
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

function closeSiteDropdown() {
  const dropdown = document.getElementById("siteDropdown");
  if (!dropdown) return;
  dropdown.style.display = "none";
}

window.addEventListener("click", (event) => {
  const switcher = document.querySelector(".site-switcher");
  const dropdown = document.getElementById("siteDropdown");
  if (switcher && dropdown && !event.target.closest(".site-switcher")) {
    dropdown.style.display = "none";
  }

  const plannerExportDropdown = document.getElementById("plannerExportDropdownMenu");
  if (plannerExportDropdown && !event.target.closest("#plannerExportDropdown")) {
    plannerExportDropdown.classList.remove("show");
  }
  const sortGroup = document.querySelector(".tidplan-controls .sort-group");
  if (sortGroup && !sortGroup.contains(event.target)) {
    closeTidplanSortMenu();
  }
});

function promptAddSite() {
  closeSiteDropdown();
  openNewSiteWizard();
}

var NEW_SITE_WIZARD_STEPS = [
  { key: "basic", title: "Osnovno" },
  { key: "users", title: "Korisnici" },
  { key: "modules", title: "Moduli" },
  { key: "defaults", title: "Postavke" },
  { key: "template", title: "Predlozak" },
  { key: "review", title: "Pregled" },
];

var SITE_MODULE_OPTIONS = [
  { key: "planner", label: "Planner" },
  { key: "tidplan", label: "Tidplan" },
  { key: "warehouse", label: "Warehouse" },
  { key: "store", label: "Store" },
  { key: "notifications", label: "Notifications" },
  { key: "surveys", label: "Surveys" },
  { key: "siteChat", label: "Chat" },
  { key: "reports", label: "Reports" },
];

var SITE_CONTACT_ROLES = [
  { key: "arbetsledare", label: "Arbetsledare" },
  { key: "projektledare", label: "Projektledare" },
  { key: "electricians", label: "Elektricari" },
  { key: "ventilation", label: "Ventilacija" },
  { key: "other", label: "Ostali" },
];

var SITE_SAFETY_RULE_OPTIONS = [
  "Kaciga obavezna",
  "Reflektirajuci prsluk",
  "Zastitne naocale",
  "Registracija pri dolasku",
  "Zabranjeno pusenje",
  "Lift pravila",
  "Posebne sigurnosne upute",
];

var newSiteWizardState = {
  open: false,
  step: 0,
  draft: null,
};

var siteWizardMapState = {
  map: null,
  marker: null,
  ready: false,
  leafletLoading: null,
  center: { lat: 59.3293, lng: 18.0686 },
};

function normalizeSiteWizardCoordinate(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return Math.round(num * 1000000) / 1000000;
}

function hasValidSiteWizardPin(info) {
  return normalizeSiteWizardCoordinate(info?.latitude, -90, 90) !== null
    && normalizeSiteWizardCoordinate(info?.longitude, -180, 180) !== null;
}

function formatSiteWizardPin(info) {
  if (!hasValidSiteWizardPin(info)) return "";
  const lat = normalizeSiteWizardCoordinate(info.latitude, -90, 90);
  const lng = normalizeSiteWizardCoordinate(info.longitude, -180, 180);
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function getSiteWizardAddressQuery(draft = getNewSiteWizardDraft()) {
  return [draft.address, draft.postalCode, draft.city, draft.country].filter(Boolean).join(", ");
}

function setSiteWizardPin(lat, lng, options = {}) {
  const cleanLat = normalizeSiteWizardCoordinate(lat, -90, 90);
  const cleanLng = normalizeSiteWizardCoordinate(lng, -180, 180);
  if (cleanLat === null || cleanLng === null) {
    showToast("Lokacija nije validna. Latitude mora biti -90..90, longitude -180..180.", "error");
    return false;
  }
  const draft = getNewSiteWizardDraft();
  draft.latitude = cleanLat;
  draft.longitude = cleanLng;
  siteWizardMapState.center = { lat: cleanLat, lng: cleanLng };
  const latInput = document.getElementById("siteWizard_latitude");
  const lngInput = document.getElementById("siteWizard_longitude");
  const pinInfo = document.getElementById("siteWizardPinInfo");
  if (latInput) latInput.value = String(cleanLat);
  if (lngInput) lngInput.value = String(cleanLng);
  if (pinInfo) pinInfo.textContent = `Pin: ${cleanLat.toFixed(6)}, ${cleanLng.toFixed(6)}`;
  if (siteWizardMapState.marker?.setLatLng) siteWizardMapState.marker.setLatLng([cleanLat, cleanLng]);
  if (siteWizardMapState.map?.setView && options.setView !== false) siteWizardMapState.map.setView([cleanLat, cleanLng], options.zoom || 16);
  return true;
}

function extractSiteWizardCoordinatesFromLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /(?:^|[^\d-])(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})(?:[^\d]|$)/,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    const lat = normalizeSiteWizardCoordinate(match[1], -90, 90);
    const lng = normalizeSiteWizardCoordinate(match[2], -180, 180);
    if (lat !== null && lng !== null) return { lat, lng };
  }
  return null;
}

function loadSiteWizardLeaflet() {
  if (window.L?.map) return Promise.resolve(true);
  if (siteWizardMapState.leafletLoading) return siteWizardMapState.leafletLoading;
  siteWizardMapState.leafletLoading = new Promise((resolve) => {
    if (!document.querySelector("link[data-site-wizard-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.siteWizardLeaflet = "true";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.addEventListener("load", () => resolve(Boolean(window.L?.map)), { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(script);
  });
  return siteWizardMapState.leafletLoading;
}

function destroySiteWizardMap() {
  if (siteWizardMapState.map?.remove) siteWizardMapState.map.remove();
  siteWizardMapState.map = null;
  siteWizardMapState.marker = null;
  siteWizardMapState.ready = false;
}

function renderSiteWizardFallbackMap(container, draft) {
  const pinText = formatSiteWizardPin(draft);
  container.innerHTML = `
    <div class="site-map-fallback">
      <strong>Map picker fallback</strong>
      <p>Mapa se nije mogla ucitati. Zalijepi Google Maps link sa pinom ili klikni okvir za probni pin oko trenutne lokacije.</p>
      <span>${siteWizardEscape(pinText || "Pin jos nije postavljen.")}</span>
    </div>
  `;
  if (container.dataset.fallbackClickBound === "true") return;
  container.dataset.fallbackClickBound = "true";
  container.addEventListener("click", (event) => {
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1)));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(rect.height, 1)));
    const base = siteWizardMapState.center || { lat: 59.3293, lng: 18.0686 };
    setSiteWizardPin(base.lat + (0.02 - y * 0.04), base.lng + (x * 0.04 - 0.02), { setView: false });
  });
}

function initSiteWizardMapPicker() {
  const container = document.getElementById("siteWizardMapPicker");
  if (!container || !newSiteWizardState.open) return;
  const draft = getNewSiteWizardDraft();
  const pinLat = normalizeSiteWizardCoordinate(draft.latitude, -90, 90);
  const pinLng = normalizeSiteWizardCoordinate(draft.longitude, -180, 180);
  const center = pinLat !== null && pinLng !== null
    ? { lat: pinLat, lng: pinLng }
    : siteWizardMapState.center;
  destroySiteWizardMap();
  loadSiteWizardLeaflet().then((ok) => {
    if (!document.getElementById("siteWizardMapPicker")) return;
    if (!ok || !window.L?.map) {
      renderSiteWizardFallbackMap(container, draft);
      return;
    }
    container.innerHTML = "";
    const map = window.L.map(container, { scrollWheelZoom: false }).setView([center.lat, center.lng], pinLat !== null ? 16 : 6);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    const marker = window.L.marker([center.lat, center.lng], { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setSiteWizardPin(pos.lat, pos.lng, { setView: false });
    });
    map.on("click", (event) => setSiteWizardPin(event.latlng.lat, event.latlng.lng, { setView: false }));
    siteWizardMapState.map = map;
    siteWizardMapState.marker = marker;
    siteWizardMapState.ready = true;
    setTimeout(() => map.invalidateSize(), 80);
    if (pinLat !== null && pinLng !== null) setSiteWizardPin(pinLat, pinLng, { setView: false });
  });
}

function getSiteInfoStorage(site = currentSite) {
  return safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_site_info", site)), {}) || {};
}

function saveSiteInfoStorage(site, info) {
  localStorage.setItem(getSiteStorageKey("cmax_site_info", site), JSON.stringify(info || {}));
}

function isSiteModuleEnabled(moduleKey, site = currentSite) {
  const info = getSiteInfoStorage(site);
  const modules = info.modules && typeof info.modules === "object" ? info.modules : null;
  if (!modules) return true;
  return modules[moduleKey] !== false;
}

function getDefaultSiteInfo(siteName = "") {
  return {
    name: siteName,
    description: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Sweden",
    latitude: "",
    longitude: "",
    projectName: siteName,
    investor: "",
    mainContractor: "",
    contactPerson: "",
    phone: "",
    email: "",
    status: "active",
    startDate: "",
    plannedEndDate: "",
    progress: 0,
    assignedUsers: [],
    modules: Object.fromEntries(SITE_MODULE_OPTIONS.map((item) => [item.key, true])),
    defaults: {
      plannerDays: true,
      warehouseCategories: true,
      storeCatalog: false,
      chatEnabled: true,
      defaultNotifications: false,
    },
    templateSite: "",
    contacts: SITE_CONTACT_ROLES.map((role) => ({
      role: role.key,
      label: role.label,
      name: "",
      phone: "",
      email: "",
    })),
    workHours: {
      days: "Ponedjeljak-Petak",
      hours: "07:00-16:00",
      breaks: ["09:00-09:30", "12:00-12:30"],
    },
    safetyRules: SITE_SAFETY_RULE_OPTIONS.slice(0, 4),
    customSafetyRules: [],
    logistics: {
      parking: "",
      storage: "",
      unloadingZone: "",
      apdPlan: "",
    },
    emergency: {
      emergencyNumber: "112",
      hospital: "",
      firstAid: "",
      fireDepartment: "",
      meetingPoint: "",
      defibrillator: "",
    },
    documents: [],
  };
}

function getNewSiteWizardDraft() {
  if (!newSiteWizardState.draft) newSiteWizardState.draft = getDefaultSiteInfo("");
  return newSiteWizardState.draft;
}

function siteWizardEscape(value) {
  return typeof escapeHtml === "function" ? escapeHtml(value) : String(value || "");
}

function ensureNewSiteWizardOverlay() {
  let overlay = document.getElementById("newSiteWizardOverlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "newSiteWizardOverlay";
  overlay.className = "site-wizard-overlay";
  overlay.innerHTML = `
    <div class="site-wizard-shell" role="dialog" aria-modal="true" aria-labelledby="newSiteWizardTitle">
      <div class="site-wizard-head">
        <div>
          <div class="admin-compose-eyebrow">New Site Wizard</div>
          <h3 id="newSiteWizardTitle">Dodaj gradiliste</h3>
        </div>
        <button class="site-wizard-close" type="button" data-cmax-action="sites.closeWizard" aria-label="Zatvori">&times;</button>
      </div>
      <div id="newSiteWizardStepper" class="site-wizard-stepper"></div>
      <div id="newSiteWizardBody" class="site-wizard-body"></div>
      <div class="site-wizard-footer">
        <button class="btn btn-ghost" type="button" data-cmax-action="sites.closeWizard">Odustani</button>
        <button class="btn btn-ghost" type="button" data-cmax-action="sites.wizardBack" id="newSiteWizardBackBtn">Nazad</button>
        <button class="btn" type="button" data-cmax-action="sites.wizardNext" id="newSiteWizardNextBtn">Dalje</button>
        <button class="btn btn-success" type="button" data-cmax-action="sites.createFromWizard" data-cmax-server-action="true" data-cmax-loading-key="loadingSiteChange" id="newSiteWizardCreateBtn">Kreiraj</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeNewSiteWizard();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && newSiteWizardState.open) closeNewSiteWizard();
  });
  return overlay;
}

function openNewSiteWizard() {
  if (!canManageSiteAccess()) {
    showToast(t("errAdminManageDenied") || "Nemate dozvolu.", "error");
    return;
  }
  newSiteWizardState = { open: true, step: 0, draft: getDefaultSiteInfo("") };
  const overlay = ensureNewSiteWizardOverlay();
  overlay.classList.add("is-open");
  document.body.classList.add("modal-open");
  renderNewSiteWizard();
}

function closeNewSiteWizard() {
  const overlay = document.getElementById("newSiteWizardOverlay");
  if (overlay) overlay.classList.remove("is-open");
  document.body.classList.remove("modal-open");
  newSiteWizardState.open = false;
  destroySiteWizardMap();
}

function collectNewSiteWizardStep() {
  if (!newSiteWizardState.open) return;
  const draft = getNewSiteWizardDraft();
  ["name", "description", "address", "postalCode", "city", "country", "projectName", "investor", "mainContractor", "contactPerson", "phone", "email", "startDate", "plannedEndDate", "progress"].forEach((key) => {
    const el = document.getElementById(`siteWizard_${key}`);
    if (el) draft[key] = el.value;
  });
  const latEl = document.getElementById("siteWizard_latitude");
  const lngEl = document.getElementById("siteWizard_longitude");
  if (latEl && lngEl) {
    const lat = normalizeSiteWizardCoordinate(latEl.value, -90, 90);
    const lng = normalizeSiteWizardCoordinate(lngEl.value, -180, 180);
    draft.latitude = lat === null ? "" : lat;
    draft.longitude = lng === null ? "" : lng;
  }
  const status = document.getElementById("siteWizard_status");
  if (status) draft.status = status.value;
  const userInputs = document.querySelectorAll("#newSiteWizardBody input[data-site-user]");
  if (userInputs.length) {
    draft.assignedUsers = Array.from(userInputs).filter((cb) => cb.checked).map((cb) => cb.dataset.siteUser);
  }
  const moduleInputs = document.querySelectorAll("#newSiteWizardBody input[data-site-module]");
  if (moduleInputs.length) {
    moduleInputs.forEach((cb) => { draft.modules[cb.dataset.siteModule] = cb.checked; });
  }
  const defaultInputs = document.querySelectorAll("#newSiteWizardBody input[data-site-default]");
  if (defaultInputs.length) {
    defaultInputs.forEach((cb) => { draft.defaults[cb.dataset.siteDefault] = cb.checked; });
  }
  const template = document.getElementById("siteWizard_templateSite");
  if (template) draft.templateSite = template.value;
  draft.contacts = SITE_CONTACT_ROLES.map((role) => ({
    role: role.key,
    label: role.label,
    name: document.getElementById(`siteWizard_contact_${role.key}_name`)?.value || "",
    phone: document.getElementById(`siteWizard_contact_${role.key}_phone`)?.value || "",
    email: document.getElementById(`siteWizard_contact_${role.key}_email`)?.value || "",
  }));
  const workDays = document.getElementById("siteWizard_workDays");
  const workHours = document.getElementById("siteWizard_workHours");
  const workBreaks = document.getElementById("siteWizard_workBreaks");
  draft.workHours = {
    days: workDays?.value || draft.workHours?.days || "",
    hours: workHours?.value || draft.workHours?.hours || "",
    breaks: splitSiteWizardLines(workBreaks?.value || ""),
  };
  const selectedSafety = Array.from(document.querySelectorAll("#newSiteWizardBody input[data-site-safety]:checked")).map((cb) => cb.dataset.siteSafety);
  const customSafety = splitSiteWizardLines(document.getElementById("siteWizard_customSafety")?.value || "");
  if (selectedSafety.length || document.getElementById("siteWizard_customSafety")) {
    draft.safetyRules = selectedSafety.concat(customSafety);
    draft.customSafetyRules = customSafety;
  }
  draft.logistics = {
    parking: document.getElementById("siteWizard_parking")?.value || draft.logistics?.parking || "",
    storage: document.getElementById("siteWizard_storage")?.value || draft.logistics?.storage || "",
    unloadingZone: document.getElementById("siteWizard_unloadingZone")?.value || draft.logistics?.unloadingZone || "",
    apdPlan: document.getElementById("siteWizard_apdPlan")?.value || draft.logistics?.apdPlan || "",
  };
  draft.documents = splitSiteWizardLines(document.getElementById("siteWizard_documents")?.value || "");
  draft.emergency = {
    emergencyNumber: document.getElementById("siteWizard_emergencyNumber")?.value || draft.emergency?.emergencyNumber || "112",
    hospital: document.getElementById("siteWizard_hospital")?.value || draft.emergency?.hospital || "",
    firstAid: document.getElementById("siteWizard_firstAid")?.value || draft.emergency?.firstAid || "",
    fireDepartment: document.getElementById("siteWizard_fireDepartment")?.value || draft.emergency?.fireDepartment || "",
    meetingPoint: document.getElementById("siteWizard_meetingPoint")?.value || draft.emergency?.meetingPoint || "",
    defibrillator: document.getElementById("siteWizard_defibrillator")?.value || draft.emergency?.defibrillator || "",
  };
}

function splitSiteWizardLines(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateNewSiteWizardStep() {
  const draft = getNewSiteWizardDraft();
  const step = NEW_SITE_WIZARD_STEPS[newSiteWizardState.step]?.key;
  if (step === "basic") {
    if (!String(draft.name || "").trim()) {
      showToast("Unesite naziv gradilista.", "error");
      return false;
    }
    if (sites.includes(String(draft.name).trim())) {
      showToast("Gradiliste s tim nazivom vec postoji.", "error");
      return false;
    }
  }
  if (step === "review" && !hasValidSiteWizardPin(draft)) {
    showToast("Postavite pin lokacije prije kreiranja gradilista.", "error");
    return false;
  }
  return true;
}

function findSiteWizardLocation() {
  collectNewSiteWizardStep();
  const draft = getNewSiteWizardDraft();
  const queryInput = document.getElementById("siteWizard_locationSearch");
  const query = String(queryInput?.value || getSiteWizardAddressQuery(draft) || "").trim();
  if (!query) {
    showToast("Upisite adresu za trazenje lokacije.", "error");
    return Promise.resolve(false);
  }
  const button = document.querySelector("[data-cmax-action='sites.findWizardLocation']");
  if (button) button.setAttribute("disabled", "disabled");
  return fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
  })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Geocode failed")))
    .then((results) => {
      const result = Array.isArray(results) ? results[0] : null;
      if (!result) {
        showToast("Lokacija nije pronadjena. Probajte precizniju adresu ili zalijepite Google Maps link.", "error");
        return false;
      }
      if (result.display_name && queryInput) queryInput.value = result.display_name;
      setSiteWizardPin(result.lat, result.lon, { zoom: 16 });
      showToast("Lokacija je pronadjena. Ako treba, pomjerite pin na mapi.", "success");
      return true;
    })
    .catch(() => {
      showToast("Mapa/geocode servis trenutno nije dostupan. Zalijepite Google Maps link sa pinom.", "error");
      return false;
    })
    .finally(() => {
      if (button) button.removeAttribute("disabled");
    });
}

function useSiteWizardMapsLink() {
  const link = document.getElementById("siteWizardGoogleMapsLink")?.value || "";
  const coords = extractSiteWizardCoordinatesFromLink(link);
  if (!coords) {
    showToast("Nisam nasao koordinate u linku. Otvorite Google Maps, podijelite lokaciju/pin i zalijepite taj link.", "error");
    return false;
  }
  setSiteWizardPin(coords.lat, coords.lng, { zoom: 16 });
  showToast("Pin je ucitan iz Google Maps linka.", "success");
  return true;
}

function useSiteWizardLocation() {
  collectNewSiteWizardStep();
  if (!hasValidSiteWizardPin(getNewSiteWizardDraft())) {
    showToast("Prvo pronadjite lokaciju ili spustite pin na mapu.", "error");
    return false;
  }
  showToast("Lokacija je potvrdjena za ovo gradiliste.", "success");
  return true;
}

function newSiteWizardNext() {
  collectNewSiteWizardStep();
  if (!validateNewSiteWizardStep()) return;
  newSiteWizardState.step = Math.min(NEW_SITE_WIZARD_STEPS.length - 1, newSiteWizardState.step + 1);
  renderNewSiteWizard();
}

function newSiteWizardBack() {
  collectNewSiteWizardStep();
  newSiteWizardState.step = Math.max(0, newSiteWizardState.step - 1);
  renderNewSiteWizard();
}

function renderNewSiteWizard() {
  if (!newSiteWizardState.open) return;
  const stepper = document.getElementById("newSiteWizardStepper");
  const body = document.getElementById("newSiteWizardBody");
  const draft = getNewSiteWizardDraft();
  if (stepper) {
    stepper.innerHTML = NEW_SITE_WIZARD_STEPS.map((step, index) => `
      <button type="button" class="site-wizard-step ${index === newSiteWizardState.step ? "is-active" : ""}" data-cmax-action="sites.wizardGoTo" data-cmax-args='[${index}]'><span>${index + 1}</span>${siteWizardEscape(step.title)}</button>
    `).join("");
  }
  if (body) {
    const key = NEW_SITE_WIZARD_STEPS[newSiteWizardState.step]?.key;
    body.innerHTML =
      key === "basic" ? renderNewSiteBasicStep(draft) :
      key === "users" ? renderNewSiteUsersStep(draft) :
      key === "modules" ? renderNewSiteModulesStep(draft) :
      key === "defaults" ? renderNewSiteDefaultsStep(draft) :
      key === "template" ? renderNewSiteTemplateStep(draft) :
      renderNewSiteReviewStep(draft);
  }
  if (NEW_SITE_WIZARD_STEPS[newSiteWizardState.step]?.key === "basic") {
    setTimeout(initSiteWizardMapPicker, 60);
  } else {
    destroySiteWizardMap();
  }
  const back = document.getElementById("newSiteWizardBackBtn");
  const next = document.getElementById("newSiteWizardNextBtn");
  const create = document.getElementById("newSiteWizardCreateBtn");
  if (back) back.style.display = newSiteWizardState.step === 0 ? "none" : "";
  if (next) next.style.display = newSiteWizardState.step >= NEW_SITE_WIZARD_STEPS.length - 1 ? "none" : "";
  if (create) create.style.display = newSiteWizardState.step >= NEW_SITE_WIZARD_STEPS.length - 1 ? "" : "none";
}

function newSiteWizardGoTo(index) {
  collectNewSiteWizardStep();
  const next = Number(index);
  if (Number.isFinite(next)) newSiteWizardState.step = Math.max(0, Math.min(NEW_SITE_WIZARD_STEPS.length - 1, next));
  renderNewSiteWizard();
}

function renderNewSiteBasicStep(draft) {
  const address = [draft.address, draft.postalCode, draft.city, draft.country].filter(Boolean).join(", ");
  const pinText = formatSiteWizardPin(draft);
  const navQuery = encodeURIComponent(pinText || address || "Sweden");
  const contacts = Array.isArray(draft.contacts) && draft.contacts.length
    ? draft.contacts
    : getDefaultSiteInfo(draft.name).contacts;
  return `
    <section class="site-wizard-section">
      <h4>Step 1 - Osnovno</h4>
      <div class="site-wizard-grid">
        <label>Naziv gradilista<input id="siteWizard_name" value="${siteWizardEscape(draft.name)}"></label>
        <label>Naziv projekta<input id="siteWizard_projectName" value="${siteWizardEscape(draft.projectName)}"></label>
        <label class="site-wizard-wide">Opis<textarea id="siteWizard_description">${siteWizardEscape(draft.description)}</textarea></label>
        <label>Adresa<input id="siteWizard_address" value="${siteWizardEscape(draft.address)}"></label>
        <label>Postanski broj<input id="siteWizard_postalCode" value="${siteWizardEscape(draft.postalCode)}"></label>
        <label>Grad<input id="siteWizard_city" value="${siteWizardEscape(draft.city)}"></label>
        <label>Drzava<input id="siteWizard_country" value="${siteWizardEscape(draft.country)}"></label>
        <input id="siteWizard_latitude" type="hidden" value="${siteWizardEscape(draft.latitude)}">
        <input id="siteWizard_longitude" type="hidden" value="${siteWizardEscape(draft.longitude)}">
        <label>Pocetak<input id="siteWizard_startDate" type="date" value="${siteWizardEscape(draft.startDate)}"></label>
        <label>Planirani zavrsetak<input id="siteWizard_plannedEndDate" type="date" value="${siteWizardEscape(draft.plannedEndDate)}"></label>
        <label>Status<select id="siteWizard_status"><option value="active" ${draft.status === "active" ? "selected" : ""}>Aktivno</option><option value="paused" ${draft.status === "paused" ? "selected" : ""}>Pauzirano</option><option value="finished" ${draft.status === "finished" ? "selected" : ""}>Zavrseno</option></select></label>
        <label>Procenat zavrsenosti<input id="siteWizard_progress" type="number" min="0" max="100" value="${siteWizardEscape(String(draft.progress || 0))}"></label>
        <label>Investitor<input id="siteWizard_investor" value="${siteWizardEscape(draft.investor)}"></label>
        <label>Glavni izvodac<input id="siteWizard_mainContractor" value="${siteWizardEscape(draft.mainContractor)}"></label>
        <label>Kontakt osoba<input id="siteWizard_contactPerson" value="${siteWizardEscape(draft.contactPerson)}"></label>
        <label>Telefon<input id="siteWizard_phone" value="${siteWizardEscape(draft.phone)}"></label>
        <label>Email<input id="siteWizard_email" type="email" value="${siteWizardEscape(draft.email)}"></label>
      </div>
      <div class="site-wizard-map-preview site-wizard-map-picker-card">
        <div class="site-wizard-map-head">
          <div>
            <strong>Pin lokacija</strong>
            <span>Upisite adresu, pronadjite je na karti i po potrebi kliknite ili pomjerite marker na tacno mjesto.</span>
          </div>
          <span id="siteWizardPinInfo" class="site-wizard-pin-info">${siteWizardEscape(pinText ? `Pin: ${pinText}` : "Pin jos nije postavljen.")}</span>
        </div>
        <div class="site-wizard-map-search">
          <input id="siteWizard_locationSearch" class="site-wizard-search" value="${siteWizardEscape(address)}" placeholder="Npr. Drottninggatan 1, Stockholm, Sweden">
          <button type="button" class="btn btn-small" data-cmax-action="sites.findWizardLocation">Pronadji na karti</button>
        </div>
        <div id="siteWizardMapPicker" class="site-wizard-map-frame site-map-picker" data-testid="site-map-picker">
          <span>Mapa se ucitava...</span>
        </div>
        <div class="site-wizard-map-search">
          <input id="siteWizardGoogleMapsLink" class="site-wizard-search" placeholder="Fallback: zalijepi Google Maps link sa pinom">
          <button type="button" class="btn btn-small btn-secondary" data-cmax-action="sites.useMapsLink">Ucitaj pin iz linka</button>
        </div>
        <div class="site-wizard-inline-actions">
          <button type="button" class="btn btn-small" data-cmax-action="sites.useWizardLocation">Koristi ovu lokaciju</button>
          <a class="btn btn-small btn-secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${navQuery}">Otvori Google Maps</a>
        </div>
        ${pinText ? "" : `<div class="site-wizard-warning">Pin je obavezan prije kreiranja gradilista.</div>`}
      </div>
      <details class="site-wizard-details" open>
        <summary>Kontakti po ulozi</summary>
        <div class="site-wizard-contact-grid">
          ${contacts.map((contact) => `
            <div class="site-wizard-contact-card">
              <strong>${siteWizardEscape(contact.label || contact.role)}</strong>
              <input id="siteWizard_contact_${siteWizardEscape(contact.role)}_name" placeholder="Ime" value="${siteWizardEscape(contact.name)}">
              <input id="siteWizard_contact_${siteWizardEscape(contact.role)}_phone" placeholder="Telefon" value="${siteWizardEscape(contact.phone)}">
              <input id="siteWizard_contact_${siteWizardEscape(contact.role)}_email" placeholder="Email" value="${siteWizardEscape(contact.email)}">
            </div>
          `).join("")}
        </div>
      </details>
      <details class="site-wizard-details">
        <summary>Radno vrijeme, pravila, logistika i hitni podaci</summary>
        ${renderNewSiteOperationalInfoFields(draft)}
      </details>
    </section>
  `;
}

function renderNewSiteOperationalInfoFields(draft) {
  const workHours = draft.workHours || {};
  const logistics = draft.logistics || {};
  const emergency = draft.emergency || {};
  const safety = new Set(Array.isArray(draft.safetyRules) ? draft.safetyRules : []);
  const customSafety = (draft.customSafetyRules || []).join("\n");
  return `
    <div class="site-wizard-grid">
      <label>Radni dani<input id="siteWizard_workDays" value="${siteWizardEscape(workHours.days || "Ponedjeljak-Petak")}"></label>
      <label>Radno vrijeme<input id="siteWizard_workHours" value="${siteWizardEscape(workHours.hours || "07:00-16:00")}"></label>
      <label class="site-wizard-wide">Pauze<textarea id="siteWizard_workBreaks">${siteWizardEscape((workHours.breaks || ["09:00-09:30", "12:00-12:30"]).join("\n"))}</textarea></label>
    </div>
    <div class="site-wizard-safety-grid">
      ${SITE_SAFETY_RULE_OPTIONS.map((rule) => `<label class="site-wizard-card"><input type="checkbox" data-site-safety="${siteWizardEscape(rule)}" ${safety.has(rule) ? "checked" : ""}><span><strong>${siteWizardEscape(rule)}</strong></span></label>`).join("")}
    </div>
    <label class="site-wizard-wide">Dodatna pravila<textarea id="siteWizard_customSafety" placeholder="Jedno pravilo po redu">${siteWizardEscape(customSafety)}</textarea></label>
    <div class="site-wizard-grid">
      <label>Parking<input id="siteWizard_parking" value="${siteWizardEscape(logistics.parking || "")}"></label>
      <label>Skladiste<input id="siteWizard_storage" value="${siteWizardEscape(logistics.storage || "")}"></label>
      <label>Zona istovara<input id="siteWizard_unloadingZone" value="${siteWizardEscape(logistics.unloadingZone || "")}"></label>
      <label>APD plan link<input id="siteWizard_apdPlan" value="${siteWizardEscape(logistics.apdPlan || "")}"></label>
      <label class="site-wizard-wide">Dokumenti<textarea id="siteWizard_documents" placeholder="APD plan, sigurnosne upute, PDF/linkovi, slike...">${siteWizardEscape((draft.documents || []).join("\n"))}</textarea></label>
    </div>
    <div class="site-wizard-grid">
      <label>Hitni broj<input id="siteWizard_emergencyNumber" value="${siteWizardEscape(emergency.emergencyNumber || "112")}"></label>
      <label>Bolnica<input id="siteWizard_hospital" value="${siteWizardEscape(emergency.hospital || "")}"></label>
      <label>Prva pomoc<input id="siteWizard_firstAid" value="${siteWizardEscape(emergency.firstAid || "")}"></label>
      <label>Vatrogasci<input id="siteWizard_fireDepartment" value="${siteWizardEscape(emergency.fireDepartment || "")}"></label>
      <label>Mjesto okupljanja<input id="siteWizard_meetingPoint" value="${siteWizardEscape(emergency.meetingPoint || "")}"></label>
      <label>Defibrilator lokacija<input id="siteWizard_defibrillator" value="${siteWizardEscape(emergency.defibrillator || "")}"></label>
    </div>
  `;
}

function getSiteWizardUsers() {
  return getAdmins().map((admin) => ({
    email: admin.email,
    name: getUserDisplayName(admin.email, admin.fullName),
    roles: normalizeGlobalFunctionKeys(admin.storeRoles || []),
  }));
}

function renderNewSiteUsersStep(draft) {
  const users = getSiteWizardUsers();
  return `
    <section class="site-wizard-section">
      <h4>Step 2 - Dodjela korisnika</h4>
      <input class="site-wizard-search" placeholder="Pretrazi korisnike..." data-cmax-action="sites.filterWizardUsers" data-cmax-event="input" data-cmax-pass-element>
      <div class="site-wizard-card-grid" id="siteWizardUsersList">
        ${users.map((user) => {
          const roleLabels = user.roles.map((role) => getStoreRoleLabel ? getStoreRoleLabel(role) : role).join(", ") || "Worker";
          return `<label class="site-wizard-card"><input type="checkbox" data-site-user="${siteWizardEscape(user.email)}" ${draft.assignedUsers.includes(user.email) ? "checked" : ""}><span><strong>${siteWizardEscape(user.name)}</strong><small>${siteWizardEscape(roleLabels)}</small></span></label>`;
        }).join("") || `<div class="site-wizard-empty">Nema korisnika.</div>`}
      </div>
    </section>
  `;
}

function filterNewSiteWizardUsers(input) {
  const value = String(input?.value || "").toLowerCase();
  document.querySelectorAll("#siteWizardUsersList .site-wizard-card").forEach((card) => {
    card.style.display = card.textContent.toLowerCase().includes(value) ? "" : "none";
  });
}

function renderNewSiteModulesStep(draft) {
  return `
    <section class="site-wizard-section">
      <h4>Step 3 - Aktivni moduli</h4>
      <div class="site-wizard-card-grid">
        ${SITE_MODULE_OPTIONS.map((item) => `<label class="site-wizard-card"><input type="checkbox" data-site-module="${item.key}" ${draft.modules[item.key] !== false ? "checked" : ""}><span><strong>${siteWizardEscape(item.label)}</strong><small>Prikazi modul za ovo gradiliste.</small></span></label>`).join("")}
      </div>
    </section>
  `;
}

function renderNewSiteDefaultsStep(draft) {
  const options = [
    ["plannerDays", "Planner", "Kreiraj pocetne dane"],
    ["warehouseCategories", "Warehouse", "Kreiraj osnovne kategorije"],
    ["storeCatalog", "Store", "Kopiraj globalni katalog"],
    ["chatEnabled", "Chat", "Omoguci chat"],
    ["defaultNotifications", "Notifications", "Kreiraj default obavijesti"],
  ];
  return `
    <section class="site-wizard-section">
      <h4>Step 4 - Pocetne postavke</h4>
      <div class="site-wizard-card-grid">
        ${options.map(([key, title, note]) => `<label class="site-wizard-card"><input type="checkbox" data-site-default="${key}" ${draft.defaults[key] ? "checked" : ""}><span><strong>${title}</strong><small>${note}</small></span></label>`).join("")}
      </div>
    </section>
  `;
}

function renderNewSiteTemplateStep(draft) {
  return `
    <section class="site-wizard-section">
      <h4>Step 5 - Predlozak</h4>
      <p>Kopira module, kategorije, postavke i strukture. Ne kopira narudzbe, chat poruke, audit ni privatne podatke.</p>
      <label>Kopiraj iz
        <select id="siteWizard_templateSite">
          <option value="">Prazno gradiliste</option>
          ${(sites || []).map((site) => `<option value="${siteWizardEscape(site)}" ${draft.templateSite === site ? "selected" : ""}>${siteWizardEscape(site)}</option>`).join("")}
        </select>
      </label>
    </section>
  `;
}

function renderNewSiteReviewStep(draft) {
  const modules = SITE_MODULE_OPTIONS.filter((item) => draft.modules[item.key] !== false).map((item) => item.label).join(", ");
  const pinText = formatSiteWizardPin(draft);
  const navQuery = encodeURIComponent(pinText || [draft.address, draft.postalCode, draft.city, draft.country].filter(Boolean).join(", ") || "Sweden");
  return `
    <section class="site-wizard-section">
      <h4>Step 6 - Pregled</h4>
      <div class="site-wizard-review">
        <div><strong>Ime</strong><span>${siteWizardEscape(draft.name || "-")}</span></div>
        <div><strong>Ljudi</strong><span>${draft.assignedUsers.length}</span></div>
        <div><strong>Moduli</strong><span>${siteWizardEscape(modules || "-")}</span></div>
        <div><strong>Template</strong><span>${siteWizardEscape(draft.templateSite || "Prazno gradiliste")}</span></div>
        <div><strong>Lokacija</strong><span>${siteWizardEscape([draft.address, draft.postalCode, draft.city, draft.country].filter(Boolean).join(", ") || "-")}</span></div>
        <div><strong>Pin</strong><span>${siteWizardEscape(pinText || "Pin nije postavljen")}</span></div>
      </div>
      <div class="site-wizard-map-preview">
        <strong>Mapa preview</strong>
        <div class="site-wizard-map-frame">
          ${pinText ? `<iframe title="Mapa gradilista" loading="lazy" src="https://www.google.com/maps?q=${navQuery}&output=embed"></iframe>` : `<span>Postavite pin prije kreiranja gradilista.</span>`}
        </div>
        <div class="site-wizard-inline-actions">
          <a class="btn btn-small btn-secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${navQuery}">Otvori navigaciju</a>
        </div>
      </div>
    </section>
  `;
}

function createSiteFromWizard() {
  collectNewSiteWizardStep();
  if (!validateNewSiteWizardStep()) return;
  const draft = getNewSiteWizardDraft();
  if (!hasValidSiteWizardPin(draft)) {
    showToast("Postavite pin lokacije prije kreiranja gradilista.", "error");
    return Promise.resolve(false);
  }
  const newSite = String(draft.name || "").trim();
  return createSiteWithMetadata(newSite, draft);
}

function createSiteWithMetadata(newSite, siteInfo) {
  if (!newSite || sites.includes(newSite)) {
    showToast("Gradiliste s tim nazivom vec postoji.", "error");
    return Promise.resolve(false);
  }
  return withLoadingPromise("loadingSiteChange", () => {
    persistCurrentStateToLocalStorage();
    const previousSites = [...sites];
    const previousCurrentSite = currentSite;
    sites.push(newSite);
    markLocalSiteMutation();
    localStorage.setItem(SITES_KEY, JSON.stringify(sites));
    initializeSiteStorage(newSite);
    applyNewSiteTemplate(newSite, siteInfo);
    saveSiteInfoStorage(newSite, { ...siteInfo, name: newSite });
    currentSite = newSite;
    setStoredCurrentSitePreference(currentSite);
    populateSiteSelect();
    updateScopedStorageKeysForCurrentSite();
    loadCurrentSiteRuntimeFromLocalStorage();
    renderCurrentSiteAfterHydrate();
    return syncModuleState("siteMetadata", {
      sites,
      siteInfo: { ...siteInfo, name: newSite },
    }, { siteId: newSite }).then((saved) => {
      if (!saved) {
        sites = previousSites;
        currentSite = previousCurrentSite;
        localStorage.setItem(SITES_KEY, JSON.stringify(sites));
        setStoredCurrentSitePreference(currentSite);
        localStorage.removeItem(getSiteStorageKey("cmax_site_info", newSite));
        populateSiteSelect();
        updateScopedStorageKeysForCurrentSite();
        loadCurrentSiteRuntimeFromLocalStorage();
        renderCurrentSiteAfterHydrate();
        showToast("Spremanje gradilista na server nije uspjelo.", "error");
        return false;
      }
      return syncNewSiteInitialModules(newSite, siteInfo).then(() => {
        addLog("site_created_wizard", { site: newSite, modules: siteInfo.modules || {} });
        closeNewSiteWizard();
        showToast("Gradiliste je kreirano.", "success");
        if (typeof refreshHomeLaunchpad === "function") refreshHomeLaunchpad();
        return true;
      });
    });
  });
}

function syncNewSiteInitialModules(newSite, siteInfo) {
  const jobs = [];
  if (siteInfo?.modules?.planner !== false) {
    jobs.push(syncModuleState("planner", {
      planner: getCachedStorageJson(getSiteStorageKey("cmax_planner_data", newSite), createEmptyPlannerData()),
    }, { siteId: newSite }));
  }
  if (siteInfo?.modules?.tidplan !== false) {
    jobs.push(syncModuleState("tidplan", {
      tidplan: getCachedStorageJson(getSiteStorageKey("tidplan", newSite), []),
      tidplanZones: getCachedStorageJson(getSiteStorageKey("tidplan_zones", newSite), DEFAULT_SITE_TEMPLATE.tidplanZones),
    }, { siteId: newSite }));
  }
  if (siteInfo?.modules?.warehouse !== false) {
    jobs.push(syncModuleState("warehouse", {
      warehouse: normalizeWarehouseData(getCachedStorageJson(getSiteStorageKey("cmax_warehouse_data", newSite), null)),
    }, { siteId: newSite }));
  }
  if (siteInfo?.modules?.store !== false) {
    jobs.push(syncModuleState("storeCatalog", {
      store: getCachedStorageJson(getSiteStorageKey("cmax_workwear_data", newSite), {}),
    }, { siteId: newSite }));
  }
  if (siteInfo?.modules?.bins !== false) {
    jobs.push(syncModuleState("bins", {
      bins: getCachedStorageJson(getSiteStorageKey("cmax_planner_bins", newSite), {}),
    }, { siteId: newSite }));
  }
  return Promise.all(jobs.map((job) => job.catch(() => false))).then(() => true);
}

function applyNewSiteTemplate(newSite, siteInfo) {
  const templateSite = String(siteInfo?.templateSite || "").trim();
  if (!templateSite || !sites.includes(templateSite)) return;
  const templatePlanner = safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_planner_data", templateSite)), null);
  if (templatePlanner && typeof templatePlanner === "object") {
    const plannerCopy = normalizePlannerData({
      workers: templatePlanner.workers || [],
      lifts: templatePlanner.lifts || [],
      moments: templatePlanner.moments || [],
      plans: templatePlanner.plans || [],
      karnas: templatePlanner.karnas || [],
      resourceHistory: {},
      dailyData: {},
    }, newSite);
    localStorage.setItem(getSiteStorageKey("cmax_planner_data", newSite), JSON.stringify(plannerCopy));
  }
  const templateZones = safeParseStoredJson(localStorage.getItem(getSiteStorageKey("tidplan_zones", templateSite)), null);
  if (Array.isArray(templateZones)) {
    localStorage.setItem(getSiteStorageKey("tidplan_zones", newSite), JSON.stringify(templateZones));
  }
  const templateWarehouse = normalizeWarehouseData(
    safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", templateSite)), null),
  );
  localStorage.setItem(getSiteStorageKey("cmax_warehouse_data", newSite), JSON.stringify({
    ...templateWarehouse,
    slots: createWarehouseSlots(),
    logs: [],
  }));
  const templateStore = safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_workwear_data", templateSite)), null);
  if (templateStore && typeof templateStore === "object") {
    localStorage.setItem(getSiteStorageKey("cmax_workwear_data", newSite), JSON.stringify({
      categories: templateStore.categories || [],
      subcategories: templateStore.subcategories || {},
      products: templateStore.products || [],
      settings: templateStore.settings || {},
      budgets: {},
      budgetLedger: [],
      orders: [],
      auditLog: [],
      cartByUser: {},
      sizePresets: templateStore.sizePresets || [],
      suppliers: templateStore.suppliers || [],
    }));
  }
}

function confirmRemoveSite() {
  closeSiteDropdown();
  removeSite();
}

function changeSite() {
  const select = document.getElementById("siteSelect");
  if (!select) return;
  withLoadingPromise("loadingSiteChange", () => {
    switchSiteFromLocal(select.value);
    return Promise.resolve();
  });
}

function addSite() {
  showPromptDialog("Unesite ime novog gradilišta:", "🏗️", "", (siteName) => {
    const newSite = (siteName || "").trim();
    if (!newSite) return;
    if (sites.includes(newSite)) {
      showAlert("Gradilište s tim nazivom već postoji.", "⚠️");
      return;
    }

    withLoadingPromise("loadingSiteChange", () => {
      persistCurrentStateToLocalStorage();
      const previousSites = [...sites];
      const previousCurrentSite = currentSite;
      const newSitePlannerKey = getSiteStorageKey("cmax_planner_data", newSite);
      const newSiteBinsKey = getSiteStorageKey("cmax_planner_bins", newSite);
      const newSiteTidplanKey = getSiteStorageKey("tidplan", newSite);
      const newSiteTidplanZonesKey = getSiteStorageKey("tidplan_zones", newSite);
      const newSiteWarehouseKey = getSiteStorageKey("cmax_warehouse_data", newSite);
      const newSiteStoreKey = getSiteStorageKey("cmax_workwear_data", newSite);
      const newSiteReportsKey = getSiteStorageKey("cmax_planner_reports", newSite);
      const newSiteNotificationsKey = getSiteStorageKey("cmax_planner_notifications", newSite);
      sites.push(newSite);
      markLocalSiteMutation();
      localStorage.setItem(SITES_KEY, JSON.stringify(sites));
      initializeSiteStorage(newSite);
      currentSite = newSite;
      setStoredCurrentSitePreference(currentSite);
      populateSiteSelect();
      document.getElementById("siteSelect").value = newSite;
      updateScopedStorageKeysForCurrentSite();
      loadCurrentSiteRuntimeFromLocalStorage();
      renderCurrentSiteAfterHydrate();
      logSiteScopeDebug("add-site", { fromSite: previousCurrentSite, toSite: newSite, to: getSiteDebugSummary(newSite) });
      return syncServerState({ includeSites: true }).then((saved) => {
        if (!saved) {
          sites = previousSites;
          currentSite = previousCurrentSite;
          localStorage.setItem(SITES_KEY, JSON.stringify(sites));
          setStoredCurrentSitePreference(currentSite);
          localStorage.removeItem(newSitePlannerKey);
          localStorage.removeItem(newSiteBinsKey);
          localStorage.removeItem(newSiteTidplanKey);
          localStorage.removeItem(newSiteTidplanZonesKey);
          localStorage.removeItem(newSiteWarehouseKey);
          localStorage.removeItem(newSiteStoreKey);
          localStorage.removeItem(newSiteReportsKey);
          localStorage.removeItem(newSiteNotificationsKey);
          populateSiteSelect();
          updateScopedStorageKeysForCurrentSite();
          loadCurrentSiteRuntimeFromLocalStorage();
          renderCurrentSiteAfterHydrate();
          updateMainTitle();
          showToast("Spremanje gradilišta na server nije uspjelo.", "error");
          return;
        }
        sendPresence(true).catch(() => {});
        refreshPresence().catch(() => {});
        return Promise.resolve();
      });
    });
  });
}

function removeSite() {
  if (sites.length <= 1) {
    showAlert("Ne možete ukloniti jedino gradilište.", "⚠️");
    return;
  }
  const siteToRemove = currentSite;
  showConfirm(
    `Jeste li sigurni da želite ukloniti gradilište "${siteToRemove}"? Svi podaci će biti izgubljeni.`,
    null,
    "⚠️",
    () => {
      withLoadingPromise("loadingSiteChange", () => {
        persistCurrentStateToLocalStorage();
        const previousSites = [...sites];
        const previousCurrentSite = currentSite;
        const removedPlannerData = localStorage.getItem(getSiteStorageKey("cmax_planner_data", siteToRemove));
        const removedTidplanData = localStorage.getItem(getSiteStorageKey("tidplan", siteToRemove));
        const removedBinsData = localStorage.getItem(getSiteStorageKey("cmax_planner_bins", siteToRemove));
        const removedWarehouseData = localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove));
        const removedStoreData = localStorage.getItem(getSiteStorageKey("cmax_workwear_data", siteToRemove));
        const removedReportsData = localStorage.getItem(getSiteStorageKey("cmax_planner_reports", siteToRemove));
        const removedNotificationsData = localStorage.getItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove));
        const removedTidplanZonesData = localStorage.getItem(getSiteStorageKey("tidplan_zones", siteToRemove));
        sites = sites.filter((s) => s !== siteToRemove);
        markLocalSiteMutation();
        localStorage.setItem(SITES_KEY, JSON.stringify(sites));
        localStorage.removeItem(getSiteStorageKey("cmax_planner_data", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("tidplan", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_planner_bins", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_workwear_data", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_planner_reports", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove));
        localStorage.removeItem(getSiteStorageKey("tidplan_zones", siteToRemove));
        currentSite = sites[0];
        setStoredCurrentSitePreference(currentSite);
        populateSiteSelect();
        updateScopedStorageKeysForCurrentSite();
        loadCurrentSiteRuntimeFromLocalStorage();
        logSiteScopeDebug("delete-site", {
          deletedSite: siteToRemove,
          toSite: currentSite,
          remaining: sites.reduce((summary, site) => {
            summary[site] = getSiteDebugSummary(site);
            return summary;
          }, {}),
        });
        return syncServerState({ includeSites: true }).then((saved) => {
          if (!saved) {
            sites = previousSites;
            currentSite = previousCurrentSite;
            localStorage.setItem(SITES_KEY, JSON.stringify(sites));
            setStoredCurrentSitePreference(currentSite);
            if (removedPlannerData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_data", siteToRemove), removedPlannerData);
            }
            if (removedTidplanData !== null) {
              localStorage.setItem(getSiteStorageKey("tidplan", siteToRemove), removedTidplanData);
            }
            if (removedBinsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_bins", siteToRemove), removedBinsData);
            }
            if (removedWarehouseData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove), removedWarehouseData);
            }
            if (removedStoreData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_workwear_data", siteToRemove), removedStoreData);
            }
            if (removedReportsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_reports", siteToRemove), removedReportsData);
            }
            if (removedNotificationsData !== null) {
              localStorage.setItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove), removedNotificationsData);
            }
            if (removedTidplanZonesData !== null) {
              localStorage.setItem(getSiteStorageKey("tidplan_zones", siteToRemove), removedTidplanZonesData);
            }
            populateSiteSelect();
            updateScopedStorageKeysForCurrentSite();
            loadCurrentSiteRuntimeFromLocalStorage();
            renderCurrentSiteAfterHydrate();
            updateMainTitle();
            showToast("Brisanje gradilišta na serveru nije uspjelo.", "error");
            return;
          }
          renderCurrentSiteAfterHydrate();
          sendPresence(true).catch(() => {});
          refreshPresence().catch(() => {});
          return Promise.resolve();
        });
      });
    }
  );
}

function updateMainTitle() {
  const title = document.getElementById("mainTitle");
  if (title) title.textContent = "CMAX SCM";
}

/* ==================== TIDPLAN FUNCTIONS ==================== */

