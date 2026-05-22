function createServerSyncError(message, status, payload = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = payload?.error || message;
  error.latest = payload?.latest || null;
  return error;
}

function parseServerSyncResponse(response, fallbackMessage) {
  if (response.ok) {
    return response.json().catch(() => ({}));
  }
  return response.json()
    .catch(() => ({}))
    .then((payload) => {
      throw createServerSyncError(payload?.error || fallbackMessage, response.status, payload);
    });
}

function postServerStateSnapshot(serverState, lastKnownVersion, options = {}) {
  const {
    keepalive = false,
    includeAdmins = false,
    includeGuestPermissions = false,
    includeBinPermissions = false,
    includeSites = false,
    includeAdminRemovalNotices = false,
    adminEditTargetEmail = "",
    skipLog = false,
    module = null,
    section = null,
  } = options;

  return fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state: buildServerStateSnapshot(serverState, {
        includeAdmins,
        includeGuestPermissions,
        includeBinPermissions,
        includeSites,
        includeAdminRemovalNotices,
        adminEditTargetEmail,
      }),
      lastKnownVersion: lastKnownVersion || 1,
      userEmail: appState.currentUser || null,
      skipLog,
      module,
      section,
    }),
    keepalive,
  }).then((res) => parseServerSyncResponse(res, "STATE_SAVE_FAILED"));
}

function showServerConflictNotice(message = "Podaci su promijenjeni na drugom uredjaju. Povuci najnovije podatke prije nastavka.") {
  showToast(message, "error");
}

function formatEntityConflictValue(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }
  return String(value);
}

function closeEntityConflictPanel() {
  document.getElementById("entityConflictOverlay")?.remove();
}

function getEntityConflictTitle(context = {}) {
  const moduleLabel = context.moduleLabel || (context.module === "tidplan" ? "Tidplan" : "Planner");
  const rowLabel = context.rowLabel || context.activityLabel || context.entityId || "-";
  return `${moduleLabel} conflict - ${rowLabel}`;
}

function showEntityConflictPanel(context = {}) {
  closeEntityConflictPanel();
  const conflict = Array.isArray(context.conflicts) ? context.conflicts[0] : null;
  const serverEntity = context.serverEntity || {};
  const field = conflict?.field || Object.keys(context.changedFields || {})[0] || "-";
  const mine = conflict ? conflict.clientValue : context.changedFields?.[field];
  const serverValue = conflict ? conflict.serverValue : serverEntity[field];
  const updatedBy = serverEntity.updatedBy || "-";
  const updatedAt = serverEntity.updatedAt ? new Date(serverEntity.updatedAt).toLocaleString() : "-";

  const overlay = document.createElement("div");
  overlay.id = "entityConflictOverlay";
  overlay.className = "modal-overlay entity-conflict-overlay";
  overlay.innerHTML = `
    <div class="modal-box entity-conflict-box" role="dialog" aria-modal="true" aria-labelledby="entityConflictTitle">
      <div class="modal-header entity-conflict-header">
        <div>
          <div class="entity-conflict-eyebrow">ENTITY VERSION CONFLICT</div>
          <h2 id="entityConflictTitle">${escapeHtml(getEntityConflictTitle(context))}</h2>
        </div>
        <button type="button" class="close-btn" id="entityConflictClose" aria-label="Close">&times;</button>
      </div>
      <div class="entity-conflict-body">
        <div class="entity-conflict-summary">
          <div><strong>Modul:</strong> ${escapeHtml(context.moduleLabel || context.module || "-")}</div>
          <div><strong>Red / activity:</strong> ${escapeHtml(context.rowLabel || context.activityLabel || context.entityId || "-")}</div>
          <div><strong>Polje:</strong> ${escapeHtml(field)}</div>
          <div><strong>Zadnja promjena:</strong> ${escapeHtml(updatedBy)} - ${escapeHtml(updatedAt)}</div>
        </div>
        <div class="entity-conflict-values">
          <section>
            <h3>Moja vrijednost</h3>
            <pre>${escapeHtml(formatEntityConflictValue(mine))}</pre>
          </section>
          <section>
            <h3>Server vrijednost</h3>
            <pre>${escapeHtml(formatEntityConflictValue(serverValue))}</pre>
          </section>
        </div>
      </div>
      <div class="entity-conflict-actions">
        <button type="button" class="btn btn-secondary" id="entityConflictUseServer">Use server</button>
        <button type="button" class="btn" id="entityConflictKeepMine">Keep mine</button>
        <button type="button" class="btn btn-secondary" id="entityConflictRefresh">Refresh row/activity</button>
        <button type="button" class="btn btn-ghost" id="entityConflictCancel">Cancel</button>
      </div>
    </div>
  `;
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeEntityConflictPanel();
  });
  document.body.appendChild(overlay);

  const close = () => closeEntityConflictPanel();
  document.getElementById("entityConflictClose")?.addEventListener("click", close);
  document.getElementById("entityConflictCancel")?.addEventListener("click", close);
  document.getElementById("entityConflictUseServer")?.addEventListener("click", () => {
    context.onUseServer?.({ field, serverEntity, serverValue });
    close();
  });
  document.getElementById("entityConflictKeepMine")?.addEventListener("click", () => {
    context.onKeepMine?.({ field, serverEntity, mine });
    close();
  });
  document.getElementById("entityConflictRefresh")?.addEventListener("click", () => {
    context.onRefresh?.({ serverEntity });
    close();
  });

  const onKey = (event) => {
    if (event.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);
}

function removeSyncBanner() {
  document.getElementById("syncUpdateBanner")?.remove();
}

function showInlineConflictWarning(message = "Isti podaci su promijenjeni na drugom uredjaju. Spremi ili osvjezi prije nastavka.") {
  const active = document.activeElement;
  const localTarget = active?.closest?.("td, tr, .admin-item, .notification-card, .survey-card, .warehouse-card, .form-group");
  if (localTarget) {
    let warning = localTarget.querySelector?.(".inline-sync-conflict");
    if (!warning) {
      warning = document.createElement("div");
      warning.className = "inline-sync-conflict";
      warning.style.cssText = "margin:6px 0;padding:8px 10px;border:1px solid #f59e0b;background:#fff7ed;color:#7c2d12;border-radius:6px;font-size:12px;";
      localTarget.appendChild(warning);
    }
    warning.textContent = message;
    return;
  }
  const view = getPresenceView();
  const targetMap = {
    planner: "planner-section",
    main: "planner-section",
    tidplan: "tidplan-section",
    bins: "binsSection",
    warehouse: "warehouse-section",
    notifications: "notifications-section",
    surveys: "surveys-section",
  };
  const target = document.getElementById(targetMap[view] || "planner-section") || document.getElementById("mainContainer");
  if (!target) {
    showToast(message, "error");
    return;
  }
  let warning = target.querySelector(".inline-sync-conflict");
  if (!warning) {
    warning = document.createElement("div");
    warning.className = "inline-sync-conflict";
    warning.style.cssText = "margin:8px 0;padding:10px 12px;border:1px solid #f59e0b;background:#fff7ed;color:#7c2d12;border-radius:6px;font-size:14px;";
    target.insertBefore(warning, target.firstChild);
  }
  warning.textContent = message;
}

function showSyncUpdateBanner({ snapshot, version, remoteKey }) {
  removeSyncBanner();
  const editor = getRemoteEditorName(snapshot);
  const banner = document.createElement("div");
  banner.id = "syncUpdateBanner";
  banner.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:5000;display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:8px;background:#111827;color:white;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:14px;";
  banner.innerHTML = `
    <span>${escapeHtml(t("syncUpdateAvailable"))}${editor ? ` ${escapeHtml(t("syncUpdateBy"))} ${escapeHtml(editor)}` : ""}</span>
    <button type="button" class="btn btn-small" style="padding:6px 10px;">${escapeHtml(t("syncRefresh"))}</button>
    <button type="button" aria-label="Zatvori" style="border:0;background:transparent;color:white;font-size:18px;cursor:pointer;line-height:1;">x</button>
  `;
  const refreshBtn = banner.querySelector("button");
  const closeBtn = banner.querySelectorAll("button")[1];
  refreshBtn.addEventListener("click", () => {
    if (!canRefreshSharedData()) {
      showInlineConflictWarning(t("syncUnsavedWait"));
      return;
    }
    applySharedDataRefresh(snapshot, version).then((applied) => {
      if (applied) showToast(t("syncUpdated"), "success");
      removeSyncBanner();
    });
  });
  closeBtn.addEventListener("click", () => {
    rememberIgnoredRemoteState(remoteKey);
    removeSyncBanner();
  });
  document.body.appendChild(banner);
}

function showRemoteUpdatePrompt({ snapshot, version, remoteKey }) {
  const conflictInfo =
    typeof getRemoteConflictInfo === "function"
      ? getRemoteConflictInfo(snapshot)
      : { hasConflict: false, keys: [] };
  if (conflictInfo.hasConflict) {
    showSyncUpdateBanner({ snapshot, version, remoteKey });
    showInlineConflictWarning(t("syncConflictSameField"));
    return Promise.resolve(false);
  }
  if (canRefreshSharedData()) {
    return applySharedDataRefresh(snapshot, version).then((applied) => {
      if (applied) showToast(t("syncUpdated"), "success");
      return applied;
    });
  }
  if (typeof applyNonConflictingRemoteChanges === "function") {
    const merged = applyNonConflictingRemoteChanges(snapshot, version);
    if (merged) {
      showToast(t("syncUpdated"), "success");
      return Promise.resolve(true);
    }
  }
  showSyncUpdateBanner({ snapshot, version, remoteKey });
  showInlineConflictWarning(t("syncUnsavedProtected"));
  return Promise.resolve(false);
}
