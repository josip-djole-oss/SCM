// Accounts are provisioned and authenticated by the server only.
function initAdmins() {}

function getAdmins() {
  const d = localStorage.getItem(ADMINS_KEY);
  const parsed = safeParseStoredJson(d, []);
  return Array.isArray(parsed)
    ? parsed.map((admin) => normalizeAdminRecord(admin))
    : [];
}

function getReports() {
  const d = localStorage.getItem(REPORTS_KEY);
  const parsed = safeParseStoredJson(d, []);
  return Array.isArray(parsed) ? parsed : [];
}

function extractListPayload(payload, key) {
  if (Array.isArray(payload)) return { list: payload, version: null, updatedAt: null };
  if (payload && typeof payload === "object" && Array.isArray(payload[key])) {
    return {
      list: payload[key],
      version: Number(payload.version) || null,
      updatedAt: payload.updatedAt || null,
    };
  }
  return { list: [], version: null, updatedAt: null };
}

async function saveReports(reports) {
  if (!BACKEND_ENABLED) throw new Error("REPORTS_BACKEND_REQUIRED");
  const site = currentSite;
  const context = captureAppContext();
  const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reports,
        userEmail: appState.currentUser || null,
        site,
        lastKnownVersion: reportsStateVersionBySite[site] || 1,
      }),
  });
  const payload = await res.json();
  if (!res.ok || !Number.isFinite(Number(payload.version))) throw new Error(payload.error || "REPORT_SAVE_FAILED");
  if (!isAppContextCurrent(context)) return false;
  reportsStateVersionBySite[site] = Number(payload.version);
  localStorage.setItem(getSiteStorageKey("cmax_planner_reports", site), JSON.stringify(reports));
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  return true;
}

function loadReportsData(options = {}) {
  const { strict = false } = options;
  if (!BACKEND_ENABLED) {
    return Promise.resolve(getReports());
  }

  const site = currentSite;
  const context = captureAppContext();
  return fetch(`/api/reports?site=${encodeURIComponent(site)}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((payload) => {
      if (!isAppContextCurrent(context)) throw new Error("STALE_APP_CONTEXT");
      const parsed = extractListPayload(payload, "reports");
      if (parsed.version) reportsStateVersionBySite[site] = parsed.version;
      localStorage.setItem(getSiteStorageKey("cmax_planner_reports", site), JSON.stringify(parsed.list));
      if (site === currentSite) {
        localStorage.setItem(REPORTS_KEY, JSON.stringify(parsed.list));
      }
      return parsed.list;
    })
    .catch((error) => {
      if (strict) throw error;
      return [];
    });
}

/* ==================== NOTIFICATIONS ==================== */
