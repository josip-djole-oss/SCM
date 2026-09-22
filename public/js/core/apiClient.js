function getCsrfToken() {
  return sessionStorage.getItem(CSRF_TOKEN_KEY) || localStorage.getItem(CSRF_TOKEN_KEY) || "";
}

function setCsrfToken(token) {
  if (!token) {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    localStorage.removeItem(CSRF_TOKEN_KEY);
    return;
  }
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  localStorage.setItem(CSRF_TOKEN_KEY, token);
}

function clearCsrfToken() {
  setCsrfToken("");
}

function clearAuthSessionLocal() {
  localStorage.removeItem(AUTH_KEY);
  clearCsrfToken();
}

var sessionExpiredHandled = false;

function getClientInstanceId() {
  const key = "cmax_client_instance_id";
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() || `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, value);
  }
  return value;
}

function callIfDefined(functionName) {
  if (typeof window[functionName] === "function") {
    window[functionName]();
  }
}

function resetAuthStateLocal() {
  invalidateAppContext();
  appState.isAdmin = false;
  appState.isSuperAdmin = false;
  appState.isReadonly = false;
  appState.currentUser = null;
  appState.currentUserName = "";
  appState.currentUserFunctions = [];
  appState.adminLevel = 1;
  appState.permissions = normalizePermissions({});
  appState.guestPermissions = getGuestPermissions();
  appState.dailyData = {};
  appState.binsData = {};
  appState.hasUnsavedChanges = false;
  tidplanDataChanged = false;
  tidplanData = [];
  warehouseData = null;
}

function handleApiUnauthorized() {
  clearAuthSessionLocal();
  resetAuthStateLocal();
  callIfDefined("stopAutoSave");
  callIfDefined("stopPresenceTracking");
  callIfDefined("stopReportsPolling");
  callIfDefined("stopNotificationsPolling");
  callIfDefined("stopSiteMetaRefresh");
  callIfDefined("stopPermissionRefresh");
  callIfDefined("stopSharedDataRefresh");
  callIfDefined("stopServerSync");

  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;
  if (document.getElementById("mainContainer")?.style.display !== "none") {
    showToast("Sesija je istekla. Prijavi se ponovno.", "error");
    showLogin();
  }
}

function applyAuthData(authData) {
  if (!authData) return;
  if (appState.currentUser !== authData.email) invalidateAppContext();
  sessionExpiredHandled = false;
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  appState.isAdmin = !!authData.isAdmin;
  appState.isSuperAdmin = !!authData.isSuperAdmin;
  appState.isReadonly = !!authData.isReadonly;
  appState.currentUser = authData.email;
  appState.currentUserName = authData.fullName || "";
  appState.currentUserFunctions = Array.isArray(authData.storeRoles) ? authData.storeRoles : [];
  appState.adminLevel = authData.level || 1;
  appState.permissions = Object.fromEntries(Object.keys(DEFAULT_PERMISSIONS).map((key) => [key,
    authData.isSuperAdmin === true || authData.permissions?.[key] === true]));
  appState.guestPermissions = getGuestPermissions();
}

var originalFetch = window.fetch.bind(window);
window.fetch = function patchedFetch(resource, options = {}) {
  const requestUrl = typeof resource === "string" ? resource : resource?.url || "";
  const nextOptions = { ...options };
  nextOptions.credentials = nextOptions.credentials || "same-origin";
  const method = (nextOptions.method || resource?.method || "GET").toUpperCase();
  const parsedUrl = new URL(requestUrl, window.location.href);
  const isApiRequest = parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith("/api/");
  const context = captureAppContext();
  if (isApiRequest) {
    nextOptions.cache = "no-store";
    nextOptions.headers = new Headers(nextOptions.headers || resource?.headers || {});
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && !requestUrl.includes("/api/login")) {
      if (!nextOptions.headers.has("x-client-instance-id")) {
        nextOptions.headers.set("x-client-instance-id", getClientInstanceId());
      }
      const csrfToken = getCsrfToken();
      if (csrfToken && !nextOptions.headers.has("x-csrf-token")) {
        nextOptions.headers.set("x-csrf-token", csrfToken);
      }
    }
  }
  return originalFetch(resource, nextOptions).then((response) => {
    if (isApiRequest && response.status === 401 && !requestUrl.includes("/api/login") && isAppContextCurrent(context, false)) {
      handleApiUnauthorized();
    }
    return response;
  });
};
