(function (global) {
  const DAY_WIDTH = 40;
  const PDF_SIZE_LIMIT_BYTES = 450 * 1024;
  const LONG_PRESS_MS = 420;
  const MAX_HISTORY_STEPS = 20;

  const uiState = (global.tidplanUiState = global.tidplanUiState || {
    undoStack: [],
    redoStack: [],
    fieldBaselines: {},
    timelineDays: [],
    context: { activityIndex: -1, clickedDate: "", clientX: 0, clientY: 0 },
    longPressTimer: null,
    longPressPoint: null,
    currentNotesActivityIndex: -1,
    currentNotesIndex: 0,
    manualMove: null,
    globalListenersBound: false,
  });

  function escapeSafe(value) {
    return typeof escapeHtml === "function"
      ? escapeHtml(String(value ?? ""))
      : String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
  }

  function cloneTidplanSnapshot(value = tidplanData) {
    try {
      return JSON.parse(JSON.stringify(Array.isArray(value) ? value : []));
    } catch (error) {
      return [];
    }
  }

  function arraysEqualByJson(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (error) {
      return false;
    }
  }

  function normalizeDate(value) {
    if (!value) return "";
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime())) return "";
    if (typeof getDateKey === "function") return getDateKey(date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatDate(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "";
    if (typeof getDateKey === "function") return getDateKey(date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addDays(dateStr, delta) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (!Number.isFinite(date.getTime())) return dateStr;
    date.setDate(date.getDate() + delta);
    return formatDate(date);
  }

  function diffDays(startStr, endStr) {
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 0;
    return Math.round((end - start) / 86400000);
  }

  function getTidplanTotalDays(activity) {
    if (!activity?.start || !activity?.end) return 0;
    return Math.max(0, diffDays(activity.start, activity.end)) + 1;
  }

  function getTidplanCompletedDays(activity) {
    const totalDays = getTidplanTotalDays(activity);
    if (!totalDays) return 0;
    const percent = Math.max(0, Math.min(100, Number(activity?.completionPercent) || 0));
    if (percent >= 100) return totalDays;
    return Math.max(0, Math.min(totalDays, Math.floor((totalDays * percent) / 100)));
  }

  function getTidplanRemainingRange(activity) {
    if (!activity?.start || !activity?.end) return null;
    const totalDays = getTidplanTotalDays(activity);
    const completedDays = getTidplanCompletedDays(activity);
    if (!totalDays || completedDays >= totalDays) {
      return {
        totalDays,
        completedDays,
        hasRemaining: false,
        remainingStart: "",
        remainingEnd: "",
      };
    }
    return {
      totalDays,
      completedDays,
      hasRemaining: true,
      remainingStart: addDays(activity.start, completedDays),
      remainingEnd: activity.end,
    };
  }

  function isTidplanActivityActiveOnDate(activity, dateStr) {
    if (!activity || activity.active === false || !dateStr) return false;
    const range = getTidplanRemainingRange(activity);
    if (!range?.hasRemaining) return false;
    return dateStr >= range.remainingStart && dateStr <= range.remainingEnd;
  }

  function getTidplanActor() {
    return {
      by: appState.currentUser || "",
      byName: appState.currentUserName || appState.currentUser || "Nepoznato",
      at: new Date().toISOString(),
    };
  }

  function ensureTidplanActivityEnhancements(activity) {
    if (!activity || typeof activity !== "object") return activity;
    if (typeof activity.active !== "boolean") activity.active = true;
    if (typeof activity.locked !== "boolean") activity.locked = false;
    if (!Array.isArray(activity.notes)) activity.notes = [];
    if (!Array.isArray(activity.linkedWorkers)) activity.linkedWorkers = [];
    if (typeof activity.completionPercent !== "number") {
      activity.completionPercent = Math.max(0, Math.min(100, Number(activity.completionPercent) || 0));
    }
    if (!activity.materialOrder || typeof activity.materialOrder !== "object") {
      activity.materialOrder = null;
    } else {
      if (!Array.isArray(activity.materialOrder.history)) activity.materialOrder.history = [];
    }
    if (!activity._metaId) {
      activity._metaId = `tid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }
    return activity;
  }

  function ensureAllTidplanActivities() {
    (tidplanData || []).forEach((activity) => ensureTidplanActivityEnhancements(activity));
  }

  function updateTidplanUnsavedState() {
    tidplanDataChanged = true;
    trackEditActivity();
    const saveBtn = document.getElementById("btnSaveTidplan");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = "1";
      saveBtn.style.cursor = "pointer";
    }
  }

  function recordTidplanHistory(reason = "") {
    const snapshot = cloneTidplanSnapshot();
    const last = uiState.undoStack[uiState.undoStack.length - 1];
    if (last && arraysEqualByJson(last.data, snapshot)) return;
    uiState.undoStack.push({
      reason,
      data: snapshot,
      at: Date.now(),
    });
    if (uiState.undoStack.length > MAX_HISTORY_STEPS) {
      uiState.undoStack.shift();
    }
    uiState.redoStack = [];
  }

  function restoreTidplanSnapshot(snapshot, direction = "undo") {
    tidplanData = cloneTidplanSnapshot(snapshot);
    ensureAllTidplanActivities();
    updateTidplanUnsavedState();
    if (typeof updateTidplan === "function") updateTidplan();
    showToast(direction === "undo" ? "Tidplan korak vracen." : "Tidplan korak vracen naprijed.", "success");
  }

  function undoTidplanChange() {
    if (!uiState.undoStack.length) {
      showToast("Nema vise koraka za ponistiti.", "info");
      return;
    }
    const current = cloneTidplanSnapshot();
    const step = uiState.undoStack.pop();
    uiState.redoStack.push({ reason: step.reason, data: current, at: Date.now() });
    restoreTidplanSnapshot(step.data, "undo");
  }

  function redoTidplanChange() {
    if (!uiState.redoStack.length) {
      showToast("Nema vise koraka za ponoviti.", "info");
      return;
    }
    const current = cloneTidplanSnapshot();
    const step = uiState.redoStack.pop();
    uiState.undoStack.push({ reason: step.reason, data: current, at: Date.now() });
    restoreTidplanSnapshot(step.data, "redo");
  }

  function persistTidplanMutation(activityIndex, fieldName) {
    if (activityIndex !== null && activityIndex !== undefined) {
      markTidplanChanged(activityIndex, fieldName);
    } else {
      updateTidplanUnsavedState();
    }
    if (typeof updateTidplan === "function") updateTidplan();
  }

  function getActivityByIndex(activityIndex) {
    const numericIndex = Number(activityIndex);
    if (!Number.isInteger(numericIndex) || numericIndex < 0) return null;
    const activity = tidplanData[numericIndex];
    if (!activity) return null;
    return ensureTidplanActivityEnhancements(activity);
  }

  function isActivityLocked(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    return Boolean(activity?.locked);
  }

  function getScopeActivityIndexes(activityIndex, scope = "current") {
    const current = getActivityByIndex(activityIndex);
    if (!current) return [];
    if (scope === "current") return [Number(activityIndex)];
    if (scope === "all") {
      return (tidplanData || [])
        .map((activity, index) => (activity ? index : -1))
        .filter((index) => index >= 0);
    }
    if (scope === "moment") {
      const momentName = String(current.moment || "").trim().toLowerCase();
      return (tidplanData || [])
        .map((activity, index) => {
          if (!activity) return -1;
          return String(activity.moment || "").trim().toLowerCase() === momentName ? index : -1;
        })
        .filter((index) => index >= 0);
    }
    return [];
  }

  function setLockState(activityIndex, scope, locked) {
    const indexes = getScopeActivityIndexes(activityIndex, scope);
    if (!indexes.length) return;
    recordTidplanHistory(locked ? "lock" : "unlock");
    indexes.forEach((index) => {
      const activity = getActivityByIndex(index);
      if (!activity) return;
      activity.locked = Boolean(locked);
      markTidplanChanged(index, "locked");
    });
    updateTidplan();
  }

  function setCompletionPercent(activityIndex, percent) {
    const activity = getActivityByIndex(activityIndex);
    if (!activity) return;
    if (activity.locked) {
      showToast("Ovaj momenat je zakljucan.", "error");
      return;
    }
    recordTidplanHistory("completion");
    activity.completionPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    const actor = getTidplanActor();
    activity.completionUpdatedAt = actor.at;
    activity.completionUpdatedBy = actor.by;
    activity.completionUpdatedByName = actor.byName;
    persistTidplanMutation(activityIndex, "completionPercent");
  }

  function alignCompletionToToday(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    if (!activity) return;
    if (activity.locked) {
      showToast("Ovaj momenat je zakljucan.", "error");
      return;
    }
    if (!activity.start || !activity.end) {
      showToast("Aktivnost mora imati start i end datum.", "error");
      return;
    }
    const totalDays = getTidplanTotalDays(activity);
    const completedDays = getTidplanCompletedDays(activity);
    const today = formatDate(new Date());
    recordTidplanHistory("move-percent-to-today");
    if (completedDays >= totalDays) {
      activity.end = today;
      activity.start = addDays(today, -(totalDays - 1));
    } else {
      activity.start = addDays(today, -completedDays);
      activity.end = addDays(activity.start, totalDays - 1);
    }
    persistTidplanMutation(activityIndex, "start");
  }

  function moveActivityToToday(activityIndex, mode) {
    const activity = getActivityByIndex(activityIndex);
    if (!activity) return;
    if (activity.locked) {
      showToast("Ovaj momenat je zakljucan.", "error");
      return;
    }
    if (!activity.start || !activity.end) {
      showToast("Aktivnost mora imati start i end datum.", "error");
      return;
    }

    if (mode === "percent") {
      alignCompletionToToday(activityIndex);
      return;
    }

    const totalDays = getTidplanTotalDays(activity);
    const today = formatDate(new Date());
    recordTidplanHistory(`move-${mode}`);
    if (mode === "start") {
      activity.start = today;
      activity.end = addDays(today, totalDays - 1);
    } else if (mode === "end") {
      activity.end = today;
      activity.start = addDays(today, -(totalDays - 1));
    }
    persistTidplanMutation(activityIndex, "start");
  }

  function enableManualMove(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    if (!activity) return;
    if (activity.locked) {
      showToast("Manualni pomak je dostupan samo za otkljucane momente.", "error");
      return;
    }
    uiState.manualMove = {
      activityIndex: Number(activityIndex),
      deltaDays: 0,
      dragging: false,
      historyRecorded: false,
      pointerId: null,
      startClientX: 0,
      originalStart: activity.start || "",
      originalEnd: activity.end || "",
      originalStartIndex: Array.isArray(uiState.timelineDays)
        ? uiState.timelineDays.indexOf(normalizeDate(activity.start))
        : -1,
      originalTotalDays: getTidplanTotalDays(activity),
      snappedStartIndex: -1,
    };
    closeTidplanContextMenu();
    showToast("Manualni pomak je spreman. Povuci gant lijevo ili desno.", "info");
  }

  function splitActivityAtDate(activityIndex, splitDate) {
    const activity = getActivityByIndex(activityIndex);
    if (!activity) return;
    if (activity.locked) {
      showToast("Zakljucani moment nije moguce podijeliti.", "error");
      return;
    }
    const normalizedSplit = normalizeDate(splitDate);
    if (!normalizedSplit || !activity.start || !activity.end) {
      showToast("Za podjelu su potrebni ispravni datumi.", "error");
      return;
    }
    if (normalizedSplit <= activity.start || normalizedSplit >= activity.end) {
      showToast("Podjela mora biti unutar trajanja aktivnosti.", "error");
      return;
    }

    recordTidplanHistory("split");
    const originalIndex = Number(activityIndex);
    const nextPartStart = addDays(normalizedSplit, 1);
    const newActivity = cloneTidplanSnapshot([activity])[0] || {};
    ensureTidplanActivityEnhancements(newActivity);
    newActivity.start = nextPartStart;
    newActivity.notes = [];
    newActivity.completionPercent = 0;
    newActivity._metaId = `tid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    activity.end = normalizedSplit;
    activity.completionPercent = Math.min(activity.completionPercent || 0, 100);
    tidplanData.splice(originalIndex + 1, 0, newActivity);
    markTidplanChanged(originalIndex, "end");
    markTidplanChanged(originalIndex + 1, "activity");
    updateTidplan();
  }

  function getLinkedWorkers(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    return Array.isArray(activity?.linkedWorkers) ? activity.linkedWorkers : [];
  }

  function createModalShell(id, title) {
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.className = "modal-overlay tidplan-overlay";
    overlay.style.display = "none";
    overlay.innerHTML = `
      <div class="modal-box tidplan-modal-box">
        <div class="modal-header">
          <h2>${escapeSafe(title)}</h2>
          <button type="button" class="close-btn" data-tidplan-close="${escapeSafe(id)}">&times;</button>
        </div>
        <div class="tidplan-modal-body" data-tidplan-modal-body="${escapeSafe(id)}"></div>
      </div>
    `;
    return overlay;
  }

  function ensureTidplanActionDom() {
    if (!document.getElementById("tidplanContextMenu")) {
      const menu = document.createElement("div");
      menu.id = "tidplanContextMenu";
      menu.className = "tidplan-context-menu";
      menu.style.display = "none";
      document.body.appendChild(menu);
    }
    if (!document.getElementById("tidplanNoteModal")) {
      document.body.appendChild(createModalShell("tidplanNoteModal", "Dodaj biljesku"));
    }
    if (!document.getElementById("tidplanNotesViewerModal")) {
      document.body.appendChild(createModalShell("tidplanNotesViewerModal", "Biljeske"));
    }
    if (!document.getElementById("tidplanMaterialModal")) {
      document.body.appendChild(createModalShell("tidplanMaterialModal", "Materijal za ovaj moment"));
    }
    if (!document.getElementById("tidplanInvoiceModal")) {
      document.body.appendChild(createModalShell("tidplanInvoiceModal", "Faktura"));
    }
    if (!document.getElementById("tidplanLinkModal")) {
      document.body.appendChild(createModalShell("tidplanLinkModal", "Uvezivanje radnika"));
    }
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "flex";
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
  }

  function getModalBody(id) {
    return document.querySelector(`[data-tidplan-modal-body="${id}"]`);
  }

  function openNoteComposer(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    if (!activity) return;
    const body = getModalBody("tidplanNoteModal");
    if (!body) return;
    body.innerHTML = `
      <div class="tidplan-form-grid">
        <label class="tidplan-field">
          <span>Biljeska</span>
          <textarea id="tidplanNoteInput" rows="6" placeholder="Upisi biljesku za ovaj moment..."></textarea>
        </label>
      </div>
      <div class="tidplan-modal-actions">
        <button type="button" class="btn btn-secondary" id="tidplanNoteCancelBtn">Odustani</button>
        <button type="button" class="btn" id="tidplanNoteSaveBtn">Spremi biljesku</button>
      </div>
    `;
    document.getElementById("tidplanNoteCancelBtn")?.addEventListener("click", () => closeModal("tidplanNoteModal"));
    document.getElementById("tidplanNoteSaveBtn")?.addEventListener("click", () => {
      const input = document.getElementById("tidplanNoteInput");
      const text = String(input?.value || "").trim();
      if (!text) {
        showToast("Upisi tekst biljeske.", "error");
        return;
      }
      const actor = getTidplanActor();
      recordTidplanHistory("note-add");
      activity.notes.push({
        id: `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        text,
        at: actor.at,
        by: actor.by,
        byName: actor.byName,
      });
      closeModal("tidplanNoteModal");
      persistTidplanMutation(activityIndex, "notes");
    });
    openModal("tidplanNoteModal");
    setTimeout(() => document.getElementById("tidplanNoteInput")?.focus(), 60);
  }

  function renderNotesViewerContent(activityIndex, noteIndex = null) {
    const activity = getActivityByIndex(activityIndex);
    const body = getModalBody("tidplanNotesViewerModal");
    if (!activity || !body) return;
    const notes = Array.isArray(activity.notes) ? activity.notes : [];
    if (!notes.length) {
      body.innerHTML = `<div class="tidplan-empty-state">Nema biljeski za ovaj moment.</div>`;
      return;
    }
    uiState.currentNotesActivityIndex = activityIndex;
    uiState.currentNotesIndex = Math.max(0, Math.min(noteIndex ?? notes.length - 1, notes.length - 1));
    const note = notes[uiState.currentNotesIndex];
    body.innerHTML = `
      <div class="tidplan-note-viewer">
        <div class="tidplan-note-viewer-meta">
          <strong>${escapeSafe(note.byName || note.by || "Nepoznato")}</strong>
          <span>${escapeSafe(new Date(note.at || Date.now()).toLocaleString(getCurrentLocale()))}</span>
        </div>
        <div class="tidplan-note-viewer-text">${escapeSafe(note.text || "").replace(/\n/g, "<br>")}</div>
        <div class="tidplan-note-viewer-footer">
          <button type="button" class="btn btn-secondary btn-small" id="tidplanPrevNoteBtn" ${uiState.currentNotesIndex <= 0 ? "disabled" : ""}>← Prethodna</button>
          <div class="tidplan-note-viewer-count">${uiState.currentNotesIndex + 1} / ${notes.length}</div>
          <button type="button" class="btn btn-secondary btn-small" id="tidplanNextNoteBtn" ${uiState.currentNotesIndex >= notes.length - 1 ? "disabled" : ""}>Sljedeca →</button>
        </div>
      </div>
    `;
    document.getElementById("tidplanPrevNoteBtn")?.addEventListener("click", () => {
      renderNotesViewerContent(activityIndex, uiState.currentNotesIndex - 1);
    });
    document.getElementById("tidplanNextNoteBtn")?.addEventListener("click", () => {
      renderNotesViewerContent(activityIndex, uiState.currentNotesIndex + 1);
    });
  }

  function openNotesViewer(activityIndex) {
    renderNotesViewerContent(activityIndex);
    openModal("tidplanNotesViewerModal");
  }

  function readPdfFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("error", () => reject(new Error("read-error")));
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.readAsDataURL(file);
    });
  }

  async function saveMaterialOrder(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    if (!activity) return;
    const description = String(document.getElementById("tidplanMaterialDescription")?.value || "").trim();
    const invoiceNumber = String(document.getElementById("tidplanMaterialInvoice")?.value || "").trim();
    const arrivalDate = String(document.getElementById("tidplanMaterialArrival")?.value || "").trim();
    const comment = String(document.getElementById("tidplanMaterialComment")?.value || "").trim();
    const fileInput = document.getElementById("tidplanMaterialPdf");
    const file = fileInput?.files?.[0] || null;

    if (!description && !invoiceNumber) {
      showToast("Upisi barem materijal ili broj fakture.", "error");
      return;
    }

    let pdfDataUrl = activity.materialOrder?.pdfDataUrl || "";
    let pdfName = activity.materialOrder?.pdfName || "";
    let pdfSize = Number(activity.materialOrder?.pdfSize || 0);

    if (file) {
      if (file.type !== "application/pdf") {
        showToast("Dozvoljen je samo PDF.", "error");
        return;
      }
      if (file.size > PDF_SIZE_LIMIT_BYTES) {
        showToast("PDF je prevelik za ovaj safe save model. Drzi se manjih faktura do 450 KB.", "error");
        return;
      }
      try {
        pdfDataUrl = await readPdfFile(file);
        pdfName = file.name;
        pdfSize = file.size;
      } catch (error) {
        showToast("PDF nije ucitan.", "error");
        return;
      }
    }

    recordTidplanHistory("material-order");
    const actor = getTidplanActor();
    activity.materialOrder = {
      status: "ordered",
      description,
      invoiceNumber,
      arrivalDate,
      comment,
      pdfDataUrl,
      pdfName,
      pdfSize,
      updatedAt: actor.at,
      updatedBy: actor.by,
      updatedByName: actor.byName,
      history: Array.isArray(activity.materialOrder?.history) ? activity.materialOrder.history : [],
    };
    activity.materialOrder.history.push({
      at: actor.at,
      by: actor.by,
      byName: actor.byName,
      description,
      invoiceNumber,
      arrivalDate,
      comment,
      pdfName,
      pdfSize,
    });
    closeModal("tidplanMaterialModal");
    persistTidplanMutation(activityIndex, "materialOrder");
  }

  function openMaterialOrderEditor(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    if (!activity) return;
    const order = activity.materialOrder || {};
    const body = getModalBody("tidplanMaterialModal");
    if (!body) return;
      body.innerHTML = `
        <div class="tidplan-form-grid">
          <label class="tidplan-field tidplan-field-span-2">
            <span>Stavke materijala</span>
            <textarea id="tidplanMaterialDescription" rows="6" placeholder="Primjer:
Gips 2700x900 10 pal
Traregel 70x45x2500 20 st
...">${escapeSafe(order.description || "")}</textarea>
          </label>
          <label class="tidplan-field">
            <span>Broj fakture</span>
            <input id="tidplanMaterialInvoice" type="text" value="${escapeSafe(order.invoiceNumber || "")}" placeholder="npr. INV-2026-0516" />
          </label>
          <label class="tidplan-field">
            <span>Datum dolaska</span>
            <input id="tidplanMaterialArrival" type="date" value="${escapeSafe(order.arrivalDate || "")}" />
          </label>
          <label class="tidplan-field tidplan-field-span-2">
            <span>Komentar</span>
            <textarea id="tidplanMaterialComment" rows="3" placeholder="Dodatna napomena uz narudzbu...">${escapeSafe(order.comment || "")}</textarea>
          </label>
          <label class="tidplan-field">
            <span>PDF faktura (max 450 KB)</span>
            <input id="tidplanMaterialPdf" type="file" accept="application/pdf" />
            <small>${order.pdfName ? `Trenutno: ${escapeSafe(order.pdfName)}` : "Nije dodan PDF."}</small>
          </label>
      </div>
      <div class="tidplan-modal-actions">
        <button type="button" class="btn btn-secondary" id="tidplanMaterialCancelBtn">Odustani</button>
        <button type="button" class="btn" id="tidplanMaterialSaveBtn">Spremi materijal</button>
      </div>
    `;
    document.getElementById("tidplanMaterialCancelBtn")?.addEventListener("click", () => closeModal("tidplanMaterialModal"));
    document.getElementById("tidplanMaterialSaveBtn")?.addEventListener("click", () => {
      saveMaterialOrder(activityIndex);
    });
    openModal("tidplanMaterialModal");
  }

  function openInvoiceViewer(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    const body = getModalBody("tidplanInvoiceModal");
    if (!activity || !body) return;
    const order = activity.materialOrder || {};
      const meta = `
        <div class="tidplan-invoice-meta">
          <div><strong>Faktura:</strong> ${escapeSafe(order.invoiceNumber || "-")}</div>
          <div><strong>Dolazi:</strong> ${escapeSafe(order.arrivalDate || "-")}</div>
          <div><strong>Materijal:</strong> ${escapeSafe(order.description || "-")}</div>
          <div><strong>Komentar:</strong> ${escapeSafe(order.comment || "-")}</div>
        </div>
      `;
    if (order.pdfDataUrl) {
      body.innerHTML = `${meta}<iframe class="tidplan-pdf-frame" src="${escapeSafe(order.pdfDataUrl)}"></iframe>`;
    } else {
      body.innerHTML = `${meta}<div class="tidplan-empty-state">Nema ucitanog PDF-a. Ovdje su spremljeni detalji narudzbe.</div>`;
    }
    openModal("tidplanInvoiceModal");
  }

  function openLinkWorkersModal(activityIndex) {
    const activity = getActivityByIndex(activityIndex);
    const body = getModalBody("tidplanLinkModal");
    if (!activity || !body) return;
    const workers = getActiveResourceList("workers", appState.currentDate) || [];
    const selected = new Set(getLinkedWorkers(activityIndex));
    const rows = workers
      .map(
        (worker) => `
          <label class="tidplan-link-row">
            <input type="checkbox" value="${escapeSafe(worker)}" ${selected.has(worker) ? "checked" : ""} />
            <span>${escapeSafe(worker)}</span>
          </label>
        `,
      )
      .join("");
    body.innerHTML = `
      <div class="tidplan-empty-state ${workers.length ? "is-hidden" : ""}" id="tidplanLinkWorkersEmpty">Nema dostupnih resursa za uvezivanje.</div>
      <div class="tidplan-link-list">${rows}</div>
      <div class="tidplan-modal-actions">
        <button type="button" class="btn btn-secondary" id="tidplanLinkCancelBtn">Odustani</button>
        <button type="button" class="btn" id="tidplanLinkSaveBtn">Spremi uvezivanje</button>
      </div>
    `;
    document.getElementById("tidplanLinkCancelBtn")?.addEventListener("click", () => closeModal("tidplanLinkModal"));
    document.getElementById("tidplanLinkSaveBtn")?.addEventListener("click", () => {
      const checked = Array.from(body.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
      recordTidplanHistory("link-workers");
      activity.linkedWorkers = checked;
      closeModal("tidplanLinkModal");
      persistTidplanMutation(activityIndex, "linkedWorkers");
    });
    openModal("tidplanLinkModal");
  }

  function getActivityMetaSummary(activity) {
    const parts = [];
    const noteCount = Array.isArray(activity?.notes) ? activity.notes.length : 0;
    const linkCount = Array.isArray(activity?.linkedWorkers) ? activity.linkedWorkers.length : 0;
    if (noteCount) parts.push(`${noteCount} bilj.`);
    if (activity?.materialOrder?.invoiceNumber || activity?.materialOrder?.description) parts.push("faktura");
    if (linkCount) parts.push(`${linkCount} rad.`);
    return parts.join(" · ");
  }

  function createMetaIconButton(kind, title, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tidplan-meta-icon tidplan-meta-icon-${kind}`;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick(event);
    });
    return button;
  }

  function decorateCommentCell(activityIndex, activity) {
    const row = document.querySelector(`#tidplanTbody tr[data-activity-index="${activityIndex}"]`);
    if (!row) return;
    const commentCell = row.children[7];
    if (!commentCell) return;
    const input = commentCell.querySelector("input");
    if (!input) return;

    let wrap = commentCell.querySelector(".tidplan-comment-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "tidplan-comment-wrap";
      commentCell.innerHTML = "";
      wrap.appendChild(input);
      commentCell.appendChild(wrap);
    }

    let meta = wrap.querySelector(".tidplan-row-meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "tidplan-row-meta";
      wrap.appendChild(meta);
    }
    meta.innerHTML = "";

    const noteCount = Array.isArray(activity.notes) ? activity.notes.length : 0;
    if (noteCount) {
      const noteBtn = createMetaIconButton("note", `Biljeske (${noteCount})`, () => openNotesViewer(activityIndex));
      const badge = document.createElement("span");
      badge.className = "tidplan-icon-count";
      badge.textContent = String(noteCount);
      noteBtn.appendChild(badge);
      meta.appendChild(noteBtn);
    }

    if (activity.materialOrder?.invoiceNumber || activity.materialOrder?.description) {
      const invoiceBtn = createMetaIconButton("invoice", "Materijal / faktura", () => openInvoiceViewer(activityIndex));
      meta.appendChild(invoiceBtn);
    }

    if (activity.locked) {
      meta.appendChild(createMetaIconButton("lock", "Zakljucan momenat", () => {}));
    }

    const linkCount = Array.isArray(activity.linkedWorkers) ? activity.linkedWorkers.length : 0;
    if (linkCount) {
      const linkBtn = createMetaIconButton("link", `Uvezani radnici (${linkCount})`, () => openLinkWorkersModal(activityIndex));
      const badge = document.createElement("span");
      badge.className = "tidplan-icon-count";
      badge.textContent = String(linkCount);
      linkBtn.appendChild(badge);
      meta.appendChild(linkBtn);
    }
    meta.style.display = meta.childElementCount ? "flex" : "none";
  }

  function decorateTimelineRow(activityIndex, activity) {
    const row = document.querySelector(`#timelineBody .timeline-row[data-activity-index="${activityIndex}"]`);
    if (!row) return;
    const bar = row.querySelector(".gantt-bar");
    const noteCount = Array.isArray(activity.notes) ? activity.notes.length : 0;
    const hasMaterial = Boolean(activity.materialOrder?.invoiceNumber || activity.materialOrder?.description);
    const linkCount = Array.isArray(activity.linkedWorkers) ? activity.linkedWorkers.length : 0;

    let meta = row.querySelector(".timeline-meta-icons");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "timeline-meta-icons";
      row.appendChild(meta);
    }
    meta.innerHTML = "";

    if (bar) {
      bar.dataset.activityIndex = String(activityIndex);
      bar.dataset.activityLocked = activity.locked ? "true" : "false";
      bar.title = `${bar.title || ""}${getActivityMetaSummary(activity) ? `\nMeta: ${getActivityMetaSummary(activity)}` : ""}`;

      let progress = bar.querySelector(".gantt-progress");
      if (!progress) {
        progress = document.createElement("div");
        progress.className = "gantt-progress";
        bar.appendChild(progress);
      }
      const completedDays = typeof getTidplanCompletedDays === "function"
        ? getTidplanCompletedDays(activity)
        : 0;
      const totalDays = typeof getTidplanTotalDays === "function"
        ? getTidplanTotalDays(activity)
        : 0;
      const progressWidthPx = Math.max(
        0,
        Math.min(
          Math.max(0, (bar.offsetWidth || 0) - (Number(activity.completionPercent) >= 100 ? 0 : DAY_WIDTH)),
          completedDays * DAY_WIDTH,
        ),
      );
      progress.style.width =
        totalDays && Number(activity.completionPercent) >= 100
          ? `${bar.offsetWidth || totalDays * DAY_WIDTH}px`
          : `${progressWidthPx}px`;

      let label = bar.querySelector(".gantt-label");
      if (!label) {
        label = document.createElement("span");
        label.className = "gantt-label";
        label.textContent = bar.firstChild?.nodeType === Node.TEXT_NODE ? bar.textContent : `${activity.plan || ""} - ${activity.moment || ""}`;
        bar.textContent = "";
        bar.appendChild(progress);
        bar.appendChild(label);
      } else {
        label.textContent = `${activity.plan || ""} - ${activity.moment || ""}`;
      }

      let pct = bar.querySelector(".gantt-percent");
      if (!pct) {
        pct = document.createElement("span");
        pct.className = "gantt-percent";
        bar.appendChild(pct);
      }
      pct.textContent = activity.completionPercent ? `${activity.completionPercent}%` : "";

      bar.classList.toggle("is-locked", Boolean(activity.locked));
      bar.classList.toggle("is-manual-ready", uiState.manualMove?.activityIndex === activityIndex);
    }

    const commentEl = row.querySelector(".timeline-comment");
    const anchorLeft = commentEl
      ? commentEl.offsetLeft + commentEl.offsetWidth + 8
      : ((bar?.offsetLeft || 0) + (bar?.offsetWidth || 0) + 8);
    meta.style.left = `${Math.max(12, anchorLeft)}px`;

    if (noteCount) {
      const noteBtn = createMetaIconButton("note", `Biljeske (${noteCount})`, () => openNotesViewer(activityIndex));
      const badge = document.createElement("span");
      badge.className = "tidplan-icon-count";
      badge.textContent = String(noteCount);
      noteBtn.appendChild(badge);
      meta.appendChild(noteBtn);
    }

    if (hasMaterial) {
      meta.appendChild(createMetaIconButton("invoice", "Materijal / faktura", () => openInvoiceViewer(activityIndex)));
    }

    if (activity.locked) {
      meta.appendChild(createMetaIconButton("lock", "Zakljucan momenat", () => {}));
    }

    if (linkCount) {
      const linkBtn = createMetaIconButton("link", `Uvezani radnici (${linkCount})`, () => openLinkWorkersModal(activityIndex));
      const badge = document.createElement("span");
      badge.className = "tidplan-icon-count";
      badge.textContent = String(linkCount);
      linkBtn.appendChild(badge);
      meta.appendChild(linkBtn);
    }
    meta.style.display = meta.childElementCount ? "flex" : "none";
  }

  function decorateActionCell(activityIndex, activity) {
    const row = document.querySelector(`#tidplanTbody tr[data-activity-index="${activityIndex}"]`);
    if (!row) return;
    const actionCell = row.children[8];
    if (!actionCell || actionCell.querySelector(".tidplan-more-btn")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-small tidplan-mini-btn tidplan-more-btn";
    button.textContent = "⋯";
    button.title = "Tidplan akcije";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openTidplanContextMenu(activityIndex, event.clientX || window.innerWidth - 36, event.clientY || window.innerHeight - 36, activity.start || "");
    });
    actionCell.appendChild(document.createTextNode(" "));
    actionCell.appendChild(button);

    if (activity.locked) {
      row.classList.add("tidplan-row-locked");
      row.querySelectorAll("select,input").forEach((input) => {
        input.disabled = true;
      });
      const buttons = actionCell.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (!btn.classList.contains("tidplan-more-btn")) btn.disabled = true;
      });
    } else {
      row.classList.remove("tidplan-row-locked");
    }
  }

  function renderTidplanActionDecorations() {
    ensureAllTidplanActivities();
    (tidplanData || []).forEach((activity, index) => {
      if (!activity) return;
      decorateCommentCell(index, activity);
      decorateTimelineRow(index, activity);
      decorateActionCell(index, activity);
    });
  }

  function getClickedDateFromPoint(clientX, rowEl) {
    const days = Array.isArray(uiState.timelineDays) ? uiState.timelineDays : [];
    if (!days.length || !rowEl) return "";
    const rect = rowEl.getBoundingClientRect();
    const index = Math.max(0, Math.min(days.length - 1, Math.floor((clientX - rect.left) / DAY_WIDTH)));
    return days[index] || "";
  }

  function buildMenuButton(label, className = "", onClick, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tidplan-menu-item ${className}`.trim();
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (disabled) return;
      onClick?.();
    });
    return button;
  }

  function appendMenuGroup(menu, title, buttons) {
    const group = document.createElement("div");
    group.className = "tidplan-menu-group";
    const heading = document.createElement("div");
    heading.className = "tidplan-menu-heading";
    heading.textContent = title;
    group.appendChild(heading);
    buttons.forEach((button) => group.appendChild(button));
    menu.appendChild(group);
  }

  function buildMenuDisclosure(label, children, disabled = false) {
    const wrap = document.createElement("div");
    wrap.className = `tidplan-menu-disclosure${disabled ? " is-disabled" : ""}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tidplan-menu-item tidplan-menu-parent";
    button.disabled = Boolean(disabled);
    button.innerHTML = `<span>${escapeSafe(label)}</span><span class="tidplan-menu-chevron">›</span>`;
    const panel = document.createElement("div");
    panel.className = "tidplan-submenu";
    children.forEach((child) => panel.appendChild(child));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (disabled) return;
      wrap.classList.toggle("is-open");
      positionTidplanContextMenu();
    });
    wrap.appendChild(button);
    wrap.appendChild(panel);
    return wrap;
  }

  function positionTidplanContextMenu() {
    const menu = document.getElementById("tidplanContextMenu");
    if (!menu || menu.style.display === "none") return;
    const isDesktop = !menu.classList.contains("is-bottom-sheet");
    if (!isDesktop) return;
    const rect = menu.getBoundingClientRect();
    let left = Number.parseFloat(menu.style.left || "12") || 12;
    let top = Number.parseFloat(menu.style.top || "12") || 12;
    if (rect.right > window.innerWidth - 12) {
      left = Math.max(12, left - (rect.right - (window.innerWidth - 12)));
    }
    if (rect.bottom > window.innerHeight - 12) {
      top = Math.max(12, top - (rect.bottom - (window.innerHeight - 12)));
    }
    if (rect.left < 12) left = 12;
    if (rect.top < 12) top = 12;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function openTidplanContextMenu(activityIndex, clientX, clientY, clickedDate = "") {
    const activity = getActivityByIndex(activityIndex);
    const menu = document.getElementById("tidplanContextMenu");
    if (!activity || !menu) return;
    ensureTidplanActionDom();
    uiState.context = {
      activityIndex: Number(activityIndex),
      clickedDate: normalizeDate(clickedDate) || activity.start || "",
      clientX,
      clientY,
    };

    const isDesktop = window.matchMedia("(min-width: 821px)").matches;
    const momentLabel = activity.moment ? `Moment: ${activity.moment}` : "Moment";
    const canManualMove = !activity.locked;

    menu.innerHTML = "";
    const historyRow = document.createElement("div");
    historyRow.className = "tidplan-history-row";
    historyRow.appendChild(
      buildMenuButton(
        "Ponisti",
        "is-half",
        () => {
          closeTidplanContextMenu();
          undoTidplanChange();
        },
        !uiState.undoStack.length,
      ),
    );
    historyRow.appendChild(
      buildMenuButton(
        "Ponovi",
        "is-half",
        () => {
          closeTidplanContextMenu();
          redoTidplanChange();
        },
        !uiState.redoStack.length,
      ),
    );
    menu.appendChild(historyRow);

    appendMenuGroup(menu, "Akcije", [
      buildMenuDisclosure("Zakljucaj", [
        buildMenuButton("Ovaj momenat", "", () => {
          closeTidplanContextMenu();
          setLockState(activityIndex, "current", true);
        }),
        buildMenuButton("Svi sa istim nazivom momenta", "", () => {
          closeTidplanContextMenu();
          setLockState(activityIndex, "moment", true);
        }),
        buildMenuButton("Svi momenti", "", () => {
          closeTidplanContextMenu();
          setLockState(activityIndex, "all", true);
        }),
      ]),
      buildMenuDisclosure("Otkljucaj", [
        buildMenuButton("Ovaj momenat", "", () => {
          closeTidplanContextMenu();
          setLockState(activityIndex, "current", false);
        }),
        buildMenuButton("Svi sa istim nazivom momenta", "", () => {
          closeTidplanContextMenu();
          setLockState(activityIndex, "moment", false);
        }),
        buildMenuButton("Svi momenti", "", () => {
          closeTidplanContextMenu();
          setLockState(activityIndex, "all", false);
        }),
      ]),
      buildMenuDisclosure(
        `Zavrseno${activity.completionPercent ? ` (${activity.completionPercent}%)` : ""}`,
        [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100].map((percent) =>
          buildMenuButton(`${percent}%`, "", () => {
            closeTidplanContextMenu();
            setCompletionPercent(activityIndex, percent);
          }),
        ),
      ),
      buildMenuDisclosure("Pomakni", [
        buildMenuButton("Danas start", "", () => {
          closeTidplanContextMenu();
          moveActivityToToday(activityIndex, "start");
        }, !canManualMove),
        buildMenuButton("Danas kraj", "", () => {
          closeTidplanContextMenu();
          moveActivityToToday(activityIndex, "end");
        }, !canManualMove),
        buildMenuButton("Danas %", "", () => {
          closeTidplanContextMenu();
          moveActivityToToday(activityIndex, "percent");
        }, !canManualMove),
        buildMenuButton("Manualno", "", () => {
          enableManualMove(activityIndex);
        }, !canManualMove),
      ], !canManualMove),
      buildMenuButton("Dodaj biljesku", "", () => {
        closeTidplanContextMenu();
        openNoteComposer(activityIndex);
      }),
      buildMenuDisclosure("Materijal za ovaj moment", [
        buildMenuButton("Narucen", "", () => {
          closeTidplanContextMenu();
          openMaterialOrderEditor(activityIndex);
        }),
      ]),
      buildMenuButton("Podijeli", "", () => {
        closeTidplanContextMenu();
        splitActivityAtDate(activityIndex, uiState.context.clickedDate);
      }, !uiState.context.clickedDate),
      buildMenuButton("Uvezivanje", "", () => {
        closeTidplanContextMenu();
        openLinkWorkersModal(activityIndex);
      }),
    ]);

    menu.style.display = "block";
    menu.classList.toggle("is-bottom-sheet", !isDesktop);
    if (isDesktop) {
      menu.style.left = `${Math.max(12, clientX)}px`;
      menu.style.top = `${Math.max(12, clientY)}px`;
      requestAnimationFrame(positionTidplanContextMenu);
    } else {
      menu.style.left = "12px";
      menu.style.right = "12px";
      menu.style.top = "auto";
      menu.style.bottom = "12px";
    }
  }

  function closeTidplanContextMenu() {
    const menu = document.getElementById("tidplanContextMenu");
    if (!menu) return;
    menu.style.display = "none";
    menu.style.left = "";
    menu.style.right = "";
    menu.style.top = "";
    menu.style.bottom = "";
  }

  function bindTableFieldHistory() {
    const tbody = document.getElementById("tidplanTbody");
    if (!tbody || tbody.dataset.historyBound === "true") return;
    tbody.dataset.historyBound = "true";

    tbody.addEventListener(
      "focusin",
      (event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
        const row = field.closest("tr[data-activity-index]");
        if (!row) return;
        const activityIndex = Number(row.dataset.activityIndex);
        const cellIndex = field.closest("td")?.cellIndex ?? -1;
        uiState.fieldBaselines[`${activityIndex}:${cellIndex}:${field.type || field.tagName}:${field.className}`] =
          cloneTidplanSnapshot();
      },
      true,
    );

    tbody.addEventListener(
      "change",
      (event) => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
        const row = field.closest("tr[data-activity-index]");
        if (!row) return;
        const activityIndex = Number(row.dataset.activityIndex);
        const cellIndex = field.closest("td")?.cellIndex ?? -1;
        const key = `${activityIndex}:${cellIndex}:${field.type || field.tagName}:${field.className}`;
        const baseline = uiState.fieldBaselines[key];
        if (baseline && !arraysEqualByJson(baseline, tidplanData)) {
          const last = uiState.undoStack[uiState.undoStack.length - 1];
          if (!last || !arraysEqualByJson(last.data, baseline)) {
            uiState.undoStack.push({ reason: "field-edit", data: baseline, at: Date.now() });
            if (uiState.undoStack.length > MAX_HISTORY_STEPS) uiState.undoStack.shift();
            uiState.redoStack = [];
          }
        }
        delete uiState.fieldBaselines[key];
      },
      true,
    );
  }

  function bindTimelineInteractions() {
    const rows = document.querySelectorAll("#timelineBody .timeline-row[data-activity-index]");
    rows.forEach((row) => {
      if (row.dataset.tidplanInteractiveBound === "true") return;
      row.dataset.tidplanInteractiveBound = "true";

      row.addEventListener("contextmenu", (event) => {
        const activityIndex = Number(row.dataset.activityIndex);
        if (!Number.isInteger(activityIndex) || activityIndex < 0) return;
        event.preventDefault();
        openTidplanContextMenu(activityIndex, event.clientX, event.clientY, getClickedDateFromPoint(event.clientX, row));
      });

      row.addEventListener("pointerdown", (event) => {
        const activityIndex = Number(row.dataset.activityIndex);
        if (!Number.isInteger(activityIndex) || activityIndex < 0) return;
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        if (target.closest(".tidplan-meta-icon")) return;

        const manual = uiState.manualMove;
        if (manual && manual.activityIndex === activityIndex && target.closest(".gantt-bar")) {
          const activity = getActivityByIndex(activityIndex);
          if (!activity || activity.locked) return;
          uiState.manualMove.dragging = true;
          uiState.manualMove.pointerId = event.pointerId;
          uiState.manualMove.startClientX = event.clientX;
          target.setPointerCapture?.(event.pointerId);
          return;
        }

        if (event.pointerType === "touch" || window.matchMedia("(max-width: 820px)").matches) {
          uiState.longPressPoint = { x: event.clientX, y: event.clientY, activityIndex, row };
          clearTimeout(uiState.longPressTimer);
          uiState.longPressTimer = setTimeout(() => {
            openTidplanContextMenu(activityIndex, event.clientX, event.clientY, getClickedDateFromPoint(event.clientX, row));
          }, LONG_PRESS_MS);
        }
      });

      row.addEventListener("pointermove", (event) => {
        if (uiState.longPressPoint) {
          const dx = Math.abs(event.clientX - uiState.longPressPoint.x);
          const dy = Math.abs(event.clientY - uiState.longPressPoint.y);
          if (dx > 8 || dy > 8) {
            clearTimeout(uiState.longPressTimer);
            uiState.longPressPoint = null;
          }
        }

        const manual = uiState.manualMove;
        if (!manual?.dragging || manual.activityIndex !== Number(row.dataset.activityIndex)) return;
        const bar = row.querySelector(".gantt-bar");
        if (!bar) return;
        const rawDeltaPx = event.clientX - manual.startClientX;
        const originalLeft = Math.max(0, manual.originalStartIndex) * DAY_WIDTH;
        const snappedStartIndex = Math.max(
          0,
          Math.min(
            (uiState.timelineDays?.length || 1) - Math.max(1, manual.originalTotalDays),
            Math.round((originalLeft + rawDeltaPx) / DAY_WIDTH),
          ),
        );
        const deltaDays = snappedStartIndex - Math.max(0, manual.originalStartIndex);
        if (deltaDays !== 0 && !manual.historyRecorded) {
          recordTidplanHistory("manual-move");
          manual.historyRecorded = true;
        }
        manual.deltaDays = deltaDays;
        manual.snappedStartIndex = snappedStartIndex;
        bar.style.transform = `translateX(${(snappedStartIndex * DAY_WIDTH) - originalLeft}px)`;
      });

      row.addEventListener("pointerup", (event) => {
        clearTimeout(uiState.longPressTimer);
        uiState.longPressPoint = null;
        const manual = uiState.manualMove;
        if (!manual?.dragging || manual.activityIndex !== Number(row.dataset.activityIndex)) return;
        const bar = row.querySelector(".gantt-bar");
        if (bar) bar.style.transform = "";
        manual.dragging = false;
        if (manual.deltaDays) {
          const activity = getActivityByIndex(manual.activityIndex);
          if (activity) {
            const nextStart =
              uiState.timelineDays?.[manual.snappedStartIndex] ||
              addDays(manual.originalStart, manual.deltaDays);
            activity.start = nextStart;
            activity.end = addDays(nextStart, Math.max(0, manual.originalTotalDays - 1));
            markTidplanChanged(manual.activityIndex, "start");
          }
          uiState.manualMove = null;
          updateTidplan();
        } else {
          uiState.manualMove = null;
        }
      });

      row.addEventListener("pointercancel", () => {
        clearTimeout(uiState.longPressTimer);
        uiState.longPressPoint = null;
        const manual = uiState.manualMove;
        if (!manual) return;
        const bar = row.querySelector(".gantt-bar");
        if (bar) bar.style.transform = "";
        uiState.manualMove = null;
      });
    });
  }

  function initTidplanHorizontalScrollbar() {
    return;
  }

  function closeTidplanOverlaysFromTarget(target) {
    if (!(target instanceof Element)) return;
    const closeButton = target.closest("[data-tidplan-close]");
    if (closeButton) {
      closeModal(closeButton.getAttribute("data-tidplan-close"));
    }
  }

  function bindTidplanGlobalListeners() {
    if (uiState.globalListenersBound) return;
    uiState.globalListenersBound = true;

    document.addEventListener("click", (event) => {
      closeTidplanOverlaysFromTarget(event.target);
      if (!event.target.closest("#tidplanContextMenu") && !event.target.closest(".tidplan-more-btn")) {
        closeTidplanContextMenu();
      }
      document.querySelectorAll(".tidplan-overlay").forEach((overlay) => {
        if (event.target === overlay) overlay.style.display = "none";
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeTidplanContextMenu();
        ["tidplanNoteModal", "tidplanNotesViewerModal", "tidplanMaterialModal", "tidplanInvoiceModal", "tidplanLinkModal"].forEach(closeModal);
      }
    });
  }

  function initTidplanActionLayer() {
    ensureTidplanActionDom();
    ensureAllTidplanActivities();
    bindTidplanGlobalListeners();
    bindTableFieldHistory();
    bindTimelineInteractions();
    initTidplanHorizontalScrollbar();
    renderTidplanActionDecorations();
  }

  global.ensureTidplanActivityEnhancements = ensureTidplanActivityEnhancements;
  global.ensureAllTidplanActivities = ensureAllTidplanActivities;
  global.getTidplanTotalDays = getTidplanTotalDays;
  global.getTidplanCompletedDays = getTidplanCompletedDays;
  global.getTidplanRemainingRange = getTidplanRemainingRange;
  global.isTidplanActivityActiveOnDate = isTidplanActivityActiveOnDate;
  global.initTidplanActionLayer = initTidplanActionLayer;
  global.recordTidplanHistory = recordTidplanHistory;
  global.undoTidplanChange = undoTidplanChange;
  global.redoTidplanChange = redoTidplanChange;
  global.openTidplanContextMenu = openTidplanContextMenu;
  global.closeTidplanContextMenu = closeTidplanContextMenu;
})(window);
