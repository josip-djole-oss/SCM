function loadBinsData() {
  const stored = localStorage.getItem(BINS_KEY);
  if (stored) {
    appState.binsData = safeParseStoredJson(stored, {}) || {};
  } else {
    appState.binsData = {};
  }
  // Initialize default data structure for current date if not exists
  ensureBinsDataForDate(appState.currentDate);
  // Load bin permissions
  loadBinPermissions();
}

function loadBinPermissions() {
  const stored = localStorage.getItem(BIN_PERMS_KEY);
  if (stored) {
    appState.binPermissions =
      safeParseStoredJson(stored, appState.binPermissions) ||
      appState.binPermissions;
  }
}

function saveBinPermissions() {
  localStorage.setItem(
    BIN_PERMS_KEY,
    JSON.stringify(appState.binPermissions),
  );
  scheduleModuleSync("adminUsers", 600, {
    binPermissions: appState.binPermissions || {},
  });
}

function saveBinsData() {
  localStorage.setItem(BINS_KEY, JSON.stringify(appState.binsData));
  scheduleModuleSync("bins", 600, { bins: appState.binsData || {} });
}

function ensureBinsDataForDate(date) {
  if (!appState.binsData[date]) {
    const rows = [];
    // Create 20 plans x 4 karnas = 80 rows
    for (let p = 1; p <= 20; p++) {
      for (let k = 1; k <= 4; k++) {
        rows.push({
          plan: `Plan ${p}`,
          karna: `Kärna ${k}`,
          totalAvailable: 0,
          emptyAvailable: 0,
          forEmptying: 0,
          additionalRequired: 0,
        });
      }
    }
    appState.binsData[date] = { planCount: 20, rows };
  }
}

function getBinsDataForDate(date) {
  ensureBinsDataForDate(date);
  return appState.binsData[date];
}

function toggleBinsView() {
  if (!canAccessBinsModule()) {
    showToast(t("accessBinsDenied"), "error");
    return;
  }
  return loadFreshDataForView("loadingDefault", () => {
  const plannerSection = document.getElementById("planner-section");
  const tidplanSection = document.getElementById("tidplan-section");
  const notificationsSection = document.getElementById("notifications-section");
  const surveysSection = document.getElementById("surveys-section");
  const warehouseSection = document.getElementById("warehouse-section");
  const warehouseLogsSection = document.getElementById("warehouse-logs-section");
  const warehouseGraphSection = document.getElementById("warehouse-graph-section");
  const homeSection = document.getElementById("home-section");
  const reportsSection = document.getElementById("reports-section");
  const settingsSection = document.getElementById("settings-section");
  if (plannerSection) plannerSection.style.display = "grid";
  if (tidplanSection) tidplanSection.style.display = "none";
  if (notificationsSection) notificationsSection.style.display = "none";
  if (surveysSection) surveysSection.style.display = "none";
  if (warehouseSection) warehouseSection.style.display = "none";
  if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
  if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  if (homeSection) homeSection.style.display = "none";
  if (reportsSection) reportsSection.style.display = "none";
  if (settingsSection) settingsSection.style.display = "none";
  if (currentView === "notifications") {
    currentView = "main";
  }
  if (currentView !== "bins") {
    currentView = "bins";
    saveCurrentView("bins");
    pushRouteForView("bins");
    document.querySelector(".planning-section").classList.add("hidden");
    document.querySelector(".lists-container").classList.add("hidden");
    document.getElementById("binsSection").classList.add("active");
    document.getElementById("btnBins").classList.add("btn-success");
    // Show Save button if there are unsaved changes
    if (appState.hasUnsavedChanges) {
      document.getElementById("btnSave").style.display = "inline-flex";
    }
    if (appState.isSuperAdmin) {
      document.getElementById("binsAdminControls").style.display = "flex";
    }
    renderBinsTable();
    if (typeof updateShellForView === "function") updateShellForView("bins");
    addLog("Switched to Bins view");
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  } else {
    currentView = "main";
    saveCurrentView("main");
    pushRouteForView("main");
    document
      .querySelector(".planning-section")
      .classList.remove("hidden");
    document.querySelector(".lists-container").classList.remove("hidden");
    document.getElementById("binsSection").classList.remove("active");
    document.getElementById("btnBins").classList.remove("btn-success");
    // Show Save button if there are unsaved changes
    if (appState.hasUnsavedChanges) {
      document.getElementById("btnSave").style.display = "inline-flex";
    }
    addLog("Switched to Main view");
    if (typeof updateShellForView === "function") updateShellForView("main");
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  }
  });
}

function renderBinsTable() {
  const binsData = getBinsDataForDate(appState.currentDate);
  const tbody = document.getElementById("binsTableBody");
  tbody.innerHTML = "";

  binsData.rows.forEach((row, idx) => {
    const tr = document.createElement("tr");

    // Plan cell
    const tdPlan = document.createElement("td");
    tdPlan.textContent = row.plan;
    tdPlan.style.fontWeight = "600";
    tr.appendChild(tdPlan);

    // Karna cell
    const tdKarna = document.createElement("td");
    tdKarna.textContent = row.karna;
    tr.appendChild(tdKarna);

    // Total Available
    const tdTotal = document.createElement("td");
    tdTotal.dataset.field = "totalAvailable";
    tdTotal.dataset.idx = idx;
    const inputTotal = createBinInput(
      idx,
      "totalAvailable",
      row.totalAvailable,
    );
    tdTotal.appendChild(inputTotal);
    tr.appendChild(tdTotal);

    // Empty Available
    const tdEmpty = document.createElement("td");
    tdEmpty.dataset.field = "emptyAvailable";
    tdEmpty.dataset.idx = idx;
    const inputEmpty = createBinInput(
      idx,
      "emptyAvailable",
      row.emptyAvailable,
    );
    tdEmpty.appendChild(inputEmpty);
    tr.appendChild(tdEmpty);

    // For Emptying
    const tdForEmpty = document.createElement("td");
    tdForEmpty.dataset.field = "forEmptying";
    tdForEmpty.dataset.idx = idx;
    const inputForEmpty = createBinInput(
      idx,
      "forEmptying",
      row.forEmptying,
    );
    tdForEmpty.appendChild(inputForEmpty);
    tr.appendChild(tdForEmpty);

    // Additional Required
    const tdAdditional = document.createElement("td");
    tdAdditional.dataset.field = "additionalRequired";
    tdAdditional.dataset.idx = idx;
    const selectAdditional = document.createElement("select");
    selectAdditional.dataset.idx = idx;
    selectAdditional.dataset.field = "additionalRequired";

    // Check permissions - super admin only
    const canEditAdditional =
      appState.isSuperAdmin || (!appState.isReadonly && hasPermission("canEditBinsData"));
    selectAdditional.disabled = !canEditAdditional;

    // Create options 0-25
    for (let i = 0; i <= 25; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = i;
      if (i === (row.additionalRequired || 0)) opt.selected = true;
      selectAdditional.appendChild(opt);
    }

    selectAdditional.addEventListener("change", (e) => {
      updateBinCell(
        idx,
        "additionalRequired",
        parseInt(e.target.value) || 0,
      );
    });

    selectAdditional.style.cssText =
      "padding: 6px; border-radius: 6px; font-size: 12px; text-align: center; border: 1.5px solid var(--border-color); background: var(--input-bg); color: var(--text-dark); cursor: pointer;";

    tdAdditional.appendChild(selectAdditional);
    tr.appendChild(tdAdditional);

    // Status
    const tdStatus = document.createElement("td");
    tdStatus.className = "bin-status-cell";
    tdStatus.dataset.field = "status";
    tdStatus.dataset.idx = idx;
    tdStatus.textContent = calculateBinStatus(row);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });

  // Apply colors after rendering
  applyBinColors();
}

function createBinInput(idx, field, value) {
  const select = document.createElement("select");
  select.dataset.idx = idx;
  select.dataset.field = field;

  // Check permissions
  const canEdit =
    appState.isSuperAdmin ||
    (hasPermission("canEditBinsData") &&
      appState.binPermissions[field] &&
      !appState.isReadonly);
  select.disabled = !canEdit;

  // Create options 0-25
  for (let i = 0; i <= 25; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    if (i === (value || 0)) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener("change", (e) => {
    updateBinCell(idx, field, parseInt(e.target.value) || 0);
  });

  select.style.cssText =
    "padding: 6px; border-radius: 6px; font-size: 12px; text-align: center; border: 1.5px solid var(--border-color); background: var(--input-bg); color: var(--text-dark); cursor: pointer;";

  return select;
}

function updateBinCell(idx, field, value) {
  if (false) {
    showToast("Prošli datumi su zaključani.", "error");
    renderBinsTable();
    return;
  }
  const binsData = getBinsDataForDate(appState.currentDate);
  const row = binsData.rows[idx];
  row[field] = value;

  // Auto-calculate logic similar to Excel
  // If totalAvailable changes and emptyAvailable > totalAvailable, adjust emptyAvailable
  if (field === "totalAvailable" && row.emptyAvailable > value) {
    row.emptyAvailable = value;
    const emptyInput = document.querySelector(
      `input[data-idx="${idx}"][data-field="emptyAvailable"]`,
    );
    if (emptyInput) emptyInput.value = value;
  }

  // If forEmptying changes, totalAvailable increases
  if (field === "forEmptying") {
    // Old value was already in total, now we add new emptied bins
    // Actually, we need to track what was emptied and add to total
    // For simplicity: user manages total manually or we auto-add
    // Per spec: "kad imam 10 total i empty 10, ako jednu napunim i dodam u for empty, on mi odma prebaci na 11 total"
    // This means: forEmptying affects both total and reduces empty
    // Let's NOT auto-modify total here since spec says "ako ne moze i ne mora"
  }

  // DO NOT auto-calculate Additional Required - user sets it manually
  // It's only used for status display, not calculated from other fields

  // Update display
  const additionalSelect = document.querySelector(
    `select[data-idx="${idx}"][data-field="additionalRequired"]`,
  );
  if (additionalSelect && field !== "additionalRequired") {
    additionalSelect.value = row.additionalRequired || 0;
  }

  const statusCell = document.querySelector(
    `td[data-field="status"][data-idx="${idx}"]`,
  );
  if (statusCell) statusCell.textContent = calculateBinStatus(row);

  saveBinsData();
  markDirty();
  applyBinColors();
}

function calculateBinStatus(row) {
  const G = row.totalAvailable;
  const H = row.emptyAvailable;
  const I = row.forEmptying;
  const J = row.additionalRequired;

  if (G === 0) return "";

  const ratio = H / G;
  let parts = [];

  // Additional required only affects status - if > 0 show "Bring new"
  if (J > 0) parts.push(t("binStatusBring"));

  // Other status indicators
  if (ratio < 0.33) parts.push(t("binStatusNotEnough"));
  else if (ratio >= 0.33 && ratio < 0.66) parts.push(t("binStatusLow"));
  else if (J === 0 && ratio >= 0.66) parts.push(t("binStatusOk"));
  if (I > H) parts.push(t("binStatusEmpty"));

  return parts.join(" /// ");
}

function applyBinColors() {
  const binsData = getBinsDataForDate(appState.currentDate);

  binsData.rows.forEach((row, idx) => {
    const G = row.totalAvailable;
    const H = row.emptyAvailable;
    const I = row.forEmptying;
    const J = row.additionalRequired;

    if (G === 0) return;

    const ratio = H / G;

    // Total Available cell
    const totalCell = document.querySelector(
      `td[data-field="totalAvailable"][data-idx="${idx}"]`,
    );
    if (totalCell) {
      totalCell.classList.remove(
        "bin-cell-green",
        "bin-cell-yellow",
        "bin-cell-red",
      );
      if (ratio >= 0.66) totalCell.classList.add("bin-cell-green");
      else if (ratio >= 0.33) totalCell.classList.add("bin-cell-yellow");
      else totalCell.classList.add("bin-cell-red");
    }

    // Empty Available cell
    const emptyCell = document.querySelector(
      `td[data-field="emptyAvailable"][data-idx="${idx}"]`,
    );
    if (emptyCell) {
      emptyCell.classList.remove(
        "bin-cell-green",
        "bin-cell-yellow",
        "bin-cell-red",
      );
      if (ratio >= 0.66) emptyCell.classList.add("bin-cell-green");
      else if (ratio >= 0.33) emptyCell.classList.add("bin-cell-yellow");
      else emptyCell.classList.add("bin-cell-red");
    }

    // For Emptying cell
    const forEmptyCell = document.querySelector(
      `td[data-field="forEmptying"][data-idx="${idx}"]`,
    );
    if (forEmptyCell) {
      forEmptyCell.classList.remove(
        "bin-cell-green",
        "bin-cell-yellow",
        "bin-cell-red",
      );
      const forEmptyRatio = I / G;
      if (forEmptyRatio >= 0.66)
        forEmptyCell.classList.add("bin-cell-red");
      else if (forEmptyRatio >= 0.33)
        forEmptyCell.classList.add("bin-cell-yellow");
      else forEmptyCell.classList.add("bin-cell-green");
    }

    // Additional Required cell - color based on value
    const additionalCell = document.querySelector(
      `td[data-field="additionalRequired"][data-idx="${idx}"]`,
    );
    if (additionalCell) {
      additionalCell.classList.remove(
        "bin-cell-green",
        "bin-cell-yellow",
        "bin-cell-red",
      );
      // Yellow if > 0, Red if > 3
      if (J > 3) additionalCell.classList.add("bin-cell-red");
      else if (J > 0) additionalCell.classList.add("bin-cell-yellow");
      else additionalCell.classList.add("bin-cell-green");
    }
  });
}

function addBinPlan() {
  if (!(appState.isSuperAdmin || hasAdminPermission("canManageBinsPlans"))) return;
  const binsData = getBinsDataForDate(appState.currentDate);
  const newPlanNum = binsData.planCount + 1;
  for (let k = 1; k <= 4; k++) {
    binsData.rows.push({
      plan: `Plan ${newPlanNum}`,
      karna: `Kärna ${k}`,
      totalAvailable: 0,
      emptyAvailable: 0,
      forEmptying: 0,
      additionalRequired: 0,
    });
  }
  binsData.planCount = newPlanNum;
  saveBinsData();
  markDirty();
  renderBinsTable();
  addLog("Added bin plan", `Plan ${newPlanNum}`);
  showToast("✅ Plan dodan!", "success");
}

function removeBinPlan() {
  if (!(appState.isSuperAdmin || hasAdminPermission("canManageBinsPlans"))) return;
  const binsData = getBinsDataForDate(appState.currentDate);
  if (binsData.planCount <= 1) {
    showToast("⚠️ Ne možete ukloniti sve planove!", "error");
    return;
  }
  showConfirm(`Ukloniti Plan ${binsData.planCount}?`, null, "⚠️", () => {
    binsData.rows.splice(-4, 4); // Remove last 4 rows (1 plan)
    binsData.planCount--;
    saveBinsData();
    markDirty();
    renderBinsTable();
    addLog("Removed bin plan", `Plan ${binsData.planCount + 1}`);
    showToast("✅ Plan uklonjen!", "success");
  });
}

