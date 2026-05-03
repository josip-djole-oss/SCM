/* ==================== SURVEYS ==================== */
let surveysCache = [];

function getSurveyReadKey() {
  return `cmax_surveys_read_${currentSite}_${getCurrentUserEmail() || "guest"}`;
}

function getCurrentUserEmail() {
  const savedAuth = safeParseStoredJson(localStorage.getItem(AUTH_KEY), {}) || {};
  return (appState.currentUser || savedAuth.email || "").toString().trim().toLowerCase();
}

function getReadSurveyIds() {
  return safeParseStoredJson(localStorage.getItem(getSurveyReadKey()), []) || [];
}

function markSurveysRead(surveys = surveysCache) {
  const next = new Set(getReadSurveyIds());
  (surveys || []).forEach((survey) => {
    if (survey?.id) next.add(survey.id);
  });
  localStorage.setItem(getSurveyReadKey(), JSON.stringify(Array.from(next)));
  updateSurveysBadge();
}

function getUnreadSurveysCount() {
  if (!hasPermission("canViewSurveys")) return 0;
  const readIds = new Set(getReadSurveyIds());
  return (surveysCache || []).filter((survey) => survey?.id && !readIds.has(survey.id)).length;
}

function updateSurveysBadge() {
  const badge = document.getElementById("surveysNotifBadge");
  if (!badge) return;
  const count = getUnreadSurveysCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-flex" : "none";
}

function getSurveysList(options = {}) {
  const { strict = false } = options;
  if (!BACKEND_ENABLED) return Promise.resolve(surveysCache);

  return fetch(`/api/surveys?site=${encodeURIComponent(currentSite)}`, {
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      const surveys = Array.isArray(data.surveys) ? data.surveys : [];
      surveysCache = surveys;
      updateSurveysBadge();
      return surveys;
    })
    .catch((error) => {
      if (strict) throw error;
      updateSurveysBadge();
      return surveysCache;
    });
}

function submitSurvey() {
  if (!hasAdminPermission("canCreateSurveys") || !hasAdminPermission("canPublishSurveys")) {
    showToast("Nemate dozvolu za objavu anketa.", "error");
    return;
  }

  const question = (document.getElementById("surveyQuestion")?.value || "").trim();
  const imageFile = document.getElementById("surveyImage")?.files[0];
  const startDate = document.getElementById("surveyStartDate")?.value;
  const startTime = document.getElementById("surveyStartTime")?.value;
  const endDate = document.getElementById("surveyEndDate")?.value;
  const endTime = document.getElementById("surveyEndTime")?.value;
  
  if (!question) {
    showToast("Molim unesite pitanje.", "error");
    return;
  }

  if (!startDate || !startTime || !endDate || !endTime) {
    showToast("Molim postavite datum i vrijeme početka i kraja.", "error");
    return;
  }

  // Collect answers
  const answersContainer = document.getElementById("surveyAnswers");
  const answers = [];
  if (answersContainer) {
    answersContainer.querySelectorAll("input[type='text']").forEach((input) => {
      const answer = input.value.trim();
      if (answer) answers.push(answer);
    });
  }

  if (answers.length < 2) {
    showToast("Molim dodajte najmanje 2 odgovora.", "error");
    return;
  }

  // Collect target users with construction site grouping
  const targetAll = document.getElementById("surveyTargetAll")?.checked === true;
  const targetSite = document.getElementById("surveyTargetSite")?.checked === true;
  const targetUsers = [];

  const usersContainer = document.getElementById("surveyTargetUsersCheckboxes");
  if (usersContainer) {
    usersContainer.querySelectorAll("input[data-survey-user]:checked").forEach((cb) => {
      const email = cb.value.trim().toLowerCase();
      if (email && !targetUsers.includes(email)) {
        targetUsers.push(email);
      }
    });
  }

  if (!targetAll && !targetSite && targetUsers.length === 0) {
    showToast("Molim odaberite barem jednu osobu ili cijelo gradilište.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("question", question);
  formData.append("answers", JSON.stringify(answers));
  formData.append("startDate", startDate);
  formData.append("startTime", startTime);
  formData.append("endDate", endDate);
  formData.append("endTime", endTime);
  formData.append("timezoneOffset", String(new Date().getTimezoneOffset()));
  formData.append("targetAll", targetAll);
  formData.append("targetSite", targetSite);
  formData.append("targetUsers", JSON.stringify(targetUsers));
  formData.append("privacy", document.getElementById("surveyPrivacy")?.value || "semiAnonymous");
  formData.append("site", currentSite);
  
  if (imageFile) {
    formData.append("image", imageFile);
  }

  withLoadingPromise("loadingNotificationUpload", () =>
    fetch("/api/surveys", {
      method: "POST",
      body: formData,
    })
      .then((res) =>
        res.ok
          ? res.json()
          : res
              .json()
              .catch(() => ({}))
              .then((data) => Promise.reject(new Error(data.error || "SURVEY_SAVE_FAILED"))),
      )
      .then(() => {
        showToast("Anketa je objavljena!", "success");
        resetSurveyForm();
        return getSurveysList();
      })
      .then(() => {
        renderSurveysList();
      })
      .catch((err) => {
        console.error("Greška pri objavi ankete:", err);
        showToast("Greška pri objavi ankete.", "error");
      })
  );
}

function resetSurveyForm() {
  document.getElementById("surveyQuestion").value = "";
  document.getElementById("surveyImage").value = "";
  document.getElementById("surveyStartDate").value = "";
  document.getElementById("surveyStartTime").value = "";
  document.getElementById("surveyEndDate").value = "";
  document.getElementById("surveyEndTime").value = "";
  const answersContainer = document.getElementById("surveyAnswers");
  if (answersContainer) answersContainer.innerHTML = "";
  document.getElementById("surveyTargetAll").checked = false;
  document.getElementById("surveyTargetSite").checked = false;
  renderSurveyTargetUsers();
}

function addSurveyAnswerField() {
  const container = document.getElementById("surveyAnswers");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.marginBottom = "8px";
  wrapper.style.gap = "8px";
  wrapper.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-group";
  input.style.flex = "1";
  input.style.padding = "10px 12px";
  input.style.border = "2px solid var(--border-color)";
  input.style.borderRadius = "8px";
  input.style.fontSize = "14px";
  input.style.backgroundColor = "var(--input-bg)";
  input.style.color = "var(--text-dark)";
  input.placeholder = "Odgovor...";

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn btn-danger btn-small";
  removeBtn.textContent = "Ukloni";
  removeBtn.onclick = () => wrapper.remove();

  wrapper.appendChild(input);
  wrapper.appendChild(removeBtn);
  container.appendChild(wrapper);
}

function renderSurveyTargetUsers() {
  const container = document.getElementById("surveyTargetUsersCheckboxes");
  if (!container) return;
  container.innerHTML = "";

  const admins = getAdmins()
    .filter((admin) => admin?.email)
    .map((admin) => ({
      email: String(admin.email || "").trim().toLowerCase(),
      name: admin.fullName || `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.email,
      sites: Array.isArray(admin.allowedSites) && admin.allowedSites.length ? admin.allowedSites : (sites || []),
      isSuperAdmin: admin.isSuperAdmin === true,
    }))
    .filter((admin, index, list) => admin.email && list.findIndex((entry) => entry.email === admin.email) === index)
    .sort((a, b) => compareNaturally(a.name, b.name));

  const hint = document.getElementById("surveyCurrentSiteHint");
  if (hint) hint.textContent = `${t("tidplanSiteSelector")}: ${currentSite}`;

  if (!admins.length) {
    container.innerHTML = `<div class="notification-empty">Nema korisnika za odabir.</div>`;
    return;
  }

  admins.forEach((user) => {
    const label = document.createElement("label");
    label.className = "survey-user-row";
    label.dataset.sites = (user.sites || []).join("|");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = user.email;
    checkbox.dataset.surveyUser = "true";
    checkbox.dataset.siteMember = user.isSuperAdmin || (user.sites || []).includes(currentSite) ? "true" : "false";

    const name = document.createElement("span");
    name.className = "survey-user-name";
    name.textContent = user.name;

    const userSites = document.createElement("span");
    userSites.className = "survey-user-site";
    userSites.textContent = user.isSuperAdmin ? "Sva gradilista" : (user.sites || []).join(", ");

    label.appendChild(checkbox);
    label.appendChild(name);
    label.appendChild(userSites);
    container.appendChild(label);
  });

  syncSurveyTargetSelection();
}

function setSurveyUserCheckboxes(predicate) {
  document
    .querySelectorAll("#surveyTargetUsersCheckboxes input[data-survey-user]")
    .forEach((checkbox) => {
      checkbox.checked = Boolean(predicate(checkbox));
    });
}

function syncSurveyTargetSelection() {
  const targetAll = document.getElementById("surveyTargetAll")?.checked === true;
  const targetSite = document.getElementById("surveyTargetSite")?.checked === true;
  if (targetAll) {
    setSurveyUserCheckboxes(() => true);
  } else if (targetSite) {
    setSurveyUserCheckboxes((checkbox) => checkbox.dataset.siteMember === "true");
  }
}

function setupSurveyTargetHandlers() {
  const targetAll = document.getElementById("surveyTargetAll");
  const targetSite = document.getElementById("surveyTargetSite");
  if (targetAll && !targetAll.dataset.boundSurveyTargets) {
    targetAll.dataset.boundSurveyTargets = "true";
    targetAll.addEventListener("change", () => {
      if (targetAll.checked && targetSite) targetSite.checked = false;
      if (targetAll.checked) setSurveyUserCheckboxes(() => true);
      else setSurveyUserCheckboxes(() => false);
    });
  }
  if (targetSite && !targetSite.dataset.boundSurveyTargets) {
    targetSite.dataset.boundSurveyTargets = "true";
    targetSite.addEventListener("change", () => {
      if (targetSite.checked && targetAll) targetAll.checked = false;
      if (targetSite.checked) setSurveyUserCheckboxes((checkbox) => checkbox.dataset.siteMember === "true");
      else setSurveyUserCheckboxes(() => false);
    });
  }
}

function renderSurveysList() {
  const container = document.getElementById("surveysList");
  if (!container) return;

  getSurveysList().then((surveys) => {
    if (!surveys || surveys.length === 0) {
      container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-light);">Nema objavljenih anketa.</div>`;
      return;
    }

    container.innerHTML = "";

    surveys.forEach((survey) => {
      const card = document.createElement("div");
      card.className = "notification-card";
      card.style.marginBottom = "16px";

      // Header with pin status
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.marginBottom = "12px";

      const title = document.createElement("h4");
      title.textContent = `${survey.pinned ? "📌 " : ""}Anketa: ${survey.question?.substring(0, 50)}...`;
      header.appendChild(title);

      card.appendChild(header);

      // Time window
      const times = document.createElement("div");
      times.style.fontSize = "12px";
      times.style.color = "var(--text-light)";
      times.style.marginBottom = "8px";

      const startDate = new Date(survey.startAt);
      const endDate = new Date(survey.endAt);
      const now = new Date();

      let statusText = "";
      if (now < startDate) {
        statusText = `Počinje: ${startDate.toLocaleString(getCurrentLocale())}`;
      } else if (now > endDate) {
        statusText = `Završena`;
      } else {
        statusText = `Aktivna do: ${endDate.toLocaleString(getCurrentLocale())}`;
      }

      times.textContent = statusText;
      card.appendChild(times);

      const author = document.createElement("div");
      author.className = "survey-author";
      author.textContent = `Objavio: ${survey.createdByName || survey.createdBy || "-"}`;
      card.appendChild(author);

      // Answers
      if (survey.answers && survey.answers.length > 0) {
        const answersDiv = document.createElement("div");
        answersDiv.style.marginBottom = "12px";

        if (survey.active && !survey.myVote) {
          const subtitle = document.createElement("div");
          subtitle.style.fontSize = "14px";
          subtitle.style.marginBottom = "8px";
          subtitle.textContent = "Odaberi odgovor:";
          answersDiv.appendChild(subtitle);

          survey.answers.forEach((answer) => {
            const label = document.createElement("label");
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.marginBottom = "6px";
            label.style.cursor = "pointer";
            label.style.padding = "8px";
            label.style.borderRadius = "6px";
            label.style.backgroundColor = "var(--hover-bg)";

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = `survey_${survey.id}`;
            radio.value = answer.id;
            radio.style.marginRight = "8px";
            radio.addEventListener("change", () => {
              voteSurvey(survey.id, answer.id);
            });

            label.appendChild(radio);
            const span = document.createElement("span");
            span.textContent = answer.text;
            label.appendChild(span);
            answersDiv.appendChild(label);
          });
        } else if (survey.results && survey.results.length > 0) {
          const resultsTitle = document.createElement("div");
          resultsTitle.style.fontSize = "14px";
          resultsTitle.style.fontWeight = "600";
          resultsTitle.style.marginBottom = "8px";
          resultsTitle.textContent = survey.myVote ? "Moj odgovor: " + (survey.results.find(r => r.id === survey.myVote)?.text || "?") : "Rezultati:";
          answersDiv.appendChild(resultsTitle);

          survey.results.forEach((result) => {
            const totalVotes = survey.results.reduce((sum, r) => sum + r.count, 0);
            const percentage = totalVotes > 0 ? Math.round((result.count / totalVotes) * 100) : 0;

            const resultDiv = document.createElement("div");
            resultDiv.style.marginBottom = "8px";

            const labelDiv = document.createElement("div");
            labelDiv.style.fontSize = "13px";
            labelDiv.style.marginBottom = "4px";
            labelDiv.textContent = `${result.text}: ${result.count} (${percentage}%)`;
            resultDiv.appendChild(labelDiv);

            const barDiv = document.createElement("div");
            barDiv.style.height = "6px";
            barDiv.style.backgroundColor = "var(--border-color)";
            barDiv.style.borderRadius = "3px";
            barDiv.style.overflow = "hidden";

            const fillDiv = document.createElement("div");
            fillDiv.style.height = "100%";
            fillDiv.style.width = `${percentage}%`;
            fillDiv.style.backgroundColor = "#4CAF50";
            barDiv.appendChild(fillDiv);
            resultDiv.appendChild(barDiv);

            answersDiv.appendChild(resultDiv);
          });
        }

        card.appendChild(answersDiv);
      }

      // Actions (pin/delete for admin level 6+)
      if (survey.canDelete || survey.canPin) {
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.marginTop = "12px";
        actions.style.borderTop = "1px solid var(--border-color)";
        actions.style.paddingTop = "12px";

        if (survey.canPin) {
          const pinBtn = document.createElement("button");
          pinBtn.className = "btn btn-small";
          pinBtn.textContent = survey.pinned ? "Ukloni pin" : "Piniraj";
          pinBtn.onclick = () => toggleSurveyPin(survey.id, !survey.pinned);
          actions.appendChild(pinBtn);
        }

        if (survey.canDelete) {
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "btn btn-small btn-danger";
          deleteBtn.textContent = "Obriši";
          deleteBtn.onclick = () => deleteSurvey(survey.id);
          actions.appendChild(deleteBtn);
        }

        card.appendChild(actions);
      }

      container.appendChild(card);
    });
  });
}

function voteSurvey(surveyId, answerId) {
  if (!BACKEND_ENABLED) return;

  fetch(`/api/surveys/${encodeURIComponent(surveyId)}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answerId,
      site: currentSite,
    }),
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then(() => {
      showToast("Hvala na glasanju!", "success");
      getSurveysList().then(() => renderSurveysList());
    })
    .catch(() => {
      showToast("Greška pri glasanju.", "error");
    });
}

function toggleSurveyPin(surveyId, pinned) {
  if (!BACKEND_ENABLED) return;

  fetch(`/api/surveys/${encodeURIComponent(surveyId)}/pin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pinned,
      site: currentSite,
    }),
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then(() => {
      getSurveysList().then(() => renderSurveysList());
    })
    .catch(() => {
      showToast("Greška pri promjeni statusa.", "error");
    });
}

function deleteSurvey(surveyId) {
  showConfirm("Jeste li sigurni da želite obrisati ovu anketu?", null, "⚠️", () => {
    if (!BACKEND_ENABLED) return;

    fetch(`/api/surveys/${encodeURIComponent(surveyId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site: currentSite,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        showToast("Anketa je obrisana!", "success");
        getSurveysList().then(() => renderSurveysList());
      })
      .catch(() => {
        showToast("Greška pri brisanju ankete.", "error");
      });
  });
}

function showSurveys() {
  if (!hasPermission("canViewSurveys")) {
    showToast("Nemate pristup anketama.", "error");
    return;
  }

  withLoading("loadingNotifications", () => {
    const plannerSection = document.getElementById("planner-section");
    const listsContainer = document.querySelector(".lists-container");
    const binsSection = document.getElementById("binsSection");
    const tidplanSection = document.getElementById("tidplan-section");
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");

    if (tidplanSection) tidplanSection.style.display = "none";
    if (plannerSection) plannerSection.style.display = "none";
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "block";

    currentView = "surveys";
    saveCurrentView("surveys");
    pushRouteForView("surveys");

    setupSurveyTargetHandlers();
    renderSurveyTargetUsers();
    initSurveyDateTimePickers();

    getSurveysList().then(() => {
      renderSurveysList();
      markSurveysRead(surveysCache);
      const composer = document.getElementById("surveysComposer");
      if (composer) {
        composer.style.display = hasAdminPermission("canPublishSurveys") ? "block" : "none";
      }
    });

    sendPresence(true).catch(() => {});
  });
}
