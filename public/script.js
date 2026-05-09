/* ==================== APP BOOTSTRAP ==================== */
window.onload = async function () {
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
