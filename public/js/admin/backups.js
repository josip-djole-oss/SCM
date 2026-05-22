function ensureBackupTabContent() {
  const tab = document.getElementById("tabBackup");
  const section = document.getElementById("backupSettingsSection");
  if (!tab || !section) return;
  if (section.parentElement !== tab) {
    tab.appendChild(section);
  }
  section.style.display = "";

  if (!document.getElementById("backupListContainer")) {
    const listSection = document.createElement("div");
    listSection.className = "admin-settings-section";
    listSection.innerHTML = `
      <h4>${escapeHtml(t("backupListTitle"))}</h4>
      <button class="btn btn-secondary" id="btnListBackups" type="button">${escapeHtml(t("backupListBtn"))}</button>
      <div id="backupListContainer" class="admin-list-container"></div>
    `;
    tab.appendChild(listSection);
  }

  if (!document.getElementById("backupInfoContainer")) {
    const infoSection = document.createElement("div");
    infoSection.className = "admin-settings-section";
    infoSection.innerHTML = `
      <h4>${escapeHtml(t("backupStatusTitle"))}</h4>
      <button class="btn btn-secondary" id="btnBackupInfo" type="button">${escapeHtml(t("backupInfoBtn"))}</button>
      <div id="backupInfoContainer" class="admin-info-container"></div>
    `;
    tab.appendChild(infoSection);
  }

  const listButton = document.getElementById("btnListBackups");
  if (listButton) listButton.dataset.cmaxAction = "admin.listBackups";
  const infoButton = document.getElementById("btnBackupInfo");
  if (infoButton) infoButton.dataset.cmaxAction = "admin.showBackupInfo";
}

function getBackupIdentifier(backup) {
  return String(backup?.id || backup?.filename || "");
}

function formatBackupLabel(backup) {
  const name = backup?.filename || backup?.id || "backup";
  const created = backup?.createdAt ? new Date(backup.createdAt).toLocaleString() : t("backupUnknownTime");
  const size = backup?.size ? `${(backup.size / 1024).toFixed(1)} KB` : "";
  return `${name} | ${created}${size ? ` | ${size}` : ""}`;
}

var BACKUP_RESTORE_WIZARD_STEPS = [
  { key: "select", title: "Backup" },
  { key: "analysis", title: "Analiza" },
  { key: "scope", title: "Scope" },
  { key: "confirm", title: "Potvrda" },
  { key: "progress", title: "Progress" },
  { key: "report", title: "Report" },
];

var backupRestoreWizardState = {
  open: false,
  step: 0,
  backups: [],
  selectedBackupId: "",
  dryRun: null,
  restoreToken: "",
  scope: { all: true },
  confirmText: "",
  password: "",
  progress: {},
  report: null,
};

function backupWizardEscape(value) {
  return typeof escapeHtml === "function" ? escapeHtml(value) : String(value || "");
}

function ensureBackupRestoreWizardOverlay() {
  let overlay = document.getElementById("backupRestoreWizardOverlay");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "backupRestoreWizardOverlay";
  overlay.className = "backup-wizard-overlay";
  overlay.innerHTML = `
    <div class="backup-wizard-shell" role="dialog" aria-modal="true" aria-labelledby="backupRestoreWizardTitle">
      <div class="backup-wizard-head">
        <div>
          <div class="admin-compose-eyebrow">Backup / Restore Wizard</div>
          <h3 id="backupRestoreWizardTitle">Sigurni restore workflow</h3>
        </div>
        <button class="backup-wizard-close" type="button" data-cmax-action="admin.closeBackupWizard" aria-label="Zatvori">&times;</button>
      </div>
      <div id="backupRestoreWizardStepper" class="backup-wizard-stepper"></div>
      <div id="backupRestoreWizardBody" class="backup-wizard-body"></div>
      <div class="backup-wizard-footer">
        <button class="btn btn-ghost" type="button" data-cmax-action="admin.closeBackupWizard">Odustani</button>
        <button class="btn btn-ghost" type="button" data-cmax-action="admin.backupWizardBack" id="backupWizardBackBtn">Nazad</button>
        <button class="btn" type="button" data-cmax-action="admin.backupWizardNext" id="backupWizardNextBtn">Dalje</button>
        <button class="btn btn-danger" type="button" data-cmax-action="admin.runBackupWizardRestore" data-cmax-server-action="true" data-cmax-loading-key="loadingBackupRestore" id="backupWizardRestoreBtn">Pokreni restore</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeBackupRestoreWizard();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && backupRestoreWizardState.open) closeBackupRestoreWizard();
  });
  return overlay;
}

async function openBackupRestoreWizard() {
  if (typeof canRestoreBackups === "function" ? !canRestoreBackups() : !canManageBackups()) {
    showToast(t("backupNoRestorePermission"), "error");
    return;
  }
  ensureBackupTabContent();
  backupRestoreWizardState = {
    open: true,
    step: 0,
    backups: [],
    selectedBackupId: "",
    dryRun: null,
    restoreToken: "",
    scope: { all: true },
    confirmText: "",
    password: "",
    progress: {},
    report: null,
  };
  const overlay = ensureBackupRestoreWizardOverlay();
  overlay.classList.add("is-open");
  document.body.classList.add("modal-open");
  renderBackupRestoreWizard();
  backupRestoreWizardState.backups = await loadBackupRestoreOptions();
  renderBackupRestoreWizard();
}

function closeBackupRestoreWizard() {
  const overlay = document.getElementById("backupRestoreWizardOverlay");
  if (overlay) overlay.classList.remove("is-open");
  document.body.classList.remove("modal-open");
  backupRestoreWizardState.open = false;
}

function collectBackupRestoreWizardStep() {
  const confirmText = document.getElementById("backupWizardConfirmText");
  if (confirmText) backupRestoreWizardState.confirmText = confirmText.value;
  const password = document.getElementById("backupWizardPassword");
  if (password) backupRestoreWizardState.password = password.value;
  const all = document.getElementById("backupWizardScopeAll");
  if (all) backupRestoreWizardState.scope.all = all.checked;
}

function selectBackupRestoreWizardBackup(backupId) {
  backupRestoreWizardState.selectedBackupId = backupId || "";
  backupRestoreWizardState.dryRun = null;
  backupRestoreWizardState.restoreToken = "";
  renderBackupRestoreWizard();
}

async function runBackupRestoreDryRun() {
  if (!backupRestoreWizardState.selectedBackupId) {
    showToast(t("backupSelectRequired"), "error");
    return false;
  }
  const response = await fetch("/api/backup/restore/dry-run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: backupRestoreWizardState.selectedBackupId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    showToast(data.error || "Dry-run nije uspio.", "error");
    return false;
  }
  backupRestoreWizardState.dryRun = data.summary || {};
  backupRestoreWizardState.restoreToken = data.restoreToken || "";
  return true;
}

async function backupRestoreWizardNext() {
  collectBackupRestoreWizardStep();
  const stepKey = BACKUP_RESTORE_WIZARD_STEPS[backupRestoreWizardState.step]?.key;
  if (stepKey === "select" && !backupRestoreWizardState.selectedBackupId) {
    showToast(t("backupSelectRequired"), "error");
    return;
  }
  if (stepKey === "select" && !backupRestoreWizardState.dryRun) {
    showLoading("loadingDefault");
    const ok = await runBackupRestoreDryRun();
    hideLoading();
    if (!ok) return;
  }
  if (stepKey === "scope" && !backupRestoreWizardState.scope.all) {
    showToast("Backend trenutno podrzava samo full restore. Za parcijalni restore treba server scope support.", "error");
    return;
  }
  backupRestoreWizardState.step = Math.min(BACKUP_RESTORE_WIZARD_STEPS.length - 1, backupRestoreWizardState.step + 1);
  renderBackupRestoreWizard();
}

function backupRestoreWizardBack() {
  collectBackupRestoreWizardStep();
  backupRestoreWizardState.step = Math.max(0, backupRestoreWizardState.step - 1);
  renderBackupRestoreWizard();
}

function renderBackupRestoreWizard() {
  if (!backupRestoreWizardState.open) return;
  const stepper = document.getElementById("backupRestoreWizardStepper");
  const body = document.getElementById("backupRestoreWizardBody");
  const stepKey = BACKUP_RESTORE_WIZARD_STEPS[backupRestoreWizardState.step]?.key || "select";
  if (stepper) {
    stepper.innerHTML = BACKUP_RESTORE_WIZARD_STEPS.map((step, index) => `
      <button type="button" class="backup-wizard-step ${index === backupRestoreWizardState.step ? "is-active" : ""}"><span>${index + 1}</span>${backupWizardEscape(step.title)}</button>
    `).join("");
  }
  if (body) {
    body.innerHTML =
      stepKey === "select" ? renderBackupWizardSelectStep() :
      stepKey === "analysis" ? renderBackupWizardAnalysisStep() :
      stepKey === "scope" ? renderBackupWizardScopeStep() :
      stepKey === "confirm" ? renderBackupWizardConfirmStep() :
      stepKey === "progress" ? renderBackupWizardProgressStep() :
      renderBackupWizardReportStep();
  }
  const back = document.getElementById("backupWizardBackBtn");
  const next = document.getElementById("backupWizardNextBtn");
  const restore = document.getElementById("backupWizardRestoreBtn");
  if (back) back.style.display = backupRestoreWizardState.step === 0 || stepKey === "progress" ? "none" : "";
  if (next) next.style.display = stepKey === "confirm" || stepKey === "progress" || stepKey === "report" ? "none" : "";
  if (restore) restore.style.display = stepKey === "confirm" ? "" : "none";
}

function renderBackupWizardSelectStep() {
  const cards = (backupRestoreWizardState.backups || []).map((backup) => {
    const id = getBackupIdentifier(backup);
    const selected = id === backupRestoreWizardState.selectedBackupId ? " is-selected" : "";
    return `
      <button type="button" class="backup-wizard-card${selected}" data-cmax-action="admin.selectBackupWizardBackup" data-cmax-args='["${backupWizardEscape(id)}"]'>
        <strong>Backup ${backupWizardEscape(backup.createdAt ? new Date(backup.createdAt).toLocaleString() : id)}</strong>
        <span>Velicina: ${backupWizardEscape(backup.size ? `${(backup.size / 1024).toFixed(1)} KB` : "-")}</span>
        <span>Datum: ${backupWizardEscape(backup.createdAt || "-")}</span>
        <small>${backupWizardEscape(backup.filename || backup.id || id)}</small>
      </button>
    `;
  }).join("");
  return `<section class="backup-wizard-section"><h4>Step 1 - Odabir backupa</h4><div class="backup-wizard-card-grid">${cards || `<div class="backup-wizard-empty">Nema dostupnih backupova.</div>`}</div></section>`;
}

function renderBackupWizardAnalysisStep() {
  const diff = backupRestoreWizardState.dryRun?.diff || [];
  const added = diff.filter((entry) => Number(entry.delta || 0) > 0);
  const changed = diff.filter((entry) => Number(entry.delta || 0) !== 0);
  const risks = diff.filter((entry) => ["users", "permissions", "storeProducts", "siteChatMessages"].includes(entry.module) && Number(entry.delta || 0) !== 0);
  const list = (items) => items.map((entry) => `<li>${backupWizardEscape(entry.module)}: ${backupWizardEscape(String(entry.current))} → ${backupWizardEscape(String(entry.restore))}</li>`).join("") || "<li>Nema.</li>";
  return `
    <section class="backup-wizard-section">
      <h4>Step 2 - Analiza / dry-run</h4>
      <div class="backup-wizard-analysis-grid">
        <div class="backup-wizard-result is-add"><strong>Bit ce dodano</strong><ul>${list(added)}</ul></div>
        <div class="backup-wizard-result is-change"><strong>Bit ce promijenjeno</strong><ul>${list(changed)}</ul></div>
        <div class="backup-wizard-result is-risk"><strong>Potencijalni rizici</strong><ul>${list(risks)}</ul></div>
      </div>
    </section>
  `;
}

function renderBackupWizardScopeStep() {
  const scopes = ["Planner", "Tidplan", "Warehouse", "Store", "Chat", "Korisnici", "Notifications", "Reports", "Site metadata"];
  return `
    <section class="backup-wizard-section">
      <h4>Step 3 - Restore scope</h4>
      <label class="backup-wizard-toggle"><input id="backupWizardScopeAll" type="checkbox" checked data-cmax-action="admin.toggleBackupWizardScope" data-cmax-event="change"> Restore sve</label>
      <p class="admin-section-note">Parcijalni scope je pripremljen u UX-u, ali backend trenutno sigurno izvrsava samo full restore.</p>
      <div class="backup-wizard-card-grid">${scopes.map((scope) => `<label class="backup-wizard-toggle is-muted"><input type="checkbox" checked disabled> ${backupWizardEscape(scope)}</label>`).join("")}</div>
    </section>
  `;
}

function toggleBackupWizardScope() {
  collectBackupRestoreWizardStep();
  renderBackupRestoreWizard();
}

function renderBackupWizardConfirmStep() {
  return `
    <section class="backup-wizard-section">
      <h4>Step 4 - Sigurnosna potvrda</h4>
      <div class="backup-wizard-danger"><strong>Ovo ce promijeniti produkcijske podatke.</strong><span>Samo Superadmin moze zavrsiti restore. Upisi RESTORE i potvrdi lozinkom.</span></div>
      <label>Upisi RESTORE<input id="backupWizardConfirmText" value="${backupWizardEscape(backupRestoreWizardState.confirmText)}"></label>
      <label>Lozinka<input id="backupWizardPassword" type="password" value="${backupWizardEscape(backupRestoreWizardState.password)}" autocomplete="current-password"></label>
    </section>
  `;
}

function renderBackupWizardProgressStep() {
  const modules = ["Planner", "Tidplan", "Warehouse", "Store", "Chat", "Korisnici", "Notifications", "Reports"];
  return `<section class="backup-wizard-section"><h4>Step 5 - Progress</h4><div class="backup-wizard-progress">${modules.map((module) => `<div><span>${backupRestoreWizardState.progress[module] || "RUN"}</span>${module}</div>`).join("")}</div></section>`;
}

function renderBackupWizardReportStep() {
  const report = backupRestoreWizardState.report || {};
  return `
    <section class="backup-wizard-section">
      <h4>Step 6 - Zavrsni report</h4>
      <div class="backup-wizard-report">
        <strong>Restore zavrsen</strong>
        <span>Backup: ${backupWizardEscape(report.backup || backupRestoreWizardState.selectedBackupId || "-")}</span>
        <span>Audit ID: #RESTORE-${backupWizardEscape(String(report.restoredAt || Date.now()).replace(/[^0-9]/g, "").slice(-8))}</span>
        <span>Integrity: ${report.integrity?.ok === true ? "OK" : "Provjeriti log"}</span>
      </div>
    </section>
  `;
}

async function runBackupWizardRestore() {
  collectBackupRestoreWizardStep();
  if (String(backupRestoreWizardState.confirmText || "").trim().toUpperCase() !== "RESTORE") {
    showToast("Morate upisati RESTORE.", "error");
    return;
  }
  if (!backupRestoreWizardState.password) {
    showToast("Unesite lozinku za sigurnosnu potvrdu.", "error");
    return;
  }
  if (!backupRestoreWizardState.restoreToken) {
    showToast("Restore token nedostaje. Ponovite dry-run.", "error");
    return;
  }
  const passwordResponse = await fetch("/api/store/confirm-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: backupRestoreWizardState.password }),
  });
  if (!passwordResponse.ok) {
    showToast("Lozinka nije potvrdena.", "error");
    return;
  }
  backupRestoreWizardState.step = 4;
  backupRestoreWizardState.progress = { Planner: "RUN", Tidplan: "RUN", Warehouse: "RUN", Store: "RUN" };
  renderBackupRestoreWizard();
  try {
    const response = await fetch("/api/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: backupRestoreWizardState.selectedBackupId,
        confirmationText: "RESTORE",
        restoreToken: backupRestoreWizardState.restoreToken,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "BACKUP_RESTORE_FAILED");
    backupRestoreWizardState.progress = Object.fromEntries(["Planner", "Tidplan", "Warehouse", "Store", "Chat", "Korisnici", "Notifications", "Reports"].map((module) => [module, "OK"]));
    backupRestoreWizardState.report = data;
    backupRestoreWizardState.step = 5;
    renderBackupRestoreWizard();
    showToast(t("backupRestoreSuccess"), "success");
    await loadAllData();
    restoreLastView();
  } catch (error) {
    backupRestoreWizardState.progress.Error = "ERR";
    renderBackupRestoreWizard();
    showToast(error.message || t("backupRestoreFailed"), "error");
  }
}

async function handleManualBackup() {
  if (!canManageBackups()) {
    showToast(t("backupNoCreatePermission"), "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch("/api/backup", { method: "POST" });
    if (response.status === 429) {
      showToast(BACKUP_RATE_LIMIT_MESSAGE, "error");
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Failed to create backup");
    showToast(`${t("backupCreated")}: ${data.file || data.id || "ok"}`, "success");
    addLog("manual_backup_created", { file: data.file || data.id || null });
    await handleListBackups();
  } catch (error) {
    console.error("Error creating backup:", error);
    showToast(error.message || t("backupFailed"), "error");
  } finally {
    hideLoading();
  }
}

async function runManualBackup() {
  const status = document.getElementById("manualBackupStatus");
  if (status) status.textContent = "";
  await handleManualBackup();
  if (status) status.textContent = t("backupComplete");
}

async function openBackupRestorePanel() {
  return openBackupRestoreWizard();
}

async function loadBackupRestoreOptions() {
  if (!canViewBackups()) {
    showToast(t("backupNoViewPermission"), "error");
    return [];
  }
  const select = document.getElementById("backupRestoreSelect");
  const status = document.getElementById("backupRestoreStatus");
  if (status) status.textContent = t("backupLoadingList");
  try {
    const response = await fetch("/api/backups", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Failed to list backups");
    const backups = Array.isArray(data.backups) ? data.backups : [];
    if (select) {
      select.innerHTML = "";
      backups.forEach((backup) => {
        const option = document.createElement("option");
        option.value = getBackupIdentifier(backup);
        option.textContent = formatBackupLabel(backup);
        select.appendChild(option);
      });
    }
    renderBackupList(backups);
    if (status) status.textContent = backups.length ? t("backupRestoreChoose") : t("backupNoAvailable");
    return backups;
  } catch (error) {
    console.error("Error loading restore backups:", error);
    if (status) status.textContent = t("backupLoadError");
    showToast(error.message || t("backupListUnavailable"), "error");
    return [];
  }
}

async function restoreSelectedBackup() {
  if (typeof canRestoreBackups === "function" ? !canRestoreBackups() : !canManageBackups()) {
    showToast(t("backupNoRestorePermission"), "error");
    return;
  }
  const select = document.getElementById("backupRestoreSelect");
  const backupId = select?.value;
  if (!backupId) {
    showToast(t("backupSelectRequired"), "error");
    return;
  }
  selectBackupRestoreWizardBackup(backupId);
  return openBackupRestoreWizard();
}

function confirmRestoreBackup(backupId) {
  showConfirm(
    t("backupRestoreConfirm"),
    t("backupRestoreTitle"),
    "!",
    async () => {
      const status = document.getElementById("backupRestoreStatus");
      if (status) status.textContent = t("backupRestoring");
      showLoading("loadingDefault");
      try {
        const response = await fetch("/api/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: backupId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "BACKUP_RESTORE_FAILED");
        if (status) status.textContent = t("backupRestoredRefreshing");
        showToast(t("backupRestoreSuccess"), "success");
        await loadAllData();
        restoreLastView();
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        console.error("Error restoring backup:", error);
        if (status) status.textContent = t("backupRestoreFailed");
        showToast(error.message || t("backupRestoreFailed"), "error");
      } finally {
        hideLoading();
      }
    },
  );
}

async function handleListBackups() {
  if (!canViewBackups()) {
    showToast(t("backupNoViewPermission"), "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const backups = await loadBackupRestoreOptions();
    renderBackupList(backups);
  } finally {
    hideLoading();
  }
}

function renderBackupList(backups) {
  const container = document.getElementById("backupListContainer");
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(backups) || backups.length === 0) {
    container.innerHTML = `<p style="color:var(--text-light);">${escapeHtml(t("backupNoItems"))}</p>`;
    return;
  }

  backups.forEach((backup) => {
    const row = document.createElement("div");
    row.className = "admin-item";
    const id = getBackupIdentifier(backup);
    row.innerHTML = `
      <div class="admin-info">
        <strong>${escapeHtml(backup.filename || backup.id || "backup")}</strong>
        <small>${escapeHtml(formatBackupLabel(backup))}</small>
      </div>
      <div class="admin-actions">
        <button class="btn btn-secondary" type="button" data-select-backup="${escapeHtml(id)}">${escapeHtml(t("backupSelect"))}</button>
        <button class="btn btn-danger" type="button" data-restore-backup="${escapeHtml(id)}">${escapeHtml(t("backupRestoreButton"))}</button>
      </div>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll("[data-select-backup]").forEach((button) => {
    button.dataset.cmaxAction = "admin.selectBackupForRestore";
    button.dataset.cmaxArgs = JSON.stringify([button.dataset.selectBackup || ""]);
  });
  container.querySelectorAll("[data-restore-backup]").forEach((button) => {
    button.dataset.cmaxAction = "admin.openBackupWizardFor";
    button.dataset.cmaxArgs = JSON.stringify([button.dataset.restoreBackup || ""]);
  });
}

async function openBackupRestoreWizardFor(backupId) {
  await openBackupRestoreWizard();
  selectBackupRestoreWizardBackup(backupId);
}

function selectBackupForRestore(backupId) {
  const select = document.getElementById("backupRestoreSelect");
  if (select) select.value = backupId || "";
  const panel = document.getElementById("backupRestorePanel");
  if (panel) panel.style.display = "block";
}

async function handleBackupInfo() {
  if (!canViewBackups()) {
    showToast(t("backupNoInfoPermission"), "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch("/api/backup/info", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Failed to get backup info");
    renderBackupInfo(data);
  } catch (error) {
    console.error("Error getting backup info:", error);
    showToast(error.message || t("backupInfoUnavailable"), "error");
  } finally {
    hideLoading();
  }
}

function renderBackupInfo(info) {
  const container = document.getElementById("backupInfoContainer");
  if (!container) return;
  container.innerHTML = `
    <p><strong>${escapeHtml(t("backupInterval"))}:</strong> ${escapeHtml(String(info.backupInterval || "-"))} h</p>
    <p><strong>${escapeHtml(t("backupStorage"))}:</strong> ${escapeHtml(String(info.storageType || "-"))}</p>
    <p><strong>${escapeHtml(t("backupLocation"))}:</strong> ${escapeHtml(String(info.backupsDir || "-"))}</p>
    <p><strong>${escapeHtml(t("backupLast"))}:</strong> ${info.lastBackupTime ? escapeHtml(new Date(info.lastBackupTime).toLocaleString()) : "N/A"}</p>
  `;
}
