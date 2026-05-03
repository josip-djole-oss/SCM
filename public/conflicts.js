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
    skipLog = false,
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
      }),
      lastKnownVersion: lastKnownVersion || 1,
      userEmail: appState.currentUser || null,
      skipLog,
    }),
    keepalive,
  }).then((res) => parseServerSyncResponse(res, "STATE_SAVE_FAILED"));
}

function showServerConflictNotice(message = "Podaci su promijenjeni na drugom uredjaju. Povuci najnovije podatke prije nastavka.") {
  showToast(message, "error");
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
  const banner = document.createElement("div");
  banner.id = "syncUpdateBanner";
  banner.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:5000;display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:8px;background:#111827;color:white;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:14px;";
  banner.innerHTML = `
    <span>Nove izmjene su dostupne</span>
    <button type="button" class="btn btn-small" style="padding:6px 10px;">Osvjezi</button>
    <button type="button" aria-label="Zatvori" style="border:0;background:transparent;color:white;font-size:18px;cursor:pointer;line-height:1;">x</button>
  `;
  const refreshBtn = banner.querySelector("button");
  const closeBtn = banner.querySelectorAll("button")[1];
  refreshBtn.addEventListener("click", () => {
    if (!canRefreshSharedData()) {
      showInlineConflictWarning("Nove izmjene cekaju, ali imas lokalne nespremljene izmjene. Spremi svoje izmjene prije osvjezavanja.");
      return;
    }
    applySharedDataRefresh(snapshot, version).then((applied) => {
      if (applied) showToast("Podaci ažurirani", "success");
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
  if (canRefreshSharedData()) {
    return applySharedDataRefresh(snapshot, version).then((applied) => {
      if (applied) showToast("Podaci ažurirani", "success");
      return applied;
    });
  }
  showSyncUpdateBanner({ snapshot, version, remoteKey });
  showInlineConflictWarning("Nove izmjene su dostupne. Lokalne nespremljene izmjene nece biti prepisane.");
  return Promise.resolve(false);
}
