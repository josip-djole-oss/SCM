function getWarehouseCatalogSorted() {
  return (warehouseData?.catalog || []).slice().sort((a, b) => compareNaturally(a.name, b.name));
}

function getVisibleWarehouseCatalog() {
  const catalog = getWarehouseCatalogSorted();
  if (!appState.isReadonly) return catalog;
  const allowedItemIds = new Set(getGuestWarehouseSiteAccess().allowedItemIds);
  return catalog.filter((item) => allowedItemIds.has(item.id));
}

function getVisibleWarehouseLogs() {
  const logs = warehouseData?.logs || [];
  if (!appState.isReadonly) return logs;
  const allowedItemIds = new Set(getGuestWarehouseSiteAccess().allowedItemIds);
  return logs.filter((entry) => allowedItemIds.has(entry.itemId));
}

function createDefaultWarehouseLogFilters() {
  return {
    filterDate: "",
    filterWorker: "",
    filterItem: "",
    filterType: "",
    filterFlow: "",
    sortField: "timestamp",
    sortDirection: "desc",
  };
}

var warehouseLogFilterState = createDefaultWarehouseLogFilters();
var warehouseLogRenderLimit = 50;

function getWarehouseItemById(itemId) {
  return (warehouseData?.catalog || []).find((item) => item.id === itemId) || null;
}

function ensureWarehouseStockRecord(itemId) {
  if (!warehouseData) loadWarehouseData();
  if (!warehouseData.stock[itemId]) {
    warehouseData.stock[itemId] = { current: 0, totalIssued: 0, totalReceived: 0 };
  }
  return warehouseData.stock[itemId];
}

function persistWarehouseData(site = currentSite) {
  warehouseData = normalizeWarehouseData(warehouseData);
  const changed = setCachedStorageJson(getSiteStorageKey("cmax_warehouse_data", site), warehouseData);
  if (!changed) return false;
  trackEditActivity();
  scheduleServerSync();
  CMAX_PERF?.count?.("persistWarehouseData");
  return true;
}

function getWarehouseAlerts() {
  return getVisibleWarehouseCatalog()
    .map((item) => {
      const stock = ensureWarehouseStockRecord(item.id);
      if ((item.minimum || 0) <= 0 || stock.current > item.minimum) return null;
      return {
        item,
        stock,
      };
    })
    .filter(Boolean);
}

function getWarehouseResponsibleAdmins(site = currentSite) {
  const selected = new Set((warehouseData?.procurementUsers || []).map((email) => String(email || "").trim().toLowerCase()));
  if (!selected.size) return [];
  return getAdmins().filter((admin) => {
    if (!admin || !admin.email) return false;
    if (!selected.has(String(admin.email).trim().toLowerCase())) return false;
    if (admin.isSuperAdmin) return true;
    if (!Array.isArray(admin.allowedSites)) return true;
    return admin.allowedSites.includes(site);
  });
}

function renderWarehouseProcurementOptions() {
  const details = document.getElementById("warehouseProcurementDetails");
  const options = document.getElementById("warehouseProcurementOptions");
  const summary = document.getElementById("warehouseProcurementSummary");
  if (!details || !options || !summary || !warehouseData) return;

  const selected = new Set((warehouseData.procurementUsers || []).map((email) => String(email || "").trim().toLowerCase()));
  const admins = getAdmins()
    .filter((admin) => admin?.email)
    .map((admin) => ({
      email: String(admin.email || "").trim().toLowerCase(),
      name: (admin.fullName || `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.email),
      allowedSites: Array.isArray(admin.allowedSites) ? admin.allowedSites : [],
      isSuperAdmin: admin.isSuperAdmin === true,
    }))
    .filter((admin) => admin.isSuperAdmin || !admin.allowedSites.length || admin.allowedSites.includes(currentSite))
    .sort((a, b) => compareNaturally(a.name, b.name));

  options.innerHTML = "";
  if (!admins.length) {
    options.innerHTML = `<div class="warehouse-multi-select-option">${escapeHtml(t("warehouseNoAssignedAdmin"))}</div>`;
  } else {
    admins.forEach((admin) => {
      const label = document.createElement("label");
      label.className = "warehouse-multi-select-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = admin.email;
      checkbox.checked = selected.has(admin.email);
      checkbox.disabled = !canEditWarehouse();
      checkbox.setAttribute("data-cmax-action", "warehouse.toggleProcurementUser");
      checkbox.setAttribute("data-cmax-args", JSON.stringify([admin.email]));
      checkbox.setAttribute("data-cmax-event", "change");
      checkbox.setAttribute("data-cmax-pass-event", "");
      const text = document.createElement("span");
      text.textContent = admin.name;
      label.appendChild(checkbox);
      label.appendChild(text);
      options.appendChild(label);
    });
  }

  const selectedNames = admins.filter((admin) => selected.has(admin.email)).map((admin) => admin.name);
  summary.textContent = selectedNames.length ? selectedNames.join(", ") : "Odaberi osobe";
  details.classList.toggle("is-disabled", !canEditWarehouse());
}

function toggleWarehouseProcurementUser(email, event) {
  if (!canEditWarehouse() || !warehouseData) return;
  const checkbox = event?.target;
  if (!checkbox) return;
  const nextSelected = new Set((warehouseData.procurementUsers || []).map((entry) => String(entry || "").trim().toLowerCase()));
  if (checkbox.checked) nextSelected.add(String(email || "").trim().toLowerCase());
  else nextSelected.delete(String(email || "").trim().toLowerCase());
  warehouseData.procurementUsers = Array.from(nextSelected);
  persistWarehouseData();
  renderWarehouseProcurementOptions();
  renderWarehouseAlerts();
  renderWarehouseInventorySummary();
}

function createWarehouseSelect(selectedValue, action, args = []) {
  const select = document.createElement("select");
  select.className = "warehouse-select";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "-";
  select.appendChild(emptyOption);
  getVisibleWarehouseCatalog().forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    if (item.id === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  select.disabled = !canEditWarehouse();
  if (action) {
    select.setAttribute("data-cmax-action", action);
    select.setAttribute("data-cmax-event", "change");
    select.setAttribute("data-cmax-pass-event", "");
    if (Array.isArray(args) && args.length) {
      select.setAttribute("data-cmax-args", JSON.stringify(args));
    }
  }
  return select;
}

function createWorkerSelect(selectedValue, action, args = []) {
  const select = document.createElement("select");
  select.className = "warehouse-select";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "-";
  select.appendChild(emptyOption);
  sortNaturally(appState.workers || []).forEach((worker) => {
    const option = document.createElement("option");
    option.value = worker;
    option.textContent = worker;
    if (worker === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  select.disabled = !canEditWarehouse();
  if (action) {
    select.setAttribute("data-cmax-action", action);
    select.setAttribute("data-cmax-event", "change");
    select.setAttribute("data-cmax-pass-event", "");
    if (Array.isArray(args) && args.length) {
      select.setAttribute("data-cmax-args", JSON.stringify(args));
    }
  }
  return select;
}

function saveWarehouseDraft() {
  persistWarehouseData();
  if (typeof cmaxScheduleFrame === "function") {
    cmaxScheduleFrame("warehouse-issue-draft-render", () => renderWarehouseIssueTable());
  } else {
    renderWarehouseIssueTable();
  }
}

function updateWarehouseIssueDraftWorker(event) {
  if (!warehouseData) return;
  warehouseData.issueDraft.worker = event?.target?.value || "";
  saveWarehouseDraft();
}

function updateWarehouseIssueDraftSlotItem(slotIndex, event) {
  if (!warehouseData) return;
  const index = Number(slotIndex);
  if (!Number.isInteger(index) || index < 0 || index >= warehouseData.issueDraft.slots.length) return;
  warehouseData.issueDraft.slots[index].itemId = event?.target?.value || "";
  saveWarehouseDraft();
}

function updateWarehouseIssueDraftSlotQuantity(slotIndex, event) {
  if (!warehouseData) return;
  const index = Number(slotIndex);
  if (!Number.isInteger(index) || index < 0 || index >= warehouseData.issueDraft.slots.length) return;
  warehouseData.issueDraft.slots[index].quantity = Math.max(Number(event?.target?.value) || 1, 1);
  saveWarehouseDraft();
}

function updateWarehouseIssueDraftComment(event) {
  if (!warehouseData) return;
  warehouseData.issueDraft.comment = event?.target?.value || "";
  saveWarehouseDraft();
}

function renderWarehouseIssueTable() {
  const tbody = document.getElementById("warehouseIssueBody");
  if (!tbody || !warehouseData) return;
  tbody.innerHTML = "";

  const tr = document.createElement("tr");
  const workerTd = document.createElement("td");
  workerTd.appendChild(createWorkerSelect(warehouseData.issueDraft.worker, "warehouse.updateIssueDraftWorker"));
  tr.appendChild(workerTd);

  warehouseData.issueDraft.slots.forEach((slot, slotIndex) => {
    const td = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "warehouse-slot-cell";
    wrap.appendChild(createWarehouseSelect(slot.itemId, "warehouse.updateIssueDraftSlotItem", [slotIndex]));
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.value = Math.max(Number(slot.quantity) || 1, 1);
    qtyInput.className = "warehouse-qty-input";
    qtyInput.disabled = !canEditWarehouse();
    qtyInput.setAttribute("data-cmax-action", "warehouse.updateIssueDraftSlotQuantity");
    qtyInput.setAttribute("data-cmax-args", JSON.stringify([slotIndex]));
    qtyInput.setAttribute("data-cmax-event", "change");
    qtyInput.setAttribute("data-cmax-pass-event", "");
    wrap.appendChild(qtyInput);
    td.appendChild(wrap);
    tr.appendChild(td);
  });

  const commentTd = document.createElement("td");
  const commentInput = document.createElement("input");
  commentInput.type = "text";
  commentInput.className = "warehouse-comment-input";
  commentInput.placeholder = t("warehouseStockCommentPlaceholder");
  commentInput.value = warehouseData.issueDraft.comment || "";
  commentInput.disabled = !canEditWarehouse();
  commentInput.setAttribute("data-cmax-action", "warehouse.updateIssueDraftComment");
  commentInput.setAttribute("data-cmax-event", "change");
  commentInput.setAttribute("data-cmax-pass-event", "");
  commentTd.appendChild(commentInput);
  tr.appendChild(commentTd);

  const actionsTd = document.createElement("td");
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn";
  saveBtn.textContent = t("warehouseSave");
  saveBtn.disabled = !canEditWarehouse();
  saveBtn.setAttribute("data-cmax-action", "warehouse.saveIssueRow");
  actionsTd.appendChild(saveBtn);
  tr.appendChild(actionsTd);
  tbody.appendChild(tr);
}

function renderWarehouseInventorySummary() {
  const tbody = document.getElementById("warehouseInventoryBody");
  if (!tbody || !warehouseData) return;
  tbody.innerHTML = "";
  const visibleCatalog = getVisibleWarehouseCatalog();
  if (!visibleCatalog.length) {
    tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(t("warehouseNoVisibleItems"))}</td></tr>`;
    return;
  }
  visibleCatalog.forEach((item) => {
    const stock = ensureWarehouseStockRecord(item.id);
    const tr = document.createElement("tr");
    if ((item.minimum || 0) > 0 && stock.current <= item.minimum) {
      tr.className = "warehouse-low-stock-row";
    }
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.unit || "kom")}</td>
      <td>${stock.current}</td>
      <td>${stock.totalIssued}</td>
      <td>${stock.totalReceived}</td>
      <td>${item.minimum || 0}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderWarehouseCatalogManager() {
  const list = document.getElementById("warehouseCatalogList");
  if (!list || !warehouseData) return;
  list.innerHTML = "";
  const visibleCatalog = getVisibleWarehouseCatalog();
  if (!visibleCatalog.length) {
    list.innerHTML = `<div class="warehouse-alert-empty">${escapeHtml(t("warehouseNoVisibleItems"))}</div>`;
    return;
  }
  visibleCatalog.forEach((item) => {
    const stock = ensureWarehouseStockRecord(item.id);
    const row = document.createElement("div");
    row.className = "warehouse-catalog-item";
    row.innerHTML = `<strong>${escapeHtml(item.name)} (${escapeHtml(item.unit || "kom")})</strong><span class="warehouse-catalog-meta">Stanje ${stock.current} | min ${item.minimum || 0}</span>`;

    const actions = document.createElement("div");
    actions.className = "warehouse-catalog-actions";

    const limitBtn = document.createElement("button");
    limitBtn.className = "btn btn-small";
    limitBtn.textContent = t("warehouseThreshold");
    limitBtn.disabled = !canEditWarehouse();
    limitBtn.setAttribute("data-cmax-action", "warehouse.setCatalogItemLimit");
    limitBtn.setAttribute("data-cmax-args", JSON.stringify([item.id]));
    actions.appendChild(limitBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = t("warehouseRemoveItem");
    removeBtn.disabled = !canEditWarehouse();
    removeBtn.setAttribute("data-cmax-action", "warehouse.removeCatalogItem");
    removeBtn.setAttribute("data-cmax-args", JSON.stringify([item.id]));
    actions.appendChild(removeBtn);

    row.appendChild(actions);
    list.appendChild(row);
  });
}

function renderWarehouseAlerts() {
  const container = document.getElementById("warehouseAlerts");
  if (!container || !warehouseData) return;
  const alerts = getWarehouseAlerts();
  if (!alerts.length) {
    container.innerHTML = `<div class="warehouse-alert-empty">${escapeHtml(t("warehouseAlertsEmpty"))}</div>`;
    return;
  }
  container.innerHTML = "";
  alerts.forEach((alert) => {
    const card = document.createElement("div");
    card.className = "warehouse-alert-card";
    card.innerHTML = `<strong>${escapeHtml(alert.item.name)}</strong><span>Stanje: ${Number(alert.stock.current) || 0}</span><span>Minimum: ${Number(alert.item.minimum) || 0}</span>`;
    container.appendChild(card);
  });
}

function renderWarehousePage() {
  if (!warehouseData) loadWarehouseData();
  ["warehouseAlertsCard", "warehouseInventoryCard", "warehouseCatalogCard"].forEach((sectionId) => {
    const card = document.getElementById(sectionId);
    const button = card?.querySelector(".warehouse-collapse-btn");
    if (button) button.textContent = card.classList.contains("is-collapsed") ? "Prikazi" : "Sakrij";
  });
  renderWarehouseIssueTable();
  renderWarehouseInventorySummary();
  renderWarehouseCatalogManager();
  renderWarehouseAlerts();
  renderWarehouseProcurementOptions();

  const itemSelect = document.getElementById("warehouseStockItem");
  if (itemSelect) {
    itemSelect.innerHTML = "";
    getVisibleWarehouseCatalog().forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      if (item.id === warehouseData.stockForm.itemId) option.selected = true;
      itemSelect.appendChild(option);
    });
  }
  const qtyInput = document.getElementById("warehouseStockQuantity");
  if (qtyInput) qtyInput.value = warehouseData.stockForm.quantity || 1;
  const dirSelect = document.getElementById("warehouseStockDirection");
  if (dirSelect) dirSelect.value = warehouseData.stockForm.direction || "in";
  const commentInput = document.getElementById("warehouseStockComment");
  if (commentInput) commentInput.value = warehouseData.stockForm.comment || "";
  const saveButton = document.getElementById("warehouseStockSaveBtn");
  if (saveButton) saveButton.disabled = !canEditWarehouse();
  const catalogAddButton = document.getElementById("warehouseCatalogAddBtn");
  if (catalogAddButton) catalogAddButton.disabled = !canEditWarehouse();
}

function toggleWarehouseSection(sectionId) {
  const card = document.getElementById(sectionId);
  if (!card) return;
  card.classList.toggle("is-collapsed");
  const button = card.querySelector(".warehouse-collapse-btn");
  if (button) {
    button.textContent = card.classList.contains("is-collapsed") ? "Prikazi" : "Sakrij";
  }
}

function showWarehouse() {
  if (!canAccessWarehouseModule()) {
    showToast(t("warehouseAccessDenied"), "error");
    return;
  }
  return loadFreshDataForView("loadingDefault", () => {
  const homeSection = document.getElementById("home-section");
  const reportsSection = document.getElementById("reports-section");
  const settingsSection = document.getElementById("settings-section");
  if (homeSection) homeSection.style.display = "none";
  if (reportsSection) reportsSection.style.display = "none";
  if (settingsSection) settingsSection.style.display = "none";
  document.getElementById("tidplan-section").style.display = "none";
  document.getElementById("notifications-section").style.display = "none";
  document.getElementById("surveys-section").style.display = "none";
  document.getElementById("planner-section").style.display = "none";
  document.getElementById("warehouse-logs-section").style.display = "none";
  document.getElementById("warehouse-graph-section").style.display = "none";
  document.getElementById("warehouse-section").style.display = "block";
  currentView = "warehouse";
  saveCurrentView("warehouse");
  pushRouteForView("warehouse");
  renderWarehousePage();
  if (typeof updateShellForView === "function") updateShellForView("warehouse");
  sendPresence(true).catch(() => {});
  refreshPresence().catch(() => {});
  });
}

function showWarehouseLogs() {
  if (!canViewWarehouseLogsSection()) {
    showToast(t("warehouseLogsAccessDenied"), "error");
    return;
  }
  const homeSection = document.getElementById("home-section");
  const reportsSection = document.getElementById("reports-section");
  const settingsSection = document.getElementById("settings-section");
  if (homeSection) homeSection.style.display = "none";
  if (reportsSection) reportsSection.style.display = "none";
  if (settingsSection) settingsSection.style.display = "none";
  document.getElementById("tidplan-section").style.display = "none";
  document.getElementById("notifications-section").style.display = "none";
  document.getElementById("planner-section").style.display = "none";
  document.getElementById("warehouse-section").style.display = "none";
  document.getElementById("warehouse-graph-section").style.display = "none";
  document.getElementById("warehouse-logs-section").style.display = "block";
  currentView = "warehouseLogs";
  saveCurrentView("warehouseLogs");
  pushRouteForView("warehouseLogs");
  warehouseLogRenderLimit = 50;
  renderWarehouseLogsPage();
  if (typeof updateShellForView === "function") updateShellForView("warehouseLogs");
}

function showWarehouseGraph() {
  if (!canViewWarehouseAnalyticsSection()) {
    showToast(t("warehouseGraphAccessDenied"), "error");
    return;
  }
  const homeSection = document.getElementById("home-section");
  const reportsSection = document.getElementById("reports-section");
  const settingsSection = document.getElementById("settings-section");
  if (homeSection) homeSection.style.display = "none";
  if (reportsSection) reportsSection.style.display = "none";
  if (settingsSection) settingsSection.style.display = "none";
  document.getElementById("tidplan-section").style.display = "none";
  document.getElementById("notifications-section").style.display = "none";
  document.getElementById("planner-section").style.display = "none";
  document.getElementById("warehouse-section").style.display = "none";
  document.getElementById("warehouse-logs-section").style.display = "none";
  document.getElementById("warehouse-graph-section").style.display = "block";
  currentView = "warehouseGraph";
  saveCurrentView("warehouseGraph");
  pushRouteForView("warehouseGraph");
  renderWarehouseGraphPage();
  if (typeof updateShellForView === "function") updateShellForView("warehouseGraph");
}





function updateWarehouseStockForm(field, value) {
  if (warehouseData.stockForm[field] === value) return;
  warehouseData.stockForm[field] = value;
  persistWarehouseData();
}

function updateWarehouseStockFormFromEvent(field, event) {
  if (!warehouseData || !warehouseData.stockForm) return;
  const value = event?.target?.value;
  if (field === "quantity") {
    updateWarehouseStockForm(field, Math.max(Number(value) || 1, 1));
    return;
  }
  updateWarehouseStockForm(field, value);
}

function applyWarehouseMovement(itemId, quantity, direction, extra = {}) {
  const item = getWarehouseItemById(itemId);
  if (!item) return false;
  const stock = ensureWarehouseStockRecord(itemId);
  const amount = Math.max(Number(quantity) || 0, 0);
  if (!amount) return false;
  if (direction === "out" && stock.current < amount) {
    showToast(tFormat("warehouseInsufficientStock", { name: item.name }), "error");
    return false;
  }
  if (direction === "out") {
    stock.current -= amount;
    stock.totalIssued += amount;
  } else {
    stock.current += amount;
    stock.totalReceived += amount;
  }
  warehouseData.logs.push(
    createWarehouseLogEntry({
      type: extra.type || "adjustment",
      worker: extra.worker || "",
      itemId,
      itemName: item.name,
      quantity: amount,
      direction,
      comment: extra.comment || "",
      balanceAfter: stock.current,
    }),
  );
  if (warehouseData.logs.length > 3000) {
    warehouseData.logs = warehouseData.logs.slice(-3000);
  }
  return true;
}

function saveWarehouseIssueRow() {
  if (!canEditWarehouse()) return;
  const worker = (warehouseData.issueDraft.worker || "").trim();
  if (!worker) {
    showToast(t("warehouseSelectWorker"), "error");
    return;
  }
  const chosenSlots = warehouseData.issueDraft.slots
    .map((slot) => ({ itemId: slot.itemId, quantity: Math.max(Number(slot.quantity) || 1, 1) }))
    .filter((slot) => slot.itemId);
  if (!chosenSlots.length) {
    showToast(t("warehouseSelectAtLeastOneItem"), "error");
    return;
  }
  const comment = (warehouseData.issueDraft.comment || "").trim();
  for (const slot of chosenSlots) {
    const ok = applyWarehouseMovement(slot.itemId, slot.quantity, "out", {
      type: "issue",
      worker,
      comment,
    });
    if (!ok) return;
  }
  warehouseData.issueDraft = createWarehouseIssueDraft();
  persistWarehouseData();
  addLog("warehouse_issue", { worker, items: chosenSlots.length, site: currentSite });
  renderWarehousePage();
  showToast(t("warehouseIssueSaved"), "success");
}

function saveWarehouseStockAdjustment() {
  if (!canEditWarehouse()) return;
  const { itemId, quantity, direction, comment } = warehouseData.stockForm || {};
  if (!itemId) {
    showToast("Odaberi alat ili materijal.", "error");
    return;
  }
  if (!applyWarehouseMovement(itemId, quantity, direction, { type: "stock", comment })) {
    return;
  }
  warehouseData.stockForm.quantity = 1;
  warehouseData.stockForm.comment = "";
  persistWarehouseData();
  addLog("warehouse_stock_update", { itemId, quantity, direction, site: currentSite });
  renderWarehousePage();
  showToast(t("warehouseStockSaved"), "success");
}

function addWarehouseCatalogItem() {
  if (!canEditWarehouse()) return;
  showPromptDialog(t("warehouseNewItemPrompt"), "📦", "", (nameValue) => {
    const name = (nameValue || "").trim();
    if (!name) return;
    if ((warehouseData.catalog || []).some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      showToast(t("warehouseDuplicateItem"), "error");
      return;
    }
    showPromptDialog(t("warehouseUnitPrompt"), "📏", "kom", (unitValue) => {
      const unit = (unitValue || "kom").trim() || "kom";
      const id = `itm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      warehouseData.catalog.push({ id, name, unit, minimum: 0, notifyPerson: "" });
      warehouseData.stock[id] = { current: 0, totalIssued: 0, totalReceived: 0 };
      warehouseData.stockForm.itemId = id;
      persistWarehouseData();
      addLog("warehouse_catalog_add", { name, unit, site: currentSite });
      renderWarehousePage();
    });
  });
}

function removeWarehouseCatalogItem(itemId) {
  if (!canEditWarehouse()) return;
  const item = getWarehouseItemById(itemId);
  if (!item) return;
  showConfirm(tFormat("warehouseRemoveItemConfirm", { name: item.name }), null, "⚠️", () => {
    warehouseData.catalog = warehouseData.catalog.filter((entry) => entry.id !== itemId);
    delete warehouseData.stock[itemId];
    warehouseData.issueDraft.slots = warehouseData.issueDraft.slots.map((slot) =>
      slot.itemId === itemId ? { itemId: "", quantity: 1 } : slot,
    );
    if (warehouseData.stockForm.itemId === itemId) {
      warehouseData.stockForm.itemId = warehouseData.catalog[0]?.id || "";
    }
    persistWarehouseData();
    addLog("warehouse_catalog_remove", { name: item.name, site: currentSite });
    renderWarehousePage();
  });
}

function setWarehouseCatalogItemLimit(itemId) {
  if (!canEditWarehouse()) return;
  const item = getWarehouseItemById(itemId);
  if (!item) return;
  showPromptDialog(t("warehouseLimitPrompt"), "⚙️", String(item.minimum || 0), (value) => {
    item.minimum = Math.max(Number(value) || 0, 0);
    persistWarehouseData();
    renderWarehousePage();
  });
}

function populateWarehouseLogFilters() {
  if (!warehouseData) return;
  const workerSelect = document.getElementById("warehouseLogWorker");
  const itemSelect = document.getElementById("warehouseLogItem");
  const previousWorker = warehouseLogFilterState.filterWorker || "";
  const previousItem = warehouseLogFilterState.filterItem || "";

  if (workerSelect) {
    const workers = Array.from(
      new Set(getVisibleWarehouseLogs().map((entry) => (entry.worker || "").trim()).filter(Boolean)),
    ).sort((a, b) => compareNaturally(a, b));
    workerSelect.innerHTML = '<option value="">-</option>';
    workers.forEach((worker) => {
      const option = document.createElement("option");
      option.value = worker;
      option.textContent = worker;
      workerSelect.appendChild(option);
    });
    workerSelect.value = workers.includes(previousWorker) ? previousWorker : "";
  }

  if (itemSelect) {
    const items = Array.from(
      new Set(getVisibleWarehouseLogs().map((entry) => (entry.itemName || "").trim()).filter(Boolean)),
    ).sort((a, b) => compareNaturally(a, b));
    itemSelect.innerHTML = '<option value="">-</option>';
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      itemSelect.appendChild(option);
    });
    itemSelect.value = items.includes(previousItem) ? previousItem : "";
  }
}

function readWarehouseLogControls() {
  return {
    filterDate: (document.getElementById("warehouseLogDate")?.value || "").trim(),
    filterWorker: (document.getElementById("warehouseLogWorker")?.value || "").trim(),
    filterItem: (document.getElementById("warehouseLogItem")?.value || "").trim(),
    filterType: (document.getElementById("warehouseLogType")?.value || "").trim(),
    filterFlow: (document.getElementById("warehouseLogFlow")?.value || "").trim(),
    sortField: document.getElementById("warehouseLogSort")?.value || "timestamp",
    sortDirection: document.getElementById("warehouseLogDirection")?.value || "desc",
  };
}

function syncWarehouseLogControls() {
  const state = warehouseLogFilterState || createDefaultWarehouseLogFilters();
  const map = {
    warehouseLogDate: state.filterDate,
    warehouseLogWorker: state.filterWorker,
    warehouseLogItem: state.filterItem,
    warehouseLogType: state.filterType,
    warehouseLogFlow: state.filterFlow,
    warehouseLogSort: state.sortField,
    warehouseLogDirection: state.sortDirection,
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  });
}

function applyWarehouseLogFilters() {
  warehouseLogFilterState = readWarehouseLogControls();
  warehouseLogRenderLimit = 50;
  renderWarehouseLogsPage();
}

function getFilteredWarehouseLogs() {
  const { filterDate, filterWorker, filterItem, filterType, filterFlow } = warehouseLogFilterState;

  return getVisibleWarehouseLogs().filter((entry) => {
    const entryDate = (entry.timestamp || "").split("T")[0];
    if (filterDate && entryDate !== filterDate) return false;
    if (filterWorker && (entry.worker || "") !== filterWorker) return false;
    if (filterItem && (entry.itemName || "") !== filterItem) return false;
    if (filterType && (entry.type || "") !== filterType) return false;
    if (filterFlow && (entry.direction || "") !== filterFlow) return false;
    return true;
  });
}

function getWarehouseSortedLogs() {
  const { sortField, sortDirection } = warehouseLogFilterState;
  const logs = getFilteredWarehouseLogs();
  logs.sort((a, b) => {
    const aValue = a?.[sortField] ?? "";
    const bValue = b?.[sortField] ?? "";
    let result = 0;
    if (sortField === "timestamp") {
      result = new Date(aValue).getTime() - new Date(bValue).getTime();
    } else if (sortField === "quantity" || sortField === "balanceAfter") {
      result = Number(aValue) - Number(bValue);
    } else {
      result = compareNaturally(String(aValue), String(bValue));
    }
    return sortDirection === "asc" ? result : -result;
  });
  return logs;
}

function resetWarehouseLogFilters() {
  warehouseLogFilterState = createDefaultWarehouseLogFilters();
  warehouseLogRenderLimit = 50;
  syncWarehouseLogControls();
  renderWarehouseLogsPage();
}

function loadMoreWarehouseLogs() {
  warehouseLogRenderLimit += 50;
  renderWarehouseLogsPage();
}

function deleteWarehouseLog(logId) {
  if (!appState.isSuperAdmin || !warehouseData) return;
  const entry = (warehouseData.logs || []).find((log) => log.id === logId);
  if (!entry) return;

  showConfirm(t("warehouseDeleteLogConfirm"), null, "⚠️", () => {
    warehouseData.logs = warehouseData.logs.filter((log) => log.id !== logId);
    persistWarehouseData();
    addLog("warehouse_log_delete", { logId, site: currentSite });
    renderWarehouseLogsPage();
    showToast(t("warehouseDeleteLogSuccess"), "success");
  });
}

function clearAllWarehouseLogs() {
  if (!appState.isSuperAdmin || !warehouseData) return;
  if (!warehouseData.logs.length) {
    showToast(t("warehouseNoLogsToDelete"), "error");
    return;
  }

  showConfirm(t("warehouseDeleteAllLogsConfirm"), null, "⚠️", () => {
    warehouseData.logs = [];
    persistWarehouseData();
    addLog("warehouse_logs_clear", { site: currentSite });
    renderWarehouseLogsPage();
    showToast(t("warehouseDeleteAllLogsSuccess"), "success");
  });
}

function renderWarehouseLogsPage() {
  const tbody = document.getElementById("warehouseLogsBody");
  const clearBtn = document.getElementById("warehouseClearLogsBtn");
  const actionsHead = document.getElementById("warehouseLogsActionsHead");
  if (!tbody || !warehouseData) return;
  const token = CMAX_PERF?.begin?.("render-warehouse-logs");
  populateWarehouseLogFilters();
  syncWarehouseLogControls();
  if (clearBtn) clearBtn.style.display = appState.isSuperAdmin ? "inline-flex" : "none";
  if (actionsHead) actionsHead.style.display = appState.isSuperAdmin ? "" : "none";
  tbody.innerHTML = "";
  const visibleLogs = getWarehouseSortedLogs();
  const pagedLogs = visibleLogs.slice(0, warehouseLogRenderLimit);
  if (!pagedLogs.length) {
    tbody.innerHTML = `<tr><td colspan="${appState.isSuperAdmin ? 10 : 9}">${escapeHtml(t("warehouseNoVisibleLogs"))}</td></tr>`;
    if (token) CMAX_PERF.end(token, { count: 0 });
    return;
  }
  pagedLogs.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(entry.timestamp).toLocaleString(getCurrentLocale())}</td>
      <td>${escapeHtml(entry.type)}</td>
      <td>${escapeHtml(entry.worker || "-")}</td>
      <td>${escapeHtml(entry.itemName || "-")}</td>
      <td>${entry.quantity}</td>
      <td>${escapeHtml(entry.direction || "-")}</td>
      <td>${escapeHtml(entry.comment || "-")}</td>
      <td>${entry.balanceAfter}</td>
      <td>${escapeHtml(entry.performedBy || "-")}</td>
      ${appState.isSuperAdmin ? `<td><button class="btn btn-small btn-danger" data-cmax-action="warehouse.deleteLog" data-cmax-args='${escapeHtml(JSON.stringify([entry.id]))}'>${escapeHtml(t("btnDeleteReport"))}</button></td>` : ""}
    `;
    tbody.appendChild(tr);
  });
  if (visibleLogs.length > pagedLogs.length) {
    const moreRow = document.createElement("tr");
    moreRow.innerHTML = `
      <td colspan="${appState.isSuperAdmin ? 10 : 9}" class="warehouse-log-load-more-cell">
        <button class="btn btn-secondary" data-cmax-action="warehouse.loadMoreLogs">
          ${escapeHtml(t("loadMore") || "Ucitaj jos")} (${pagedLogs.length}/${visibleLogs.length})
        </button>
      </td>
    `;
    tbody.appendChild(moreRow);
  }
  CMAX_PERF?.count?.("renderWarehouseLogsPage");
  if (token) CMAX_PERF.end(token, { count: pagedLogs.length, total: visibleLogs.length });
}

function renderWarehouseGraphPage() {
  const workerChart = document.getElementById("warehouseGraphWorkers");
  const itemChart = document.getElementById("warehouseGraphItems");
  const insight = document.getElementById("warehouseGraphInsight");
  if (!workerChart || !itemChart || !insight || !warehouseData) return;
  const issueLogs = getVisibleWarehouseLogs().filter((entry) => entry.type === "issue");
  const workerTotals = {};
  const itemTotals = {};
  const itemWorkerTotals = {};
  issueLogs.forEach((entry) => {
    workerTotals[entry.worker || t("warehouseUnknown")] =
      (workerTotals[entry.worker || t("warehouseUnknown")] || 0) + (Number(entry.quantity) || 0);
    itemTotals[entry.itemName || t("warehouseUnknown")] =
      (itemTotals[entry.itemName || t("warehouseUnknown")] || 0) + (Number(entry.quantity) || 0);
    const itemName = entry.itemName || t("warehouseUnknown");
    const workerName = entry.worker || t("warehouseUnknown");
    itemWorkerTotals[itemName] = itemWorkerTotals[itemName] || {};
    itemWorkerTotals[itemName][workerName] = (itemWorkerTotals[itemName][workerName] || 0) + (Number(entry.quantity) || 0);
  });

  const renderBars = (container, source) => {
    container.innerHTML = "";
    const entries = Object.entries(source).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = entries[0]?.[1] || 1;
    if (!entries.length) {
      container.innerHTML = `<div class="warehouse-graph-empty">${escapeHtml(t("warehouseNoVisibleGraph"))}</div>`;
      return;
    }
    entries.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "warehouse-graph-bar";
      row.innerHTML = `<span class="warehouse-graph-label">${escapeHtml(label)}</span><div class="warehouse-graph-track"><div class="warehouse-graph-fill" style="width:${Math.max((value / max) * 100, 6)}%"></div></div><strong>${value}</strong>`;
      container.appendChild(row);
    });
  };

  const standoutPairs = [];
  Object.entries(itemWorkerTotals).forEach(([itemName, workerMap]) => {
    const entries = Object.entries(workerMap);
    if (!entries.length) return;
    const values = entries.map(([, value]) => value);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    entries.forEach(([workerName, value]) => {
      standoutPairs.push({
        label: `${workerName} - ${itemName}`,
        workerName,
        itemName,
        value,
        avg,
        ratio: avg > 0 ? value / avg : value,
      });
    });
  });
  const standoutSource = {};
  standoutPairs
    .sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      return b.value - a.value;
    })
    .slice(0, 8)
    .forEach((entry) => {
      standoutSource[entry.label] = entry.value;
    });

  renderBars(workerChart, standoutSource);
  renderBars(itemChart, itemTotals);

  const topStandout = standoutPairs.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    return b.value - a.value;
  })[0];
  const workerValues = Object.values(workerTotals);
  const overallAvg = workerValues.length ? workerValues.reduce((sum, value) => sum + value, 0) / workerValues.length : 0;
  const topWorker = Object.entries(workerTotals).sort((a, b) => b[1] - a[1])[0];
  if (topStandout && topStandout.value > topStandout.avg) {
    const primary = `${topStandout.workerName} se izdvaja iznad prosjeka za ${topStandout.itemName}: uzeo je ${topStandout.value}, a prosjek za taj materijal je ${topStandout.avg.toFixed(1)}.`;
    const secondary =
      topWorker && topWorker[1] > overallAvg
        ? ` Ukupno gledano, najviše je uzeo ${topWorker[0]} s ${topWorker[1]}, dok je prosjek ${overallAvg.toFixed(1)}.`
        : "";
    insight.textContent = primary + secondary;
  } else {
    insight.textContent = "Nitko se trenutno ne izdvaja znacajno iznad prosjeka za pojedini alat ili materijal.";
  }
}

