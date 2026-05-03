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
      <h4>Backup lista</h4>
      <button class="btn btn-secondary" id="btnListBackups" type="button">Osvjezi listu</button>
      <div id="backupListContainer" class="admin-list-container"></div>
    `;
    tab.appendChild(listSection);
  }

  if (!document.getElementById("backupInfoContainer")) {
    const infoSection = document.createElement("div");
    infoSection.className = "admin-settings-section";
    infoSection.innerHTML = `
      <h4>Backup status</h4>
      <button class="btn btn-secondary" id="btnBackupInfo" type="button">Osvjezi info</button>
      <div id="backupInfoContainer" class="admin-info-container"></div>
    `;
    tab.appendChild(infoSection);
  }

  const listButton = document.getElementById("btnListBackups");
  if (listButton) listButton.onclick = handleListBackups;
  const infoButton = document.getElementById("btnBackupInfo");
  if (infoButton) infoButton.onclick = handleBackupInfo;
}

function getBackupIdentifier(backup) {
  return String(backup?.id || backup?.filename || "");
}

function formatBackupLabel(backup) {
  const name = backup?.filename || backup?.id || "backup";
  const created = backup?.createdAt ? new Date(backup.createdAt).toLocaleString() : "nepoznato vrijeme";
  const size = backup?.size ? `${(backup.size / 1024).toFixed(1)} KB` : "";
  return `${name} | ${created}${size ? ` | ${size}` : ""}`;
}

async function handleManualBackup() {
  if (!canManageBackups()) {
    showToast("Nemate dozvolu za kreiranje backupa.", "error");
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
    showToast(`Backup kreiran: ${data.file || data.id || "ok"}`, "success");
    addLog("manual_backup_created", { file: data.file || data.id || null });
    await handleListBackups();
  } catch (error) {
    console.error("Error creating backup:", error);
    showToast(error.message || "Backup nije uspio.", "error");
  } finally {
    hideLoading();
  }
}

async function runManualBackup() {
  const status = document.getElementById("manualBackupStatus");
  if (status) status.textContent = "";
  await handleManualBackup();
  if (status) status.textContent = "Backup zahtjev je zavrsen. Provjeri listu ispod.";
}

async function openBackupRestorePanel() {
  if (typeof canRestoreBackups === "function" ? !canRestoreBackups() : !canManageBackups()) {
    showToast("Nemate dozvolu za vracanje backupa.", "error");
    return;
  }
  ensureBackupTabContent();
  const panel = document.getElementById("backupRestorePanel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" || !panel.style.display ? "block" : "none";
  if (panel.style.display === "block") {
    await loadBackupRestoreOptions();
  }
}

async function loadBackupRestoreOptions() {
  if (!canViewBackups()) {
    showToast("Nemate dozvolu za pregled backupa.", "error");
    return [];
  }
  const select = document.getElementById("backupRestoreSelect");
  const status = document.getElementById("backupRestoreStatus");
  if (status) status.textContent = "Ucitavam backup listu...";
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
    if (status) status.textContent = backups.length ? "Odaberi backup za vracanje." : "Nema dostupnih backupova.";
    return backups;
  } catch (error) {
    console.error("Error loading restore backups:", error);
    if (status) status.textContent = "Greska pri ucitavanju backupova.";
    showToast(error.message || "Backup lista nije dostupna.", "error");
    return [];
  }
}

async function restoreSelectedBackup() {
  if (typeof canRestoreBackups === "function" ? !canRestoreBackups() : !canManageBackups()) {
    showToast("Nemate dozvolu za vracanje backupa.", "error");
    return;
  }
  const select = document.getElementById("backupRestoreSelect");
  const backupId = select?.value;
  if (!backupId) {
    showToast("Odaberite backup za vracanje.", "error");
    return;
  }
  confirmRestoreBackup(backupId);
}

function confirmRestoreBackup(backupId) {
  showConfirm(
    "Vratiti odabrani backup? Trenutno stanje ce prije toga biti spremljeno kao pre-restore backup.",
    "Restore backup",
    "!",
    async () => {
      const status = document.getElementById("backupRestoreStatus");
      if (status) status.textContent = "Vracam backup...";
      showLoading("loadingDefault");
      try {
        const response = await fetch("/api/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: backupId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "BACKUP_RESTORE_FAILED");
        if (status) status.textContent = "Backup je vracen. Osvjezavam podatke...";
        showToast("Backup je uspjesno vracen.", "success");
        await loadAllData();
        restoreLastView();
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        console.error("Error restoring backup:", error);
        if (status) status.textContent = "Vracanje backupa nije uspjelo.";
        showToast(error.message || "Backup restore failed.", "error");
      } finally {
        hideLoading();
      }
    },
  );
}

async function handleListBackups() {
  if (!canViewBackups()) {
    showToast("Nemate dozvolu za pregled backupa.", "error");
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
    container.innerHTML = '<p style="color:var(--text-light);">Nema backupova.</p>';
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
        <button class="btn btn-secondary" type="button" data-select-backup="${escapeHtml(id)}">Odaberi</button>
        <button class="btn btn-danger" type="button" data-restore-backup="${escapeHtml(id)}">Restore</button>
      </div>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll("[data-select-backup]").forEach((button) => {
    button.addEventListener("click", () => {
      const select = document.getElementById("backupRestoreSelect");
      if (select) select.value = button.dataset.selectBackup || "";
      const panel = document.getElementById("backupRestorePanel");
      if (panel) panel.style.display = "block";
    });
  });
  container.querySelectorAll("[data-restore-backup]").forEach((button) => {
    button.addEventListener("click", () => confirmRestoreBackup(button.dataset.restoreBackup || ""));
  });
}

async function handleBackupInfo() {
  if (!canViewBackups()) {
    showToast("Nemate dozvolu za pregled informacija o backupu.", "error");
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
    showToast(error.message || "Backup info nije dostupan.", "error");
  } finally {
    hideLoading();
  }
}

function renderBackupInfo(info) {
  const container = document.getElementById("backupInfoContainer");
  if (!container) return;
  container.innerHTML = `
    <p><strong>Interval:</strong> ${escapeHtml(String(info.backupInterval || "-"))} h</p>
    <p><strong>Storage:</strong> ${escapeHtml(String(info.storageType || "-"))}</p>
    <p><strong>Lokacija:</strong> ${escapeHtml(String(info.backupsDir || "-"))}</p>
    <p><strong>Zadnji backup:</strong> ${info.lastBackupTime ? escapeHtml(new Date(info.lastBackupTime).toLocaleString()) : "N/A"}</p>
  `;
}
