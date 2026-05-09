function getCurrentDayData() {
  if (!appState.dailyData[appState.currentDate]) {
    appState.dailyData[appState.currentDate] = {
      workerAttendance: {},
      liftAvailability: {},
      liftPlans: {},
      planningRows: [],
    };
  }
  return appState.dailyData[appState.currentDate];
}

/* ==================== RENDER FUNCTIONS ==================== */
function renderAll() {
  seedResourceHistoryForCurrentLists();
  updateDateDisplay();
  renderPastDayLockNotice("planner-section");
  renderLastEditedInfo();
  renderWorkersList();
  renderLiftsList();
  renderMomensList();
  renderPlansList();
  renderKarnasList();
  renderPlanningTable();
}

function getWorkersInUse() {
  const dayData = getCurrentDayData();
  const inUse = new Set();
  dayData.planningRows.forEach((row) => {
    if (row.w1) inUse.add(row.w1);
    if (row.w2) inUse.add(row.w2);
    if (row.w3) inUse.add(row.w3);
  });
  return inUse;
}

function renderWorkersList() {
  const tbody = document.getElementById("workersList");
  const dayData = getCurrentDayData();
  const inUse = getWorkersInUse();
  const sortedWorkers = getActiveResourceList("workers", appState.currentDate);
  tbody.innerHTML = "";

  sortedWorkers.forEach((worker) => {
    const isPresent = dayData.workerAttendance[worker] !== false;
    const isBusy = inUse.has(worker);
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = worker;
    tdName.style.textAlign = "left";
    tr.appendChild(tdName);

    const tdCheck = document.createElement("td");
    tdCheck.className = "checkbox-cell";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isPresent;
    checkbox.onchange = () => toggleWorkerAttendance(worker);
    if (appState.isReadonly || !canEditDate(appState.currentDate)) checkbox.disabled = true;
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    const tdStatus = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = "status-badge";
    if (!isPresent) {
      statusBadge.classList.add("status-absent");
      statusBadge.textContent = t("workerAbsent");
    } else if (isBusy) {
      statusBadge.classList.add("status-busy");
      statusBadge.textContent = t("workerBusy");
    } else {
      statusBadge.classList.add("status-available");
      statusBadge.textContent = t("workerPresent");
    }
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  });
}

function renderLiftsList() {
  const tbody = document.getElementById("liftsList");
  const dayData = getCurrentDayData();
  const sortedLifts = getActiveResourceList("lifts", appState.currentDate);
  tbody.innerHTML = "";

  sortedLifts.forEach((lift) => {
    const isAvailable = dayData.liftAvailability[lift] !== false;
    const liftPlan = dayData.liftPlans[lift] || "";
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = lift;
    tdName.style.textAlign = "left";
    tr.appendChild(tdName);

    const tdCheck = document.createElement("td");
    tdCheck.className = "checkbox-cell";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isAvailable;
    checkbox.onchange = () => toggleLiftAvailability(lift);
    if (appState.isReadonly || !canEditDate(appState.currentDate)) checkbox.disabled = true;
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    const tdStatus = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = "status-badge";
    if (isAvailable) {
      statusBadge.classList.add("status-available");
      statusBadge.textContent = t("liftAvailable");
    } else {
      statusBadge.classList.add("status-unavailable");
      statusBadge.textContent = t("liftUnavailable");
    }
    tdStatus.appendChild(statusBadge);
    tr.appendChild(tdStatus);

    const tdPlan = document.createElement("td");
    const planInput = document.createElement("input");
    planInput.type = "text";
    planInput.className = "plan-input";
    planInput.value = liftPlan;
    planInput.placeholder = "Plan";
    planInput.oninput = () => updateLiftPlan(lift, planInput.value);
    if (appState.isReadonly || !canEditDate(appState.currentDate)) planInput.disabled = true;
    tdPlan.appendChild(planInput);
    tr.appendChild(tdPlan);

    tbody.appendChild(tr);
  });
}

function renderMomensList() {
  const tbody = document.getElementById("momentsList");
  tbody.innerHTML = "";
  getActiveResourceList("moments", appState.currentDate).forEach((m) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = m;
    td.style.textAlign = "left";
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

function renderPlansList() {
  const tbody = document.getElementById("plansList");
  tbody.innerHTML = "";
  getActiveResourceList("plans", appState.currentDate).forEach((p) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = p;
    td.style.textAlign = "left";
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

function renderKarnasList() {
  const tbody = document.getElementById("karnasList");
  tbody.innerHTML = "";
  getActiveResourceList("karnas", appState.currentDate).forEach((k) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = k;
    td.style.textAlign = "left";
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

function renderPlanningTable() {
  const tbody = document.getElementById("planningTableBody");
  const dayData = getCurrentDayData();
  tbody.innerHTML = "";
  dayData.planningRows.forEach((rowData, index) => {
    tbody.appendChild(createPlanningRow(rowData, index));
  });
  if (!appState.isReadonly && canEditDate(appState.currentDate)) {
    tbody.appendChild(createPlanningRow({}, dayData.planningRows.length));
  }
  applyColorCoding();
  renderWorkersList(); // update busy status
}

function addPlanningRow() {
  if (appState.isReadonly || !appState.isAdmin || !canEditDate(appState.currentDate)) return;
  const dayData = getCurrentDayData();
  trackLocalEditKey(makePlannerEditKey(appState.currentDate, "rows", "count"));
  dayData.planningRows.push({});
  saveData();
  markDirty();
  renderPlanningTable();
}

function removePlanningRow() {
  if (appState.isReadonly || !appState.isAdmin || !canEditDate(appState.currentDate)) return;
  const dayData = getCurrentDayData();
  // Ukloni zadnji puni red ako postoji (ne brišemo sve redove odjednom)
  if (dayData.planningRows.length > 0) {
    trackLocalEditKey(makePlannerEditKey(appState.currentDate, "rows", "count"));
    dayData.planningRows.pop();
    saveData();
    markDirty();
    renderPlanningTable();
  }
}

function createPlanningRow(rowData, index) {
  const tr = document.createElement("tr");
  tr.dataset.rowIndex = index;
  const fields = [
    ["w1", getActiveResourceList("workers", appState.currentDate)],
    ["w2", getActiveResourceList("workers", appState.currentDate)],
    ["w3", getActiveResourceList("workers", appState.currentDate)],
    ["plan", getActiveResourceList("plans", appState.currentDate)],
    ["karna", getActiveResourceList("karnas", appState.currentDate)],
    ["m1", getActiveResourceList("moments", appState.currentDate)],
    ["m2", getActiveResourceList("moments", appState.currentDate)],
    ["l1", getActiveResourceList("lifts", appState.currentDate)],
    ["l2", getActiveResourceList("lifts", appState.currentDate)],
    ["l3", getActiveResourceList("lifts", appState.currentDate)],
  ];
  fields.forEach(([f, opts]) =>
    tr.appendChild(createSelectCell(f, rowData[f], opts, index)),
  );
  tr.appendChild(createCommentCell(rowData.comment || "", index));
  return tr;
}

function createSelectCell(fieldName, selectedValue, options, rowIndex) {
  const td = document.createElement("td");
  td.dataset.field = fieldName;
  td.dataset.pval = selectedValue || "-";

  const select = document.createElement("select");
  select.disabled = appState.isReadonly || !canEditDate(appState.currentDate);
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "-";
  select.appendChild(emptyOpt);

  const sorted = sortNaturally(options);
  if (selectedValue && !sorted.includes(selectedValue)) {
    sorted.push(selectedValue);
  }

  sortNaturally(sorted).forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (selectedValue === opt) o.selected = true;
    select.appendChild(o);
  });

  select.onchange = () => {
    td.dataset.pval = select.value || "-";
    handlePlanningCellChange(rowIndex, fieldName, select.value);
  };
  td.appendChild(select);
  return td;
}

function createCommentCell(value, rowIndex) {
  const td = document.createElement("td");
  td.dataset.field = "comment";
  td.dataset.pval = value || "";
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "Komentar...";
  input.disabled = appState.isReadonly || !canEditDate(appState.currentDate);
  input.oninput = () => {
    td.dataset.pval = input.value;
    handlePlanningCellChange(rowIndex, "comment", input.value);
  };
  td.appendChild(input);
  return td;
}

function handlePlanningCellChange(rowIndex, fieldName, value) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderPlanningTable();
    return;
  }
  const dayData = getCurrentDayData();
  trackLocalEditKey(makePlannerEditKey(appState.currentDate, "row", rowIndex, fieldName));
  if (!dayData.planningRows[rowIndex])
    dayData.planningRows[rowIndex] = {};

  if (
    fieldName === "m2" &&
    value &&
    value === dayData.planningRows[rowIndex].m1
  ) {
    showAlert(t("momentDuplicateError"), "⚠️");
    dayData.planningRows[rowIndex][fieldName] = "";
    saveData();
    markDirty();
    renderPlanningTable();
    return;
  }
  if (
    fieldName === "m1" &&
    value &&
    value === dayData.planningRows[rowIndex].m2
  ) {
    showAlert(t("momentDuplicateError"), "⚠️");
    dayData.planningRows[rowIndex].m2 = "";
    saveData();
    markDirty();
    renderPlanningTable();
    return;
  }

  dayData.planningRows[rowIndex][fieldName] = value;
  const isNewRow = rowIndex === dayData.planningRows.length;
  if (isNewRow) {
    dayData.planningRows.push({});
  }
  saveData();
  markDirty();
  if (isNewRow) {
    // Re-render whole planning table so a new empty row appears immediately
    renderPlanningTable();
  } else {
    applyColorCoding();
    renderWorkersList();
  }
}

function applyColorCoding() {
  const dayData = getCurrentDayData();
  const tbody = document.getElementById("planningTableBody");
  const workerCounts = {};
  const liftCounts = {};

  dayData.planningRows.forEach((row) => {
    ["w1", "w2", "w3"].forEach((f) => {
      if (row[f]) workerCounts[row[f]] = (workerCounts[row[f]] || 0) + 1;
    });
    ["l1", "l2", "l3"].forEach((f) => {
      if (row[f]) liftCounts[row[f]] = (liftCounts[row[f]] || 0) + 1;
    });
  });

  Array.from(tbody.rows).forEach((tr, rowIndex) => {
    if (rowIndex >= dayData.planningRows.length) return;
    const row = dayData.planningRows[rowIndex];

    ["w1", "w2", "w3"].forEach((field) => {
      const td = tr.querySelector(`[data-field="${field}"]`);
      if (!td) return;
      td.classList.remove("duplicate-error", "absent-warning");
      const v = row[field];
      if (v) {
        if (dayData.workerAttendance[v] === false)
          td.classList.add("absent-warning");
        else if (workerCounts[v] > 1) td.classList.add("duplicate-error");
      }
    });

    ["l1", "l2", "l3"].forEach((field) => {
      const td = tr.querySelector(`[data-field="${field}"]`);
      if (!td) return;
      td.classList.remove("duplicate-error", "absent-warning");
      const v = row[field];
      if (v) {
        if (dayData.liftAvailability[v] === false)
          td.classList.add("absent-warning");
        else if (liftCounts[v] > 1) td.classList.add("duplicate-error");
      }
    });

    if (row.m1 && row.m2 && row.m1 === row.m2) {
      const td = tr.querySelector('[data-field="m2"]');
      if (td) {
        td.classList.remove("duplicate-error", "absent-warning");
        td.classList.add("moment-error");
      }
    }
  });
}

/* ==================== TOGGLE FUNCTIONS ==================== */
function toggleWorkerAttendance(worker) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderWorkersList();
    return;
  }
  const dayData = getCurrentDayData();
  trackLocalEditKey(makePlannerEditKey(appState.currentDate, "workerAttendance", worker));
  if (dayData.workerAttendance[worker] === false)
    delete dayData.workerAttendance[worker];
  else dayData.workerAttendance[worker] = false;
  saveData();
  markDirty();
  renderWorkersList();
  renderPlanningTable();
}

function toggleLiftAvailability(lift) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderLiftsList();
    return;
  }
  const dayData = getCurrentDayData();
  trackLocalEditKey(makePlannerEditKey(appState.currentDate, "liftAvailability", lift));
  if (dayData.liftAvailability[lift] === false)
    delete dayData.liftAvailability[lift];
  else dayData.liftAvailability[lift] = false;
  saveData();
  markDirty();
  renderLiftsList();
  renderPlanningTable();
}

function updateLiftPlan(lift, plan) {
  if (!canEditDate(appState.currentDate)) {
    showToast("Prošli datumi su zaključani.", "error");
    renderLiftsList();
    return;
  }
  const dayData = getCurrentDayData();
  trackLocalEditKey(makePlannerEditKey(appState.currentDate, "liftPlan", lift));
  dayData.liftPlans[lift] = plan;
  saveData();
  markDirty();
}

function toggleList(name) {
  const content = document.getElementById(`${name}-content`);
  const icon = document.getElementById(`${name}-icon`);
  content.classList.toggle("collapsed");
  icon.classList.toggle("collapsed");
}

/* ==================== CLEAR TABLE ==================== */
function clearAllTable() {
  if (appState.isReadonly || !hasPermission("canClear") || !canEditDate(appState.currentDate)) {
    showToast(t("accessDenied"), "error");
    return;
  }
  if (currentView === "bins") {
    // Clear Bins table only
    showConfirm(t("clearTableConfirm"), null, "⚠️", () => {
      const binsData = getBinsDataForDate(appState.currentDate);
      const planCount = binsData.planCount;
      binsData.rows = [];
      // Reinitialize with empty rows
      for (let p = 1; p <= planCount; p++) {
        for (let k = 1; k <= 4; k++) {
          binsData.rows.push({
            plan: `Plan ${p}`,
            karna: `Kärna ${k}`,
            totalAvailable: 0,
            emptyAvailable: 0,
            forEmptying: 0,
            additionalRequired: 0,
          });
        }
      }
      saveBinsData();
      markDirty();
      renderBinsTable();
      showToast(t("clearTableSuccess"), "success");
    });
  } else {
    // Clear Planning table (main view)
    showConfirm(t("clearTableConfirm"), null, "⚠️", () => {
      const dayData = getCurrentDayData();
      trackLocalEditKey(makePlannerEditKey(appState.currentDate, "day", "all"));
      dayData.planningRows = [];
      saveData();
      markDirty();
      renderPlanningTable();
      showToast(t("clearTableSuccess"), "success");
    });
  }
}

/* ==================== ADMIN PANEL ==================== */
