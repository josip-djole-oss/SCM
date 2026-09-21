/* ==================== APP BOOTSTRAP ==================== */
const CMAX = (window.CMAX = window.CMAX || {});
CMAX.core = CMAX.core || {};
CMAX.core.runtime = CMAX.core.runtime || {};
CMAX.core.bootstrap = CMAX.core.bootstrap || {};

CMAX.core.runtime.showError = function showError(message) {
  let panel = document.getElementById("applicationRuntimeError");
  if (!panel) {
    panel = document.createElement("aside");
    panel.id = "applicationRuntimeError";
    panel.setAttribute("role", "alert");
    panel.style.cssText = "position:fixed;inset:16px 16px auto;z-index:100000;padding:20px;background:#fff1f2;color:#881337;border:1px solid #fda4af;border-radius:10px;";
    const text = document.createElement("p");
    text.dataset.errorText = "true";
    const retry = document.createElement("button");
    retry.textContent = "Osvjezi aplikaciju";
    retry.onclick = () => window.location.reload();
    const close = document.createElement("button");
    close.textContent = "Zatvori poruku";
    close.onclick = () => panel.remove();
    panel.append(text, retry, close);
    document.body.append(panel);
  }
  panel.querySelector("[data-error-text]").textContent = message;
};

CMAX.core.runtime.handleGlobalError = function handleGlobalError(event) {
  if (!(event instanceof ErrorEvent)) return;
  const msg = event.message;
  const url = event.filename;
  const lineNo = event.lineno;
  const columnNo = event.colno;
  const error = event.error;
  const message = `JavaScript greska: ${msg} (${url}:${lineNo}:${columnNo})`;
  console.error(message, error);
  CMAX.core.runtime.showError("Doslo je do greske. Vas trenutni unos je sacuvan na ekranu. Pokusajte ponovno ili osvjezite aplikaciju.");
};

CMAX.core.bootstrap.start = async function startBootstrap() {
  try {
    await initApp();
    initSurveyDateTimePickers();
  } catch (err) {
    console.error("initApp failed", err);
    CMAX.core.runtime.showError("Aplikacija nije spremna. Provjerite vezu i pokusajte ponovno.");
  }
};

if (!CMAX.core.runtime.errorHandlerBound) {
  CMAX.core.runtime.errorHandlerBound = true;
  window.addEventListener("error", CMAX.core.runtime.handleGlobalError);
}
if (!CMAX.core.bootstrap.loadBound) {
  CMAX.core.bootstrap.loadBound = true;
  window.addEventListener("load", CMAX.core.bootstrap.start);
}

window.addEventListener("popstate", () => {
  if (document.getElementById("mainContainer")?.style.display !== "none") {
    withLoadingPromise("loadingDefault", () =>
      loadAllData({ strict: true }).then(() => {
        renderAll();
        return applyRouteFromPath(window.location.pathname);
      }),
    ).catch((error) => {
      showToast(error?.message || "Ne mogu ucitati najnovije podatke.", "error");
    });
  } else if (window.location.pathname !== "/login") {
    pushRouteForView("login", { path: "/login", replace: true });
  }
});
