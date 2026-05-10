/* ==================== APP BOOTSTRAP ==================== */
const CMAX = (window.CMAX = window.CMAX || {});
CMAX.core = CMAX.core || {};
CMAX.core.runtime = CMAX.core.runtime || {};
CMAX.core.bootstrap = CMAX.core.bootstrap || {};

CMAX.core.runtime.handleGlobalError = function handleGlobalError(event) {
  if (!(event instanceof ErrorEvent)) return;
  const msg = event.message;
  const url = event.filename;
  const lineNo = event.lineno;
  const columnNo = event.colno;
  const error = event.error;
  const message = `JavaScript greska: ${msg} (${url}:${lineNo}:${columnNo})`;
  console.error(message, error);
  document.body.innerHTML = `<div style="padding:20px;color:#b00;background:#fee;font-family:sans-serif;">
    <h2>Dogodila se pogreska</h2>
    <pre>${message}</pre>
    <p>Osvjezite stranicu ili pogledajte konzolu za detalje.</p>
  </div>`;
};

CMAX.core.bootstrap.start = async function startBootstrap() {
  try {
    await initApp();
    initSurveyDateTimePickers();
  } catch (err) {
    console.error("initApp failed", err);
    document.body.innerHTML = `<div style="padding:20px;color:#b00;background:#fee;font-family:sans-serif;">
      <h2>Neuspjela inicijalizacija</h2>
      <pre>${err.toString()}</pre>
    </div>`;
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
