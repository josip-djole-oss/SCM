var currentReportFilter = "all";

function openReportModal() {
  if (!canCreateReportsAccess()) {
    showToast(t("accessReportsDenied"), "error");
    return;
  }
  const liftSel = document.getElementById("reportLift");
  liftSel.innerHTML = '<option value="">-</option>';
  [...appState.lifts]
    .sort((a, b) => a.localeCompare(b))
    .forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      liftSel.appendChild(opt);
    });
  const planSel = document.getElementById("reportPlan");
  planSel.innerHTML = '<option value="">-</option>';
  appState.plans.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    planSel.appendChild(opt);
  });
  const reporterInput = document.getElementById("reporterName");
  const reporterName = getCurrentReporterName();
  if (reporterInput) {
    reporterInput.value = reporterName;
    reporterInput.disabled = true;
    reporterInput.readOnly = true;
  }
  document.getElementById("reportComment").value = "";
  document.getElementById("reportModal").style.display = "flex";
}

function closeReportModal() {
  document.getElementById("reportModal").style.display = "none";
}

function openChangePasswordModal() {
  CMAX.admin.close();
  document.getElementById("oldPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  document.getElementById("changePasswordModal").style.display = "flex";
}

function closeChangePasswordModal() {
  document.getElementById("changePasswordModal").style.display = "none";
}

function submitChangePassword() {
  const oldPassword = document.getElementById("oldPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document
    .getElementById("confirmPassword")
    .value.trim();

  // Validation
  if (!oldPassword || !newPassword || !confirmPassword) {
    showAlert("Molimo popunite sva polja.", "⚠️");
    return;
  }

  if (newPassword.length < 6) {
    showAlert("Nova lozinka mora imati najmanje 6 znakova.", "⚠️");
    return;
  }

  if (newPassword !== confirmPassword) {
    showAlert("Nove lozinke se ne podudaraju.", "⚠️");
    return;
  }

  if (oldPassword === newPassword) {
    showAlert("Nova lozinka mora biti različita od stare.", "⚠️");
    return;
  }

  // Get current logged-in user email from AUTH_KEY
  const authData = JSON.parse(
    localStorage.getItem(AUTH_KEY) || '{"email":""}',
  );
  const currentUserEmail = authData.email || appState.currentUser;

  if (!currentUserEmail) {
    showAlert("Korisnik nije pronađen.", "⚠️");
    return;
  }

  // Find user in admins list and verify old password
  const admins = getAdmins();
  const userIndex = admins.findIndex((a) => a.email === currentUserEmail);

  if (userIndex === -1) {
    showAlert("Korisnik nije pronađen u sustavu.", "⚠️");
    return;
  }

  if (admins[userIndex].password !== oldPassword) {
    showAlert("Stara lozinka nije točna!", "⚠️");
    return;
  }

  // Update password
  admins[userIndex].password = newPassword;
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
  syncServerState({ includeAdmins: true }).catch(() => {});

  // Log password change
  addLog("Changed password", currentUserEmail);

  // Clear inputs and close modal
  document.getElementById("oldPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";

  closeChangePasswordModal();
  showAlert("Lozinka je uspješno promijenjena!", "✅");
}

function submitReport() {
  const liftNumber = document.getElementById("reportLift").value;
  const plan = document.getElementById("reportPlan").value;
  const reporterName = getCurrentReporterName();
  const comment = document.getElementById("reportComment").value.trim();

  if (!liftNumber || !plan || !reporterName) {
    showToast(t("errFillReport"), "error");
    return;
  }

  const reports = getReports();
  reports.push({
    id: Date.now(),
    liftNumber,
    plan,
    reporterName,
    comment,
    status: "pending",
    adminNote: "",
    date: new Date().toISOString(),
    isNew: true,
  });
  saveReports(reports);
  trackEditActivity();
  closeReportModal();
  showToast(t("reportSubmitSuccess"), "success");
  updateNotifBadge();
}

function filterReports(status) {
  currentReportFilter = status;
  document
    .querySelectorAll("#reportFilterBar .btn")
    .forEach((b) => b.classList.remove("active"));
  const map = {
    all: "filterAll",
    pending: "filterPending",
    approved: "filterApproved",
    rejected: "filterRejected",
  };
  if (map[status]) {
    const el = document.getElementById(map[status]);
    if (el) el.classList.add("active");
  }
  renderReportsList(status);
}

function renderReportsList(status) {
  const container = document.getElementById("reportsList");
  if (!hasAdminPermission("canViewReports")) {
    container.innerHTML =
      `<p style="color:var(--text-light); text-align:center; padding:20px; font-size:14px;">${t("accessReportsViewDenied")}</p>`;
    return;
  }
  let reports = getReports();
  if (status !== "all")
    reports = reports.filter((r) => r.status === status);

  if (reports.length === 0) {
    container.innerHTML = `<p style="color:var(--text-light); text-align:center; padding:20px; font-size:14px;">${t("noReports")}</p>`;
    return;
  }

  container.innerHTML = "";
  reports
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((report) => {
      const div = document.createElement("div");
      div.className = `report-item ${report.status}`;

      const badgeClass =
        report.status === "approved"
          ? "badge-approved"
          : report.status === "rejected"
            ? "badge-rejected"
            : "badge-pending";
      const badgeText =
        report.status === "approved"
          ? t("badgeApproved")
          : report.status === "rejected"
            ? t("badgeRejected")
            : t("badgePending");

      div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px;">
        <div>
          <strong>🛗 ${escapeHtml(report.liftNumber)}</strong> — <strong>${escapeHtml(report.plan)}</strong>
          <span class="report-status-badge ${badgeClass}" style="margin-left:8px;">${badgeText}</span>
          ${report.isNew ? `<span class="report-status-badge badge-new" style="margin-left:4px;">${t("badgeNew")}</span>` : ""}
        </div>
        <div class="report-meta">${new Date(report.date).toLocaleString()}</div>
      </div>
      <div class="report-meta" style="margin-top:4px;">👤 ${escapeHtml(report.reporterName)}</div>
      ${report.comment ? `<div class="report-comment">💬 ${escapeHtml(report.comment)}</div>` : ""}
      ${report.adminNote ? `<div class="report-comment" style="color:#e74c3c;">📝 ${t("reportAdminNote")} ${escapeHtml(report.adminNote)}</div>` : ""}
    `;

      if (report.status === "pending" && hasAdminPermission("canApproveReports")) {
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "report-actions";

        const approveBtn = document.createElement("button");
        approveBtn.className = "btn btn-small btn-success";
        approveBtn.textContent = t("btnApprove");
        approveBtn.dataset.cmaxAction = "reports.review";
        approveBtn.dataset.cmaxArgs = JSON.stringify([report.id, "approved"]);

        const rejectBtn = document.createElement("button");
        rejectBtn.className = "btn btn-small btn-danger";
        rejectBtn.textContent = t("btnReject");
        rejectBtn.dataset.cmaxAction = "reports.review";
        rejectBtn.dataset.cmaxArgs = JSON.stringify([report.id, "rejected"]);

        actionsDiv.appendChild(approveBtn);
        actionsDiv.appendChild(rejectBtn);
        div.appendChild(actionsDiv);
      }

      if (appState.isSuperAdmin || hasAdminPermission("canDeleteReports")) {
        const deleteDiv = document.createElement("div");
        deleteDiv.className = "report-actions";
        deleteDiv.style.marginTop = "8px";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-small btn-danger";
        deleteBtn.textContent = "🗑️ " + t("btnDeleteReport");
        deleteBtn.dataset.cmaxAction = "reports.delete";
        deleteBtn.dataset.cmaxArgs = JSON.stringify([report.id]);

        deleteDiv.appendChild(deleteBtn);
        div.appendChild(deleteDiv);
      }

      container.appendChild(div);
    });

  // Mark all as seen
  const allReports = getReports();
  allReports.forEach((r) => {
    r.isNew = false;
  });
  saveReports(allReports);
  updateNotifBadge();
}

function reviewReport(id, action) {
  if (!hasAdminPermission("canApproveReports")) return;
  if (action === "rejected") {
    showPromptDialog(t("rejectConfirm"), "❌", "", (note) => {
      doReviewReport(id, action, note || "");
    });
  } else {
    showConfirm(t("approveConfirm"), null, "✅", () => {
      doReviewReport(id, action, "");
    });
  }
}

function doReviewReport(id, action, note) {
  const reports = getReports();
  const idx = reports.findIndex((r) => r.id === id);
  if (idx !== -1) {
    const report = reports[idx];
    reports[idx].status = action;
    reports[idx].adminNote = note;
    saveReports(reports);
    trackEditActivity();
    addLog(
      `${action === "approved" ? "Approved" : "Rejected"} report`,
      `Lift ${report.liftNumber}, Plan ${report.plan}, Reporter: ${report.reporterName}`,
    );
    renderReportsList(currentReportFilter);
    updateNotifBadge();
  }
}

/* ==================== DARK MODE ==================== */
