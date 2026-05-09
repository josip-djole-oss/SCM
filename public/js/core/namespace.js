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
    init: legacyMethod("initApp"),
    render: legacyMethod("renderAll"),
    load: legacyMethod("loadAllData"),
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
    init: legacyMethod("renderAll"),
    render: legacyMethod("renderAll"),
    save: legacyMethod("saveData"),
    addRow: legacyMethod("addPlanningRow"),
    removeRow: legacyMethod("removePlanningRow"),
    clear: legacyMethod("clearAllTable"),
    toggleList: legacyMethod("toggleList"),
    openManagePanel: legacyMethod("openManagePanel"),
    closeManagePanel: legacyMethod("closeManagePanel"),
    manageSelectCategory: legacyMethod("manageSelectCategory"),
    manageGoBack: legacyMethod("manageGoBack"),
    manageGoAdd: legacyMethod("manageGoAdd"),
    manageGoRemove: legacyMethod("manageGoRemove"),
    manageDoAdd: legacyMethod("manageDoAdd"),
    manageRemoveItem: legacyMethod("manageRemoveItem"),
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
    init: legacyMethod("renderWarehousePage"),
    show: legacyMethod("showWarehouse"),
    render: legacyMethod("renderWarehousePage"),
    save: legacyMethod("persistWarehouseData"),
    showLogs: legacyMethod("showWarehouseLogs"),
    showGraph: legacyMethod("showWarehouseGraph"),
    updateStockForm: legacyMethod("updateWarehouseStockForm"),
    updateStockFormFromEvent: legacyMethod("updateWarehouseStockFormFromEvent"),
    saveStockAdjustment: legacyMethod("saveWarehouseStockAdjustment"),
    saveIssueRow: legacyMethod("saveWarehouseIssueRow"),
    updateIssueDraftWorker: legacyMethod("updateWarehouseIssueDraftWorker"),
    updateIssueDraftSlotItem: legacyMethod("updateWarehouseIssueDraftSlotItem"),
    updateIssueDraftSlotQuantity: legacyMethod("updateWarehouseIssueDraftSlotQuantity"),
    updateIssueDraftComment: legacyMethod("updateWarehouseIssueDraftComment"),
    toggleProcurementUser: legacyMethod("toggleWarehouseProcurementUser"),
    addCatalogItem: legacyMethod("addWarehouseCatalogItem"),
    removeCatalogItem: legacyMethod("removeWarehouseCatalogItem"),
    setCatalogItemLimit: legacyMethod("setWarehouseCatalogItemLimit"),
    applyLogFilters: legacyMethod("applyWarehouseLogFilters"),
    resetLogFilters: legacyMethod("resetWarehouseLogFilters"),
    deleteLog: legacyMethod("deleteWarehouseLog"),
    clearLogs: legacyMethod("clearAllWarehouseLogs"),
    printInventory: legacyMethod("printWarehouseInventory"),
    exportInventoryToPDF: legacyMethod("exportWarehouseInventoryToPDF"),
    handleImportExcel: legacyMethod("handleWarehouseImportExcel"),
  });

  assignNamespace("surveys", {
    init: legacyMethod("setupSurveyTargetHandlers"),
    show: legacyMethod("showSurveys"),
    render: legacyMethod("renderSurveysList"),
    submit: legacyMethod("submitSurvey"),
    addAnswerField: legacyMethod("addSurveyAnswerField"),
    vote: legacyMethod("voteSurvey"),
    togglePin: legacyMethod("toggleSurveyPin"),
    delete: legacyMethod("deleteSurvey"),
  });

  assignNamespace("admin", {
    init: legacyMethod("initAdmins"),
    open: legacyMethod("openAdminPanel"),
    close: legacyMethod("closeAdminPanel"),
    switchTab: legacyMethod("switchTab"),
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
    openBackupRestorePanel: legacyMethod("openBackupRestorePanel"),
    loadBackupRestoreOptions: legacyMethod("loadBackupRestoreOptions"),
    restoreSelectedBackup: legacyMethod("restoreSelectedBackup"),
    confirmRestoreBackup: legacyMethod("confirmRestoreBackup"),
    listBackups: legacyMethod("handleListBackups"),
    showBackupInfo: legacyMethod("handleBackupInfo"),
    selectBackupForRestore: legacyMethod("selectBackupForRestore"),
  });

  assignNamespace("reports", {
    open: legacyMethod("openReportModal"),
    close: legacyMethod("closeReportModal"),
    submit: legacyMethod("submitReport"),
    filter: legacyMethod("filterReports"),
    review: legacyMethod("reviewReport"),
    delete: legacyMethod("deleteReport"),
    openChangePassword: legacyMethod("openChangePasswordModal"),
    closeChangePassword: legacyMethod("closeChangePasswordModal"),
    submitChangePassword: legacyMethod("submitChangePassword"),
  });

  assignNamespace("importExport", {
    saveAll: legacyMethod("saveAllData"),
    printPlanner: legacyMethod("handlePrint"),
    exportPlanner: legacyMethod("handleExport"),
    exportPlannerExcel: legacyMethod("exportPlannerToExcel"),
    exportPlannerPDF: legacyMethod("exportPlannerToPDF"),
    exportModule: legacyMethod("handleModuleExport"),
    openImportModal: legacyMethod("openModuleImportModal"),
    closeImportModal: legacyMethod("closeModuleImportModal"),
    handleImportFileChange: legacyMethod("handleModuleImportFileChange"),
    resetImportFile: legacyMethod("resetModuleImportModalFile"),
    uploadImport: legacyMethod("uploadModuleImport"),
    exportTidplanPDF: legacyMethod("handleTidplanExportPdf"),
    exportWarehouseExcel: legacyMethod("handleWarehouseExportExcel"),
    togglePlannerDropdown: legacyMethod("togglePlannerExportImportDropdown"),
    toggleTidplanDropdown: legacyMethod("toggleTidplanExportImportDropdown"),
    toggleWarehouseDropdown: legacyMethod("toggleWarehouseExportImportDropdown"),
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
    setLanguage: legacyMethod("setLanguage"),
    toggleDarkMode: legacyMethod("toggleDarkMode"),
    setColorTheme: legacyMethod("setColorTheme"),
    toggleBinPermission: legacyMethod("toggleBinPermission"),
    showAlert: legacyMethod("showAlert"),
    showConfirm: legacyMethod("showConfirm"),
    showPromptDialog: legacyMethod("showPromptDialog"),
    showToast: legacyMethod("showToast"),
    initTooltips: legacyMethod("initTooltips"),
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
    init: legacyMethod("loadBinsData"),
    show: legacyMethod("toggleBinsView"),
    render: legacyMethod("renderBinsTable"),
    addPlan: legacyMethod("addBinPlan"),
    removePlan: legacyMethod("removeBinPlan"),
  });

  assignNamespace("notifications", {
    show: legacyMethod("showNotifications"),
    submit: legacyMethod("submitNotification"),
    openPrintChooser: legacyMethod("openNotificationPrintChooser"),
    closePrintChooser: legacyMethod("closeNotificationPrintChooser"),
    printSelected: legacyMethod("printSelectedNotification"),
    closeViewer: legacyMethod("closeNotificationViewer"),
    previousImage: legacyMethod("prevNotificationImage"),
    nextImage: legacyMethod("nextNotificationImage"),
  });

  const compatibilityHandlers = {
    addBinPlan: "bins.addPlan",
    addKarna: "tidplan.addKarna",
    addMoment: "tidplan.addMoment",
    addNewAdmin: "admin.addNewAdmin",
    addPlan: "tidplan.addPlan",
    addPlanningRow: "planner.addRow",
    addSurveyAnswerField: "surveys.addAnswerField",
    addTidplanActivity: "tidplan.addActivity",
    addTidplanZoneFromInputs: "tidplan.addZoneFromInputs",
    addWarehouseCatalogItem: "warehouse.addCatalogItem",
    applyTidplanSort: "tidplan.applySort",
    applyWarehouseLogFilters: "warehouse.applyLogFilters",
    clearAllTable: "planner.clear",
    clearAllTidplanZones: "tidplan.clearZones",
    clearAllWarehouseLogs: "warehouse.clearLogs",
    clearLogs: "admin.clearLogs",
    clearTidplan: "tidplan.clear",
    closeAdminPanel: "admin.close",
    closeChangePasswordModal: "reports.closeChangePassword",
    closeManagePanel: "planner.closeManagePanel",
    closeModuleImportModal: "importExport.closeImportModal",
    closeNotificationPrintChooser: "notifications.closePrintChooser",
    closeNotificationViewer: "notifications.closeViewer",
    closeReportModal: "reports.close",
    confirmRestoreBackup: "admin.confirmRestoreBackup",
    confirmRemoveSite: "sites.confirmRemove",
    deleteWarehouseLog: "warehouse.deleteLog",
    deleteReport: "reports.delete",
    deleteSurvey: "surveys.delete",
    enterReadonlyMode: "core.enterReadonlyMode",
    exportPlannerToExcel: "importExport.exportPlannerExcel",
    exportPlannerToPDF: "importExport.exportPlannerPDF",
    exportWarehouseInventoryToPDF: "warehouse.exportInventoryToPDF",
    filterReports: "reports.filter",
    handleExport: "importExport.exportPlanner",
    handleLogin: "core.login",
    handleModuleExport: "importExport.exportModule",
    handlePrint: "importExport.printPlanner",
    handleTidplanExportPdf: "importExport.exportTidplanPDF",
    handleWarehouseExportExcel: "importExport.exportWarehouseExcel",
    handleBackupInfo: "admin.showBackupInfo",
    handleListBackups: "admin.listBackups",
    loadBackupRestoreOptions: "admin.loadBackupRestoreOptions",
    logout: "core.logout",
    manageDoAdd: "planner.manageDoAdd",
    manageGoAdd: "planner.manageGoAdd",
    manageGoBack: "planner.manageGoBack",
    manageGoRemove: "planner.manageGoRemove",
    manageRemoveItem: "planner.manageRemoveItem",
    manageSelectCategory: "planner.manageSelectCategory",
    nextNotificationImage: "notifications.nextImage",
    openAdminPanel: "admin.open",
    openBackupRestorePanel: "admin.openBackupRestorePanel",
    openChangePasswordModal: "reports.openChangePassword",
    openManagePanel: "planner.openManagePanel",
    openModuleImportModal: "importExport.openImportModal",
    openNotificationPrintChooser: "notifications.openPrintChooser",
    openReportModal: "reports.open",
    prevNotificationImage: "notifications.previousImage",
    printSelectedNotification: "notifications.printSelected",
    printTidplan: "tidplan.print",
    printWarehouseInventory: "warehouse.printInventory",
    promptAddSite: "sites.promptAdd",
    removeBinPlan: "bins.removePlan",
    removeKarna: "tidplan.removeKarna",
    removeMoment: "tidplan.removeMoment",
    removePlan: "tidplan.removePlan",
    removePlanningRow: "planner.removeRow",
    resetThemeSettings: "admin.resetThemeSettings",
    resetTidplanLayoutSettings: "admin.resetTidplanLayoutSettings",
    resetWarehouseLogFilters: "warehouse.resetLogFilters",
    removeAdminAction: "admin.removeAction",
    reviewReport: "reports.review",
    restoreSelectedBackup: "admin.restoreSelectedBackup",
    runManualBackup: "admin.runManualBackup",
    saveAllData: "importExport.saveAll",
    saveAdminPerms: "admin.savePerms",
    saveGuestAccessSettings: "admin.saveGuestAccessSettings",
    saveTidplanData: "tidplan.save",
    saveWarehouseStockAdjustment: "warehouse.saveStockAdjustment",
    selectBackupForRestore: "admin.selectBackupForRestore",
    setColorTheme: "utils.setColorTheme",
    setLanguage: "utils.setLanguage",
    showNotifications: "notifications.show",
    showPlanner: "tidplan.showPlanner",
    showSurveys: "surveys.show",
    showTidplan: "tidplan.show",
    showWarehouse: "warehouse.show",
    showWarehouseGraph: "warehouse.showGraph",
    showWarehouseLogs: "warehouse.showLogs",
    submitChangePassword: "reports.submitChangePassword",
    submitNotification: "notifications.submit",
    submitReport: "reports.submit",
    submitSurvey: "surveys.submit",
    switchTab: "admin.switchTab",
    switchToLogin: "core.switchToLogin",
    toggleAdminPerms: "admin.togglePerms",
    toggleBinPermission: "utils.toggleBinPermission",
    toggleBinsView: "bins.show",
    toggleDarkMode: "utils.toggleDarkMode",
    toggleList: "planner.toggleList",
    togglePlannerExportImportDropdown: "importExport.togglePlannerDropdown",
    toggleSurveyPin: "surveys.togglePin",
    toggleSiteDropdown: "sites.toggleDropdown",
    toggleTidplanExportImportDropdown: "importExport.toggleTidplanDropdown",
    toggleTidplanSortMenu: "tidplan.toggleSortMenu",
    toggleWarehouseExportImportDropdown: "importExport.toggleWarehouseDropdown",
    toggleZoneManager: "tidplan.toggleZoneManager",
    updateTidplan: "tidplan.update",
    updateWarehouseStockForm: "warehouse.updateStockForm",
    uploadModuleImport: "importExport.uploadImport",
    voteSurvey: "surveys.vote",
  };

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

  Object.keys(compatibilityHandlers).forEach((handlerName) => {
    captureLegacy(handlerName);
    global[handlerName] = function (...args) {
      return invokeAction(compatibilityHandlers[handlerName], args);
    };
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
    handlers: compatibilityHandlers,
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
