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

function showRemoteUpdatePrompt({ snapshot, version, remoteKey }) {
  const overlay = document.getElementById("customDialogOverlay");
  const icon = document.getElementById("dialogIcon");
  const messageEl = document.getElementById("dialogMessage");
  const input = document.getElementById("dialogInput");
  const btns = document.getElementById("dialogButtons");
  if (!overlay || !icon || !messageEl || !btns) return Promise.resolve(false);

  const editor = getRemoteEditorName(snapshot);
  const time = formatRemoteEditTime(snapshot?.savedAt);
  const area = getPresenceAreaLabel(getPresenceView());
  icon.textContent = "i";
  input.style.display = "none";
  messageEl.innerHTML = `
    <strong>Promjena na serveru</strong><br><br>
    <div>${escapeHtml(editor)} je snimio podatke${time ? ` u ${escapeHtml(time)}` : ""}.</div>
    <div style="margin-top:8px;color:var(--text-light);">Trenutno si u modulu: ${escapeHtml(area)}.</div>
    <div style="margin-top:8px;">Mozes povuci najnovije podatke sada ili nastaviti bez povlacenja za ovu promjenu.</div>
  `;
  btns.innerHTML = "";

  return new Promise((resolve) => {
    const noBtn = document.createElement("button");
    noBtn.className = "btn btn-secondary";
    noBtn.textContent = "Ne sada";
    noBtn.onclick = () => {
      overlay.style.display = "none";
      rememberIgnoredRemoteState(remoteKey);
      resolve(false);
    };

    const yesBtn = document.createElement("button");
    yesBtn.className = "btn";
    yesBtn.textContent = "Povuci najnovije";
    yesBtn.onclick = () => {
      overlay.style.display = "none";
      applySharedDataRefresh(snapshot, version).then(resolve);
    };

    btns.appendChild(noBtn);
    btns.appendChild(yesBtn);
    overlay.style.display = "flex";
  });
}
