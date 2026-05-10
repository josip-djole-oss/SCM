(function (global) {
  "use strict";

  const CMAX = (global.CMAX = global.CMAX || {});
  const legacyFns = Object.create(null);

  function captureLegacy(name) {
    if (!legacyFns[name] && typeof global[name] === "function") {
      legacyFns[name] = global[name];
    }
    return legacyFns[name];
  }

  function callLegacy(name, args) {
    const fn = legacyFns[name] || global[name];
    if (typeof fn !== "function") {
      throw new Error(`CMAX legacy handler is missing: ${name}`);
    }
    return fn.apply(global, args);
  }

  function legacyMethod(name) {
    captureLegacy(name);
    return function (...args) {
      return callLegacy(name, args);
    };
  }

  function assignNamespace(name, methods) {
    CMAX[name] = Object.assign(CMAX[name] || {}, methods);
    return CMAX[name];
  }

  assignNamespace("core", {
    save: legacyMethod("saveAllData"),
    saveData: legacyMethod("saveData"),
    login: legacyMethod("handleLogin"),
    enterReadonlyMode: legacyMethod("enterReadonlyMode"),
    switchToLogin: legacyMethod("switchToLogin"),
    logout: legacyMethod("logout"),
    applyPermissions: legacyMethod("applyPermissionVisibility"),
  });

  assignNamespace("sites", {
    init: legacyMethod("populateSiteSelect"),
    render: legacyMethod("renderSiteSwitcher"),
    switchSite: legacyMethod("changeSite"),
    switchSiteFromLocal: legacyMethod("switchSiteFromLocal"),
    toggleDropdown: legacyMethod("toggleSiteDropdown"),
    closeDropdown: legacyMethod("closeSiteDropdown"),
    promptAdd: legacyMethod("promptAddSite"),
    confirmRemove: legacyMethod("confirmRemoveSite"),
    add: legacyMethod("addSite"),
    remove: legacyMethod("removeSite"),
    updateTitle: legacyMethod("updateMainTitle"),
  });

  assignNamespace("planner", {
    init(...args) {
      return callLegacy("renderAll", args);
    },
    render(...args) {
      return callLegacy("renderAll", args);
    },
    save(...args) {
      return callLegacy("saveData", args);
    },
    addRow(...args) {
      return callLegacy("addPlanningRow", args);
    },
    removeRow(...args) {
      return callLegacy("removePlanningRow", args);
    },
    clear(...args) {
      return callLegacy("clearAllTable", args);
    },
    toggleList(...args) {
      return callLegacy("toggleList", args);
    },
    openManagePanel(...args) {
      return callLegacy("openManagePanel", args);
    },
    closeManagePanel(...args) {
      return callLegacy("closeManagePanel", args);
    },
    manageSelectCategory(...args) {
      return callLegacy("manageSelectCategory", args);
    },
    manageGoBack(...args) {
      return callLegacy("manageGoBack", args);
    },
    manageGoAdd(...args) {
      return callLegacy("manageGoAdd", args);
    },
    manageGoRemove(...args) {
      return callLegacy("manageGoRemove", args);
    },
    manageDoAdd(...args) {
      return callLegacy("manageDoAdd", args);
    },
    manageRemoveItem(...args) {
      return callLegacy("manageRemoveItem", args);
    },
  });

  assignNamespace("tidplan", {
    init: legacyMethod("loadTidplanData"),
    show: legacyMethod("showTidplan"),
    showPlanner: legacyMethod("showPlanner"),
    render: legacyMethod("updateTidplan"),
    update: legacyMethod("updateTidplan"),
    save: legacyMethod("saveTidplanData"),
    clear: legacyMethod("clearTidplan"),
    print: legacyMethod("printTidplan"),
    addActivity: legacyMethod("addTidplanActivity"),
    toggleSortMenu: legacyMethod("toggleTidplanSortMenu"),
    applySort: legacyMethod("applyTidplanSort"),
    toggleZoneManager: legacyMethod("toggleZoneManager"),
    addZoneFromInputs: legacyMethod("addTidplanZoneFromInputs"),
    clearZones: legacyMethod("clearAllTidplanZones"),
    addPlan: legacyMethod("addPlan"),
    addMoment: legacyMethod("addMoment"),
    addKarna: legacyMethod("addKarna"),
    removePlan: legacyMethod("removePlan"),
    removeMoment: legacyMethod("removeMoment"),
    removeKarna: legacyMethod("removeKarna"),
  });

  assignNamespace("warehouse", {
    init(...args) {
      return callLegacy("renderWarehousePage", args);
    },
    show(...args) {
      return callLegacy("showWarehouse", args);
    },
    render(...args) {
      return callLegacy("renderWarehousePage", args);
    },
    save(...args) {
      return callLegacy("persistWarehouseData", args);
    },
    showLogs(...args) {
      return callLegacy("showWarehouseLogs", args);
    },
    showGraph(...args) {
      return callLegacy("showWarehouseGraph", args);
    },
    updateStockForm(...args) {
      return callLegacy("updateWarehouseStockForm", args);
    },
    updateStockFormFromEvent(...args) {
      return callLegacy("updateWarehouseStockFormFromEvent", args);
    },
    saveStockAdjustment(...args) {
      return callLegacy("saveWarehouseStockAdjustment", args);
    },
    saveIssueRow(...args) {
      return callLegacy("saveWarehouseIssueRow", args);
    },
    updateIssueDraftWorker(...args) {
      return callLegacy("updateWarehouseIssueDraftWorker", args);
    },
    updateIssueDraftSlotItem(...args) {
      return callLegacy("updateWarehouseIssueDraftSlotItem", args);
    },
    updateIssueDraftSlotQuantity(...args) {
      return callLegacy("updateWarehouseIssueDraftSlotQuantity", args);
    },
    updateIssueDraftComment(...args) {
      return callLegacy("updateWarehouseIssueDraftComment", args);
    },
    toggleProcurementUser(...args) {
      return callLegacy("toggleWarehouseProcurementUser", args);
    },
    addCatalogItem(...args) {
      return callLegacy("addWarehouseCatalogItem", args);
    },
    removeCatalogItem(...args) {
      return callLegacy("removeWarehouseCatalogItem", args);
    },
    setCatalogItemLimit(...args) {
      return callLegacy("setWarehouseCatalogItemLimit", args);
    },
    applyLogFilters(...args) {
      return callLegacy("applyWarehouseLogFilters", args);
    },
    resetLogFilters(...args) {
      return callLegacy("resetWarehouseLogFilters", args);
    },
    deleteLog(...args) {
      return callLegacy("deleteWarehouseLog", args);
    },
    clearLogs(...args) {
      return callLegacy("clearAllWarehouseLogs", args);
    },
    printInventory(...args) {
      return callLegacy("printWarehouseInventory", args);
    },
    exportInventoryToPDF(...args) {
      return callLegacy("exportWarehouseInventoryToPDF", args);
    },
    handleImportExcel(...args) {
      return callLegacy("handleWarehouseImportExcel", args);
    },
  });

  assignNamespace("surveys", {
    init(...args) {
      return callLegacy("setupSurveyTargetHandlers", args);
    },
    show(...args) {
      return callLegacy("showSurveys", args);
    },
    render(...args) {
      return callLegacy("renderSurveysList", args);
    },
    submit(...args) {
      return callLegacy("submitSurvey", args);
    },
    addAnswerField(...args) {
      return callLegacy("addSurveyAnswerField", args);
    },
    vote(...args) {
      return callLegacy("voteSurvey", args);
    },
    togglePin(...args) {
      return callLegacy("toggleSurveyPin", args);
    },
    delete(...args) {
      return callLegacy("deleteSurvey", args);
    },
  });

  assignNamespace("admin", {
    init: legacyMethod("initAdmins"),
    open(...args) {
      return callLegacy("openAdminPanel", args);
    },
    close(...args) {
      return callLegacy("closeAdminPanel", args);
    },
    switchTab(...args) {
      return callLegacy("switchTab", args);
    },
    addNewAdmin: legacyMethod("addNewAdmin"),
    saveGuestAccessSettings: legacyMethod("saveGuestAccessSettings"),
    togglePerms: legacyMethod("toggleAdminPerms"),
    savePerms: legacyMethod("saveAdminPerms"),
    stageLevelChange: legacyMethod("stageAdminLevelChange"),
    stagePermissionChange: legacyMethod("stageAdminPermissionChange"),
    removeAction: legacyMethod("removeAdminAction"),
    clearLogs: legacyMethod("clearLogs"),
    resetTidplanLayoutSettings: legacyMethod("resetTidplanLayoutSettings"),
    resetThemeSettings: legacyMethod("resetThemeSettings"),
    runManualBackup: legacyMethod("runManualBackup"),
    openBackupRestorePanel(...args) {
      return callLegacy("openBackupRestorePanel", args);
    },
    loadBackupRestoreOptions(...args) {
      return callLegacy("loadBackupRestoreOptions", args);
    },
    restoreSelectedBackup: legacyMethod("restoreSelectedBackup"),
    confirmRestoreBackup: legacyMethod("confirmRestoreBackup"),
    listBackups(...args) {
      return callLegacy("handleListBackups", args);
    },
    showBackupInfo(...args) {
      return callLegacy("handleBackupInfo", args);
    },
    selectBackupForRestore(...args) {
      return callLegacy("selectBackupForRestore", args);
    },
  });

  assignNamespace("reports", {
    open(...args) {
      return callLegacy("openReportModal", args);
    },
    close(...args) {
      return callLegacy("closeReportModal", args);
    },
    submit(...args) {
      return callLegacy("submitReport", args);
    },
    filter(...args) {
      return callLegacy("filterReports", args);
    },
    review(...args) {
      return callLegacy("reviewReport", args);
    },
    delete(...args) {
      return callLegacy("deleteReport", args);
    },
    openChangePassword(...args) {
      return callLegacy("openChangePasswordModal", args);
    },
    closeChangePassword(...args) {
      return callLegacy("closeChangePasswordModal", args);
    },
    submitChangePassword(...args) {
      return callLegacy("submitChangePassword", args);
    },
  });

  assignNamespace("importExport", {
    saveAll: legacyMethod("saveAllData"),
    printPlanner(...args) {
      return callLegacy("handlePrint", args);
    },
    exportPlanner(...args) {
      return callLegacy("handleExport", args);
    },
    exportPlannerExcel(...args) {
      return callLegacy("exportPlannerToExcel", args);
    },
    exportPlannerPDF(...args) {
      return callLegacy("exportPlannerToPDF", args);
    },
    exportModule: legacyMethod("handleModuleExport"),
    openImportModal(...args) {
      return callLegacy("openModuleImportModal", args);
    },
    closeImportModal(...args) {
      return callLegacy("closeModuleImportModal", args);
    },
    handleImportFileChange(...args) {
      return callLegacy("handleModuleImportFileChange", args);
    },
    resetImportFile(...args) {
      return callLegacy("resetModuleImportModalFile", args);
    },
    uploadImport: legacyMethod("uploadModuleImport"),
    exportTidplanPDF: legacyMethod("handleTidplanExportPdf"),
    exportWarehouseExcel(...args) {
      return callLegacy("handleWarehouseExportExcel", args);
    },
    togglePlannerDropdown(...args) {
      return callLegacy("togglePlannerExportImportDropdown", args);
    },
    toggleTidplanDropdown(...args) {
      return callLegacy("toggleTidplanExportImportDropdown", args);
    },
    toggleWarehouseDropdown(...args) {
      return callLegacy("toggleWarehouseExportImportDropdown", args);
    },
  });

  Object.assign(CMAX.importExport, {
    exportPlannerExcelAndClose(...args) {
      const result = CMAX.importExport.exportPlannerExcel(...args);
      CMAX.importExport.togglePlannerDropdown();
      return result;
    },
    exportPlannerPDFAndClose(...args) {
      const result = CMAX.importExport.exportPlannerPDF(...args);
      CMAX.importExport.togglePlannerDropdown();
      return result;
    },
    openPlannerImportExcelAndClose() {
      const result = CMAX.importExport.openImportModal("planner", "excel");
      CMAX.importExport.togglePlannerDropdown();
      return result;
    },
    openPlannerImportPDFAndClose() {
      const result = CMAX.importExport.openImportModal("planner", "pdf");
      CMAX.importExport.togglePlannerDropdown();
      return result;
    },
    exportTidplanPDFAndClose(...args) {
      const result = CMAX.importExport.exportTidplanPDF(...args);
      CMAX.importExport.toggleTidplanDropdown();
      return result;
    },
    exportTidplanExcelAndClose() {
      const result = CMAX.importExport.exportModule("tidplan", "excel");
      CMAX.importExport.toggleTidplanDropdown();
      return result;
    },
    openTidplanImportPDFAndClose() {
      const result = CMAX.importExport.openImportModal("tidplan", "pdf");
      CMAX.importExport.toggleTidplanDropdown();
      return result;
    },
    openTidplanImportExcelAndClose() {
      const result = CMAX.importExport.openImportModal("tidplan", "excel");
      CMAX.importExport.toggleTidplanDropdown();
      return result;
    },
    exportWarehouseExcelAndClose(...args) {
      const result = CMAX.importExport.exportWarehouseExcel(...args);
      CMAX.importExport.toggleWarehouseDropdown();
      return result;
    },
    exportWarehousePDFAndClose() {
      const result = CMAX.importExport.exportModule("warehouse", "pdf");
      CMAX.importExport.toggleWarehouseDropdown();
      return result;
    },
    openWarehouseImportExcelAndClose() {
      const result = CMAX.importExport.openImportModal("warehouse", "excel");
      CMAX.importExport.toggleWarehouseDropdown();
      return result;
    },
    openWarehouseImportPDFAndClose() {
      const result = CMAX.importExport.openImportModal("warehouse", "pdf");
      CMAX.importExport.toggleWarehouseDropdown();
      return result;
    },
  });

  assignNamespace("utils", {
    setLanguage(...args) {
      return callLegacy("setLanguage", args);
    },
    toggleDarkMode(...args) {
      return callLegacy("toggleDarkMode", args);
    },
    setColorTheme(...args) {
      return callLegacy("setColorTheme", args);
    },
    toggleBinPermission(...args) {
      return callLegacy("toggleBinPermission", args);
    },
    showAlert(...args) {
      return callLegacy("showAlert", args);
    },
    showConfirm(...args) {
      return callLegacy("showConfirm", args);
    },
    showPromptDialog(...args) {
      return callLegacy("showPromptDialog", args);
    },
    showToast(...args) {
      return callLegacy("showToast", args);
    },
    initTooltips(...args) {
      return callLegacy("initTooltips", args);
    },
    reloadPage() {
      global.location.reload();
    },
    handleImageFallback(img) {
      if (!img?.dataset?.cmaxImageFallback) return;
      const fallback = document.getElementById(img.dataset.cmaxImageFallback);
      img.style.display = "none";
      if (fallback) {
        fallback.style.display = img.dataset.cmaxImageFallbackDisplay || "";
      }
    },
    removeClosest(selector, el) {
      if (!selector || !el) return;
      el.closest(selector)?.remove();
    },
  });

  assignNamespace("bins", {
    init(...args) {
      return callLegacy("loadBinsData", args);
    },
    show(...args) {
      return callLegacy("toggleBinsView", args);
    },
    render(...args) {
      return callLegacy("renderBinsTable", args);
    },
    addPlan(...args) {
      return callLegacy("addBinPlan", args);
    },
    removePlan(...args) {
      return callLegacy("removeBinPlan", args);
    },
  });

  assignNamespace("notifications", {
    show(...args) {
      return callLegacy("showNotifications", args);
    },
    submit(...args) {
      return callLegacy("submitNotification", args);
    },
    openPrintChooser(...args) {
      return callLegacy("openNotificationPrintChooser", args);
    },
    closePrintChooser(...args) {
      return callLegacy("closeNotificationPrintChooser", args);
    },
    printSelected(...args) {
      return callLegacy("printSelectedNotification", args);
    },
    closeViewer(...args) {
      return callLegacy("closeNotificationViewer", args);
    },
    previousImage(...args) {
      return callLegacy("prevNotificationImage", args);
    },
    nextImage(...args) {
      return callLegacy("nextNotificationImage", args);
    },
  });

  function resolveAction(path) {
    return path.split(".").reduce((target, part) => target && target[part], CMAX);
  }

  function invokeAction(path, args) {
    const fn = resolveAction(path);
    if (typeof fn !== "function") {
      throw new Error(`CMAX action is missing: ${path}`);
    }
    return fn.apply(CMAX, args);
  }

  assignNamespace("events", {
    dispatch(action, el, event) {
      const args = el ? getDelegatedArgs(el, event) : [];
      return invokeAction(action, args, el, event);
    },
  });

  function parseDelegatedArgs(el) {
    const rawArgs = el.getAttribute("data-cmax-args");
    if (!rawArgs) return [];
    try {
      return JSON.parse(rawArgs);
    } catch (error) {
      console.error("Invalid data-cmax-args value", rawArgs, error);
      return [];
    }
  }

  function getDelegatedArgs(el, event) {
    const args = parseDelegatedArgs(el);
    if (el.hasAttribute("data-cmax-pass-element")) args.push(el);
    if (el.hasAttribute("data-cmax-pass-event")) args.push(event);
    return args;
  }

  function handleDelegatedEvent(event) {
    const el = event.target.closest("[data-cmax-action]");
    if (!el) return;

    const expectedEvent = el.getAttribute("data-cmax-event") || "click";
    if (expectedEvent !== event.type) return;

    CMAX.events.dispatch(el.getAttribute("data-cmax-action"), el, event);
  }

  function handleImageFallbackEvent(event) {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.dataset.cmaxImageFallback) return;
    CMAX.utils.handleImageFallback(img);
  }

  function applyMissedImageFallbacks() {
    document.querySelectorAll("img[data-cmax-image-fallback]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) {
        CMAX.utils.handleImageFallback(img);
      }
    });
  }

  CMAX.compat = Object.assign(CMAX.compat || {}, {
    legacyFns,
    handlers: Object.freeze({}),
    invoke: invokeAction,
  });

  if (!CMAX.compat.delegatedHandlersInitialized && global.document) {
    CMAX.compat.delegatedHandlersInitialized = true;
    ["click", "change", "input", "submit"].forEach((eventName) => {
      document.addEventListener(eventName, handleDelegatedEvent);
    });
    document.addEventListener("error", handleImageFallbackEvent, true);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", applyMissedImageFallbacks, { once: true });
    } else {
      applyMissedImageFallbacks();
    }
  }
})(window);
