function showTidplan() {
  if (!canAccessTidplanModule()) {
    showToast(t("accessTidplanDenied"), "error");
    return;
  }
  return loadFreshDataForView("loadingTidplan", () => {
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");
    const warehouseLogsSection = document.getElementById("warehouse-logs-section");
    const warehouseGraphSection = document.getElementById("warehouse-graph-section");
    if (notificationsSection) notificationsSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (currentView === "notifications") {
      currentView = "main";
      saveCurrentView("main");
    }
    document.getElementById("planner-section").style.display = "none";
    document.getElementById("tidplan-section").style.display = "block";
    currentView = "tidplan";
    saveCurrentView("tidplan");
    pushRouteForView("tidplan");
    updateTidplan();
    initTidplanResizer();
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  });
}

function showPlanner() {
  return loadFreshDataForView("loadingDefault", () => {
  const notificationsSection = document.getElementById("notifications-section");
  const surveysSection = document.getElementById("surveys-section");
  const warehouseSection = document.getElementById("warehouse-section");
  const warehouseLogsSection = document.getElementById("warehouse-logs-section");
  const warehouseGraphSection = document.getElementById("warehouse-graph-section");
  const tidplanSection = document.getElementById("tidplan-section");
  const plannerSection = document.getElementById("planner-section");
  if (notificationsSection) notificationsSection.style.display = "none";
  if (surveysSection) surveysSection.style.display = "none";
  if (warehouseSection) warehouseSection.style.display = "none";
  if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
  if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
  currentView = "main";
  if (tidplanSection) tidplanSection.style.display = "none";
  if (plannerSection) plannerSection.style.display = "block";
  applyPermissionVisibility();
  saveCurrentView("main");
  pushRouteForView("main");
  sendPresence(true).catch(() => {});
  refreshPresence().catch(() => {});
  });
}

function updateTidplan() {
  renderPastDayLockNotice("tidplan-section");
  renderLastEditedInfo();
  collectPlans();
  const editableTidplan = canEditTidplan();
  const locale = getCurrentLocale();

  // Display total present and available workers
  const presentWorkersEl = document.getElementById("totalPresentWorkers");
  const totalWorkersEl = document.getElementById("totalWorkers");
  if (presentWorkersEl && totalWorkersEl) {
    const dayData = getCurrentDayData();
    const activeWorkers = getActiveResourceList("workers", appState.currentDate);
    const presentCount = activeWorkers.filter(
      (w) => dayData.workerAttendance[w] !== false
    ).length;
    presentWorkersEl.textContent = presentCount;
    totalWorkersEl.textContent = activeWorkers.length;
    const availableWorkersWrap = presentWorkersEl.parentElement;
    if (availableWorkersWrap) {
      availableWorkersWrap.childNodes[0].textContent = `${t("tidplanAvailableWorkers")} `;
    }
  }

  const saveBtn = document.getElementById("btnSaveTidplan");
  if (saveBtn) {
    saveBtn.disabled = !editableTidplan || !tidplanDataChanged;
    saveBtn.style.opacity = saveBtn.disabled ? "0.6" : "1";
    saveBtn.style.cursor = saveBtn.disabled ? "not-allowed" : "pointer";
  }

  const headerTitle = document.getElementById("tidplanTitle");
  if (headerTitle)
    headerTitle.textContent = `${t("tidplanTitle")} - ${currentSite}`;
  const tidplanSiteEl = document.getElementById("tidplanSite");
  if (tidplanSiteEl) tidplanSiteEl.textContent = currentSite;
  const tidplanSiteLabel = document.getElementById("tidplanSiteLabel");
  if (tidplanSiteLabel)
    tidplanSiteLabel.textContent = `${t("tidplanSiteLabel")} `;
  const tidplanDateLabel = document.getElementById("tidplanDateLabel");
  if (tidplanDateLabel)
    tidplanDateLabel.textContent = `${t("tidplanDateLabel")} `;
  const tidplanDateEl = document.getElementById("tidplanDate");
  if (tidplanDateEl)
    tidplanDateEl.textContent = new Date().toLocaleDateString(locale);

  const btnAdd = document.getElementById("btnAddTidplanActivity");
  if (btnAdd) {
    btnAdd.textContent = t("tidplanAddActivity");
    btnAdd.disabled = !editableTidplan || !hasPermission("canAddTidplanActivity");
  }
  const btnManageZones = document.getElementById("btnManageZones");
  if (btnManageZones) {
    btnManageZones.textContent = t("tidplanManageZones");
    btnManageZones.disabled =
      !editableTidplan || !hasPermission("canManageTidplanZones");
  }
  const btnPrint = document.getElementById("btnPrintTidplan");
  if (btnPrint) {
    btnPrint.textContent = t("tidplanPrint");
    btnPrint.disabled = !hasPermission("canPrintTidplan");
  }
  const btnBack = document.getElementById("btnBackToPlanner");
  if (btnBack) btnBack.textContent = t("tidplanBackToPlanner");
  const btnSort = document.getElementById("btnSortTidplan");
  if (btnSort) btnSort.textContent = t("tidplanSort");
  const btnClear = document.getElementById("btnClearTidplan");
  if (btnClear) btnClear.textContent = t("tidplanClearPlan");
  const btnSave = document.getElementById("btnSaveTidplan");
  if (btnSave) btnSave.textContent = t("tidplanSave");

  const btnTidplanExportPdf = document.getElementById("btnTidplanExportPdf");
  if (btnTidplanExportPdf) btnTidplanExportPdf.textContent = t("tidplanExportPdf");
  const btnTidplanImportPdf = document.getElementById("btnTidplanImportPdf");
  if (btnTidplanImportPdf) btnTidplanImportPdf.textContent = t("tidplanImportPdf");
  const sortPanelHeader = document.querySelector(
    "#tidplanSortOptions .sort-panel-header",
  );
  if (sortPanelHeader) sortPanelHeader.textContent = t("tidplanSortBy");

  const applySortBtn = document.querySelector(
    "#tidplanSortOptions .btn.btn-small",
  );
  if (applySortBtn) applySortBtn.textContent = t("tidplanApplySort");

  const zoneManagerTitle = document.querySelector("#zoneManagerPanel strong");
  if (zoneManagerTitle) {
    zoneManagerTitle.textContent = t("tidplanZoneManagerTitle");
  }

  const zoneManagerCloseBtn = document.querySelector(
    "#zoneManagerPanel .btn.btn-small",
  );
  if (zoneManagerCloseBtn) zoneManagerCloseBtn.textContent = t("tidplanClose");

  const zoneNameInput = document.getElementById("newZoneName");
  if (zoneNameInput) {
    zoneNameInput.placeholder = t("tidplanZoneNamePlaceholder");
  }

  const addZoneBtn = document.querySelector(".zone-input-group .btn.btn-small");
  if (addZoneBtn) addZoneBtn.textContent = t("tidplanAddZone");

  if (btnClear)
    btnClear.disabled = !editableTidplan || !hasPermission("canClearTidplan");

  const zoneManagerPanel = document.getElementById("zoneManagerPanel");
  if (zoneManagerPanel && !editableTidplan) {
    zoneManagerPanel.style.display = "none";
  }

  populateFilters();
  renderZoneList();
  renderTidplanTable();
  renderTidplanTimeline();

  // Initialize flatpickr for tidplan date inputs
  setTimeout(() => initTidplanDatePickers(), 10);

  // Setup scroll synchronization between left panel and timeline
  setTimeout(() => {
    syncTidplanScroll();
  }, 50);
}

function syncTidplanScroll() {
  const leftPanel = document.querySelector(".tidplan-left-panel");
  const timeline = document.getElementById("tidplanTimeline");

  if (!leftPanel || !timeline) return;

  let syncing = false;

  const syncFromLeft = () => {
    if (syncing) return;
    syncing = true;
    timeline.scrollTop = leftPanel.scrollTop;
    syncing = false;
  };

  const syncFromRight = () => {
    if (syncing) return;
    syncing = true;
    leftPanel.scrollTop = timeline.scrollTop;
    syncing = false;
  };

  leftPanel.onscroll = syncFromLeft;
  timeline.onscroll = syncFromRight;
  timeline.scrollTop = leftPanel.scrollTop;
}

var tidplanSortCriteria = [];

function openTidplanSortMenu() {
  const sortOptions = document.getElementById("tidplanSortOptions");
  if (!sortOptions) return;

  sortOptions.classList.add("show");
  sortOptions.style.right = "0";
  sortOptions.style.left = "auto";

  // Auto flip if left edge overflows viewport
  const rect = sortOptions.getBoundingClientRect();
  if (rect.left < 8) {
    sortOptions.style.left = "0";
    sortOptions.style.right = "auto";
    sortOptions.classList.add("flip-left");
  } else {
    sortOptions.classList.remove("flip-left");
  }
}

function closeTidplanSortMenu() {
  const sortOptions = document.getElementById("tidplanSortOptions");
  if (!sortOptions) return;

  sortOptions.classList.remove("show");
}

function toggleTidplanSortMenu() {
  const sortOptions = document.getElementById("tidplanSortOptions");
  if (!sortOptions) return;

  if (sortOptions.classList.contains("show")) {
    closeTidplanSortMenu();
  } else {
    openTidplanSortMenu();
  }
}

function applyTidplanSort() {
  const checkboxes = document.querySelectorAll(
    "#tidplanSortOptions input[type='checkbox']",
  );
  tidplanSortCriteria = Array.from(checkboxes)
    .filter((c) => c.checked)
    .map((c) => c.value);

  // Close the dropdown
  document.getElementById("tidplanSortOptions").classList.remove("show");

  // Refresh the table with new sorting
  updateTidplan();
}

function getFilteredTidplanData() {
  let filteredData = (tidplanData || []).slice();

  const filterPlan = (document.getElementById("filterPlan")?.value || "").trim();
  const filterZona = (document.getElementById("filterZona")?.value || "").trim();
  const filterMoment = (document.getElementById("filterMoment")?.value || "").trim();

  const normalize = (value) => (value || "").toString().trim().toLowerCase();
  const matchesFilter = (target, filter) => {
    if (!filter) return true;
    const t = normalize(target);
    const f = normalize(filter);
    return t === f;
  };

  if (filterPlan && filterPlan !== "-") {
    filteredData = filteredData.filter((d) => matchesFilter(d.plan, filterPlan));
  }

  if (filterZona && filterZona !== "-") {
    filteredData = filteredData.filter((d) => matchesFilter(d.zona, filterZona));
  }

  if (filterMoment && filterMoment !== "-") {
    filteredData = filteredData.filter((d) => matchesFilter(d.moment, filterMoment));
  }

  if (filterPlan || filterZona || filterMoment) {
    console.debug(
      "Tidplan filter:",
      { filterPlan, filterZona, filterMoment },
      " -> records:",
      filteredData.length,
    );
  }

  if (tidplanSortCriteria.length) {
    filteredData.sort((a, b) => {
      for (const key of tidplanSortCriteria) {
        const aVal = (a[key] || "").toString();
        const bVal = (b[key] || "").toString();
        if (key === "resursi") {
          const numA = Number(aVal) || 0;
          const numB = Number(bVal) || 0;
          if (numA !== numB) return numA - numB;
        } else if (key === "start" || key === "end") {
          const dA = aVal ? new Date(aVal) : new Date(0);
          const dB = bVal ? new Date(bVal) : new Date(0);
          if (dA - dB !== 0) return dA - dB;
        } else {
          const comp = compareNaturally(aVal, bVal);
          if (comp !== 0) return comp;
        }
      }
      return 0;
    });
  }

  return filteredData;
}

function isTidplanActivityInactive(activity) {
  return activity && activity.active === false;
}

function getWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getSaturdayBetween(year, startMonthIndex, startDay, endMonthIndex, endDay) {
  const date = new Date(year, startMonthIndex, startDay);
  const end = new Date(year, endMonthIndex, endDay);
  while (date <= end) {
    if (date.getDay() === 6) return new Date(date);
    date.setDate(date.getDate() + 1);
  }
  return null;
}

function getSwedishHolidayMap(year) {
  window.swedishHolidayCache = window.swedishHolidayCache || {};
  if (window.swedishHolidayCache[year]) {
    return window.swedishHolidayCache[year];
  }

  const holidays = new Map([
    [`${year}-01-01`, "Nyarsdagen"],
    [`${year}-01-06`, "Trettondedag jul"],
    [`${year}-05-01`, "Forsta maj"],
    [`${year}-06-06`, "Sveriges nationaldag"],
    [`${year}-12-25`, "Juldagen"],
    [`${year}-12-26`, "Annandag jul"],
  ]);

  const easterSunday = getEasterSunday(year);
  [
    [-2, "Langfredagen"],
    [0, "Paskdagen"],
    [1, "Annandag pask"],
    [39, "Kristi himmelsfards dag"],
  ].forEach(([offset, name]) => {
    const holiday = new Date(easterSunday);
    holiday.setDate(holiday.getDate() + offset);
    holidays.set(getDateKey(holiday), name);
  });

  const midsummerDay = getSaturdayBetween(year, 5, 20, 5, 26);
  if (midsummerDay) {
    holidays.set(getDateKey(midsummerDay), "Midsommardagen");
  }

  const allSaintsDay = getSaturdayBetween(year, 9, 31, 10, 6);
  if (allSaintsDay) {
    holidays.set(getDateKey(allSaintsDay), "Alla helgons dag");
  }

  window.swedishHolidayCache[year] = holidays;
  return holidays;
}

function getSwedishDayMeta(date) {
  const holidayName = getSwedishHolidayMap(date.getFullYear()).get(getDateKey(date)) || "";
  return {
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
    isHoliday: Boolean(holidayName),
    holidayName,
  };
}

function populateFilters() {
  const filterPlan = document.getElementById("filterPlan");
  const filterZona = document.getElementById("filterZona");
  const filterMoment = document.getElementById("filterMoment");

  const selectedPlan = filterPlan ? filterPlan.value : "";
  const selectedZona = filterZona ? filterZona.value : "";
  const selectedMoment = filterMoment ? filterMoment.value : "";

  if (filterPlan) {
    filterPlan.innerHTML = `<option value="">-</option>`;
    sortNaturally(availablePlans).forEach((plan) => {
      const option = document.createElement("option");
      option.value = plan;
      option.textContent = plan;
      filterPlan.appendChild(option);
    });
    if (selectedPlan) {
      filterPlan.value = selectedPlan;
    } else {
      filterPlan.value = "";
    }
  }

  if (filterZona) {
    filterZona.innerHTML = `<option value="">-</option>`;

    const zoneSet = new Set();
    (tidplanZones || []).forEach((zone) => {
      if (zone && zone.name) zoneSet.add(zone.name.toString().trim());
    });
    (tidplanData || []).forEach((row) => {
      if (row && row.zona && row.zona.toString().trim())
        zoneSet.add(row.zona.toString().trim());
    });

    Array.from(zoneSet)
      .sort((a, b) => compareNaturally(a, b))
      .forEach((zoneName) => {
        const option = document.createElement("option");
        option.value = zoneName;
        option.textContent = zoneName;
        filterZona.appendChild(option);
      });

    if (selectedZona) filterZona.value = selectedZona;
  }

  if (filterMoment) {
    filterMoment.innerHTML = `<option value="">-</option>`;
    sortNaturally(Array.from(new Set(tidplanData.map((d) => d.moment) || []))).forEach(
      (moment) => {
        const option = document.createElement("option");
        option.value = moment;
        option.textContent = moment;
        filterMoment.appendChild(option);
      }
    );
    if (selectedMoment) {
      filterMoment.value = selectedMoment;
    } else {
      filterMoment.value = "";
    }
  }
}

function renderTidplanTimeline() {
  const locale = getCurrentLocale();
  // Display total present and available workers
  const presentWorkersEl = document.getElementById("totalPresentWorkers");
  const totalWorkersEl = document.getElementById("totalWorkers");
  if (presentWorkersEl && totalWorkersEl) {
    const dayData = getCurrentDayData();
    const activeWorkers = getActiveResourceList("workers", appState.currentDate);
    const presentCount = activeWorkers.filter(
      (w) => dayData.workerAttendance[w] !== false
    ).length;
    presentWorkersEl.textContent = presentCount;
    totalWorkersEl.textContent = activeWorkers.length;
  }

  // Calculate date range including all activities
  let minDate = new Date();
  minDate.setDate(minDate.getDate() - 14);
  let maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 14);
  tidplanData.forEach((activity) => {
    if (activity.start) {
      const start = new Date(activity.start);
      if (start < minDate) minDate = new Date(start);
    }
    if (activity.end) {
      const end = new Date(activity.end);
      if (end > maxDate) maxDate = new Date(end);
    }
  });
  // Extend by 1 week on each side
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 7);

  const days = [];
  for (
    let d = new Date(minDate);
    d <= maxDate;
    d.setDate(d.getDate() + 1)
  ) {
    days.push(new Date(d));
  }

  const weeks = {};
  days.forEach((day) => {
    const weekNum = getWeekNumber(day);
    if (!weeks[weekNum]) weeks[weekNum] = [];
    weeks[weekNum].push(day);
  });

  // Render header
  const header = document.getElementById("timelineHeader");
  header.innerHTML = "";
  header.style.width = days.length * 40 + "px";
  Object.keys(weeks).forEach((week) => {
    const weekDiv = document.createElement("div");
    weekDiv.className = "week-header";
    weekDiv.style.width = weeks[week].length * 40 + "px";
    weekDiv.style.minWidth = weeks[week].length * 40 + "px";
    weekDiv.style.maxWidth = weeks[week].length * 40 + "px";
    const weekLabel = document.createElement("div");
    weekLabel.className = "week-label";
    weekLabel.textContent = "V" + week;
    weekDiv.appendChild(weekLabel);
    const dayHeaders = document.createElement("div");
    dayHeaders.className = "day-headers";
    weeks[week].forEach((day) => {
      const dayHeader = document.createElement("div");
      dayHeader.className = "day-header";
      const dayMeta = getSwedishDayMeta(day);
      const dayName = document.createElement("span");
      dayName.className = "day-header-name";
      dayName.textContent = day.toLocaleDateString(locale, {
        weekday: "short",
      }).replace(".", "");

      const dayDate = document.createElement("span");
      dayDate.className = "day-header-date";
      dayDate.textContent = day.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });

      dayHeader.appendChild(dayName);
      dayHeader.appendChild(dayDate);
      if (dayMeta.isHoliday) {
        dayHeader.classList.add("is-holiday");
      } else if (dayMeta.isWeekend) {
        dayHeader.classList.add("is-weekend");
      }
      dayHeader.title = dayMeta.isHoliday
        ? `${day.toLocaleDateString(locale)} - ${dayMeta.holidayName}`
        : dayMeta.isWeekend
          ? `${day.toLocaleDateString(locale)} - ${t("weekendLabel")}`
          : day.toLocaleDateString(locale);
      if (day.toDateString() === new Date().toDateString()) {
        dayHeader.classList.add("today");
      }
      dayHeaders.appendChild(dayHeader);
    });
    weekDiv.appendChild(dayHeaders);
    header.appendChild(weekDiv);
  });

  // Render body
  const body = document.getElementById("timelineBody");
  body.innerHTML = "";
  body.style.width = days.length * 40 + "px";
  const filteredData = getFilteredTidplanData();
  const todayStr = new Date().toDateString();
  const todayIndex = days.findIndex((day) => day.toDateString() === todayStr);
  const dayMetaList = days.map((day) => getSwedishDayMeta(day));

  const appendTodayLine = (target) => {
    if (todayIndex < 0) return;
    const todayLine = document.createElement("div");
    todayLine.className = "today-line";
    todayLine.style.left = todayIndex * 40 + "px";
    target.appendChild(todayLine);
  };

  const appendDayHighlights = (target) => {
    dayMetaList.forEach((meta, dayIndex) => {
      if (!meta.isWeekend && !meta.isHoliday) return;
      const highlight = document.createElement("div");
      highlight.className = `timeline-day-highlight ${meta.isHoliday ? "is-holiday" : "is-weekend"}`;
      highlight.style.left = dayIndex * 40 + "px";
      target.appendChild(highlight);
    });
  };

  filteredData.forEach((activity, index) => {
    const row = document.createElement("div");
    row.className = `timeline-row${isTidplanActivityInactive(activity) ? " timeline-row-inactive" : ""}`;
    // Keep background white for better readability
    row.style.backgroundColor = "var(--card-bg)";
    appendDayHighlights(row);
    appendTodayLine(row);

    // Calculate bar position first to position zone indicator
    if (activity.start && activity.end) {
      const start = new Date(activity.start);
      const end = new Date(activity.end);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const startIndex = days.findIndex(
        (d) => d.toISOString().split("T")[0] === startStr,
      );
      const endIndex = days.findIndex(
        (d) => d.toISOString().split("T")[0] === endStr,
      );
      if (startIndex >= 0 && endIndex >= 0) {
        const left = startIndex * 40;
        const width = (endIndex - startIndex + 1) * 40;

        // Add zone indicator circle positioned 15px before the Gantt bar
        const zoneIndicator = document.createElement("div");
        zoneIndicator.className = "zone-indicator";
        zoneIndicator.style.backgroundColor = getZonaColor(activity.zona);
        zoneIndicator.style.left = (left - 15) + "px"; // 15px before Gantt bar start
        zoneIndicator.title = `Zona: ${activity.zona || "Nepoznata zona"}`;
        zoneIndicator.setAttribute("data-zone", activity.zona || "");
        row.appendChild(zoneIndicator);

        const bar = document.createElement("div");
        bar.className = `gantt-bar${isTidplanActivityInactive(activity) ? " gantt-bar-inactive" : ""}`;
        bar.style.left = left + "px";
        bar.style.width = width + "px";
        bar.style.backgroundColor = isTidplanActivityInactive(activity)
          ? "#98a2b3"
          : getActivityColor(
          activity.plan,
          activity.moment,
        );
        bar.textContent = activity.plan + " - " + activity.moment;
        bar.title = [
          `Plan: ${activity.plan || "-"}`,
          `Zona: ${activity.zona || "-"}`,
          `Karna: ${activity.karna || "-"}`,
          `Moment: ${activity.moment || "-"}`,
          `Resursi: ${activity.resursi || 0}`,
          `Komentar: ${activity.komentar || "-"}`,
        ].join("\n");
        row.appendChild(bar);

        const commentText = (activity.komentar || activity.comment || "").trim();
        if (commentText) {
          const commentEl = document.createElement("div");
          commentEl.className = "timeline-comment";
          commentEl.style.left = (left + width + 8) + "px";
          commentEl.textContent = commentText;
          commentEl.title = commentText;
          row.appendChild(commentEl);
        }
      } else {
        // No valid Gantt bar - place zone indicator at default position
        const zoneIndicator = document.createElement("div");
        zoneIndicator.className = "zone-indicator";
        zoneIndicator.style.backgroundColor = getZonaColor(activity.zona);
        zoneIndicator.style.left = "15px"; // Default position for rows without Gantt bars
        zoneIndicator.title = `Zona: ${activity.zona || "Nepoznata zona"}`;
        zoneIndicator.setAttribute("data-zone", activity.zona || "");
        row.appendChild(zoneIndicator);

        const commentText = (activity.komentar || activity.comment || "").trim();
        if (commentText) {
          const commentEl = document.createElement("div");
          commentEl.className = "timeline-comment";
          commentEl.style.left = "8px";
          commentEl.textContent = commentText;
          commentEl.title = commentText;
          row.appendChild(commentEl);
        }
      }
    } else {
      // No start/end dates - place zone indicator at default position
      const zoneIndicator = document.createElement("div");
      zoneIndicator.className = "zone-indicator";
      zoneIndicator.style.backgroundColor = getZonaColor(activity.zona);
      zoneIndicator.style.left = "15px"; // Default position for rows without dates
      zoneIndicator.title = `Zona: ${activity.zona || "Nepoznata zona"}`;
      zoneIndicator.setAttribute("data-zone", activity.zona || "");
      row.appendChild(zoneIndicator);
    }
    body.appendChild(row);
  });

  // Add resource summary footer using present workers on current date
  const dayData = getCurrentDayData();
  const presentWorkers = getActiveResourceList("workers", appState.currentDate).filter(
    (w) => dayData.workerAttendance[w] !== false
  ).length;
  
  const footerRow = document.createElement("div");
  footerRow.className = "timeline-row timeline-resources-footer";
  footerRow.style.backgroundColor = "var(--header-bg)";
  footerRow.style.fontWeight = "bold";
  footerRow.style.borderTop = "2px solid var(--border-color)";
  footerRow.style.display = "flex";
  footerRow.style.alignItems = "center";
  appendDayHighlights(footerRow);
  appendTodayLine(footerRow);

  // Calculate daily resources needed
  days.forEach((day, dayIndex) => {
    const dayStr = day.toISOString().split("T")[0];
    let dailyNeeded = 0;

    filteredData.forEach((activity) => {
      if (isTidplanActivityInactive(activity)) return;
      if (activity.start && activity.end) {
        const start = new Date(activity.start).toISOString().split("T")[0];
        const end = new Date(activity.end).toISOString().split("T")[0];
        if (start <= dayStr && dayStr <= end) {
          dailyNeeded += parseInt(activity.resursi) || 0;
        }
      }
    });

    const cellDiv = document.createElement("div");
    cellDiv.style.flex = "0 0 40px";
    cellDiv.style.width = "40px";
    cellDiv.style.height = "30px";
    cellDiv.style.minWidth = "40px";
    cellDiv.style.maxWidth = "40px";
    cellDiv.style.boxSizing = "border-box";
    cellDiv.style.display = "flex";
    cellDiv.style.alignItems = "center";
    cellDiv.style.justifyContent = "center";
    cellDiv.style.fontSize = "12px";
    cellDiv.style.fontWeight = "bold";
    cellDiv.style.color = "#fff";
    cellDiv.style.borderRight = "1px solid var(--border-color)";
    const surplus = Math.max(presentWorkers - dailyNeeded, 0);
    const shortage = Math.max(dailyNeeded - presentWorkers, 0);
    const dayLabel = day.toLocaleDateString(locale);

    if (shortage > 0) {
      cellDiv.style.backgroundColor = "#d85d6d";
    } else if (surplus > 0) {
      cellDiv.style.backgroundColor = "#3a7afe";
    } else {
      cellDiv.style.backgroundColor = "#39b86f";
    }

    cellDiv.title = [
      `Datum: ${dayLabel}`,
      `Potrebno resursa: ${dailyNeeded}`,
      `Dostupno resursa: ${presentWorkers}`,
      `Visak resursa: ${surplus}`,
      `Manjak resursa: ${shortage}`,
    ].join("\n");

    cellDiv.textContent = dailyNeeded > 0 ? dailyNeeded : "0";

    footerRow.appendChild(cellDiv);
  })

  body.appendChild(footerRow);

  // Store days for reference
  window.tidplanDays = days;
}

function renderTidplanTable() {
  const editableTidplan = canEditTidplan();
  const tbody = document.getElementById("tidplanTbody");
  tbody.innerHTML = "";

  const filteredData = getFilteredTidplanData();
  if (!filteredData.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td colspan='9' style='text-align:center;color:#777;'>Nema aktivnosti</td>";
    tbody.appendChild(tr);
    return;
  }

  filteredData.forEach((activity) => {
    const tr = document.createElement("tr");
    tr.dataset.activityIndex = String(tidplanData.indexOf(activity));
    const activityIndex = Number(tr.dataset.activityIndex);
    tr.className = isTidplanActivityInactive(activity) ? "tidplan-row-inactive" : "";
    tr.style.backgroundColor = isTidplanActivityInactive(activity)
      ? "rgba(148, 163, 184, 0.2)"
      : getZonaColor(activity.zona);

    const tdPlan = document.createElement("td");
    tdPlan.className = "tidplan-cell-wide";
    const selectPlan = document.createElement("select");
    selectPlan.className = "tidplan-select";
    selectPlan.disabled = !editableTidplan;
    sortNaturally(availablePlans).forEach((plan) => {
      const option = document.createElement("option");
      option.value = plan;
      option.textContent = plan;
      if (plan === activity.plan) option.selected = true;
      selectPlan.appendChild(option);
    });
    selectPlan.addEventListener("change", () => {
      activity.plan = selectPlan.value;
      markTidplanChanged(activityIndex, "plan");
      updateTidplan();
    });
    tdPlan.appendChild(selectPlan);
    tr.appendChild(tdPlan);

    const tdZona = document.createElement("td");
    const selectZona = document.createElement("select");
    selectZona.className = "tidplan-select";
    selectZona.disabled = !editableTidplan;
    tidplanZones
      .slice()
      .sort((a, b) => compareNaturally(a.name, b.name))
      .forEach((zone) => {
        const option = document.createElement("option");
        option.value = zone.name;
        option.textContent = zone.name;
        if (zone.name === activity.zona) option.selected = true;
        selectZona.appendChild(option);
      });
    selectZona.addEventListener("change", () => {
      activity.zona = selectZona.value;
      markTidplanChanged(activityIndex, "zona");
      updateTidplan();
    });
    tdZona.appendChild(selectZona);
    tr.appendChild(tdZona);

    const tdKarna = document.createElement("td");
    tdKarna.className = "tidplan-cell-wide";
    const selectKarna = document.createElement("select");
    selectKarna.className = "tidplan-select";
    selectKarna.disabled = !editableTidplan;
    sortNaturally(availableKarne).forEach((karna) => {
      const option = document.createElement("option");
      option.value = karna;
      option.textContent = karna;
      if (karna === activity.karna) option.selected = true;
      selectKarna.appendChild(option);
    });
    selectKarna.addEventListener("change", () => {
      activity.karna = selectKarna.value;
      markTidplanChanged(activityIndex, "karna");
      updateTidplan();
    });
    tdKarna.appendChild(selectKarna);
    tr.appendChild(tdKarna);

    const tdMoment = document.createElement("td");
    tdMoment.className = "tidplan-cell-wide";
    const selectMoment = document.createElement("select");
    selectMoment.className = "tidplan-select";
    selectMoment.disabled = !editableTidplan;
    sortNaturally(availableMoments).forEach((moment) => {
      const option = document.createElement("option");
      option.value = moment;
      option.textContent = moment;
      if (moment === activity.moment) option.selected = true;
      selectMoment.appendChild(option);
    });
    selectMoment.addEventListener("change", () => {
      activity.moment = selectMoment.value;
      markTidplanChanged(activityIndex, "moment");
      updateTidplan();
    });
    tdMoment.appendChild(selectMoment);
    tr.appendChild(tdMoment);

    const tdResursi = document.createElement("td");
    const inputResursi = document.createElement("input");
    inputResursi.type = "number";
    inputResursi.value = activity.resursi || 1;
    inputResursi.min = 1;
    inputResursi.disabled = !editableTidplan;
    inputResursi.addEventListener("change", () => {
      activity.resursi = parseInt(inputResursi.value) || 1;
      markTidplanChanged(activityIndex, "resursi");
      updateTidplan();
    });
    tdResursi.appendChild(inputResursi);
    tr.appendChild(tdResursi);

    const tdStart = document.createElement("td");
    const inputStart = document.createElement("input");
    inputStart.type = "date";
    inputStart.value = activity.start || "";
    inputStart.disabled = !editableTidplan;
    inputStart.addEventListener("change", () => {
      activity.start = inputStart.value;
      markTidplanChanged(activityIndex, "start");
      updateTidplan();
    });
    tdStart.appendChild(inputStart);
    tr.appendChild(tdStart);

    const tdEnd = document.createElement("td");
    const inputEnd = document.createElement("input");
    inputEnd.type = "date";
    inputEnd.value = activity.end || "";
    inputEnd.disabled = !editableTidplan;
    inputEnd.addEventListener("change", () => {
      activity.end = inputEnd.value;
      markTidplanChanged(activityIndex, "end");
      updateTidplan();
    });
    tdEnd.appendChild(inputEnd);
    tr.appendChild(tdEnd);

    const tdKomentar = document.createElement("td");
    const inputKomentar = document.createElement("input");
    inputKomentar.type = "text";
    inputKomentar.placeholder = "Komentar...";
    inputKomentar.className = "tidplan-comment-input";
    inputKomentar.value = activity.komentar || "";
    inputKomentar.disabled = !editableTidplan;
    inputKomentar.addEventListener("change", () => {
      activity.komentar = inputKomentar.value;
      markTidplanChanged(activityIndex, "komentar");
      updateTidplan();
    });
    tdKomentar.appendChild(inputKomentar);
    tr.appendChild(tdKomentar);

    const tdActions = document.createElement("td");
    const btnToggleActive = document.createElement("button");
    btnToggleActive.className = `btn btn-small ${isTidplanActivityInactive(activity) ? "" : "btn-secondary"}`;
    btnToggleActive.disabled = !editableTidplan;
    btnToggleActive.textContent = isTidplanActivityInactive(activity) ? "Uključi" : "Isključi";
    btnToggleActive.addEventListener("click", () => toggleTidplanActivityActive(Number(tr.dataset.activityIndex)));
    tdActions.appendChild(btnToggleActive);

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn btn-small btn-danger";
    btnDelete.disabled =
      !editableTidplan || !hasPermission("canDeleteTidplanActivity");
    btnDelete.textContent = "−";
    btnDelete.addEventListener("click", () => {
      const toDeleteIndex = Number(tr.dataset.activityIndex);
      if (toDeleteIndex >= 0) {
        tidplanData.splice(toDeleteIndex, 1);
        markTidplanChanged(toDeleteIndex, "activity");
        updateTidplan();
      }
    });
    tdActions.appendChild(document.createTextNode(" "));
    tdActions.appendChild(btnDelete);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  // Initialize flatpickr for date inputs
  setTimeout(() => initTidplanDatePickers(), 10);
}

function getActivityColor(plan, moment) {
  // Generate color based on moment only (not plan+moment combination)
  const combined = moment || "none";
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Increased saturation and lightness for stronger colors
  return `hsl(${hue}, 85%, 48%)`;
}

function addTidplanActivity() {
  if (!canEditTidplan() || !hasPermission("canAddTidplanActivity")) return;
  const defaultZone = tidplanZones[0] ? tidplanZones[0].name : "Zona A";
  const defaultKarna = availableKarne[0] || "Karna 1";
  tidplanData.push({
    plan: "",
    zona: defaultZone,
    karna: defaultKarna,
    moment: "",
    resursi: 1,
    start: "",
    end: "",
    komentar: "",
    active: true,
  });
  markTidplanChanged(tidplanData.length - 1, "activity");
  updateTidplan();
}

function toggleTidplanActivityActive(activityIndex) {
  const activity = tidplanData[activityIndex];
  if (!activity || !canEditTidplan()) return;

  const nextActive = isTidplanActivityInactive(activity);
  const message = nextActive
    ? "Jeste li sigurni da zelite ponovno ukljuciti ovu aktivnost?"
    : "Jeste li sigurni da zelite iskljuciti ovu aktivnost? Vise se nece racunati u resurse i vrijeme.";

  showConfirm(message, null, "⚠️", () => {
    activity.active = nextActive;
    markTidplanChanged(activityIndex, "active");
    updateTidplan();
  });
}

function syncTidplanTableToState() {
  const rows = document.querySelectorAll("#tidplanTbody tr[data-activity-index]");
  rows.forEach((row) => {
    const activityIndex = Number(row.dataset.activityIndex);
    if (!Number.isInteger(activityIndex) || activityIndex < 0 || !tidplanData[activityIndex]) {
      return;
    }

    const cells = row.querySelectorAll("td");
    const activity = tidplanData[activityIndex];
    const planSelect = cells[0]?.querySelector("select");
    const zonaSelect = cells[1]?.querySelector("select");
    const karnaSelect = cells[2]?.querySelector("select");
    const momentSelect = cells[3]?.querySelector("select");
    const resursiInput = cells[4]?.querySelector("input");
    const startInput = cells[5]?.querySelector("input");
    const endInput = cells[6]?.querySelector("input");
    const komentarInput = cells[7]?.querySelector("input");

    if (planSelect) activity.plan = planSelect.value;
    if (zonaSelect) activity.zona = zonaSelect.value;
    if (karnaSelect) activity.karna = karnaSelect.value;
    if (momentSelect) activity.moment = momentSelect.value;
    if (resursiInput) activity.resursi = parseInt(resursiInput.value, 10) || 1;
    if (startInput) activity.start = startInput.value;
    if (endInput) activity.end = endInput.value;
    if (komentarInput) activity.komentar = komentarInput.value;
    if (typeof activity.active !== "boolean") activity.active = true;
  });
}

function saveTidplanData() {
  if (!canEditTidplan()) return;
  syncTidplanTableToState();
  localStorage.setItem(
    getStorageKey("tidplan"),
    JSON.stringify(tidplanData),
  );
  saveTidplanZones();
  tidplanDataChanged = false;

  // Flash success state
  const saveBtn = document.getElementById("btnSaveTidplan");
  if (saveBtn) {
    const originalBg = saveBtn.style.background;
    const originalOpacity = saveBtn.style.opacity;
    saveBtn.style.background =
      "linear-gradient(135deg, #27ae60, #2ecc71)";
    saveBtn.style.opacity = "1";
    saveBtn.disabled = true;
    saveBtn.style.cursor = "not-allowed";

    setTimeout(() => {
      saveBtn.style.background = originalBg;
      saveBtn.style.opacity = originalOpacity;
    }, 2000);
  }

  syncServerState().catch(() => {});
  showToast("✅ Plan je uspješno spremljen!", "success");
}

function markTidplanChanged(activityIndex = null, fieldName = "") {
  if (!canEditTidplan()) return;
  if (activityIndex !== null && activityIndex !== undefined) {
    trackLocalEditKey(makeTidplanEditKey(activityIndex, fieldName));
  }
  tidplanDataChanged = true;
  trackEditActivity();
  const saveBtn = document.getElementById("btnSaveTidplan");
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.style.opacity = "1";
    saveBtn.style.cursor = "pointer";
  }
}

function clearTidplan() {
  if (!canEditTidplan() || !hasPermission("canClearTidplan")) return;
  showConfirm(
    "Jeste li sigurni da želite očistiti sve aktivnosti u planu? Ova radnja se ne može poništiti!",
    null,
    "⚠️",
    () => {
      tidplanData = [];
      saveTidplanData();
      updateTidplan();
      showToast("🗑️ Plan je očišćen!", "success");
    },
  );
}

function printTidplan() {
  if (!hasPermission("canPrintTidplan")) {
    showToast(t("accessTidplanPrintDenied"), "error");
    return;
  }
  showConfirm(
    "Da = print cijelog Tidplana. Ne = print trenutnog prikaza s aktivnim filterima.",
    "Print Tidplan",
    "🖨️",
    () => printTidplanDocument("full"),
    () => printTidplanDocument("current"),
  );
}

function getTidplanPrintDateRange(activities) {
  const validDates = [];
  (activities || []).forEach((activity) => {
    if (activity.start) validDates.push(new Date(`${activity.start}T00:00:00`));
    if (activity.end) validDates.push(new Date(`${activity.end}T00:00:00`));
  });
  if (!validDates.length) {
    const today = new Date();
    return { start: new Date(today.getFullYear(), today.getMonth(), today.getDate()), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14) };
  }
  const min = new Date(Math.min(...validDates.map((date) => date.getTime())));
  const max = new Date(Math.max(...validDates.map((date) => date.getTime())));
  min.setDate(min.getDate() - 2);
  max.setDate(max.getDate() + 2);
  return { start: min, end: max };
}

function buildTidplanPrintDays(activities) {
  const { start, end } = getTidplanPrintDateRange(activities);
  const days = [];
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    days.push(new Date(day));
  }
  return days;
}

function chunkTidplanPrintDays(days, size) {
  const chunks = [];
  for (let i = 0; i < days.length; i += size) {
    chunks.push(days.slice(i, i + size));
  }
  return chunks;
}

function printTidplanTimelineView() {
  const activities = (getFilteredTidplanData() || []).filter((activity) => activity && !isTidplanActivityInactive(activity));
  const locale = getCurrentLocale();
  const days = buildTidplanPrintDays(activities);
  const dayChunks = chunkTidplanPrintDays(days, 14);
  const formatDay = (date) => date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  const formatWeekday = (date) => date.toLocaleDateString(locale, { weekday: "short" });

  const pages = dayChunks.map((chunk, pageIndex) => {
    const headers = chunk.map((day) => {
      const meta = getSwedishDayMeta(day);
      const classes = ["day-head"];
      if (day.getDay() === 0 || day.getDay() === 6 || meta.isHoliday) classes.push("off-day");
      return `<th class="${classes.join(" ")}"><span>${escapeHtml(formatWeekday(day))}</span><strong>${escapeHtml(formatDay(day))}</strong></th>`;
    }).join("");

    const rows = activities.map((activity, index) => {
      const color = getActivityColor(activity.plan, activity.moment);
      const start = activity.start ? new Date(`${activity.start}T00:00:00`) : null;
      const end = activity.end ? new Date(`${activity.end}T00:00:00`) : start;
      const cells = chunk.map((day) => {
        const meta = getSwedishDayMeta(day);
        const classes = ["timeline-cell"];
        const active = start && end && day >= start && day <= end;
        if (active) classes.push("active");
        if (day.getDay() === 0 || day.getDay() === 6 || meta.isHoliday) classes.push("off-day");
        return `<td class="${classes.join(" ")}" style="${active ? `background:${color};` : ""}">${active ? escapeHtml(String(activity.resursi || "")) : ""}</td>`;
      }).join("");

      return `
        <tr>
          <td class="row-num">${index + 1}</td>
          <td class="left-plan"><span class="color-dot" style="background:${color};"></span>${escapeHtml(activity.plan || "-")}</td>
          <td>${escapeHtml(activity.zona || "-")}</td>
          <td>${escapeHtml(activity.karna || "-")}</td>
          <td>${escapeHtml(activity.moment || "-")}</td>
          <td class="res-cell">${Number(activity.resursi) || ""}</td>
          ${cells}
          <td class="comment-cell">${escapeHtml(activity.komentar || activity.comment || "")}</td>
        </tr>
      `;
    }).join("");

    const weekRange = chunk.length
      ? `Tjedan ${getWeekNumber(chunk[0])}${getWeekNumber(chunk[0]) !== getWeekNumber(chunk[chunk.length - 1]) ? ` - ${getWeekNumber(chunk[chunk.length - 1])}` : ""}`
      : "";

    return `
      <section class="print-page">
        ${getCmaxPrintHeaderHtml(currentSite, formatCmaxPrintDate(new Date()))}
        <div class="meta">
          <span>Tidplan - trenutni prikaz</span>
          <span>${escapeHtml(weekRange)}</span>
          <span>${escapeHtml(new Date().toLocaleString(locale))}</span>
          <span>Aktivnosti: ${activities.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="row-num">#</th>
              <th class="left-plan">Plan</th>
              <th>Zona</th>
              <th>Karna</th>
              <th>Moment</th>
              <th class="res-cell">Res</th>
              ${headers}
              <th class="comment-cell">Komentar</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td class="empty" colspan="${7 + chunk.length}">Nema aktivnosti za trenutni prikaz.</td></tr>`}
          </tbody>
        </table>
        <div class="page-foot">${pageIndex + 1} / ${dayChunks.length || 1}</div>
      </section>
    `;
  }).join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tidplan trenutni prikaz ${escapeHtml(currentSite)}</title>
        <style>
          ${getCmaxPrintHeaderCss()}
          @page { size: A4 landscape; margin: 7mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; background: #fff; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
          .header { border-bottom: 3px solid #667eea; padding-bottom: 6px; margin-bottom: 8px; }
          h1 { font-size: 18px; margin: 0 0 4px; color: #101828; }
          .meta { font-size: 11px; color: #667085; display: flex; gap: 14px; flex-wrap: wrap; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5px; }
          th, td { border: 1px solid #cfd6e4; padding: 4px 3px; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; }
          th { background: #eef2ff; color: #26335f; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tbody tr:nth-child(even) td { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr { page-break-inside: avoid; }
          .row-num { width: 7mm; text-align: center; }
          .left-plan { width: 24mm; white-space: nowrap; }
          th:nth-child(3), td:nth-child(3) { width: 17mm; }
          th:nth-child(4), td:nth-child(4) { width: 17mm; }
          th:nth-child(5), td:nth-child(5) { width: 23mm; }
          .res-cell { width: 9mm; text-align: center; }
          .day-head { width: 8.5mm; text-align: center; padding: 3px 1px; }
          .day-head span { display: block; font-size: 7px; color: #667085; text-transform: uppercase; }
          .day-head strong { display: block; font-size: 8px; color: #101828; }
          .timeline-cell { width: 8.5mm; height: 8mm; text-align: center; color: #fff; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .timeline-cell.off-day:not(.active), .day-head.off-day { background: #f3f4f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .color-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: middle; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .comment-cell { width: 24mm; white-space: normal; }
          .empty { text-align: center; padding: 16px; color: #667085; }
          .page-foot { margin-top: 5px; font-size: 9px; color: #667085; text-align: right; }
        </style>
      </head>
      <body>
        ${pages || `<section class="print-page">${getCmaxPrintHeaderHtml(currentSite, formatCmaxPrintDate(new Date()))}<div class="empty">Nema aktivnosti za trenutni prikaz.</div></section>`}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}

function printTidplanDocument(mode = "current") {
  if (mode === "current") {
    printTidplanTimelineView();
    return;
  }
  const sourceActivities = mode === "full" ? tidplanData : getFilteredTidplanData();
  const activities = (sourceActivities || []).filter((activity) => activity && !isTidplanActivityInactive(activity));
  const locale = getCurrentLocale();
  const dateLabel = (value) => {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isFinite(date.getTime())) return value;
    return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const activityRows = activities.map((activity, index) => {
    const color = getActivityColor(activity.plan, activity.moment);
    return `
      <tr>
        <td class="num">${index + 1}</td>
        <td class="color"><span style="background:${color};"></span></td>
        <td>${escapeHtml(activity.plan || "-")}</td>
        <td>${escapeHtml(activity.zona || "-")}</td>
        <td>${escapeHtml(activity.karna || "-")}</td>
        <td>${escapeHtml(activity.moment || "-")}</td>
        <td class="num">${Number(activity.resursi) || 0}</td>
        <td>${escapeHtml(dateLabel(activity.start))}</td>
        <td>${escapeHtml(dateLabel(activity.end))}</td>
        <td class="comment">${escapeHtml(activity.komentar || activity.comment || "")}</td>
      </tr>
    `;
  }).join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tidplan ${escapeHtml(currentSite)}</title>
        <style>
          ${getCmaxPrintHeaderCss()}
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; background: #fff; }
          .header { border-bottom: 3px solid #667eea; padding-bottom: 8px; margin-bottom: 12px; }
          h1 { font-size: 20px; margin: 0 0 4px; color: #101828; }
          .meta { font-size: 12px; color: #667085; display: flex; gap: 18px; flex-wrap: wrap; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; page-break-inside: auto; }
          th, td { border: 1px solid #d0d5dd; padding: 6px 5px; vertical-align: top; }
          th { background: #667eea; color: #fff; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tbody tr:nth-child(even) td { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr { page-break-inside: avoid; }
          .num { width: 10mm; text-align: center; }
          .color { width: 8mm; text-align: center; }
          .color span { display: inline-block; width: 12px; height: 12px; border-radius: 50%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .comment { width: 42mm; white-space: normal; }
          .empty { text-align: center; padding: 18px; color: #667085; }
        </style>
      </head>
      <body>
        ${getCmaxPrintHeaderHtml(currentSite, formatCmaxPrintDate(new Date()))}
        <div class="meta">
          <span>${mode === "full" ? "Cijeli Tidplan" : "Trenutni prikaz / filter"}</span>
          <span>${escapeHtml(new Date().toLocaleString(locale))}</span>
          <span>Aktivnosti: ${activities.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="num">#</th>
              <th class="color"></th>
              <th>Plan</th>
              <th>Zona</th>
              <th>Karna</th>
              <th>Moment</th>
              <th class="num">Res</th>
              <th>Start</th>
              <th>End</th>
              <th class="comment">Komentar</th>
            </tr>
          </thead>
          <tbody>
            ${activityRows || `<tr><td class="empty" colspan="10">Nema aktivnosti za print.</td></tr>`}
          </tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}


function updatePlansList() {
  const list = document.getElementById("plansList");
  if (!list) return;
  list.innerHTML = "";
  availablePlans.forEach((plan) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.marginBottom = "10px";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = plan;
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = "Ukloni";
    removeBtn.dataset.cmaxAction = "tidplan.removePlan";
    removeBtn.dataset.cmaxArgs = JSON.stringify([plan]);
    div.appendChild(nameSpan);
    div.appendChild(removeBtn);
    list.appendChild(div);
  });
}

function addPlan() {
  const name = document.getElementById("newPlanName").value.trim();
  if (name && !availablePlans.includes(name)) {
    availablePlans.push(name);
    saveAvailablePlans();
    updatePlansList();
    document.getElementById("newPlanName").value = "";
    updateTidplan(); // Refresh filters
  }
}

function removePlan(plan) {
  showConfirm(`Želite li ukloniti plan "${plan}"?`, null, "⚠️", () => {
    availablePlans = availablePlans.filter((p) => p !== plan);
    saveAvailablePlans();
    updatePlansList();
    updateTidplan();
  });
}

function saveAvailablePlans() {
  appState.plans = sortNaturally([...availablePlans]);
  saveData();
  collectPlans();
  syncServerState().catch(() => {});
}


function updateMomentsList() {
  const list = document.getElementById("momentsList");
  if (!list) return;
  list.innerHTML = "";
  availableMoments.forEach((moment) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.marginBottom = "10px";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = moment;
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = "Ukloni";
    removeBtn.dataset.cmaxAction = "tidplan.removeMoment";
    removeBtn.dataset.cmaxArgs = JSON.stringify([moment]);
    div.appendChild(nameSpan);
    div.appendChild(removeBtn);
    list.appendChild(div);
  });
}

function addMoment() {
  const name = document.getElementById("newMomentName").value.trim();
  if (name && !availableMoments.includes(name)) {
    availableMoments.push(name);
    saveAvailableMoments();
    updateMomentsList();
    document.getElementById("newMomentName").value = "";
    updateTidplan();
  }
}

function removeMoment(moment) {
  showConfirm(`Želite li ukloniti moment "${moment}"?`, null, "⚠️", () => {
    availableMoments = availableMoments.filter((m) => m !== moment);
    saveAvailableMoments();
    updateMomentsList();
    updateTidplan();
  });
}

function saveAvailableMoments() {
  appState.moments = sortNaturally([...availableMoments]);
  saveData();
  collectPlans();
  syncServerState().catch(() => {});
}


function updateKarneList() {
  const list = document.getElementById("karneList");
  if (!list) return;
  list.innerHTML = "";
  availableKarne.forEach((karna) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.marginBottom = "10px";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = karna;
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-small btn-danger";
    removeBtn.textContent = "Ukloni";
    removeBtn.dataset.cmaxAction = "tidplan.removeKarna";
    removeBtn.dataset.cmaxArgs = JSON.stringify([karna]);
    div.appendChild(nameSpan);
    div.appendChild(removeBtn);
    list.appendChild(div);
  });
}

function addKarna() {
  const name = document.getElementById("newKarnaName").value.trim();
  if (name && !availableKarne.includes(name)) {
    availableKarne.push(name);
    saveAvailableKarne();
    updateKarneList();
    document.getElementById("newKarnaName").value = "";
    updateTidplan();
  }
}

function removeKarna(karna) {
  showConfirm(`Želite li ukloniti karnu "${karna}"?`, null, "⚠️", () => {
    availableKarne = availableKarne.filter((k) => k !== karna);
    saveAvailableKarne();
    updateKarneList();
    updateTidplan();
  });
}

function saveAvailableKarne() {
  appState.karnas = sortNaturally([...availableKarne]);
  saveData();
  collectPlans();
  syncServerState().catch(() => {});
}





/* ==================== APP START ==================== */
window.addEventListener("error", (event) => {
  if (!(event instanceof ErrorEvent)) return;
  const msg = event.message;
  const url = event.filename;
  const lineNo = event.lineno;
  const columnNo = event.colno;
  const error = event.error;
  const message = `JavaScript greška: ${msg} (${url}:${lineNo}:${columnNo})`;
  console.error(message, error);
  document.body.innerHTML = `<div style="padding:20px;color:#b00;background:#fee;font-family:sans-serif;">
    <h2>Dogodila se pogreška</h2>
    <pre>${message}</pre>
    <p>Osvježite stranicu ili pogledajte konzolu za detalje.</p>
  </div>`;
});



