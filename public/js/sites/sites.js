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

var newSiteWizardState = {
  open: false,
  step: 0,
  draft: null,
};

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
    contacts: [],
    workHours: {
      days: "Ponedjeljak-Petak",
      hours: "07:00-16:00",
      breaks: ["09:00-09:30", "12:00-12:30"],
    },
    safetyRules: [
      "Kaciga obavezna",
      "Reflektirajuci prsluk",
      "Zastitne naocale",
      "Registracija pri dolasku",
    ],
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
}

function collectNewSiteWizardStep() {
  if (!newSiteWizardState.open) return;
  const draft = getNewSiteWizardDraft();
  ["name", "description", "address", "postalCode", "city", "country", "latitude", "longitude", "projectName", "investor", "mainContractor", "contactPerson", "phone", "email", "startDate", "plannedEndDate", "progress"].forEach((key) => {
    const el = document.getElementById(`siteWizard_${key}`);
    if (el) draft[key] = el.value;
  });
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
        <label>Latitude<input id="siteWizard_latitude" value="${siteWizardEscape(draft.latitude)}"></label>
        <label>Longitude<input id="siteWizard_longitude" value="${siteWizardEscape(draft.longitude)}"></label>
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
      <div class="site-wizard-map-preview">
        <strong>Mapa preview</strong>
        <span>${siteWizardEscape(address || "Upisite adresu ili lat/lng za preview.")}</span>
        <a class="btn btn-small btn-secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(draft.latitude && draft.longitude ? `${draft.latitude},${draft.longitude}` : address)}">Otvori / odaberi na karti</a>
      </div>
    </section>
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
  return `
    <section class="site-wizard-section">
      <h4>Step 6 - Pregled</h4>
      <div class="site-wizard-review">
        <div><strong>Ime</strong><span>${siteWizardEscape(draft.name || "-")}</span></div>
        <div><strong>Ljudi</strong><span>${draft.assignedUsers.length}</span></div>
        <div><strong>Moduli</strong><span>${siteWizardEscape(modules || "-")}</span></div>
        <div><strong>Template</strong><span>${siteWizardEscape(draft.templateSite || "Prazno gradiliste")}</span></div>
        <div><strong>Lokacija</strong><span>${siteWizardEscape([draft.address, draft.postalCode, draft.city, draft.country].filter(Boolean).join(", ") || "-")}</span></div>
      </div>
    </section>
  `;
}

function createSiteFromWizard() {
  collectNewSiteWizardStep();
  if (!validateNewSiteWizardStep()) return;
  const draft = getNewSiteWizardDraft();
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

