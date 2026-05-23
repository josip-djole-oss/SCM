var toolroomState = {
  loaded: false,
  loading: false,
  activeTab: "dashboard",
  activeCategoryId: "",
  activeItemId: "",
  data: { items: [], categories: [], presets: [], history: [] },
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
  renderToolroom();
}

function selectToolroomCategory(categoryId = "") {
  toolroomState.activeCategoryId = String(categoryId || "");
  toolroomState.activeTab = "categories";
  renderToolroom();
}

function selectToolroomItem(itemId = "") {
  toolroomState.activeItemId = String(itemId || "");
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
          ["categories", "Kategorije"],
          ["presets", "Preseti"],
          ["myTools", "Moji alati"],
        ].map(([key, label]) => `<button class="btn btn-secondary ${toolroomState.activeTab === key ? "btn-success" : ""}" data-cmax-action="toolroom.switchTab" data-cmax-args='["${key}"]'>${label}</button>`).join("")}
      </div>
      <div class="toolroom-stats">
        <article><strong>${items.length}</strong><span>Ukupno alata</span></article>
        <article><strong>${categories.length}</strong><span>Kategorije</span></article>
        <article><strong>${presets.length}</strong><span>Preseti</span></article>
        <article><strong>${inService}</strong><span>Na servisu</span></article>
        <article><strong>${awaiting}</strong><span>Ceka graviranje</span></article>
      </div>
      <div class="toolroom-content">
        ${renderToolroomActiveTab()}
      </div>
    </section>
  `;
}

function renderToolroomActiveTab() {
  if (toolroomState.activeTab === "items") return renderToolroomItemsTab();
  if (toolroomState.activeTab === "categories") return renderToolroomCategoriesTab();
  if (toolroomState.activeTab === "presets") return renderToolroomPresetsTab();
  if (toolroomState.activeTab === "myTools") return renderToolroomMyToolsTab();
  return renderToolroomDashboardTab();
}

function renderToolroomDashboardTab() {
  const items = getToolroomItems().filter((item) => !item.archived);
  const recent = (toolroomState.data.history || []).slice(-6).reverse();
  return `
    <div class="toolroom-grid">
      <article class="toolroom-card">
        <h3>Pregled za Alatnicara</h3>
        <p class="toolroom-muted">Phase 1 prikazuje osnovu. Zaduzenje, servis i kvarovi dolaze u sljedecoj fazi.</p>
        <div class="toolroom-status-grid">
          ${["available", "awaiting_engraving", "assigned_worker", "assigned_site", "in_service", "written_off"].map((status) => `<span>${status}: <strong>${items.filter((item) => item.status === status).length}</strong></span>`).join("")}
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
  return `
    <div class="toolroom-detail">
      <div class="toolroom-big-icon">${toolroomEscape(item.internalNumber || "?")}</div>
      <h2>${toolroomEscape(item.name || "-")}</h2>
      <p>${toolroomEscape(item.brand)} ${toolroomEscape(item.model)}</p>
      <div class="toolroom-status-grid">
        <span>Status <strong>${toolroomEscape(item.status)}</strong></span>
        <span>Kategorija <strong>${toolroomEscape(category?.name || "-")}</strong></span>
        <span>Serijski broj <strong>${toolroomEscape(item.serialNumber || "-")}</strong></span>
        <span>Verzija <strong>${toolroomEscape(item.itemVersion || 1)}</strong></span>
      </div>
      <div class="toolroom-quick-actions">
        <button class="btn" disabled>Zaduzi</button>
        <button class="btn" disabled>Razduzi</button>
        <button class="btn" disabled>Prebaci</button>
        <button class="btn btn-secondary" disabled>Servis</button>
        <button class="btn btn-secondary" disabled>Prijavi kvar</button>
        <button class="btn btn-secondary" disabled>Historija</button>
        ${canToolroomManageUi() ? `<button class="btn btn-danger" data-cmax-action="toolroom.archiveItem" data-cmax-args='["${toolroomEscape(item.id)}",${Number(item.itemVersion || 1)}]'>Arhiviraj</button>` : ""}
      </div>
      <p class="toolroom-muted">Brze akcije su prikazane kao Phase 1 placeholder; workflowi dolaze u Phase 2.</p>
    </div>
  `;
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
  return `
    <div class="toolroom-my-tools">
      <article class="toolroom-card">
        <h3>Moji alati</h3>
        <div class="toolroom-empty">Phase 1 empty state. U Phase 2 ovdje dolaze velike mobile kartice za alate zaduzenje na korisnika ili aktivno gradiliste.</div>
      </article>
    </div>
  `;
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
