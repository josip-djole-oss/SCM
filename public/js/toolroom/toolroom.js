var toolroomState = {
  loaded: false,
  loading: false,
  activeTab: "dashboard",
  activeCategoryId: "",
  activeItemId: "",
  action: null,
  myTools: [],
  myToolsLoaded: false,
  data: { items: [], categories: [], presets: [], assignments: [], faults: [], serviceRecords: [], history: [] },
  permissions: {},
};

function toolroomEscape(value) {
  return typeof escapeHtml === "function" ? escapeHtml(value) : String(value || "");
}

function toolroomApi(path, options = {}) {
  const nextOptions = { ...options };
  nextOptions.headers = new Headers(nextOptions.headers || {});
  if (nextOptions.body && !nextOptions.headers.has("Content-Type")) {
    nextOptions.headers.set("Content-Type", "application/json");
  }
  return fetch(`/api/toolroom${path}`, nextOptions).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "TOOLROOM_REQUEST_FAILED");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  });
}

function loadToolroomData(force = false) {
  if (toolroomState.loading) return Promise.resolve(toolroomState.data);
  if (toolroomState.loaded && !force) return Promise.resolve(toolroomState.data);
  toolroomState.loading = true;
  return toolroomApi("")
    .then((payload) => {
      toolroomState.data = payload.toolroom || { items: [], categories: [], presets: [], history: [] };
      toolroomState.permissions = payload.permissions || {};
      toolroomState.loaded = true;
      return toolroomState.data;
    })
    .finally(() => { toolroomState.loading = false; });
}

function getToolroomCategories() {
  return Array.isArray(toolroomState.data.categories) ? toolroomState.data.categories : [];
}

function getToolroomItems() {
  return Array.isArray(toolroomState.data.items) ? toolroomState.data.items : [];
}

function getToolroomPresets(type = "") {
  const presets = Array.isArray(toolroomState.data.presets) ? toolroomState.data.presets : [];
  return presets.filter((preset) => !preset.archived && (!type || preset.type === type));
}

function getToolroomCategoryById(id) {
  return getToolroomCategories().find((category) => category.id === id) || null;
}

function getToolroomItemById(id) {
  return getToolroomItems().find((item) => item.id === id) || null;
}

function getToolroomBreadcrumb(categoryId = toolroomState.activeCategoryId) {
  const categories = getToolroomCategories();
  const chain = [];
  let current = categories.find((category) => category.id === categoryId);
  const guard = new Set();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    chain.unshift(current);
    current = categories.find((category) => category.id === current.parentId);
  }
  return chain;
}

function canToolroomManageUi() {
  return typeof canManageToolroom === "function" && canManageToolroom();
}

function canToolroomEditPresetsUi() {
  return typeof canEditToolPresets === "function" && canEditToolPresets();
}

function canToolroomAssignUi() {
  return typeof canAssignToolsAccess === "function" && canAssignToolsAccess();
}

function canToolroomReturnUi() {
  return typeof canReturnToolsAccess === "function" && canReturnToolsAccess();
}

function canToolroomViewMyToolsUi() {
  return typeof canViewMyToolsAccess === "function" ? canViewMyToolsAccess() : true;
}

function canToolroomReportFaultUi() {
  return typeof canReportToolFaultAccess === "function" ? canReportToolFaultAccess() : false;
}

function canToolroomHandleServiceUi() {
  return typeof canHandleToolServiceAccess === "function" ? canHandleToolServiceAccess() : false;
}

function canToolroomWriteOffUi() {
  return typeof canWriteOffToolsAccess === "function" ? canWriteOffToolsAccess() : false;
}

function getToolroomHolderLabelUi(item) {
  if (!item) return "";
  if (item.currentHolderType === "worker") return item.currentHolderUserName || item.currentHolderUserEmail || "Worker";
  if (item.currentHolderType === "site") return item.currentHolderSiteId || "Gradiliste";
  if (item.currentHolderType === "service") return "Servis";
  if (item.currentHolderType === "lost") return "Izgubljeno";
  if (item.currentHolderType === "written_off") return "Otpisano";
  return "Alatnica";
}

function isToolroomAssigned(item) {
  return item && (item.currentHolderType === "worker" || item.currentHolderType === "site" || item.status === "assigned_worker" || item.status === "assigned_site");
}

function getToolroomAssignableItems() {
  return getToolroomItems().filter((item) => !item.archived && item.status === "available" && (!item.currentHolderType || item.currentHolderType === "toolroom"));
}

function getToolroomFaults() {
  return Array.isArray(toolroomState.data.faults) ? toolroomState.data.faults : [];
}

function getToolroomServiceRecords() {
  return Array.isArray(toolroomState.data.serviceRecords) ? toolroomState.data.serviceRecords : [];
}

function getToolroomFaultById(id) {
  return getToolroomFaults().find((fault) => fault.id === id) || null;
}

function canReportFaultForToolUi(item) {
  if (!item || !canToolroomReportFaultUi()) return false;
  if (canToolroomHandleServiceUi()) return true;
  const email = (appState.currentUser || "").toLowerCase();
  if (item.currentHolderType === "worker" && item.currentHolderUserEmail === email) return true;
  return item.currentHolderType === "site" && item.currentHolderSiteId === currentSite;
}

function renderToolroomUserOptions(selected = "") {
  const admins = typeof getAdmins === "function" ? getAdmins() : [];
  return admins
    .filter((admin) => admin && admin.email && admin.active !== false)
    .map((admin) => {
      const label = admin.fullName || admin.email;
      return `<option value="${toolroomEscape(admin.email)}" ${selected === admin.email ? "selected" : ""}>${toolroomEscape(label)} - ${toolroomEscape(admin.functionBadge || admin.function || admin.level || "")}</option>`;
    }).join("");
}

function renderToolroomSiteOptions(selected = "") {
  const list = Array.isArray(sites) ? sites : [];
  return list.map((site) => `<option value="${toolroomEscape(site)}" ${selected === site ? "selected" : ""}>${toolroomEscape(site)}</option>`).join("");
}

function loadToolroomMyTools(force = false) {
  if (toolroomState.myToolsLoaded && !force) return Promise.resolve(toolroomState.myTools);
  return toolroomApi(`/my-tools?site=${encodeURIComponent(currentSite || "")}`)
    .then((payload) => {
      toolroomState.myTools = Array.isArray(payload.tools) ? payload.tools : [];
      toolroomState.myToolsLoaded = true;
      return toolroomState.myTools;
    })
    .catch((error) => {
      showToast(error.payload?.error || error.message || "Moji alati se ne mogu ucitati.", "error");
      return [];
    });
}

function setWarehouseToolroomMode(mode) {
  const toolroom = document.getElementById("toolroom-section");
  const warehouseGrid = document.querySelector("#warehouse-section > .warehouse-grid");
  const dropdown = document.getElementById("warehouseExportImportDropdown");
  const isToolroom = mode === "toolroom";
  if (toolroom) toolroom.style.display = isToolroom ? "block" : "none";
  if (warehouseGrid) warehouseGrid.style.display = isToolroom ? "none" : "grid";
  if (dropdown && isToolroom) dropdown.style.display = "none";
  document.getElementById("warehouseNavStockBtn")?.classList.toggle("btn-success", !isToolroom);
  document.getElementById("warehouseNavToolroomBtn")?.classList.toggle("btn-success", isToolroom);
}

function showWarehouseStock() {
  setWarehouseToolroomMode("stock");
  renderWarehousePage();
}

function showToolroom() {
  if (typeof canAccessToolroomModule === "function" && !canAccessToolroomModule()) {
    showToast("Nemate dozvolu za Alatnicu.", "error");
    return;
  }
  const showToolroomView = () => {
    const homeSection = document.getElementById("home-section");
    const reportsSection = document.getElementById("reports-section");
    const settingsSection = document.getElementById("settings-section");
    if (homeSection) homeSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    ["tidplan-section", "notifications-section", "surveys-section", "planner-section", "warehouse-logs-section", "warehouse-graph-section", "workwear-section", "site-chat-section"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    const warehouseSection = document.getElementById("warehouse-section");
    if (warehouseSection) warehouseSection.style.display = "block";
    currentView = "warehouse";
    saveCurrentView("warehouse");
    pushRouteForView("warehouse");
    setWarehouseToolroomMode("toolroom");
    renderToolroom();
    if (typeof updateShellForView === "function") updateShellForView("warehouse");
  };
  return loadFreshDataForView("loadingDefault", () =>
    loadToolroomData(true).then(showToolroomView));
}

function switchToolroomTab(tab) {
  toolroomState.activeTab = tab || "dashboard";
  toolroomState.action = null;
  if (toolroomState.activeTab === "myTools") {
    return loadToolroomMyTools(true).then(renderToolroom);
  }
  renderToolroom();
}

function selectToolroomCategory(categoryId = "") {
  toolroomState.activeCategoryId = String(categoryId || "");
  toolroomState.activeTab = "categories";
  renderToolroom();
}

function selectToolroomItem(itemId = "") {
  toolroomState.activeItemId = String(itemId || "");
  toolroomState.action = null;
  if (toolroomState.activeTab === "myTools") toolroomState.activeTab = "items";
  renderToolroom();
}

function renderToolroom() {
  const root = document.getElementById("toolroom-section");
  if (!root) return;
  const data = toolroomState.data || {};
  const items = getToolroomItems().filter((item) => !item.archived);
  const categories = getToolroomCategories().filter((category) => !category.archived);
  const presets = (data.presets || []).filter((preset) => !preset.archived);
  const inService = items.filter((item) => item.status === "in_service").length;
  const awaiting = items.filter((item) => item.status === "awaiting_engraving").length;
  const assignedWorker = items.filter((item) => item.status === "assigned_worker").length;
  const assignedSite = items.filter((item) => item.status === "assigned_site").length;
  const activeFaults = getToolroomFaults().filter((fault) => !["returned_available", "written_off"].includes(fault.status)).length;
  root.innerHTML = `
    <section class="toolroom-shell">
      <div class="toolroom-hero">
        <div>
          <span class="admin-compose-eyebrow">Verktygsforrad / Alatnica</span>
          <h2>Alatnica</h2>
          <p>Odvojeno od gradilisnog skladista: svaki alat je fizicki komad sa svojim brojem, statusom i historijom.</p>
        </div>
        <div class="toolroom-search-card">
          <input id="toolroomSearchInput" placeholder="Pretrazi B054, Milwaukee, Marko, Karlatornet..." data-cmax-action="toolroom.render" data-cmax-event="input">
        </div>
      </div>
      <div class="toolroom-tabs">
        ${[
          ["dashboard", "Dashboard"],
          ["items", "Alati"],
          ["faults", "Kvarovi"],
          ["categories", "Kategorije"],
          ["presets", "Preseti"],
          ["myTools", "Moji alati"],
        ].map(([key, label]) => `<button class="btn btn-secondary ${toolroomState.activeTab === key ? "btn-success" : ""}" data-cmax-action="toolroom.switchTab" data-cmax-args='["${key}"]'>${label}</button>`).join("")}
      </div>
      <div class="toolroom-stats">
        <article><strong>${items.length}</strong><span>Ukupno alata</span></article>
        <article><strong>${categories.length}</strong><span>Kategorije</span></article>
        <article><strong>${presets.length}</strong><span>Preseti</span></article>
        <article><strong>${assignedWorker}</strong><span>Kod radnika</span></article>
        <article><strong>${assignedSite}</strong><span>Na gradilistima</span></article>
        <article><strong>${activeFaults + awaiting + inService}</strong><span>Kvarovi / servis</span></article>
      </div>
      <div class="toolroom-content">
        ${renderToolroomActiveTab()}
      </div>
    </section>
  `;
}

function renderToolroomActiveTab() {
  if (toolroomState.activeTab === "items") return renderToolroomItemsTab();
  if (toolroomState.activeTab === "faults") return renderToolroomFaultsTab();
  if (toolroomState.activeTab === "categories") return renderToolroomCategoriesTab();
  if (toolroomState.activeTab === "presets") return renderToolroomPresetsTab();
  if (toolroomState.activeTab === "myTools") return renderToolroomMyToolsTab();
  return renderToolroomDashboardTab();
}

function renderToolroomDashboardTab() {
  const items = getToolroomItems().filter((item) => !item.archived);
  const recent = (toolroomState.data.history || []).slice(-6).reverse();
  const faults = getToolroomFaults();
  const byWorker = items.filter((item) => item.currentHolderType === "worker").reduce((acc, item) => {
    const key = getToolroomHolderLabelUi(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
  const bySite = items.filter((item) => item.currentHolderType === "site").reduce((acc, item) => {
    const key = item.currentHolderSiteId || "-";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
  const overdue = items.filter((item) => item.expectedReturnAt && item.expectedReturnAt < new Date().toISOString().slice(0, 10) && isToolroomAssigned(item)).length;
  return `
    <div class="toolroom-grid">
      <article class="toolroom-card">
        <h3>Pregled za Alatnicara</h3>
        <p class="toolroom-muted">Brzi pregled dostupnih, zaduzenih, izgubljenih i zakasnjelih alata.</p>
        <div class="toolroom-status-grid">
          ${["available", "assigned_worker", "assigned_site", "lost", "awaiting_return", "fault_reported"].map((status) => `<span>${status}: <strong>${items.filter((item) => item.status === status).length}</strong></span>`).join("")}
          <span>kasni povrat: <strong>${overdue}</strong></span>
        </div>
      </article>
      <article class="toolroom-card">
        <h3>Po radniku</h3>
        ${Object.keys(byWorker).length ? Object.entries(byWorker).map(([name, list]) => `<p><strong>${toolroomEscape(name)}</strong><br><small>${list.length} alata: ${list.map((item) => toolroomEscape(item.internalNumber)).join(", ")}</small></p>`).join("") : `<div class="toolroom-empty">Nema alata zaduzenih radnicima.</div>`}
      </article>
      <article class="toolroom-card">
        <h3>Po gradilistu</h3>
        ${Object.keys(bySite).length ? Object.entries(bySite).map(([site, list]) => `<p><strong>${toolroomEscape(site)}</strong><br><small>${list.length} alata: ${list.map((item) => toolroomEscape(item.internalNumber)).join(", ")}</small></p>`).join("") : `<div class="toolroom-empty">Nema alata zaduzenih gradilistima.</div>`}
      </article>
      <article class="toolroom-card">
        <h3>Fault queue</h3>
        <div class="toolroom-status-grid">
          ${["reported", "awaiting_return", "in_service", "repaired", "written_off"].map((status) => `<span>${status}: <strong>${faults.filter((fault) => fault.status === status).length}</strong></span>`).join("")}
        </div>
      </article>
      <article class="toolroom-card">
        <h3>Historija</h3>
        ${recent.length ? recent.map((event) => `<p><strong>${toolroomEscape(event.type)}</strong><br><small>${toolroomEscape(event.note)} | ${toolroomEscape(event.actor)}</small></p>`).join("") : `<div class="toolroom-empty">Nema historije.</div>`}
      </article>
    </div>
  `;
}

function renderToolroomItemsTab() {
  const items = getToolroomItems().filter((item) => !item.archived);
  const selected = getToolroomItemById(toolroomState.activeItemId) || items[0] || null;
  return `
    <div class="toolroom-grid is-items">
      <article class="toolroom-card">
        <div class="toolroom-card-head">
          <h3>Registar alata</h3>
          ${canToolroomManageUi() ? `<button class="btn" data-cmax-action="toolroom.saveItemFromForm">Dodaj / Spremi alat</button>` : ""}
        </div>
        ${canToolroomManageUi() ? renderToolroomItemForm(selected) : ""}
        <div class="toolroom-list">
          ${items.length ? items.map((item) => `
            <button class="toolroom-row ${selected?.id === item.id ? "is-active" : ""}" data-cmax-action="toolroom.selectItem" data-cmax-args='["${toolroomEscape(item.id)}"]'>
              <span class="toolroom-icon">${toolroomEscape((item.internalNumber || "?").slice(0, 3))}</span>
              <span><strong>${toolroomEscape(item.internalNumber || "-")} - ${toolroomEscape(item.name || "-")}</strong><small>${toolroomEscape(item.brand)} ${toolroomEscape(item.model)} | ${toolroomEscape(item.status)}</small></span>
            </button>
          `).join("") : `<div class="toolroom-empty">Nema alata. Dodajte prvi alat u registar.</div>`}
        </div>
      </article>
      <article class="toolroom-card">
        <h3>Detalji alata</h3>
        ${selected ? renderToolroomItemDetail(selected) : `<div class="toolroom-empty">Odaberite alat za detalje.</div>`}
      </article>
    </div>
  `;
}

function renderToolroomItemForm(item = null) {
  const categories = getToolroomCategories().filter((category) => !category.archived);
  const statuses = getToolroomPresets("status");
  return `
    <div class="toolroom-form">
      <input id="toolroomItemId" type="hidden" value="${toolroomEscape(item?.id || "")}">
      <input id="toolroomItemVersion" type="hidden" value="${toolroomEscape(item?.itemVersion || "")}">
      <label>Interni broj<input id="toolroomInternalNumber" value="${toolroomEscape(item?.internalNumber || "")}" placeholder="B054"></label>
      <label>Serijski broj<input id="toolroomSerialNumber" value="${toolroomEscape(item?.serialNumber || "")}"></label>
      <label>Naziv<input id="toolroomItemName" value="${toolroomEscape(item?.name || "")}" placeholder="Milwaukee M18 FPD3"></label>
      <label>Tip<select id="toolroomItemType">${renderToolroomPresetOptions("toolType", item?.type)}</select></label>
      <label>Marka<select id="toolroomItemBrand">${renderToolroomPresetOptions("brand", item?.brand)}</select></label>
      <label>Model<select id="toolroomItemModel">${renderToolroomPresetOptions("model", item?.model)}</select></label>
      <label>Kategorija<select id="toolroomItemCategory"><option value="">Bez kategorije</option>${categories.map((category) => `<option value="${toolroomEscape(category.id)}" ${item?.categoryId === category.id ? "selected" : ""}>${toolroomEscape(category.name)}</option>`).join("")}</select></label>
      <label>Status<select id="toolroomItemStatus">${statuses.map((preset) => `<option value="${toolroomEscape(preset.value)}" ${item?.status === preset.value ? "selected" : ""}>${toolroomEscape(preset.label)}</option>`).join("")}</select></label>
      <label class="toolroom-wide">Napomena<textarea id="toolroomItemNotes">${toolroomEscape(item?.notes || "")}</textarea></label>
    </div>
  `;
}

function renderToolroomPresetOptions(type, selected) {
  const presets = getToolroomPresets(type);
  return `<option value="">-</option>${presets.map((preset) => `<option value="${toolroomEscape(preset.value)}" ${selected === preset.value ? "selected" : ""}>${toolroomEscape(preset.label)}</option>`).join("")}`;
}

function renderToolroomItemDetail(item) {
  const category = getToolroomCategoryById(item.categoryId);
  const assigned = isToolroomAssigned(item);
  return `
    <div class="toolroom-detail">
      <div class="toolroom-big-icon">${toolroomEscape(item.internalNumber || "?")}</div>
      <h2>${toolroomEscape(item.name || "-")}</h2>
      <p>${toolroomEscape(item.brand)} ${toolroomEscape(item.model)} ${assigned ? `| Kod: ${toolroomEscape(getToolroomHolderLabelUi(item))}` : ""}</p>
      <div class="toolroom-status-grid">
        <span>Status <strong>${toolroomEscape(item.status)}</strong></span>
        <span>Kategorija <strong>${toolroomEscape(category?.name || "-")}</strong></span>
        <span>Serijski broj <strong>${toolroomEscape(item.serialNumber || "-")}</strong></span>
        <span>Verzija <strong>${toolroomEscape(item.itemVersion || 1)}</strong></span>
        <span>Zaduzeno <strong>${toolroomEscape(item.issuedAt || "-")}</strong></span>
        <span>Ocekivan povrat <strong>${toolroomEscape(item.expectedReturnAt || "-")}</strong></span>
      </div>
      <div class="toolroom-quick-actions">
        <button class="btn" ${canToolroomAssignUi() && !assigned && item.status === "available" ? "" : "disabled"} data-cmax-action="toolroom.openAction" data-cmax-args='["assign","${toolroomEscape(item.id)}"]'>Zaduzi</button>
        <button class="btn" ${canToolroomReturnUi() && assigned ? "" : "disabled"} data-cmax-action="toolroom.openAction" data-cmax-args='["return","${toolroomEscape(item.id)}"]'>Razduzi</button>
        <button class="btn" ${canToolroomAssignUi() && assigned ? "" : "disabled"} data-cmax-action="toolroom.openAction" data-cmax-args='["transfer","${toolroomEscape(item.id)}"]'>Prebaci</button>
        <button class="btn btn-secondary" ${canToolroomHandleServiceUi() ? "" : "disabled"} data-cmax-action="toolroom.switchTab" data-cmax-args='["faults"]'>Servis</button>
        <button class="btn btn-secondary" ${canReportFaultForToolUi(item) ? "" : "disabled"} data-cmax-action="toolroom.openAction" data-cmax-args='["fault","${toolroomEscape(item.id)}"]'>Prijavi kvar</button>
        <button class="btn btn-secondary" data-cmax-action="toolroom.openAction" data-cmax-args='["history","${toolroomEscape(item.id)}"]'>Historija</button>
        ${canToolroomManageUi() ? `<button class="btn btn-danger" data-cmax-action="toolroom.archiveItem" data-cmax-args='["${toolroomEscape(item.id)}",${Number(item.itemVersion || 1)}]'>Arhiviraj</button>` : ""}
      </div>
      ${renderToolroomActionPanel(item)}
    </div>
  `;
}

function renderToolroomActionPanel(item) {
  if (!toolroomState.action || toolroomState.action.toolId !== item.id) return "";
  const type = toolroomState.action.type;
  if (type === "history") {
    const events = (toolroomState.data.history || []).filter((event) => event.entityId === item.id).slice(-12).reverse();
    return `<div class="toolroom-action-panel"><div class="toolroom-card-head"><h3>Historija alata</h3><button class="btn btn-secondary" data-cmax-action="toolroom.closeAction">Zatvori</button></div>${events.length ? events.map((event) => `<p><strong>${toolroomEscape(event.type)}</strong><br><small>${toolroomEscape(event.note)} | ${toolroomEscape(event.actor)} | ${toolroomEscape(event.at)}</small></p>`).join("") : `<div class="toolroom-empty">Nema historije za ovaj alat.</div>`}</div>`;
  }
  if (type === "return") {
    return `
      <div class="toolroom-action-panel">
        <div class="toolroom-card-head"><h3>Razduzi / vrati alat</h3><button class="btn btn-secondary" data-cmax-action="toolroom.closeAction">Zatvori</button></div>
        <div class="toolroom-form">
          <label>Stanje<select id="toolroomReturnCondition"><option value="ok">Vracen ispravan</option><option value="damaged">Vracen ostecen</option><option value="not_returned">Nije vracen</option><option value="lost">Izgubljen</option></select></label>
          <label>Datum<input id="toolroomReturnDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
          <label class="toolroom-wide">Napomena<textarea id="toolroomReturnNote"></textarea></label>
          <button class="btn" data-cmax-action="toolroom.submitReturn" data-cmax-args='["${toolroomEscape(item.id)}"]'>Potvrdi razduzenje</button>
        </div>
      </div>`;
  }
  if (type === "fault") {
    return `
      <div class="toolroom-action-panel">
        <div class="toolroom-card-head"><h3>Prijavi kvar</h3><button class="btn btn-secondary" data-cmax-action="toolroom.closeAction">Zatvori</button></div>
        <div class="toolroom-form">
          <label>Tip kvara<select id="toolroomFaultType">${renderToolroomPresetOptions("faultType", "")}<option value="Ostalo">Ostalo</option></select></label>
          <label>Slika/dokument URL<input id="toolroomFaultAttachment" placeholder="Opcionalno"></label>
          <label class="toolroom-wide">Komentar<textarea id="toolroomFaultComment" placeholder="Opis problema"></textarea></label>
          <label class="toolroom-wide toolroom-check"><input id="toolroomFaultReplacement" type="checkbox"> Trebam zamjenski alat</label>
          <button class="btn" data-cmax-action="toolroom.submitFault" data-cmax-args='["${toolroomEscape(item.id)}"]'>Posalji prijavu</button>
        </div>
      </div>`;
  }
  const submitAction = type === "transfer" ? "toolroom.submitTransfer" : "toolroom.submitAssign";
  const title = type === "transfer" ? "Prebaci alat" : "Zaduzi alat";
  return `
    <div class="toolroom-action-panel">
      <div class="toolroom-card-head"><h3>${title}</h3><button class="btn btn-secondary" data-cmax-action="toolroom.closeAction">Zatvori</button></div>
      <div class="toolroom-form">
        <label>Zaduzi na<select id="toolroomAssignHolderType"><option value="worker">Radnika</option><option value="site">Gradiliste</option></select></label>
        <label>Radnik<select id="toolroomAssignWorker"><option value="">Odaberi radnika</option>${renderToolroomUserOptions()}</select></label>
        <label>Gradiliste<select id="toolroomAssignSite"><option value="">Odaberi gradiliste</option>${renderToolroomSiteOptions(currentSite)}</select></label>
        <label>Datum<input id="toolroomAssignDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
        <label>Ocekivan povrat<input id="toolroomExpectedReturnDate" type="date"></label>
        <label class="toolroom-wide">Napomena<textarea id="toolroomAssignNote"></textarea></label>
        <button class="btn" data-cmax-action="${submitAction}" data-cmax-args='["${toolroomEscape(item.id)}"]'>Potvrdi</button>
      </div>
    </div>`;
}

function renderToolroomCategoriesTab() {
  const categories = getToolroomCategories().filter((category) => !category.archived);
  const breadcrumb = getToolroomBreadcrumb();
  const children = categories.filter((category) => (category.parentId || "") === (toolroomState.activeCategoryId || "")).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const selected = getToolroomCategoryById(toolroomState.activeCategoryId);
  return `
    <div class="toolroom-grid">
      <article class="toolroom-card">
        <h3>Kategorije</h3>
        <div class="toolroom-breadcrumb"><button data-cmax-action="toolroom.selectCategory" data-cmax-args='[""]'>Alatnica</button>${breadcrumb.map((category) => `<button data-cmax-action="toolroom.selectCategory" data-cmax-args='["${toolroomEscape(category.id)}"]'>${toolroomEscape(category.name)}</button>`).join("")}</div>
        <div class="toolroom-category-grid">
          ${children.length ? children.map((category) => `<button class="toolroom-category-card" data-cmax-action="toolroom.selectCategory" data-cmax-args='["${toolroomEscape(category.id)}"]'><span>${toolroomEscape(category.iconKey || "folder")}</span><strong>${toolroomEscape(category.name)}</strong></button>`).join("") : `<div class="toolroom-empty">Nema podkategorija u ovom nivou.</div>`}
        </div>
      </article>
      <article class="toolroom-card">
        <h3>${selected ? "Uredi kategoriju" : "Dodaj kategoriju"}</h3>
        ${canToolroomManageUi() ? renderToolroomCategoryForm(selected) : `<div class="toolroom-empty">Nemate dozvolu za uredjivanje kategorija.</div>`}
      </article>
    </div>
  `;
}

function renderToolroomCategoryForm(category = null) {
  const categories = getToolroomCategories().filter((entry) => !entry.archived && entry.id !== category?.id);
  return `
    <div class="toolroom-form">
      <input id="toolroomCategoryId" type="hidden" value="${toolroomEscape(category?.id || "")}">
      <input id="toolroomCategoryVersion" type="hidden" value="${toolroomEscape(category?.categoryVersion || "")}">
      <label>Naziv<input id="toolroomCategoryName" value="${toolroomEscape(category?.name || "")}"></label>
      <label>Parent<select id="toolroomCategoryParent"><option value="">Alatnica root</option>${categories.map((entry) => `<option value="${toolroomEscape(entry.id)}" ${category?.parentId === entry.id ? "selected" : ""}>${toolroomEscape(entry.name)}</option>`).join("")}</select></label>
      <label>Ikona<input id="toolroomCategoryIcon" value="${toolroomEscape(category?.iconKey || "folder")}"></label>
      <label>Redoslijed<input id="toolroomCategoryOrder" type="number" value="${toolroomEscape(category?.order || 1)}"></label>
      <button class="btn" data-cmax-action="toolroom.saveCategoryFromForm">Spremi kategoriju</button>
      ${category ? `<button class="btn btn-danger" data-cmax-action="toolroom.archiveCategory" data-cmax-args='["${toolroomEscape(category.id)}",${Number(category.categoryVersion || 1)}]'>Arhiviraj</button>` : ""}
    </div>
  `;
}

function renderToolroomPresetsTab() {
  const types = ["toolType", "brand", "model", "status", "faultType", "serviceAction", "prefixRule"];
  return `
    <div class="toolroom-grid">
      ${types.map((type) => `
        <article class="toolroom-card">
          <h3>${toolroomEscape(type)}</h3>
          <div class="toolroom-list is-compact">
            ${getToolroomPresets(type).slice(0, 10).map((preset) => `<span>${toolroomEscape(preset.label)} <small>${toolroomEscape(preset.value)}</small></span>`).join("") || `<div class="toolroom-empty">Nema preseta.</div>`}
          </div>
        </article>
      `).join("")}
      <article class="toolroom-card">
        <h3>Dodaj / uredi preset</h3>
        ${canToolroomEditPresetsUi() ? renderToolroomPresetForm() : `<div class="toolroom-empty">Nemate dozvolu za presete.</div>`}
      </article>
    </div>
  `;
}

function renderToolroomFaultsTab() {
  const faults = getToolroomFaults().slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const serviceRecords = getToolroomServiceRecords();
  return `
    <div class="toolroom-grid">
      <article class="toolroom-card">
        <h3>Alatnicar fault queue</h3>
        ${faults.length ? faults.map((fault) => {
          const item = getToolroomItemById(fault.toolId);
          const replacement = fault.replacementRequested ? getToolroomAssignableItems().find((candidate) => candidate.id !== fault.toolId && ((item?.model && candidate.model === item.model) || (item?.type && candidate.type === item.type))) : null;
          return `
            <div class="toolroom-fault-card">
              <div>
                <strong>${toolroomEscape(item?.internalNumber || "-")} - ${toolroomEscape(item?.name || "-")}</strong>
                <p>${toolroomEscape(fault.faultType)} | ${toolroomEscape(fault.status)} | ${toolroomEscape(fault.reporterName || fault.reporterEmail)} | ${toolroomEscape(fault.reporterSite || "-")}</p>
                <small>${toolroomEscape(fault.comment || "")}</small>
                ${fault.replacementRequested ? `<div class="toolroom-status-pill">Zamjena: ${replacement ? `predlozeno ${toolroomEscape(replacement.internalNumber)}` : "Nema dostupne zamjene"}</div>` : ""}
              </div>
              ${canToolroomHandleServiceUi() ? `
                <div class="toolroom-fault-actions">
                  <button class="btn btn-secondary" data-cmax-action="toolroom.updateFault" data-cmax-args='["${toolroomEscape(fault.id)}","received"]'>Zaprimljeno</button>
                  <button class="btn btn-secondary" data-cmax-action="toolroom.updateFault" data-cmax-args='["${toolroomEscape(fault.id)}","awaiting_return"]'>Ceka povrat</button>
                  <button class="btn btn-secondary" data-cmax-action="toolroom.updateFault" data-cmax-args='["${toolroomEscape(fault.id)}","returned_office"]'>Vraceno u ured</button>
                  <button class="btn btn-secondary" data-cmax-action="toolroom.openAction" data-cmax-args='["service","${toolroomEscape(fault.id)}"]'>Posalji na servis</button>
                  <button class="btn btn-secondary" data-cmax-action="toolroom.updateFault" data-cmax-args='["${toolroomEscape(fault.id)}","returned_available"]'>Vrati u opticaj</button>
                  ${canToolroomWriteOffUi() ? `<button class="btn btn-danger" data-cmax-action="toolroom.updateFault" data-cmax-args='["${toolroomEscape(fault.id)}","written_off"]'>Otpisi</button>` : ""}
                  ${fault.replacementRequested && replacement ? `<button class="btn" data-cmax-action="toolroom.assignReplacement" data-cmax-args='["${toolroomEscape(fault.id)}","${toolroomEscape(replacement.id)}"]'>Dodijeli zamjenu</button>` : ""}
                </div>
              ` : ""}
              ${toolroomState.action?.type === "service" && toolroomState.action?.toolId === fault.id ? renderToolroomServicePanel(fault) : ""}
            </div>
          `;
        }).join("") : `<div class="toolroom-empty">Nema prijava kvarova.</div>`}
      </article>
      <article class="toolroom-card">
        <h3>Servis records</h3>
        ${serviceRecords.length ? serviceRecords.slice().reverse().map((record) => `<p><strong>${toolroomEscape(record.serviceCompany || "Servis")}</strong><br><small>${toolroomEscape(record.status)} | ${toolroomEscape(record.sentAt)} | ${toolroomEscape(record.expectedReturnAt || "-")} | ${toolroomEscape(record.cost || 0)} SEK</small></p>`).join("") : `<div class="toolroom-empty">Nema servisnih zapisa.</div>`}
      </article>
    </div>
  `;
}

function renderToolroomServicePanel(fault) {
  return `
    <div class="toolroom-action-panel">
      <div class="toolroom-card-head"><h3>Servis</h3><button class="btn btn-secondary" data-cmax-action="toolroom.closeAction">Zatvori</button></div>
      <div class="toolroom-form">
        <label>Servisna firma<input id="toolroomServiceCompany" placeholder="npr. Hilti Service"></label>
        <label>Datum slanja<input id="toolroomServiceSentAt" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
        <label>Ocekivan povrat<input id="toolroomServiceExpectedReturn" type="date"></label>
        <label>Trosak SEK<input id="toolroomServiceCost" type="number" min="0" step="1"></label>
        <label>Dokument/racun URL<input id="toolroomServiceDocument"></label>
        <label class="toolroom-wide">Opis / komentar<textarea id="toolroomServiceComment">${toolroomEscape(fault.comment || "")}</textarea></label>
        <button class="btn" data-cmax-action="toolroom.submitService" data-cmax-args='["${toolroomEscape(fault.id)}"]'>Posalji na servis</button>
      </div>
    </div>`;
}

function renderToolroomPresetForm() {
  return `
    <div class="toolroom-form">
      <label>Tip<select id="toolroomPresetType">${["toolType", "brand", "model", "status", "faultType", "serviceAction", "prefixRule"].map((type) => `<option value="${type}">${type}</option>`).join("")}</select></label>
      <label>Naziv<input id="toolroomPresetLabel"></label>
      <label>Vrijednost<input id="toolroomPresetValue"></label>
      <button class="btn" data-cmax-action="toolroom.savePresetFromForm">Spremi preset</button>
    </div>
  `;
}

function renderToolroomMyToolsTab() {
  const tools = Array.isArray(toolroomState.myTools) ? toolroomState.myTools : [];
  return `
    <div class="toolroom-my-tools">
      <article class="toolroom-card">
        <h3>Moji alati</h3>
        <p class="toolroom-muted">Prikazuje alate zaduzenje direktno na vas i alate zaduzenje na aktivno gradiliste: <strong>${toolroomEscape(currentSite || "-")}</strong>.</p>
        ${canToolroomViewMyToolsUi() ? `
          <div class="toolroom-my-tool-grid">
            ${tools.length ? tools.map((item) => `
              <article class="toolroom-my-tool-card">
                <div class="toolroom-icon">${toolroomEscape((item.internalNumber || "?").slice(0, 3))}</div>
                <div>
                  <strong>${toolroomEscape(item.internalNumber || "-")}</strong>
                  <h4>${toolroomEscape(item.name || "-")}</h4>
                  <p>${toolroomEscape(item.brand || "")} ${toolroomEscape(item.model || "")}</p>
                  <span class="toolroom-status-pill">${toolroomEscape(item.status || "-")}</span>
                  <small>${toolroomEscape(getToolroomHolderLabelUi(item))} | ${toolroomEscape(item.issuedAt || "-")}</small>
                </div>
                <div class="toolroom-my-tool-actions">
                  <button class="btn btn-secondary" data-cmax-action="toolroom.selectItem" data-cmax-args='["${toolroomEscape(item.id)}"]'>Detalji</button>
                  <button class="btn" ${canReportFaultForToolUi(item) ? "" : "disabled"} data-cmax-action="toolroom.openAction" data-cmax-args='["fault","${toolroomEscape(item.id)}"]'>Prijavi kvar</button>
                </div>
              </article>
            `).join("") : `<div class="toolroom-empty">Nema alata zaduzenih na vas ili aktivno gradiliste.</div>`}
          </div>
          ${toolroomState.action?.type === "fault" ? renderToolroomActionPanel(getToolroomItemById(toolroomState.action.toolId) || {}) : ""}
        ` : `<div class="toolroom-empty">Nemate dozvolu za prikaz svojih alata.</div>`}
      </article>
    </div>
  `;
}

function openToolroomAction(type, toolId) {
  toolroomState.action = { type: String(type || ""), toolId: String(toolId || "") };
  toolroomState.activeItemId = String(toolId || toolroomState.activeItemId || "");
  renderToolroom();
}

function closeToolroomAction() {
  toolroomState.action = null;
  renderToolroom();
}

function readToolroomAssignmentForm(toolId) {
  const holderType = document.getElementById("toolroomAssignHolderType")?.value || "worker";
  return {
    toolId,
    holderType,
    workerEmail: document.getElementById("toolroomAssignWorker")?.value || "",
    siteId: document.getElementById("toolroomAssignSite")?.value || "",
    assignedAt: document.getElementById("toolroomAssignDate")?.value || new Date().toISOString().slice(0, 10),
    expectedReturnAt: document.getElementById("toolroomExpectedReturnDate")?.value || "",
    note: document.getElementById("toolroomAssignNote")?.value || "",
  };
}

function submitToolroomAssign(toolId) {
  return withLoadingPromise("loadingDefault", () => toolroomApi("/assignments", {
    method: "POST",
    body: JSON.stringify(readToolroomAssignmentForm(toolId)),
  }).then((payload) => {
    showToast("Alat je zaduzen.", "success");
    toolroomState.activeItemId = payload.item?.id || toolId;
    toolroomState.action = null;
    toolroomState.myToolsLoaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Zaduzenje nije uspjelo.", "error")));
}

function submitToolroomTransfer(toolId) {
  return withLoadingPromise("loadingDefault", () => toolroomApi("/transfers", {
    method: "POST",
    body: JSON.stringify(readToolroomAssignmentForm(toolId)),
  }).then((payload) => {
    showToast("Alat je prebacen.", "success");
    toolroomState.activeItemId = payload.item?.id || toolId;
    toolroomState.action = null;
    toolroomState.myToolsLoaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Prebacivanje nije uspjelo.", "error")));
}

function submitToolroomReturn(toolId) {
  const payload = {
    toolId,
    condition: document.getElementById("toolroomReturnCondition")?.value || "ok",
    returnedAt: document.getElementById("toolroomReturnDate")?.value || new Date().toISOString().slice(0, 10),
    note: document.getElementById("toolroomReturnNote")?.value || "",
  };
  return withLoadingPromise("loadingDefault", () => toolroomApi("/returns", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((response) => {
    showToast("Razduzenje je spremljeno.", "success");
    toolroomState.activeItemId = response.item?.id || toolId;
    toolroomState.action = null;
    toolroomState.myToolsLoaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Razduzenje nije uspjelo.", "error")));
}

function submitToolroomFault(toolId) {
  const payload = {
    toolId,
    activeSite: currentSite || "",
    faultType: document.getElementById("toolroomFaultType")?.value || "Ostalo",
    comment: document.getElementById("toolroomFaultComment")?.value || "",
    attachmentUrl: document.getElementById("toolroomFaultAttachment")?.value || "",
    replacementRequested: document.getElementById("toolroomFaultReplacement")?.checked === true,
  };
  return withLoadingPromise("loadingDefault", () => toolroomApi("/faults", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(() => {
    showToast("Kvar je prijavljen.", "success");
    toolroomState.action = null;
    toolroomState.myToolsLoaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Prijava kvara nije uspjela.", "error")));
}

function updateToolroomFault(faultId, action) {
  return withLoadingPromise("loadingDefault", () => toolroomApi(`/faults/${encodeURIComponent(faultId)}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  }).then(() => {
    showToast("Status kvara je azuriran.", "success");
    toolroomState.action = null;
    toolroomState.myToolsLoaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Azuriranje kvara nije uspjelo.", "error")));
}

function submitToolroomService(faultId) {
  const payload = {
    faultId,
    serviceCompany: document.getElementById("toolroomServiceCompany")?.value || "",
    sentAt: document.getElementById("toolroomServiceSentAt")?.value || new Date().toISOString().slice(0, 10),
    expectedReturnAt: document.getElementById("toolroomServiceExpectedReturn")?.value || "",
    cost: Number(document.getElementById("toolroomServiceCost")?.value || 0),
    documentUrl: document.getElementById("toolroomServiceDocument")?.value || "",
    comment: document.getElementById("toolroomServiceComment")?.value || "",
  };
  return withLoadingPromise("loadingDefault", () => toolroomApi("/service", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(() => {
    showToast("Alat je poslan na servis.", "success");
    toolroomState.action = null;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Servis nije spremljen.", "error")));
}

function assignToolroomReplacement(faultId, replacementToolId) {
  return withLoadingPromise("loadingDefault", () => toolroomApi(`/faults/${encodeURIComponent(faultId)}/replacement`, {
    method: "POST",
    body: JSON.stringify({ replacementToolId }),
  }).then(() => {
    showToast("Zamjenski alat je dodijeljen.", "success");
    toolroomState.myToolsLoaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Zamjena nije dodijeljena.", "error")));
}

function saveToolroomItemFromForm() {
  const item = {
    id: document.getElementById("toolroomItemId")?.value || undefined,
    internalNumber: document.getElementById("toolroomInternalNumber")?.value || "",
    serialNumber: document.getElementById("toolroomSerialNumber")?.value || "",
    name: document.getElementById("toolroomItemName")?.value || "",
    type: document.getElementById("toolroomItemType")?.value || "",
    brand: document.getElementById("toolroomItemBrand")?.value || "",
    model: document.getElementById("toolroomItemModel")?.value || "",
    categoryId: document.getElementById("toolroomItemCategory")?.value || "",
    status: document.getElementById("toolroomItemStatus")?.value || "available",
    notes: document.getElementById("toolroomItemNotes")?.value || "",
    itemVersion: Number(document.getElementById("toolroomItemVersion")?.value || 0),
  };
  return withLoadingPromise("loadingDefault", () => toolroomApi("/items", {
    method: "POST",
    body: JSON.stringify({ item, baseVersion: item.itemVersion || undefined }),
  }).then((payload) => {
    showToast("Alat je spremljen.", "success");
    toolroomState.activeItemId = payload.item?.id || "";
    toolroomState.loaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => {
    showToast(error.payload?.error || error.message || "Spremanje alata nije uspjelo.", "error");
  }));
}

function saveToolroomCategoryFromForm() {
  const category = {
    id: document.getElementById("toolroomCategoryId")?.value || undefined,
    name: document.getElementById("toolroomCategoryName")?.value || "",
    parentId: document.getElementById("toolroomCategoryParent")?.value || "",
    iconKey: document.getElementById("toolroomCategoryIcon")?.value || "folder",
    order: Number(document.getElementById("toolroomCategoryOrder")?.value || 1),
    categoryVersion: Number(document.getElementById("toolroomCategoryVersion")?.value || 0),
  };
  return withLoadingPromise("loadingDefault", () => toolroomApi("/categories", {
    method: "POST",
    body: JSON.stringify({ category, baseVersion: category.categoryVersion || undefined }),
  }).then((payload) => {
    showToast("Kategorija je spremljena.", "success");
    toolroomState.activeCategoryId = payload.category?.id || "";
    toolroomState.loaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Spremanje kategorije nije uspjelo.", "error")));
}

function saveToolroomPresetFromForm() {
  const preset = {
    type: document.getElementById("toolroomPresetType")?.value || "toolType",
    label: document.getElementById("toolroomPresetLabel")?.value || "",
    value: document.getElementById("toolroomPresetValue")?.value || "",
  };
  return withLoadingPromise("loadingDefault", () => toolroomApi("/presets", {
    method: "POST",
    body: JSON.stringify({ preset }),
  }).then(() => {
    showToast("Preset je spremljen.", "success");
    toolroomState.loaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }).catch((error) => showToast(error.payload?.error || error.message || "Spremanje preseta nije uspjelo.", "error")));
}

function archiveToolroomItem(id, version) {
  return withLoadingPromise("loadingDefault", () => toolroomApi(`/items/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ baseVersion: version }),
  }).then(() => {
    showToast("Alat je arhiviran.", "success");
    toolroomState.activeItemId = "";
    toolroomState.loaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }));
}

function archiveToolroomCategory(id, version) {
  return withLoadingPromise("loadingDefault", () => toolroomApi(`/categories/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ baseVersion: version }),
  }).then(() => {
    showToast("Kategorija je arhivirana.", "success");
    toolroomState.activeCategoryId = "";
    toolroomState.loaded = false;
    return loadToolroomData(true).then(renderToolroom);
  }));
}
