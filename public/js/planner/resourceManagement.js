var currentManageCategory = null;

function openManagePanel(category) {
  currentManageCategory = category || null;
  document.getElementById("managePanelTitle").textContent =
    t("managePanelTitle");
  showManageStep(category ? 2 : 1);
  document.getElementById("managePanel").style.display = "flex";
}

function closeManagePanel() {
  document.getElementById("managePanel").style.display = "none";
  currentManageCategory = null;
}

function showManageStep(step) {
  document.getElementById("manageStep1").style.display =
    step === 1 ? "block" : "none";
  document.getElementById("manageStep2").style.display =
    step === 2 ? "block" : "none";
  document.getElementById("manageStepAdd").style.display =
    step === 3 ? "block" : "none";
  document.getElementById("manageStepRemove").style.display =
    step === 4 ? "block" : "none";

  if (step === 2 && currentManageCategory) {
    const names = {
      workers: t("mcWorkers"),
      lifts: t("mcLifts"),
      moments: t("mcMoments"),
      plans: t("mcPlans"),
      karnas: t("mcKarnas"),
    };
    document.getElementById("manageStep2Title").textContent =
      names[currentManageCategory] || "";
    document.getElementById("manageAddBtn").textContent =
      t("manageAddBtn");
    document.getElementById("manageRemoveBtn").textContent =
      t("manageRemoveBtn");
    const lbls = ["manageBackLbl", "manageBackLbl2", "manageBackLbl3"];
    lbls.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t("manageBack");
    });
  }
}

function manageSelectCategory(cat) {
  currentManageCategory = cat;
  showManageStep(2);
}

function manageGoBack(toStep) {
  if (toStep === 1) {
    currentManageCategory = null;
  }
  showManageStep(toStep);
  document.getElementById("manageAddResult").style.display = "none";
  document.getElementById("manageRemoveResult").style.display = "none";
}

function manageGoAdd() {
  const names = {
    workers: t("mcWorkers"),
    lifts: t("mcLifts"),
    moments: t("mcMoments"),
    plans: t("mcPlans"),
    karnas: t("mcKarnas"),
  };
  document.getElementById("manageAddTitle").textContent =
    names[currentManageCategory] || "";
  document.getElementById("manageAddLabel").textContent =
    t("manageAddLabel");
  document.getElementById("manageConfirmAddBtn").textContent =
    t("manageConfirmAdd");
  document.getElementById("manageAddInput").value = "";
  document.getElementById("manageAddResult").style.display = "none";
  showManageStep(3);
  setTimeout(
    () => document.getElementById("manageAddInput").focus(),
    100,
  );
}

function manageGoRemove() {
  const names = {
    workers: t("mcWorkers"),
    lifts: t("mcLifts"),
    moments: t("mcMoments"),
    plans: t("mcPlans"),
    karnas: t("mcKarnas"),
  };
  document.getElementById("manageRemoveTitle").textContent =
    names[currentManageCategory] || "";
  document.getElementById("manageRemoveHint").textContent =
    t("manageRemoveHint");
  document.getElementById("manageRemoveResult").style.display = "none";
  renderManageRemoveList();
  showManageStep(4);
}

function manageDoAdd() {
  const input = document.getElementById("manageAddInput");
  const name = input.value.trim();
  const resultEl = document.getElementById("manageAddResult");

  if (!name) {
    resultEl.textContent = t("manageErrEmpty");
    resultEl.className = "manage-result error";
    resultEl.style.display = "block";
    return;
  }

  const list = appState[currentManageCategory];
  if (getActiveResourceList(currentManageCategory, appState.currentDate).includes(name)) {
    resultEl.textContent = t("manageErrExists");
    resultEl.className = "manage-result error";
    resultEl.style.display = "block";
    return;
  }

  list.push(name);
  recordResourceAdded(currentManageCategory, name, appState.currentDate);
  saveData();
  syncServerState({ skipLog: true }).catch(() => {});
  markDirty();
  renderAll();

  resultEl.textContent = t("manageSuccessAdd");
  resultEl.className = "manage-result success";
  resultEl.style.display = "block";
  input.value = "";
  setTimeout(() => input.focus(), 100);
}

function renderManageRemoveList() {
  const container = document.getElementById("manageRemoveList");
  const list = getActiveResourceList(currentManageCategory, appState.currentDate);
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-light); font-size:14px;">—</div>`;
    return;
  }

  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "manage-remove-item";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = item;
    const removeSpan = document.createElement("span");
    removeSpan.className = "remove-x";
    removeSpan.textContent = "✕";
    div.appendChild(nameSpan);
    div.appendChild(removeSpan);
    div.dataset.cmaxAction = "planner.manageRemoveItem";
    div.dataset.cmaxArgs = JSON.stringify([item]);
    container.appendChild(div);
  });
}

function manageRemoveItem(name) {
  const list = appState[currentManageCategory];
  const idx = list.indexOf(name);

  // Log lift deletions to backend so they remain in audit logs
  if (currentManageCategory === "lifts" && BACKEND_ENABLED) {
    try {
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: appState.currentUser || null,
          action: "delete_lift",
          details: { liftName: name },
        }),
      }).catch(() => {});
    } catch (e) {}
  }

  recordResourceRemoved(currentManageCategory, name, appState.currentDate);
  if (idx !== -1) list.splice(idx, 1);
  saveData();
  syncServerState({ skipLog: true }).catch(() => {});
  markDirty();
  renderAll();

  const resultEl = document.getElementById("manageRemoveResult");
  resultEl.textContent = t("manageSuccessRemove") + " " + name;
  resultEl.className = "manage-result success";
  resultEl.style.display = "block";
  renderManageRemoveList();
  setTimeout(() => {
    resultEl.style.display = "none";
  }, 2500);
}

/* ==================== NOTIFICATION BADGE ==================== */
function updateNotifBadge() {
  const reports = getReports();
  const pendingCount = reports.filter(
    (r) => r.status === "pending",
  ).length;

  const adminBadge = document.getElementById("adminNotifBadge");
  const reportBadge = document.getElementById("reportNotifBadge");

  if (adminBadge) {
    adminBadge.textContent = pendingCount;
    adminBadge.style.display =
      pendingCount > 0 && canOpenAdminPanelAccess() && hasAdminPermission("canViewReports")
        ? "inline-flex"
        : "none";
  }
  if (reportBadge) {
    reportBadge.textContent = pendingCount;
    reportBadge.style.display =
      pendingCount > 0 && hasAdminPermission("canViewReports")
        ? "inline-flex"
        : "none";
  }

  updateNotificationsBadge();
}

function getUnreadNotificationsCount() {
  const key = `cmax_notifications_read_${currentSite}`;
  const readIds = safeParseStoredJson(localStorage.getItem(key), []) || [];
  const notifications = getNotificationsForSite(currentSite);
  const unread = notifications.filter((n) => !readIds.includes(n.id));
  return unread.length;
}

function markNotificationsRead(notifications) {
  const key = `cmax_notifications_read_${currentSite}`;
  const readIds = safeParseStoredJson(localStorage.getItem(key), []) || [];
  const next = new Set(readIds);
  (notifications || []).forEach((n) => {
    if (n && n.id != null) next.add(n.id);
  });
  localStorage.setItem(key, JSON.stringify(Array.from(next)));
}

function updateNotificationsBadge() {
  const btnBadge = document.getElementById("notificationsNotifBadge");
  if (!btnBadge) return;
  const unreadCount = getUnreadNotificationsCount();
  btnBadge.textContent = unreadCount;
  btnBadge.style.display = unreadCount > 0 ? "inline-flex" : "none";
}

/* ==================== DATA MANAGEMENT ==================== */
