function toggleDarkMode() {
  showConfirm(t("confirmDarkMode"), null, "🌙", () => {
    const isDark =
      document.documentElement.getAttribute("data-dark") === "true";
    const newDark = !isDark;
    document.documentElement.setAttribute(
      "data-dark",
      newDark ? "true" : "false",
    );
    localStorage.setItem(DARK_KEY, newDark ? "true" : "false");
    updateDarkModeBtn();
  });
}

function updateDarkModeBtn() {
  const btn = document.getElementById("darkModeToggleBtn");
  if (!btn) return;
  const isDark =
    document.documentElement.getAttribute("data-dark") === "true";
  btn.textContent = isDark ? t("darkModeOff") : t("darkModeOn");
}

/* ==================== COLOR THEME ==================== */
function setColorTheme(theme) {
  showConfirm(t("confirmThemeChange"), null, "🎨", () => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeBtns(theme);
    // Re-init flatpickr to pick up new colors
    reinitFlatpickr();
  });
}

function updateThemeBtns(theme) {
  document
    .querySelectorAll(".theme-btn")
    .forEach((b) => b.classList.remove("active"));
  const map = {
    blue: "themeBtnBlue",
    orange: "themeBtnOrange",
    red: "themeBtnRed",
    teal: "themeBtnTeal",
    indigo: "themeBtnIndigo",
    emerald: "themeBtnEmerald",
    slate: "themeBtnSlate",
    olive: "themeBtnOlive",
    rose: "themeBtnRose",
  };
  if (map[theme]) {
    const el = document.getElementById(map[theme]);
    if (el) el.classList.add("active");
  }
}

function initBinPermissionsUI() {
  // Set checkbox values from appState.binPermissions
  const cb1 = document.getElementById("bin_perm_totalAvailable");
  const cb2 = document.getElementById("bin_perm_emptyAvailable");
  const cb3 = document.getElementById("bin_perm_forEmptying");
  if (cb1) cb1.checked = appState.binPermissions.totalAvailable !== false;
  if (cb2) cb2.checked = appState.binPermissions.emptyAvailable !== false;
  if (cb3) cb3.checked = appState.binPermissions.forEmptying !== false;
  const canManageBinsPerms =
    appState.isSuperAdmin || hasAdminPermission("canManageBinsPermissions");
  [cb1, cb2, cb3].forEach((checkbox) => {
    if (checkbox) checkbox.disabled = !canManageBinsPerms;
  });
}

function toggleBinPermission(field) {
  if (!hasAdminPermission("canManageBinsPermissions")) return;
  const checkboxId = "bin_perm_" + field;
  const checkbox = document.getElementById(checkboxId);
  if (checkbox) {
    appState.binPermissions[field] = checkbox.checked;
    saveBinPermissions();
    renderBinsTable();
    addLog("Updated bin permissions", field + ": " + checkbox.checked);
  }
}

/* ==================== BINS SYSTEM ==================== */
