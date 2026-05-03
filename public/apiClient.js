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

let sessionExpiredHandled = false;

function callIfDefined(functionName) {
  if (typeof window[functionName] === "function") {
    window[functionName]();
  }
}

function resetAuthStateLocal() {
  appState.isAdmin = false;
  appState.isSuperAdmin = false;
  appState.isReadonly = false;
  appState.currentUser = null;
  appState.currentUserName = "";
  appState.adminLevel = 1;
  appState.permissions = normalizePermissions({});
  appState.guestPermissions = getGuestPermissions();
}

function handleApiUnauthorized() {
  clearAuthSessionLocal();
  resetAuthStateLocal();
  callIfDefined("stopAutoSave");
  callIfDefined("stopPresenceTracking");
  callIfDefined("stopReportsPolling");
  callIfDefined("stopNotificationsPolling");
  callIfDefined("stopSiteMetaRefresh");

  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;
  if (document.getElementById("mainContainer")?.style.display !== "none") {
    showToast("Sesija je istekla. Prijavi se ponovno.", "error");
    showLogin();
  }
}

function applyAuthData(authData) {
  if (!authData) return;
  sessionExpiredHandled = false;
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
  appState.isAdmin = authData.isAdmin;
  appState.isSuperAdmin = authData.isSuperAdmin;
  appState.isReadonly = authData.isReadonly;
  appState.currentUser = authData.email;
  appState.currentUserName = authData.fullName || "";
  appState.adminLevel = authData.level || 1;
  appState.permissions = authData.permissions || normalizePermissions({});
  appState.guestPermissions = getGuestPermissions();
}

const originalFetch = window.fetch.bind(window);
window.fetch = function patchedFetch(resource, options = {}) {
  const requestUrl = typeof resource === "string" ? resource : resource?.url || "";
  const nextOptions = { ...options };
  nextOptions.credentials = nextOptions.credentials || "same-origin";
  const method = (nextOptions.method || "GET").toUpperCase();
  const isApiRequest = requestUrl.startsWith("/api/");
  if (isApiRequest) {
    nextOptions.headers = new Headers(nextOptions.headers || {});
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && !requestUrl.includes("/api/login")) {
      const csrfToken = getCsrfToken();
      if (csrfToken && !nextOptions.headers.has("x-csrf-token")) {
        nextOptions.headers.set("x-csrf-token", csrfToken);
      }
    }
  }
  return originalFetch(resource, nextOptions).then((response) => {
    if (isApiRequest && response.status === 401 && !requestUrl.includes("/api/login")) {
      handleApiUnauthorized();
    }
    return response;
  });
};
