function markDirty() {
  appState.hasUnsavedChanges = true;
  trackEditActivity();
  // Show Save button
  const btnSave = document.getElementById("btnSave");
  if (btnSave && currentView === "main") {
    btnSave.style.display = "inline-flex";
  }
}

function markClean() {
  appState.hasUnsavedChanges = false;
  localEditKeys.clear();
  // Hide Save button if in main view
  const btnSave = document.getElementById("btnSave");
  if (btnSave && currentView === "main") {
    btnSave.style.display = "none";
  }
}

function saveAllData() {
  saveData();
  saveBinsData();
  if (typeof markClean === "function") markClean();
  showToast(t("dataSaved"), "success");
}

function stopAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  autoSaveInterval = null;
}

function startAutoSave() {
  stopAutoSave();
  // Auto-save every 5 minutes
  autoSaveInterval = setInterval(() => {
    if (!appState.isReadonly && appState.currentUser && freshServerDataLoaded) {
      saveData();
      saveBinsData();
      if (typeof markClean === "function") markClean();
      console.log("Auto-saved at", new Date().toLocaleTimeString());
    }
  }, 300000); // 5 minutes
}

/* ==================== HANDLE PRINT/EXPORT WITH VIEW ==================== */
function handlePrint() {
  if (!hasPermission("canPrint")) {
    showToast(t("accessPrintDenied"), "error");
    return;
  }
  if (currentView === "bins") {
    printBinsTable();
  } else {
    window.print();
  }
  addLog("Printed", currentView === "bins" ? "Bins table" : "Main table");
}


function handleExport() {
  if (!hasPermission("canExport")) {
    showToast(t("accessExportDenied"), "error");
    return;
  }
  if (currentView === "bins") {
    exportBinsToPDF();
  } else if (currentView === "main") {
    exportToPDF();
  } else {
    exportToPDF();
  }
  addLog(
    "Exported to PDF",
    currentView === "bins" ? "Bins table" : "Main table",
  );
}

function printBinsTable() {
  // Create a print-friendly version
  const printWindow = window.open("", "_blank");
  const binsData = getBinsDataForDate(appState.currentDate);
  const date = new Date(appState.currentDate + "T00:00:00");
  const dateStr = date
    .toLocaleDateString("hr-HR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kante za smeće - ${dateStr}</title><style>
    ${getCmaxPrintHeaderCss()}
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    body > h1:first-of-type { display: none; }
    .date { font-size: 14px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #667eea; color: white; padding: 10px; text-align: center; font-weight: 600; }
    td { border: 1px solid #ccc; padding: 8px; text-align: center; }
    tr:hover { background: #f5f5f5; }
    .bin-cell-green { background-color: #d4edda !important; }
    .bin-cell-yellow { background-color: #fff3cd !important; }
    .bin-cell-red { background-color: #f8d7da !important; }
  </style></head><body>
    <h1>CMAX SCM - Kante za smeće</h1>
    ${getCmaxPrintHeaderHtml(currentSite, dateStr)}
    <table>
      <thead><tr>
        <th>Plan</th><th>Kärna</th><th>Total available</th><th>Empty available</th>
        <th>For emptying</th><th>Additional required</th><th>Status</th>
      </tr></thead>
      <tbody>`;

  binsData.rows.forEach((row) => {
    const G = row.totalAvailable;
    const H = row.emptyAvailable;
    const I = row.forEmptying;
    const J = row.additionalRequired;
    const ratio = G > 0 ? H / G : 0;
    const forEmptyRatio = G > 0 ? I / G : 0;

    let totalClass = "",
      emptyClass = "",
      forEmptyClass = "",
      additionalClass = "";

    if (ratio >= 0.66) {
      totalClass = "bin-cell-green";
      emptyClass = "bin-cell-green";
    } else if (ratio >= 0.33) {
      totalClass = "bin-cell-yellow";
      emptyClass = "bin-cell-yellow";
    } else {
      totalClass = "bin-cell-red";
      emptyClass = "bin-cell-red";
    }

    if (forEmptyRatio >= 0.66) forEmptyClass = "bin-cell-red";
    else if (forEmptyRatio >= 0.33) forEmptyClass = "bin-cell-yellow";
    else forEmptyClass = "bin-cell-green";

    if (J >= 5) additionalClass = "bin-cell-red";
    else if (J >= 2) additionalClass = "bin-cell-yellow";
    else additionalClass = "bin-cell-green";

    html += `<tr>
      <td style="font-weight:600;">${row.plan}</td>
      <td>${row.karna}</td>
      <td class="${totalClass}">${G}</td>
      <td class="${emptyClass}">${H}</td>
      <td class="${forEmptyClass}">${I}</td>
      <td class="${additionalClass}">${J}</td>
      <td style="font-size:10px;">${calculateBinStatus(row)}</td>
    </tr>`;
  });

  html += `</tbody></table></body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function exportBinsToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const binsData = getBinsDataForDate(appState.currentDate);
  const date = new Date(appState.currentDate + "T00:00:00");
  const dateStr = date
    .toLocaleDateString("hr-HR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  // Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 297, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("CMAX PLANNER - KANTE ZA SMEĆE", 14, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, 14, 17);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 52, "F");
  const contentStartY = drawCmaxPdfHeader(doc, currentSite, dateStr);

  // Table
  const tableData = binsData.rows.map((row) => [
    row.plan,
    row.karna,
    row.totalAvailable,
    row.emptyAvailable,
    row.forEmptying,
    row.additionalRequired,
    calculateBinStatus(row),
  ]);

  doc.autoTable({
    head: [
      [
        "Plan",
        "Kärna",
        "Total avail.",
        "Empty avail.",
        "For empty",
        "Add. req.",
        "Status",
      ],
    ],
    body: tableData,
    startY: contentStartY + 10,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: contentStartY + 10, left: 14, right: 14 },
  });

  const fileName = `CMAX_Bins_${appState.currentDate}.pdf`;
  doc.save(fileName);
}

/* ==================== MODULE EXPORT/IMPORT ==================== */
var MODULE_EXPORT_IMPORT_LABELS = {
  planner: "Planner",
  tidplan: "Tidplan",
  warehouse: "Skladište",
};

var pendingModuleImport = null;

function renderModuleImportFileState(fileName = "") {
  const state = document.getElementById("moduleImportFileState");
  if (!state) return;
  state.textContent = fileName || "Nije odabrana datoteka.";
}

function getModulePermission(module, action) {
  const permissionMap = {
    planner: { export: canExportPlanner, import: canImportPlanner },
    tidplan: { export: canExportTidplan, import: canImportTidplan },
    warehouse: { export: canExportWarehouse, import: canImportWarehouse },
  };
  return permissionMap[module]?.[action]?.() === true;
}

async function handleModuleExport(module, format) {
  if (!getModulePermission(module, "export")) {
    showToast(t("accessExportDenied"), "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/${module}/export/${format}?site=${encodeURIComponent(currentSite || "default")}`);
    const data = response.ok ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "EXPORT_FAILED");
    const blob = await response.blob();
    const extension = format === "pdf" ? "pdf" : "xlsx";
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${module}-${currentSite || "site"}-${new Date().toISOString().split("T")[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast(`${MODULE_EXPORT_IMPORT_LABELS[module] || module} export je skinut.`, "success");
  } catch (error) {
    console.error("Module export failed:", error);
    showToast(error.message || "Greška pri exportu.", "error");
  } finally {
    hideLoading();
  }
}

function openModuleImportModal(module, format) {
  if (!getModulePermission(module, "import")) {
    showToast(t("accessImportDenied"), "error");
    return;
  }
  pendingModuleImport = { module, format };
  const title = document.getElementById("moduleImportTitle");
  const label = document.getElementById("moduleImportFileLabel");
  const fileInput = document.getElementById("moduleImportFile");
  if (title) {
    title.textContent = t("moduleImportTitle")
      .replace("{module}", MODULE_EXPORT_IMPORT_LABELS[module] || module)
      .replace("{format}", format.toUpperCase());
  }
  if (label) label.textContent = `${format.toUpperCase()} ${t("importFileLabel")}`;
  if (fileInput) {
    fileInput.value = "";
    fileInput.accept = format === "pdf" ? ".pdf,application/pdf" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  renderModuleImportFileState("");
  const modal = document.getElementById("moduleImportModal");
  if (modal) modal.style.display = "flex";
}

function closeModuleImportModal() {
  pendingModuleImport = null;
  const fileInput = document.getElementById("moduleImportFile");
  if (fileInput) fileInput.value = "";
  renderModuleImportFileState("");
  const modal = document.getElementById("moduleImportModal");
  if (modal) modal.style.display = "none";
}

function handleModuleImportFileChange(event) {
  const fileName = event?.target?.files?.[0]?.name || "";
  renderModuleImportFileState(fileName);
}

function resetModuleImportModalFile() {
  const fileInput = document.getElementById("moduleImportFile");
  if (fileInput) fileInput.value = "";
  renderModuleImportFileState("");
}

async function uploadModuleImport() {
  if (!pendingModuleImport) return;
  const { module, format } = pendingModuleImport;
  if (!getModulePermission(module, "import")) {
    showToast(t("accessImportDenied"), "error");
    return;
  }
  const fileInput = document.getElementById("moduleImportFile");
  if (!fileInput?.files?.length) {
    showToast("Odaberite datoteku za import.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("site", currentSite || "default");
    const response = await fetch(`/api/${module}/import/${format}`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "IMPORT_FAILED");
    showToast(`${MODULE_EXPORT_IMPORT_LABELS[module] || module} je importan.`, "success");
    closeModuleImportModal();
    await loadAllData();
    if (module === "planner") renderPlanningTable();
    if (module === "tidplan") CMAX.tidplan.update();
    if (module === "warehouse") renderWarehousePage();
  } catch (error) {
    console.error("Module import failed:", error);
    showToast(error.message || "Greška pri importu.", "error");
  } finally {
    hideLoading();
  }
}

/* ==================== WAREHOUSE EXPORT/IMPORT ==================== */
async function handleWarehouseExportExcel() {
  if (!canExportWarehouse()) {
    showToast("Nemate dozvolu za export skladišta.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/warehouse/export/excel?site=${encodeURIComponent(currentSite || "default")}`);
    if (!response.ok) throw new Error("Failed to export warehouse");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skladiste-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Skladište uspješno exportano u Excel.", "success");
    addLog("Exported warehouse to Excel");
  } catch (error) {
    console.error("Error exporting warehouse:", error);
    showToast("Greška pri exportu skladišta.", "error");
  } finally {
    hideLoading();
  }
}

async function handleWarehouseImportExcel() {
  if (!canImportWarehouse()) {
    showToast("Nemate dozvolu za import skladišta.", "error");
    return;
  }
  const fileInput = document.getElementById("warehouseImportFile");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showToast("Odaberite Excel datoteku za import.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    const response = await fetch("/api/warehouse/import/excel", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to import warehouse");
    const data = await response.json();
    showToast(`Uspješno importano ${data.itemsImported} stavki u skladište.`, "success");
    addLog("Imported warehouse from Excel", { itemsImported: data.itemsImported });
    closeModal('warehouseImportModal');
    loadWarehouseData();
    renderWarehousePage();
  } catch (error) {
    console.error("Error importing warehouse:", error);
    showToast("Greška pri importu skladišta.", "error");
  } finally {
    hideLoading();
  }
}

/* ==================== TIDPLAN EXPORT/IMPORT ==================== */
async function handleTidplanExportPdf() {
  if (!canExportTidplan()) {
    showToast("Nemate dozvolu za export Tidplana.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/tidplan/export/pdf?site=${encodeURIComponent(currentSite)}`);
    if (!response.ok) throw new Error("Failed to export Tidplan");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tidplan-${currentSite}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Tidplan uspješno exportan u PDF.", "success");
    addLog("Exported Tidplan to PDF", { site: currentSite });
  } catch (error) {
    console.error("Error exporting Tidplan:", error);
    showToast("Greška pri exportu Tidplana.", "error");
  } finally {
    hideLoading();
  }
}


/* ==================== PLANNER EXPORT/IMPORT ==================== */
async function exportPlannerToExcel() {
  if (!canExportPlanner()) {
    showToast("Nemate dozvolu za export Plannera.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/planner/export/excel?site=${encodeURIComponent(currentSite)}`);
    if (!response.ok) throw new Error("Failed to export Planner");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-${currentSite}-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Planner uspješno exportan u Excel.", "success");
    addLog("Exported Planner to Excel", { site: currentSite });
  } catch (error) {
    console.error("Error exporting Planner:", error);
    showToast("Greška pri exportu Plannera.", "error");
  } finally {
    hideLoading();
  }
}

async function exportPlannerToPDF() {
  if (!canExportPlanner()) {
    showToast("Nemate dozvolu za export Plannera.", "error");
    return;
  }
  exportToPDF();
  addLog("Exported Planner to PDF", { site: currentSite, date: appState.currentDate });
  showToast("Planner uspješno exportan u PDF.", "success");
  return;
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/planner/export/pdf?site=${encodeURIComponent(currentSite)}`);
    if (!response.ok) throw new Error("Failed to export Planner");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-${currentSite}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Planner uspješno exportan u PDF.", "success");
    addLog("Exported Planner to PDF", { site: currentSite });
  } catch (error) {
    console.error("Error exporting Planner:", error);
    showToast("Greška pri exportu Plannera.", "error");
  } finally {
    hideLoading();
  }
}

async function exportPlannerToWord() {
  if (!canExportPlanner()) {
    showToast("Nemate dozvolu za export Plannera.", "error");
    return;
  }
  showLoading("loadingDefault");
  try {
    const response = await fetch(`/api/planner/export/word?site=${encodeURIComponent(currentSite)}`);
    if (!response.ok) throw new Error("Failed to export Planner");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-${currentSite}-${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Planner uspješno exportan u Word.", "success");
    addLog("Exported Planner to Word", { site: currentSite });
  } catch (error) {
    console.error("Error exporting Planner:", error);
    showToast("Greška pri exportu Plannera.", "error");
  } finally {
    hideLoading();
  }
}

/* ==================== DELETE REPORT (SUPER ADMIN) ==================== */
function deleteReport(reportId) {
  if (!(appState.isSuperAdmin || hasAdminPermission("canDeleteReports"))) return;
  showConfirm(t("confirmDeleteReport"), null, "⚠️", () => {
    let reports = getReports();
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      addLog(
        "Deleted report",
        `Lift ${report.liftNumber}, Plan ${report.plan}, Reporter: ${report.reporterName}`,
      );
    }
    reports = reports.filter((r) => r.id !== reportId);
    saveReports(reports);
    trackEditActivity();
    renderReportsList(currentReportFilter);
    updateNotifBadge();
    showToast(t("reportDeleted"), "success");
  });
}

function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;
  if (dropdown.style.display === "none" || !dropdown.style.display) {
    dropdown.style.display = "block";
  } else {
    dropdown.style.display = "none";
  }
  dropdown.classList.toggle("show", dropdown.style.display === "block");
}

function togglePlannerExportImportDropdown() {
  toggleDropdown("plannerExportImportDropdown");
}

function toggleTidplanExportImportDropdown() {
  toggleDropdown("tidplanExportImportDropdown");
}

function toggleWarehouseExportImportDropdown() {
  toggleDropdown("warehouseExportImportDropdown");
}

function formatCmaxPrintDate(value = appState.currentDate, options = {}) {
  const date = value instanceof Date ? value : new Date(`${value || appState.currentDate}T00:00:00`);
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
  return safeDate.toLocaleDateString(options.locale || "hr-HR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

function getCmaxLogoImage() {
  const img = document.getElementById("mainLogoImg") || document.getElementById("loginLogoImg");
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

function drawCmaxPdfHeader(doc, site = currentSite, dateLabel = formatCmaxPrintDate(), options = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = getCmaxLogoImage();
  const logoSize = options.logoSize || 39;
  const title = `CMAX SCM - ${site || currentSite}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleWidth = Math.min(Math.max(doc.getTextWidth(title) + 24, 118), pageWidth - 104);
  const groupWidth = logoSize + 7 + titleWidth;
  const startX = (pageWidth - groupWidth) / 2;
  const topY = options.topY || 7;
  const titleX = startX + logoSize + 7;
  const titleY = topY + 10;

  doc.setFillColor(102, 88, 190);
  doc.roundedRect(startX, topY, logoSize, logoSize, 5, 5, "F");

  if (logo) {
    try {
      const ratio = logo.naturalWidth && logo.naturalHeight ? logo.naturalWidth / logo.naturalHeight : 1;
      const maxLogoImage = logoSize - 4;
      const imageWidth = ratio >= 1 ? maxLogoImage : maxLogoImage * ratio;
      const imageHeight = ratio >= 1 ? maxLogoImage / ratio : maxLogoImage;
      doc.addImage(
        logo,
        "PNG",
        startX + (logoSize - imageWidth) / 2,
        topY + (logoSize - imageHeight) / 2,
        imageWidth,
        imageHeight,
      );
    } catch (error) {
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("CM", startX + logoSize / 2, topY + logoSize / 2 + 4, { align: "center" });
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("CM", startX + logoSize / 2, topY + logoSize / 2 + 4, { align: "center" });
  }

  doc.setFillColor(102, 88, 190);
  doc.roundedRect(titleX, titleY, titleWidth, 15, 2, 2, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(titleX + 4, titleY + 5.4, 3, 3, 0.8, 0.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(title, titleX + 10, titleY + 10.6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(70, 70, 70);
  doc.text(dateLabel, titleX + titleWidth / 2, titleY + 24, { align: "center" });

  doc.setDrawColor(102, 88, 190);
  doc.setLineWidth(0.35);
  doc.line(10, topY + logoSize + 5, pageWidth - 10, topY + logoSize + 5);
  doc.setTextColor(0, 0, 0);
  return topY + logoSize + 20;
}

function getCmaxPrintHeaderCss() {
  return `
    :root {
      --primary-color-start: #667eea;
      --primary-color-mid: #6658be;
      --primary-color-end: #764ba2;
      --shadow: rgba(30, 41, 59, 0.18);
      --text-dark: #1f2937;
    }
    .header.cmax-print-header {
      display: flex !important;
      justify-content: center;
      align-items: center;
      width: 100%;
      border-bottom: 2px solid #8b83c7;
      padding: 0 0 12px;
      margin: 0 0 24px;
      page-break-inside: avoid;
    }
    .header.cmax-print-header .logo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      flex-wrap: nowrap;
    }
    .header.cmax-print-header .logo {
      width: 150px;
      height: 150px;
      background: linear-gradient(135deg, var(--primary-color-start) 0%, var(--primary-color-mid) 45%, var(--primary-color-end) 100%);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: bold;
      color: #fff;
      box-shadow: 0 4px 12px var(--shadow);
      overflow: hidden;
      flex-shrink: 0;
    }
    .header.cmax-print-header .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: inherit;
    }
    .header.cmax-print-header .title-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: center;
      align-items: center;
    }
    .header.cmax-print-header .title-section h1,
    .header.cmax-print-header .cmax-print-title {
      font-size: 36px;
      color: var(--text-dark);
    }
    .header.cmax-print-header #mainTitle,
    .header.cmax-print-header .cmax-print-title {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 12px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--primary-color-start), var(--primary-color-end));
      color: #fff;
      box-shadow: 0 8px 20px var(--shadow);
      line-height: 1.1;
      margin: 0;
      white-space: nowrap;
    }
    .header.cmax-print-header #mainTitle::before,
    .header.cmax-print-header .cmax-print-title::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);
      transform: rotate(45deg);
      flex-shrink: 0;
    }
    .header.cmax-print-header .date-display {
      display: block !important;
      font-size: 12px;
      color: #4b5563;
      text-transform: uppercase;
    }
    @media (max-width: 700px) {
      .header.cmax-print-header .logo { width: 96px; height: 96px; border-radius: 14px; }
      .header.cmax-print-header .title-section h1,
      .header.cmax-print-header .cmax-print-title { font-size: 24px; }
      .header.cmax-print-header #mainTitle,
      .header.cmax-print-header .cmax-print-title { white-space: normal; }
    }
    .cmax-print-header { border-bottom: 2px solid #8b83c7; padding: 0 0 8px; margin: 0 0 18px; display: flex; justify-content: center; }
    .cmax-print-header .logo-section { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; }
    .cmax-print-header .logo { width: 82px; height: 82px; background: linear-gradient(135deg, #667eea 0%, #6658be 45%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(30, 41, 59, 0.18); overflow: hidden; flex-shrink: 0; }
    .cmax-print-header .logo img { max-width: 94%; max-height: 94%; width: auto; height: auto; object-fit: contain; border-radius: inherit; }
    .cmax-print-header .title-section { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
    .cmax-print-header h1 { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 12px; border-radius: 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 28px; line-height: 1; margin: 0; }
    .cmax-print-header .cmax-print-title { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 12px; border-radius: 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 28px; line-height: 1; margin: 0; }
    .cmax-print-header .date-display { display: block; font-size: 11px; color: #4b5563; font-weight: 600; text-transform: uppercase; }
  `;
}

function getCmaxPrintHeaderHtml(site = currentSite, dateLabel = formatCmaxPrintDate()) {
  return `
    <div class="header cmax-print-header">
      <div class="logo-section">
        <div class="logo">
          <img src="/cmaxlogo.png" alt="CMAX Logo" />
        </div>
        <div class="title-section">
          <h1 id="mainTitle">CMAX SCM - ${escapeHtml(site || currentSite)}</h1>
          <div class="date-display">${escapeHtml(dateLabel)}</div>
        </div>
      </div>
    </div>
  `;
}

/* ==================== PDF EXPORT ==================== */
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const dayData = getCurrentDayData();
  const date = new Date(appState.currentDate + "T00:00:00");
  const dateStr = date
    .toLocaleDateString("hr-HR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  const contentStartY = drawCmaxPdfHeader(doc, currentSite, dateStr);

  // Summary row
  const activeWorkers = getActiveResourceList("workers", appState.currentDate);
  const activeLifts = getActiveResourceList("lifts", appState.currentDate);
  const presentWorkers = activeWorkers.filter(
    (w) => dayData.workerAttendance[w] !== false,
  ).length;
  const availableLifts = activeLifts.filter(
    (l) => dayData.liftAvailability[l] !== false,
  ).length;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Resursi: ${presentWorkers}/${activeWorkers.length} dostupno  |  Liftovi: ${availableLifts}/${activeLifts.length} dostupno`,
    14,
    contentStartY + 4,
  );
  doc.setTextColor(0, 0, 0);

  const headers = [
    t("thW1"),
    t("thW2"),
    t("thW3"),
    t("thPlan"),
    t("thKarna"),
    t("thM1"),
    t("thM2"),
    t("thL1"),
    t("thL2"),
    t("thL3"),
    t("thComment"),
  ];

  const rows = dayData.planningRows
    .filter((row) => row && Object.values(row).some((v) => v))
    .map((row) => [
      row.w1 || "",
      row.w2 || "",
      row.w3 || "",
      row.plan || "",
      row.karna || "",
      row.m1 || "",
      row.m2 || "",
      row.l1 || "",
      row.l2 || "",
      row.l3 || "",
      row.comment || "",
    ]);

  if (rows.length === 0)
    rows.push(["—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—"]);

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: contentStartY + 14,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    bodyStyles: { textColor: [44, 62, 80], halign: "center" },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
      7: { cellWidth: 18 },
      8: { cellWidth: 18 },
      9: { cellWidth: 18 },
      10: { cellWidth: "auto" },
    },
    margin: { left: 10, right: 10 },
    didDrawCell: (data) => {
      if (data.section === "body") {
        const row = dayData.planningRows[data.row.index];
        if (!row) return;
        const field = [
          "w1",
          "w2",
          "w3",
          "plan",
          "karna",
          "m1",
          "m2",
          "l1",
          "l2",
          "l3",
          "comment",
        ][data.column.index];
        const val = row[field];
        if (!val) return;
        // Color coding
        if (["w1", "w2", "w3"].includes(field)) {
          if (dayData.workerAttendance[val] === false) {
            doc.setFillColor(255, 243, 205);
            doc.rect(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              "F",
            );
            doc.setTextColor(133, 100, 4);
            doc.setFontSize(8);
            doc.text(
              val,
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 1,
              { align: "center" },
            );
          }
        }
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
    `CMAX SCM | ${dateStr}`,
      10,
      doc.internal.pageSize.height - 6,
    );
    doc.text(
      `${i} / ${pageCount}`,
      doc.internal.pageSize.width - 20,
      doc.internal.pageSize.height - 6,
    );
  }

  const fileName = `CMAX_Planner_${appState.currentDate}.pdf`;
  doc.save(fileName);
}

function getWarehouseInventoryExportRows() {
  if (!warehouseData) loadWarehouseData();
  return getVisibleWarehouseCatalog().map((item) => {
    const stock = ensureWarehouseStockRecord(item.id);
    return {
      name: item.name || "",
      unit: item.unit || "kom",
      current: Number(stock.current) || 0,
      issued: Number(stock.totalIssued) || 0,
      received: Number(stock.totalReceived) || 0,
      minimum: Number(item.minimum) || 0,
    };
  });
}

function exportWarehouseInventoryToPDF() {
  if (!canAccessWarehouseModule()) {
    showToast(t("warehouseAccessDenied"), "error");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = getWarehouseInventoryExportRows();
  const generatedAt = new Date().toLocaleString(getCurrentLocale());

  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 297, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("CMAX SCM", 14, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`SKLADISTE - ${currentSite} | ${generatedAt}`, 14, 17);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 52, "F");
  const contentStartY = drawCmaxPdfHeader(doc, currentSite, formatCmaxPrintDate(new Date()));
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Skladiste | ${generatedAt} | Stavke: ${rows.length}`, 14, contentStartY + 4);
  doc.setTextColor(0, 0, 0);

  doc.autoTable({
    head: [["Alat / materijal", "Jedinica", "Trenutno", "Ukupno dano", "Ukupno doslo", "Min. limit"]],
    body: rows.map((row) => [row.name, row.unit, row.current, row.issued, row.received, row.minimum]),
    startY: contentStartY + 14,
    styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.3 },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    bodyStyles: { textColor: [44, 62, 80] },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const source = rows[data.row.index];
      if (source && source.minimum > 0 && source.current <= source.minimum) {
        data.cell.styles.fillColor = [255, 244, 214];
        data.cell.styles.textColor = [122, 93, 0];
      }
    },
    margin: { left: 10, right: 10 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`CMAX SCM | SKLADISTE - ${currentSite}`, 10, doc.internal.pageSize.height - 6);
    doc.text(`${i} / ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 6);
  }

  doc.save(`CMAX_Skladiste_${currentSite}_${new Date().toISOString().split("T")[0]}.pdf`);
}

function printWarehouseInventory() {
  if (!canAccessWarehouseModule()) {
    showToast(t("warehouseAccessDenied"), "error");
    return;
  }
  const rows = getWarehouseInventoryExportRows();
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const htmlRows = rows.map((row) => `
    <tr class="${row.minimum > 0 && row.current <= row.minimum ? "low" : ""}">
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.unit)}</td>
      <td>${row.current}</td>
      <td>${row.issued}</td>
      <td>${row.received}</td>
      <td>${row.minimum}</td>
    </tr>
  `).join("");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CMAX Skladiste</title>
        <style>
          ${getCmaxPrintHeaderCss()}
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .meta { color: #667085; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #667eea; color: #fff; text-align: left; padding: 8px; }
          td { border: 1px solid #d0d5dd; padding: 7px; }
          tr.low td { background: #fff4d6; color: #7a5d00; }
        </style>
      </head>
      <body>
        ${getCmaxPrintHeaderHtml(currentSite, formatCmaxPrintDate(new Date()))}
        <h1>Skladiste</h1>
        <div class="meta">${escapeHtml(new Date().toLocaleString(getCurrentLocale()))}</div>
        <table>
          <thead>
            <tr>
              <th>Alat / materijal</th><th>Jedinica</th><th>Trenutno</th>
              <th>Ukupno dano</th><th>Ukupno doslo</th><th>Min. limit</th>
            </tr>
          </thead>
          <tbody>${htmlRows || `<tr><td colspan="6">Nema stavki.</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}





/* ==================== SITE MANAGEMENT ==================== */

