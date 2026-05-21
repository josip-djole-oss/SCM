var notificationsListRenderLimit = 40;
var notificationsLoadAbortBySite = {};

function getNotificationStorageKey(site) {
  return getSiteStorageKey("cmax_planner_notifications", site);
}

function getNotificationsForSite(site = currentSite) {
  return getCachedStorageJson(getNotificationStorageKey(site), []) || [];
}

function saveNotificationsForSite(site, notifications) {
  const changed = setCachedStorageJson(getNotificationStorageKey(site), notifications);
  if (site === currentSite) {
    setCachedStorageJson(NOTIFICATIONS_KEY, notifications);
  }
  if (!changed) return Promise.resolve(true);
  if (!BACKEND_ENABLED) return Promise.resolve(true);
  return fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notifications,
      userEmail: appState.currentUser || null,
      site,
      lastKnownVersion: notificationsStateVersionBySite[site] || 1,
    }),
  })
    .then((res) => (res.ok ? res.json().catch(() => ({})) : Promise.reject(res)))
    .then((payload) => {
      notificationsStateVersionBySite[site] =
        Number(payload?.version) || notificationsStateVersionBySite[site] || 1;
      return true;
    })
    .catch(() => {
      return false;
    });
}

function loadNotificationsData(site = currentSite, options = {}) {
  const { strict = false } = options;
  if (!BACKEND_ENABLED) {
    return Promise.resolve(getNotificationsForSite(site));
  }

  if (notificationsLoadAbortBySite[site]) {
    notificationsLoadAbortBySite[site].abort();
  }
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  if (controller) notificationsLoadAbortBySite[site] = controller;

  return fetch(`/api/notifications?site=${encodeURIComponent(site)}`, {
    cache: "no-store",
    signal: controller?.signal,
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((payload) => {
      const parsed = extractListPayload(payload, "notifications");
      const list = parsed.list;
      if (parsed.version) notificationsStateVersionBySite[site] = parsed.version;
      setCachedStorageJson(getNotificationStorageKey(site), list);
      if (site === currentSite) {
        setCachedStorageJson(NOTIFICATIONS_KEY, list);
        updateNotificationsBadge();
      }
      return list;
    })
    .catch((error) => {
      if (error?.name === "AbortError") return getNotificationsForSite(site);
      if (strict) throw error;
      return fetch("/api/state", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          serverStateVersion = Number(data?.version) || serverStateVersion || 1;
          const state = data?.state;
          const list =
            state &&
            state.siteData &&
            state.siteData[site] &&
            Array.isArray(state.siteData[site].notifications)
              ? state.siteData[site].notifications
              : [];
          setCachedStorageJson(getNotificationStorageKey(site), list);
      if (site === currentSite) {
        setCachedStorageJson(NOTIFICATIONS_KEY, list);
        updateNotificationsBadge();
      }
      return list;
    })
        .catch(() => []);
    })
    .finally(() => {
      if (notificationsLoadAbortBySite[site] === controller) {
        delete notificationsLoadAbortBySite[site];
      }
    });
}

function getNextNotificationId() {
  const storedCounter = parseInt(
    getCachedStorageValue(NOTIFICATIONS_COUNTER_KEY, "0") || "0",
    10,
  );
  let maxId = Number.isFinite(storedCounter) ? storedCounter : 0;
  (sites || []).forEach((site) => {
    const list = getNotificationsForSite(site);
    list.forEach((item) => {
      const idNum = Number(item?.id || 0);
      if (Number.isFinite(idNum)) {
        maxId = Math.max(maxId, idNum);
      }
    });
  });
  const nextId = maxId + 1;
  setCachedStorageValue(NOTIFICATIONS_COUNTER_KEY, String(nextId));
  return nextId;
}

function resetNotificationsRenderLimit() {
  notificationsListRenderLimit = 40;
}

function loadMoreNotificationsList() {
  notificationsListRenderLimit += 40;
  renderNotificationsList();
}

function formatNotificationId(id) {
  const num = Number(id) || 0;
  return `#${String(num).padStart(5, "0")}`;
}

function getCurrentNotificationAuthor() {
  return appState.currentUserName || appState.currentUser || "Unknown";
}

function renderNotificationSiteOptions() {
  const container = document.getElementById("notificationSites");
  if (!container) return;
  container.innerHTML = "";
  const sortedSites = getAccessibleSites()
    .slice()
    .sort((a, b) => a.localeCompare(b, "hr"));
  sortedSites.forEach((site) => {
    const label = document.createElement("label");
    label.className = "notification-site-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = site;
    checkbox.checked = site === currentSite;
    label.appendChild(checkbox);
    const span = document.createElement("span");
    span.textContent = site;
    label.appendChild(span);
    container.appendChild(label);
  });
}

function renderNotificationFilterSites() {
  const select = document.getElementById("notificationFilterSite");
  if (!select) return;
  const accessible = getAccessibleSites();
  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = t("filterAll") || "Sve";
  select.appendChild(allOption);
  accessible
    .slice()
    .sort((a, b) => a.localeCompare(b, "hr"))
    .forEach((site) => {
      const option = document.createElement("option");
      option.value = site;
      option.textContent = site;
      select.appendChild(option);
    });
}

function renderNotificationImagePreview(files) {
  const preview = document.getElementById("notificationImagePreview");
  if (!preview) return;
  preview.innerHTML = "";
  if (!files || !files.length) return;
  Array.from(files).forEach((file) => {
    const img = document.createElement("img");
    img.alt = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    preview.appendChild(img);
  });
}

function uploadNotificationImages(files) {
  const fileList = Array.from(files || []);
  if (!fileList.length) return Promise.resolve([]);

  const normalizeUploadUrl = (fileInfo) => {
    if (!fileInfo) return "";
    let url = fileInfo.url || fileInfo.path || fileInfo.filename || "";
    if (!url) return "";
    if (typeof url !== "string") return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/uploads/")) return url;
    if (url.includes("uploads")) {
      const idx = url.lastIndexOf("uploads");
      if (idx >= 0) {
        const tail = url
          .slice(idx + "uploads".length)
          .replace(/\\/g, "/")
          .replace(/^\/+/, "");
        return `/uploads/${tail}`;
      }
    }
    return url.replace(/\\/g, "/");
  };

  if (!BACKEND_ENABLED) {
    return Promise.all(
      fileList.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({ url: reader.result, name: file.name });
            };
            reader.readAsDataURL(file);
          }),
      ),
    );
  }

  return Promise.all(
    fileList.map((file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userEmail", appState.currentUser || "");
      return fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const fileInfo = (data && data.file) || data || null;
          const url = normalizeUploadUrl(fileInfo);
          return { url, name: (fileInfo && fileInfo.originalName) || file.name };
        })
        .catch((err) => {
          console.error("Image upload failed:", err);
          return { url: "", name: file.name };
        });
    }),
  );
}

function renderNotificationsList() {
  const container = document.getElementById("notificationsList");
  if (!container) return;
  const token = CMAX_PERF?.begin?.("render-notifications-list");
  const siteFilter = document.getElementById("notificationFilterSite")?.value || "";
  const searchText = (document.getElementById("notificationSearch")?.value || "").trim().toLowerCase();
  const pinnedOnly = document.getElementById("notificationPinnedOnly")?.checked === true;

  const sourceSites = siteFilter ? [siteFilter] : getAccessibleSites();
  let notifications = [];
  sourceSites.forEach((site) => {
    const list = getNotificationsForSite(site);
    list.forEach((note) => {
      notifications.push({ ...note, site });
    });
  });

  notifications = notifications
    .filter((note) => (pinnedOnly ? !!note.pinned : true))
    .filter((note) => {
      if (!searchText) return true;
      const text = `${note.message || ""} ${note.authorName || ""} ${note.createdBy || ""}`.toLowerCase();
      return text.includes(searchText);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const visibleNotifications = notifications.slice(0, notificationsListRenderLimit);

  if (!visibleNotifications.length) {
    container.innerHTML = `<div class="notification-empty">${escapeHtml(t("notificationsEmpty"))}</div>`;
    if (token) CMAX_PERF.end(token, { count: 0 });
    return;
  }

  container.innerHTML = "";
  visibleNotifications.forEach((note) => {
    const card = document.createElement("div");
    card.className = "notification-card";
    card.dataset.notificationId = String(note.id || "");
    card.dataset.notificationSite = String(note.site || "");

    const author = document.createElement("div");
    author.className = "notification-author";
    author.textContent = note.authorName || note.createdBy || "Unknown";
    card.appendChild(author);

    const title = document.createElement("h4");
    title.textContent = `${note.pinned ? "📌 " : ""}Post ${formatNotificationId(note.id)}`;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "notification-meta";
    const siteLabel = note.site ? ` • ${note.site}` : "";
    meta.textContent = `${new Date(note.createdAt).toLocaleString(getCurrentLocale())}${siteLabel}`;
    card.appendChild(meta);

    if (note.message) {
      const body = document.createElement("div");
      body.className = "notification-body";
      body.textContent = note.message;
      card.appendChild(body);
    }

    if (Array.isArray(note.images) && note.images.length) {
      const imagesWrap = document.createElement("div");
      imagesWrap.className = "notification-images";
      note.images.forEach((img, idx) => {
        const imageEl = document.createElement("img");
        imageEl.src = img.url;
        imageEl.alt = img.name || "notification";
        imageEl.loading = "lazy";
        imageEl.decoding = "async";
        imageEl.addEventListener("click", () => {
          openNotificationViewer(
            note.images.map((i) => i.url),
            idx,
          );
        });
        imagesWrap.appendChild(imageEl);
      });
      card.appendChild(imagesWrap);
    }

    if (canManageNotificationsAccess() || canDeleteNotificationsAccess()) {
      const actions = document.createElement("div");
      actions.className = "notification-actions";
      if (canManageNotificationsAccess()) {
        const pinBtn = document.createElement("button");
        pinBtn.className = "btn btn-small";
        pinBtn.textContent = note.pinned
          ? (t("notificationUnpin") || "Unpin")
          : (t("notificationPin") || "Pin");
        pinBtn.addEventListener("click", () => {
          toggleNotificationPin(note.id, note.site, !note.pinned);
        });
        actions.appendChild(pinBtn);
      }
      if (canDeleteNotificationsAccess()) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-small btn-danger";
        deleteBtn.textContent = t("btnDeleteNotification");
        deleteBtn.addEventListener("click", () => {
          deleteNotification(note.id, note.site);
        });
        actions.appendChild(deleteBtn);
      }
      card.appendChild(actions);
    }

    container.appendChild(card);
  });

  if (notifications.length > visibleNotifications.length) {
    const moreWrap = document.createElement("div");
    moreWrap.className = "notification-load-more";
    moreWrap.innerHTML = `
      <button class="btn btn-secondary" data-cmax-action="notifications.loadMore">
        ${escapeHtml(t("loadMore") || "Ucitaj jos")} (${visibleNotifications.length}/${notifications.length})
      </button>
    `;
    container.appendChild(moreWrap);
  }

  if (window.pendingNotificationFocus) {
    const targetId = String(window.pendingNotificationFocus.id || "");
    const targetSite = String(window.pendingNotificationFocus.site || "");
    const match = Array.from(container.querySelectorAll(".notification-card")).find((card) => {
      return card.dataset.notificationId === targetId && card.dataset.notificationSite === targetSite;
    });
    if (match) {
      match.classList.add("notification-card-focus");
      match.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => match.classList.remove("notification-card-focus"), 2200);
    }
    window.pendingNotificationFocus = null;
  }
  CMAX_PERF?.count?.("renderNotificationsList");
  if (token) CMAX_PERF.end(token, { count: visibleNotifications.length, total: notifications.length });
}

function getPrintableNotifications() {
  const siteFilter = document.getElementById("notificationFilterSite")?.value || "";
  const sourceSites = siteFilter ? [siteFilter] : getAccessibleSites();
  const byKey = new Map();
  sourceSites.forEach((site) => {
    getNotificationsForSite(site).forEach((note) => {
      if (!note) return;
      const key = `${site}:${note.id}`;
      byKey.set(key, { ...note, site });
    });
  });
  return Array.from(byKey.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function openNotificationPrintChooser() {
  if (!canAccessNotificationsModule() || !hasPermission("canPrint")) {
    showToast(t("accessPrintDenied"), "error");
    return;
  }
  const notifications = getPrintableNotifications();
  if (!notifications.length) {
    showToast(t("notificationsEmpty"), "error");
    return;
  }

  const existing = document.getElementById("notificationPrintModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "notificationPrintModal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 520px;">
      <div class="modal-header">
        <h2>Print obavijest</h2>
        <button class="close-btn" data-cmax-action="notifications.closePrintChooser">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="notificationPrintSelect">Odaberi obavijest:</label>
          <select id="notificationPrintSelect"></select>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
          <button class="btn btn-secondary" data-cmax-action="notifications.closePrintChooser">Odustani</button>
          <button class="btn" data-cmax-action="notifications.printSelected">Print</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const select = document.getElementById("notificationPrintSelect");
  notifications.forEach((note, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    const date = note.createdAt ? new Date(note.createdAt).toLocaleString(getCurrentLocale()) : "";
    const preview = (note.message || "").replace(/\s+/g, " ").trim().slice(0, 60);
    option.textContent = `${formatNotificationId(note.id)} | ${note.site || currentSite} | ${date}${preview ? ` | ${preview}` : ""}`;
    select.appendChild(option);
  });
  modal.dataset.notifications = JSON.stringify(notifications);
}

function closeNotificationPrintChooser() {
  const modal = document.getElementById("notificationPrintModal");
  if (modal) modal.remove();
}

function printSelectedNotification() {
  const modal = document.getElementById("notificationPrintModal");
  const select = document.getElementById("notificationPrintSelect");
  const notifications = safeParseStoredJson(modal?.dataset.notifications || "[]", []) || [];
  const note = notifications[Number(select?.value || 0)];
  closeNotificationPrintChooser();
  if (!note) {
    showToast("Obavijest nije pronađena.", "error");
    return;
  }
  printNotificationDocument(note);
}

function printNotificationDocument(note) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const locale = getCurrentLocale();
  const createdAt = note.createdAt ? new Date(note.createdAt).toLocaleString(locale) : "";
  const images = Array.isArray(note.images) ? note.images : [];
  const imageHtml = images.map((img) => {
    const src = img && img.url ? img.url : "";
    if (!src) return "";
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(img.name || "obavijest")}" />`;
  }).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Obavijest ${escapeHtml(formatNotificationId(note.id))}</title>
        <style>
          ${getCmaxPrintHeaderCss()}
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; background: #fff; }
          .note-meta { color: #667085; font-size: 12px; display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
          .card { border: 1px solid #d0d5dd; border-radius: 6px; padding: 16px; }
          .post-title { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 14px; }
          .post-title h2 { margin: 0; font-size: 18px; color: #101828; }
          .author { color: #667085; font-size: 12px; }
          .body { white-space: pre-wrap; font-size: 14px; line-height: 1.5; margin-bottom: 16px; }
          .images { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .images img { width: 100%; max-height: 240px; object-fit: contain; border: 1px solid #d0d5dd; border-radius: 6px; }
          .footer { margin-top: 16px; color: #98a2b3; font-size: 10px; text-align: right; }
        </style>
      </head>
      <body>
        ${getCmaxPrintHeaderHtml(note.site || currentSite, formatCmaxPrintDate(note.createdAt ? new Date(note.createdAt) : new Date()))}
        <div class="note-meta">
          <span>OBAVIJEST</span>
          <span>${escapeHtml(createdAt)}</span>
          <span>${escapeHtml(formatNotificationId(note.id))}</span>
        </div>
        <div class="card">
          <div class="post-title">
            <h2>Post ${escapeHtml(formatNotificationId(note.id))}</h2>
            <div class="author">${escapeHtml(note.authorName || note.createdBy || "Unknown")}</div>
          </div>
          <div class="body">${escapeHtml(note.message || "") || "Bez teksta."}</div>
          ${imageHtml ? `<div class="images">${imageHtml}</div>` : ""}
        </div>
        <div class="footer">CMAX SCM | ${escapeHtml(new Date().toLocaleString(locale))}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
}

function resetNotificationComposer() {
  const textEl = document.getElementById("notificationText");
  if (textEl) textEl.value = "";
  const fileInput = document.getElementById("notificationImages");
  if (fileInput) fileInput.value = "";
  const preview = document.getElementById("notificationImagePreview");
  if (preview) preview.innerHTML = "";
  renderNotificationSiteOptions();
}

function submitNotification() {
  if (!canManageNotificationsAccess()) {
    showToast(t("accessNotificationsDenied"), "error");
    return;
  }
  const textEl = document.getElementById("notificationText");
  const message = (textEl?.value || "").trim();
  const fileInput = document.getElementById("notificationImages");
  const files = fileInput?.files ? Array.from(fileInput.files) : [];

  if (files.length > 2) {
    showToast(t("notificationTooManyImages"), "error");
    return;
  }

  const siteContainer = document.getElementById("notificationSites");
  const selectedSites = [];
  if (siteContainer) {
    siteContainer
      .querySelectorAll("input[type='checkbox']")
      .forEach((cb) => {
        if (cb.checked) selectedSites.push(cb.value);
      });
  }

  if (!selectedSites.length) {
    const accessibleSites = getAccessibleSites();
    if (accessibleSites.includes(currentSite)) {
      selectedSites.push(currentSite);
    } else {
      showToast(t("notificationSitesError"), "error");
      return;
    }
  }

  if (!message && files.length === 0) {
    showToast(t("notificationEmptyError"), "error");
    return;
  }

  const postId = getNextNotificationId();
  const createdAt = new Date().toISOString();
  const authorName = getCurrentNotificationAuthor();

  withLoadingPromise("loadingNotificationUpload", () =>
    uploadNotificationImages(files).then((uploadedImages) => {
      const images = (uploadedImages || []).filter((img) => img.url);
      if (files.length && images.length === 0) {
        showToast(t("notificationUploadFailed"), "error");
      }
      if (!message && images.length === 0) {
        showToast(t("notificationUploadFailed"), "error");
        return;
      }
      const baseNotification = {
        id: postId,
        createdAt,
        authorName,
        message,
        images,
        sites: [...selectedSites],
      };

      const savePromises = selectedSites.map((site) => {
        const list = getNotificationsForSite(site);
        list.unshift({ ...baseNotification, site });
        return saveNotificationsForSite(site, list);
      });

      addLog("Objavio obavijest", `Post ${formatNotificationId(postId)}`);

      return Promise.all(savePromises).then(() => {
        trackEditActivity();
        showToast(t("notificationPosted"), "success");
        resetNotificationComposer();
        if (selectedSites.includes(currentSite)) {
          renderNotificationsList();
        }
      });
    }),
  );
}

function deleteNotification(notificationId, site = currentSite) {
  if (!canDeleteNotificationsAccess()) {
    showToast(t("accessNotificationsDenied"), "error");
    return;
  }
  showConfirm(t("confirmDeleteNotification"), null, "⚠️", () => {
    const list = getNotificationsForSite(site);
    const next = list.filter((n) => n.id !== notificationId);
    saveNotificationsForSite(site, next).then(() => {
      trackEditActivity();
      showToast(t("notificationDeleted"), "success");
      renderNotificationsList();
      addLog("Obrisao obavijest", `Post ${formatNotificationId(notificationId)}`);
    });
  });
}

function toggleNotificationPin(notificationId, site = currentSite, pinned = true) {
  if (!canManageNotificationsAccess()) return;
  const list = getNotificationsForSite(site);
  const idx = list.findIndex((n) => n.id === notificationId);
  if (idx === -1) return;
  list[idx].pinned = pinned;
  saveNotificationsForSite(site, list).then(() => {
    trackEditActivity();
    renderNotificationsList();
  });
}

function showNotifications() {
  if (!canAccessNotificationsModule()) {
    showToast(t("accessNotificationsDenied"), "error");
    return;
  }
  return loadFreshDataForView("loadingNotifications", () => {
    const homeSection = document.getElementById("home-section");
    const reportsSection = document.getElementById("reports-section");
    const settingsSection = document.getElementById("settings-section");
    const plannerSection = document.getElementById("planner-section");
    const listsContainer = document.querySelector(".lists-container");
    const binsSection = document.getElementById("binsSection");
    const tidplanSection = document.getElementById("tidplan-section");
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");
    const warehouseLogsSection = document.getElementById("warehouse-logs-section");
    const warehouseGraphSection = document.getElementById("warehouse-graph-section");

    if (homeSection) homeSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (tidplanSection) tidplanSection.style.display = "none";
    if (plannerSection) plannerSection.style.display = "none";
    if (listsContainer) listsContainer.classList.add("hidden");
    if (binsSection) binsSection.classList.remove("active");
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "none";
    if (notificationsSection) notificationsSection.style.display = "block";

    currentView = "notifications";
    saveCurrentView("notifications");
    pushRouteForView("notifications");
    resetNotificationsRenderLimit();

    Promise.all(getAccessibleSites().map((site) => loadNotificationsData(site)))
      .then(() => {
        renderNotificationSiteOptions();
        renderNotificationFilterSites();
        if (window.pendingNotificationFilterSite) {
          const filter = document.getElementById("notificationFilterSite");
          if (filter) filter.value = window.pendingNotificationFilterSite;
          window.pendingNotificationFilterSite = "";
        }
        renderNotificationsList();
        const composer = document.getElementById("notificationsComposer");
        if (composer) {
          composer.style.display = canManageNotificationsAccess() ? "block" : "none";
        }
        const currentList = getNotificationsForSite(currentSite);
        markNotificationsRead(currentList);
        updateNotificationsBadge();
        if (typeof updateShellForView === "function") updateShellForView("notifications");
      })
      .catch(() => {
        renderNotificationsList();
        if (typeof updateShellForView === "function") updateShellForView("notifications");
      });

    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
  });
}

function openNotificationViewer(images, startIndex = 0) {
  if (!Array.isArray(images) || !images.length) return;
  notificationViewerImages = images.slice();
  notificationViewerIndex = Math.max(0, Math.min(startIndex, images.length - 1));
  updateNotificationViewer();
  const viewer = document.getElementById("notificationImageViewer");
  if (viewer) viewer.style.display = "flex";
}

function updateNotificationViewer() {
  const imgEl = document.getElementById("notificationViewerImage");
  const prevBtn = document.getElementById("notificationViewerPrev");
  const nextBtn = document.getElementById("notificationViewerNext");
  if (imgEl) {
    imgEl.src = notificationViewerImages[notificationViewerIndex] || "";
  }
  const disableNav = notificationViewerImages.length <= 1;
  if (prevBtn) prevBtn.disabled = disableNav;
  if (nextBtn) nextBtn.disabled = disableNav;
}

function closeNotificationViewer() {
  const viewer = document.getElementById("notificationImageViewer");
  if (viewer) viewer.style.display = "none";
  notificationViewerImages = [];
  notificationViewerIndex = 0;
}

function prevNotificationImage() {
  if (!notificationViewerImages.length) return;
  notificationViewerIndex =
    (notificationViewerIndex - 1 + notificationViewerImages.length) %
    notificationViewerImages.length;
  updateNotificationViewer();
}

function nextNotificationImage() {
  if (!notificationViewerImages.length) return;
  notificationViewerIndex =
    (notificationViewerIndex + 1) % notificationViewerImages.length;
  updateNotificationViewer();
}

