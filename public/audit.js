function getLogs() {
  return logsCache.slice();
}

function getLogFilterValues() {
  return {
    text: (document.getElementById("logFilterText")?.value || "").trim().toLowerCase(),
    user: (document.getElementById("logFilterUser")?.value || "").trim().toLowerCase(),
    action: (document.getElementById("logFilterAction")?.value || "").trim().toLowerCase(),
    from: document.getElementById("logFilterFrom")?.value || "",
    to: document.getElementById("logFilterTo")?.value || "",
  };
}

function setupLogFilters() {
  ["logFilterText", "logFilterUser", "logFilterAction", "logFilterFrom", "logFilterTo"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.dataset.logFilterReady) {
      el.dataset.logFilterReady = "true";
      el.addEventListener("input", renderLogs);
      el.addEventListener("change", renderLogs);
    }
  });
  const reset = document.getElementById("btnResetLogFilters");
  if (reset && !reset.dataset.logFilterReady) {
    reset.dataset.logFilterReady = "true";
    reset.addEventListener("click", () => {
      ["logFilterText", "logFilterUser", "logFilterAction", "logFilterFrom", "logFilterTo"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      renderLogs();
    });
  }
}

function populateLogActionFilter(logs) {
  const select = document.getElementById("logFilterAction");
  if (!select) return;
  const selected = select.value || "";
  const actions = Array.from(new Set((logs || []).map((log) => String(log.action || "").trim()).filter(Boolean))).sort();
  select.innerHTML = `<option value="">Sve akcije</option>`;
  actions.forEach((action) => {
    const option = document.createElement("option");
    option.value = action.toLowerCase();
    option.textContent = getAuditActionLabel(action);
    if (option.value === selected) option.selected = true;
    select.appendChild(option);
  });
}

function filterLogsForDisplay(logs) {
  const filters = getLogFilterValues();
  return (logs || []).filter((log) => {
    const dateText = String(log.timestamp || "").slice(0, 10);
    if (filters.from && dateText < filters.from) return false;
    if (filters.to && dateText > filters.to) return false;
    const userText = `${getUserDisplayName(log.user, log.userName)} ${log.user || ""}`.toLowerCase();
    if (filters.user && !userText.includes(filters.user)) return false;
    const actionText = String(log.action || "").toLowerCase();
    if (filters.action && actionText !== filters.action) return false;
    const detailsText = normalizeText(formatLogDetails(log.details)).toLowerCase();
    const allText = `${userText} ${actionText} ${detailsText}`.toLowerCase();
    return !filters.text || allText.includes(filters.text);
  });
}

function loadLogsData() {
  if (!BACKEND_ENABLED) {
    logsLoadedOnce = true;
    return Promise.resolve(getLogs());
  }

  return fetch("/api/logs", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((logs) => {
      logsCache = Array.isArray(logs) ? logs : [];
      logsLoadedOnce = true;
      return logsCache;
    })
    .catch(() => getLogs());
}

function addLog(action, details = "") {
  const entry = {
    timestamp: new Date().toISOString(),
    user: appState.currentUser || "Guest",
    action,
    details,
  };

  logsCache.push(entry);
  if (logsCache.length > 500) logsCache.splice(0, logsCache.length - 500);

  if (BACKEND_ENABLED) {
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: entry.user,
        action: entry.action,
        details: entry.details,
      }),
    }).catch(() => {});
  }
}

function formatAuditList(value) {
  if (!Array.isArray(value)) return "";
  if (value.length === 0) return "nista";
  if (value.length > 8) return `${value.slice(0, 8).join(", ")} +${value.length - 8}`;
  return value.join(", ");
}

function formatLogDetails(details) {
  if (details === null || details === undefined) return "";
  if (typeof details === "string") return details;
  if (typeof details !== "object") return String(details);

  const parts = [];
  if (details.targetEmail) parts.push(`admin: ${getUserDisplayName(details.targetEmail, details.targetName)}`);
  if (details.targetName) parts.push(`ime: ${details.targetName}`);
  if (details.level) parts.push(`level: ${details.level}`);
  if (details.fromLevel || details.toLevel) parts.push(`level: ${details.fromLevel || "-"} -> ${details.toLevel || "-"}`);
  if (details.site) parts.push(`gradiliste: ${details.site}`);
  if (details.reason) parts.push(`razlog: ${details.reason}`);
  if (Array.isArray(details.permissionsAdded) && details.permissionsAdded.length) {
    parts.push(`dodane ovlasti: ${formatAuditList(details.permissionsAdded)}`);
  }
  if (Array.isArray(details.permissionsRemoved) && details.permissionsRemoved.length) {
    parts.push(`uklonjene ovlasti: ${formatAuditList(details.permissionsRemoved)}`);
  }
  if (Array.isArray(details.sitesAdded) && details.sitesAdded.length) {
    parts.push(`dodana gradilista: ${formatAuditList(details.sitesAdded)}`);
  }
  if (Array.isArray(details.sitesRemoved) && details.sitesRemoved.length) {
    parts.push(`uklonjena gradilista: ${formatAuditList(details.sitesRemoved)}`);
  }
  if (details.readonlyChanged) {
    parts.push(`readonly: ${details.fromReadonly ? "da" : "ne"} -> ${details.toReadonly ? "da" : "ne"}`);
  }
  if (parts.length) return parts.join(" | ");

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

function localizeLogPhrase(key) {
  const map = {
    hr: {
      loginSuccess: "Uspjesna prijava",
      loginFail: "Neuspjesna prijava",
      logout: "Odjava",
    },
    en: {
      loginSuccess: "Successfully logged in",
      loginFail: "Login failed",
      logout: "Logged out",
    },
    sv: {
      loginSuccess: "Inloggning lyckades",
      loginFail: "Inloggning misslyckades",
      logout: "Utloggad",
    },
  };
  const langKey = currentLang === "sv" ? "sv" : currentLang === "en" ? "en" : "hr";
  return (map[langKey] && map[langKey][key]) || key;
}

function getAuditActionLabel(actionRaw) {
  const key = String(actionRaw || "").toLowerCase();
  const labels = {
    admin_created: "Dodan admin",
    admin_updated: "Izmijenjen admin",
    admin_removed: "Uklonjen admin",
    admin_password_changed: "Promijenjena admin lozinka",
    admin_sites_changed: "Promijenjen pristup gradilistima",
    admin_permissions_changed: "Promijenjene ovlasti",
    manual_backup_created: "Kreiran backup",
    backup_restored: "Vracen backup",
    clear_logs: "Obrisani logovi",
    login: "Login",
    logout: "Logout",
  };
  return labels[key] || actionRaw;
}

function formatLogEntry(log) {
  const actionRaw = normalizeText(log.action || "");
  let details = log.details;
  if (typeof details === "string") {
    const trimmed = details.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        details = JSON.parse(trimmed);
      } catch {
        details = details;
      }
    }
  }
  if (actionRaw.toLowerCase() === "login") {
    if (details && typeof details === "object" && "success" in details) {
      return {
        action: actionRaw,
        details: localizeLogPhrase(details.success ? "loginSuccess" : "loginFail"),
      };
    }
  }
  if (actionRaw.toLowerCase() === "logged in") {
    return { action: actionRaw, details: localizeLogPhrase("loginSuccess") };
  }
  if (actionRaw.toLowerCase() === "logged out") {
    return { action: actionRaw, details: localizeLogPhrase("logout") };
  }
  return {
    action: getAuditActionLabel(actionRaw),
    details: normalizeText(formatLogDetails(details)),
  };
}

function renderLogs() {
  const container = document.getElementById("logsContainer");
  if (!container) return;
  if (!hasAdminPermission("canViewLogs")) {
    container.innerHTML =
      `<p style="color:var(--text-light); text-align:center; padding:20px;">${t("accessLogsViewDenied")}</p>`;
    return;
  }
  if (BACKEND_ENABLED && !logsLoadedOnce) {
    loadLogsData()
      .then(() => renderLogs())
      .catch(() => renderLogs());
    return;
  }
  setupLogFilters();
  const allLogs = getLogs();
  populateLogActionFilter(allLogs);
  const logs = filterLogsForDisplay(allLogs).reverse();

  if (logs.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-light); text-align:center; padding:20px;">Nema logova.</p>';
    return;
  }

  container.innerHTML = "";
  logs.forEach((log) => {
    const div = document.createElement("div");
    div.className = "log-entry";
    const date = new Date(log.timestamp);
    const timeStr = date.toLocaleString(
      currentLang === "hr" ? "hr-HR" : currentLang === "sv" ? "sv-SE" : "en-US",
    );
    const formatted = formatLogEntry(log);
    const detailsText = formatted.details || "";
    div.innerHTML = `
      <span class="log-time">${escapeHtml(timeStr)}</span>
      <span class="log-user">${escapeHtml(getUserDisplayName(log.user, log.userName))}</span>
      <span class="log-action">${escapeHtml(formatted.action || "")}</span>
      ${detailsText ? `<span style="color:var(--text-light);">(${escapeHtml(detailsText)})</span>` : ""}
    `;
    container.appendChild(div);
  });
}

function clearLogs() {
  if (!hasAdminPermission("canClearLogs")) {
    showToast(t("accessLogsClearDenied"), "error");
    return;
  }
  showConfirm(
    "Jeste li sigurni da zelite obrisati sve logove?",
    null,
    "!",
    () => {
      const finishClear = () => {
        logsCache = [];
        addLog("clear_logs");
        loadLogsData()
          .then(() => renderLogs())
          .catch(() => renderLogs());
        showToast("Logovi su obrisani.", "success");
      };

      if (!BACKEND_ENABLED) {
        finishClear();
        return;
      }

      fetch("/api/logs", { method: "DELETE" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then(() => finishClear())
        .catch(() => {
          showToast(t("accessLogsClearDenied"), "error");
        });
    },
  );
}
