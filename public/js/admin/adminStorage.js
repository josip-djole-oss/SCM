function initAdmins() {
  if (BACKEND_ENABLED) return;
  const admins = getAdmins();
  const superAdminExists = admins.some(
    (a) => a.email === SUPER_ADMIN_EMAIL,
  );
  if (!superAdminExists) {
    admins.push({
      firstName: "Super",
      lastName: "Admin",
      fullName: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      isSuperAdmin: true,
      level: 6,
      permissions: { ...DEFAULT_PERMISSIONS },
    });
    localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  }
}

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

function saveReports(reports) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  if (BACKEND_ENABLED) {
    const site = currentSite;
    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reports,
        userEmail: appState.currentUser || null,
        site,
        lastKnownVersion: reportsStateVersionBySite[site] || 1,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((payload) => {
        reportsStateVersionBySite[site] = Number(payload?.version) || reportsStateVersionBySite[site] || 1;
      })
      .catch(() => {});
  }
  scheduleServerSync();
}

function loadReportsData(options = {}) {
  const { strict = false } = options;
  if (!BACKEND_ENABLED) {
    return Promise.resolve(getReports());
  }

  const site = currentSite;
  return fetch(`/api/reports?site=${encodeURIComponent(site)}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((payload) => {
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
