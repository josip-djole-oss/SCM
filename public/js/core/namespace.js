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
    save(...args) {
      return callLegacy("saveAllData", args);
    },
    saveData(...args) {
      return callLegacy("saveData", args);
    },
    login(...args) {
      return callLegacy("handleLogin", args);
    },
    enterReadonlyMode(...args) {
      return callLegacy("enterReadonlyMode", args);
    },
    switchToLogin(...args) {
      return callLegacy("switchToLogin", args);
    },
    showHome(...args) {
      return callLegacy("showHome", args);
    },
    logout(...args) {
      return callLegacy("logout", args);
    },
    applyPermissions(...args) {
      return callLegacy("applyPermissionVisibility", args);
    },
  });

  assignNamespace("sites", {
    init(...args) {
      return callLegacy("populateSiteSelect", args);
    },
    render(...args) {
      return callLegacy("renderSiteSwitcher", args);
    },
    switchSite(...args) {
      return callLegacy("changeSite", args);
    },
    switchSiteFromLocal(...args) {
      return callLegacy("switchSiteFromLocal", args);
    },
    toggleDropdown(...args) {
      return callLegacy("toggleSiteDropdown", args);
    },
    closeDropdown(...args) {
      return callLegacy("closeSiteDropdown", args);
    },
    promptAdd(...args) {
      return callLegacy("promptAddSite", args);
    },
    confirmRemove(...args) {
      return callLegacy("confirmRemoveSite", args);
    },
    add(...args) {
      return callLegacy("addSite", args);
    },
    remove(...args) {
      return callLegacy("removeSite", args);
    },
    updateTitle(...args) {
      return callLegacy("updateMainTitle", args);
    },
  });

  assignNamespace("dashboard", {
    toggleSidebarCollapse(...args) {
      return callLegacy("toggleSidebarCollapse", args);
    },
    toggleSidebarOverlay(...args) {
      return callLegacy("toggleSidebarOverlay", args);
    },
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
    useTidplanScheme(...args) {
      return callLegacy("useTidplanSchemeForToday", args);
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
    init(...args) {
      return callLegacy("loadTidplanData", args);
    },
    show(...args) {
      return callLegacy("showTidplan", args);
    },
    showPlanner(...args) {
      return callLegacy("showPlanner", args);
    },
    render(...args) {
      return callLegacy("updateTidplan", args);
    },
    update(...args) {
      return callLegacy("updateTidplan", args);
    },
    save(...args) {
      return callLegacy("saveTidplanData", args);
    },
    clear(...args) {
      return callLegacy("clearTidplan", args);
    },
    print(...args) {
      return callLegacy("printTidplan", args);
    },
    addActivity(...args) {
      return callLegacy("addTidplanActivity", args);
    },
    toggleSortMenu(...args) {
      return callLegacy("toggleTidplanSortMenu", args);
    },
    applySort(...args) {
      return callLegacy("applyTidplanSort", args);
    },
    toggleZoneManager(...args) {
      return callLegacy("toggleZoneManager", args);
    },
    addZoneFromInputs(...args) {
      return callLegacy("addTidplanZoneFromInputs", args);
    },
    clearZones(...args) {
      return callLegacy("clearAllTidplanZones", args);
    },
    addPlan(...args) {
      return callLegacy("addPlan", args);
    },
    addMoment(...args) {
      return callLegacy("addMoment", args);
    },
    addKarna(...args) {
      return callLegacy("addKarna", args);
    },
    removePlan(...args) {
      return callLegacy("removePlan", args);
    },
    removeMoment(...args) {
      return callLegacy("removeMoment", args);
    },
    removeKarna(...args) {
      return callLegacy("removeKarna", args);
    },
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
    toggleSection(...args) {
      return callLegacy("toggleWarehouseSection", args);
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
    updateCatalogSearch(...args) {
      return callLegacy("updateWarehouseCatalogSearch", args);
    },
    toggleCatalogExpand(...args) {
      return callLegacy("toggleWarehouseCatalogExpand", args);
    },
    applyLogFilters(...args) {
      return callLegacy("applyWarehouseLogFilters", args);
    },
    loadMoreLogs(...args) {
      return callLegacy("loadMoreWarehouseLogs", args);
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

  assignNamespace("workwear", {
    show(...args) {
      return callLegacy("showWorkwear", args);
    },
    hide(...args) {
      return callLegacy("hideWorkwearSection", args);
    },
    render(...args) {
      return callLegacy("renderWorkwearModule", args);
    },
    applyFilters(...args) {
      return callLegacy("workwearApplyFilters", args);
    },
    prevProductPage(...args) {
      return callLegacy("workwearPrevProductPage", args);
    },
    nextProductPage(...args) {
      return callLegacy("workwearNextProductPage", args);
    },
    loadMoreProducts(...args) {
      return callLegacy("workwearNextProductPage", args);
    },
    loadMoreOrders(...args) {
      return callLegacy("workwearLoadMoreOrders", args);
    },
    selectSizeForProduct(...args) {
      return callLegacy("workwearSelectSizeForProduct", args);
    },
    selectVariantForProduct(...args) {
      return callLegacy("workwearSelectVariantForProduct", args);
    },
    setQuantityForProduct(...args) {
      return callLegacy("workwearSetQuantityForProduct", args);
    },
    setCommentForProduct(...args) {
      return callLegacy("workwearSetCommentForProduct", args);
    },
    addToCart(...args) {
      return callLegacy("workwearAddToCart", args);
    },
    toggleCartOverlay(...args) {
      return callLegacy("workwearToggleCartOverlay", args);
    },
    toggleOrdersOverlay(...args) {
      return callLegacy("workwearToggleOrdersOverlay", args);
    },
    openProductImageViewer(...args) {
      return callLegacy("workwearOpenProductImageViewer", args);
    },
    closeProductImageViewer(...args) {
      return callLegacy("workwearCloseProductImageViewer", args);
    },
    prevProductImage(...args) {
      return callLegacy("workwearPrevProductImage", args);
    },
    nextProductImage(...args) {
      return callLegacy("workwearNextProductImage", args);
    },
    closeCartOverlay(...args) {
      return callLegacy("workwearCloseCartOverlay", args);
    },
    closeOrdersOverlay(...args) {
      return callLegacy("workwearCloseOrdersOverlay", args);
    },
    closeManagerEditor(...args) {
      return callLegacy("workwearCloseManagerEditor", args);
    },
    removeCartItem(...args) {
      return callLegacy("workwearRemoveCartItem", args);
    },
    saveDraft(...args) {
      return callLegacy("workwearSaveDraft", args);
    },
    submitOrder(...args) {
      return callLegacy("workwearSubmitOrder", args);
    },
    cancelOrder(...args) {
      return callLegacy("workwearCancelOrder", args);
    },
    approveOrder(...args) {
      return callLegacy("workwearApproveOrder", args);
    },
    rejectOrder(...args) {
      return callLegacy("workwearRejectOrder", args);
    },
    markDelivered(...args) {
      return callLegacy("workwearMarkDelivered", args);
    },
    saveProduct(...args) {
      return callLegacy("workwearSaveProduct", args);
    },
    toggleManagerEditor(...args) {
      return callLegacy("workwearToggleManagerEditor", args);
    },
    startNewProductWizard(...args) {
      return callLegacy("workwearStartNewProductWizard", args);
    },
    editProductWizard(...args) {
      return callLegacy("workwearEditProductWizard", args);
    },
    removeOrArchiveProduct(...args) {
      return callLegacy("workwearRemoveOrArchiveProduct", args);
    },
    setProductWizardStep(...args) {
      return callLegacy("workwearSetProductWizardStep", args);
    },
    prevProductWizardStep(...args) {
      return callLegacy("workwearPrevProductWizardStep", args);
    },
    nextProductWizardStep(...args) {
      return callLegacy("workwearNextProductWizardStep", args);
    },
    updateWizardCategory(...args) {
      return callLegacy("workwearUpdateWizardCategory", args);
    },
    quickAddWizardCategory(...args) {
      return callLegacy("workwearQuickAddWizardCategory", args);
    },
    quickAddWizardSubcategory(...args) {
      return callLegacy("workwearQuickAddWizardSubcategory", args);
    },
    previewProductLink(...args) {
      return callLegacy("workwearPreviewProductLink", args);
    },
    applyProductLinkPreview(...args) {
      return callLegacy("workwearApplyProductLinkPreview", args);
    },
    clearProductLinkPreview(...args) {
      return callLegacy("workwearClearProductLinkPreview", args);
    },
    updateWizardSizePreset(...args) {
      return callLegacy("workwearUpdateWizardSizePreset", args);
    },
    saveWizardSizePreset(...args) {
      return callLegacy("workwearSaveWizardSizePreset", args);
    },
    toggleWizardSize(...args) {
      return callLegacy("workwearToggleWizardSize", args);
    },
    addWizardCustomSize(...args) {
      return callLegacy("workwearAddWizardCustomSize", args);
    },
    addWizardVariant(...args) {
      return callLegacy("workwearAddWizardVariant", args);
    },
    updateWizardVariantField(...args) {
      return callLegacy("workwearUpdateWizardVariantField", args);
    },
    removeWizardVariant(...args) {
      return callLegacy("workwearRemoveWizardVariant", args);
    },
    removeWizardSize(...args) {
      return callLegacy("workwearRemoveWizardSize", args);
    },
    toggleWizardSite(...args) {
      return callLegacy("workwearToggleWizardSite", args);
    },
    toggleWizardRole(...args) {
      return callLegacy("workwearToggleWizardRole", args);
    },
    toggleWizardApprovalRole(...args) {
      return callLegacy("workwearToggleWizardApprovalRole", args);
    },
    toggleWizardAllSites(...args) {
      return callLegacy("workwearToggleWizardAllSites", args);
    },
    toggleWizardAllRoles(...args) {
      return callLegacy("workwearToggleWizardAllRoles", args);
    },
    refreshWizardFlags(...args) {
      return callLegacy("workwearRefreshWizardFlags", args);
    },
    uploadWizardImage(...args) {
      return callLegacy("workwearUploadWizardImage", args);
    },
    toggleProductSection(...args) {
      return callLegacy("workwearToggleProductSection", args);
    },
    switchManagerTab(...args) {
      return callLegacy("workwearSwitchManagerTab", args);
    },
    applyBulkEdit(...args) {
      return callLegacy("workwearApplyBulkEdit", args);
    },
    addCategory(...args) {
      return callLegacy("workwearAddCategory", args);
    },
    renameCategory(...args) {
      return callLegacy("workwearRenameCategory", args);
    },
    archiveCategory(...args) {
      return callLegacy("workwearArchiveCategory", args);
    },
    addSubcategory(...args) {
      return callLegacy("workwearAddSubcategory", args);
    },
    renameSubcategory(...args) {
      return callLegacy("workwearRenameSubcategory", args);
    },
    archiveSubcategory(...args) {
      return callLegacy("workwearArchiveSubcategory", args);
    },
    addManagerSizePreset(...args) {
      return callLegacy("workwearAddManagerSizePreset", args);
    },
    updateManagerSizePreset(...args) {
      return callLegacy("workwearUpdateManagerSizePreset", args);
    },
    archiveManagerSizePreset(...args) {
      return callLegacy("workwearArchiveManagerSizePreset", args);
    },
    restoreManagerSizePreset(...args) {
      return callLegacy("workwearRestoreManagerSizePreset", args);
    },
    setBulkSelection(...args) {
      return callLegacy("workwearSetBulkSelection", args);
    },
    toggleBulkSite(...args) {
      return callLegacy("workwearToggleBulkSite", args);
    },
    toggleBulkRole(...args) {
      return callLegacy("workwearToggleBulkRole", args);
    },
    toggleBulkAllSites(...args) {
      return callLegacy("workwearToggleBulkAllSites", args);
    },
    toggleBulkAllRoles(...args) {
      return callLegacy("workwearToggleBulkAllRoles", args);
    },
    adjustBudget(...args) {
      return callLegacy("workwearAdjustBudget", args);
    },
    saveGlobalRules(...args) {
      return callLegacy("workwearSaveGlobalRules", args);
    },
    saveStoreUser(...args) {
      return callLegacy("workwearSaveStoreUser", args);
    },
    editStoreUser(...args) {
      return callLegacy("workwearEditStoreUser", args);
    },
    cancelStoreUserEdit(...args) {
      return callLegacy("workwearCancelStoreUserEdit", args);
    },
    requestPasswordReset(...args) {
      return callLegacy("workwearRequestPasswordReset", args);
    },
    approvePasswordReset(...args) {
      return callLegacy("workwearApprovePasswordReset", args);
    },
    rejectPasswordReset(...args) {
      return callLegacy("workwearRejectPasswordReset", args);
    },
    exportData(...args) {
      return callLegacy("workwearExportData", args);
    },
    openImport(...args) {
      return callLegacy("workwearOpenImport", args);
    },
    importDataFromEvent(...args) {
      return callLegacy("workwearImportDataFromEvent", args);
    },
    runExportWizard(...args) {
      return callLegacy("workwearRunExportWizard", args);
    },
    setOrderFilter(...args) {
      return callLegacy("workwearSetOrderFilter", args);
    },
  });

  assignNamespace("store", {
    show(...args) {
      return CMAX.workwear.show(...args);
    },
  });

  assignNamespace("siteChat", {
    show(...args) {
      return callLegacy("showSiteChat", args);
    },
    openSite(...args) {
      return callLegacy("siteChatOpenSite", args);
    },
    backToList(...args) {
      return callLegacy("siteChatBackToList", args);
    },
    send(...args) {
      return callLegacy("siteChatSendMessage", args);
    },
    retry(...args) {
      return callLegacy("siteChatRetryMessage", args);
    },
    loadOlder(...args) {
      return callLegacy("siteChatLoadOlder", args);
    },
    jumpLatest(...args) {
      return callLegacy("siteChatJumpLatest", args);
    },
    setDraft(...args) {
      return callLegacy("siteChatSetDraft", args);
    },
    attachFile(...args) {
      return callLegacy("siteChatAttachFile", args);
    },
    removeAttachment(...args) {
      return callLegacy("siteChatRemoveAttachment", args);
    },
    reply(...args) {
      return callLegacy("siteChatReplyToMessage", args);
    },
    cancelReply(...args) {
      return callLegacy("siteChatCancelReply", args);
    },
    edit(...args) {
      return callLegacy("siteChatEditMessage", args);
    },
    delete(...args) {
      return callLegacy("siteChatDeleteMessage", args);
    },
    react(...args) {
      return callLegacy("siteChatToggleReaction", args);
    },
    pin(...args) {
      return callLegacy("siteChatPinMessage", args);
    },
    unpin(...args) {
      return callLegacy("siteChatUnpinMessage", args);
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
    loadMore(...args) {
      return callLegacy("loadMoreSurveys", args);
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
    showCenter(...args) {
      return callLegacy("showReportsCenter", args);
    },
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
    loadMore(...args) {
      return callLegacy("loadMoreReports", args);
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
    saveAll(...args) {
      return callLegacy("saveAllData", args);
    },
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
    exportModule(...args) {
      return callLegacy("handleModuleExport", args);
    },
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
    uploadImport(...args) {
      return callLegacy("uploadModuleImport", args);
    },
    exportTidplanPDF(...args) {
      return callLegacy("handleTidplanExportPdf", args);
    },
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
    loadMore(...args) {
      return callLegacy("loadMoreNotificationsList", args);
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

  assignNamespace("accountNotifications", {
    togglePanel(...args) {
      return callLegacy("toggleAccountNotificationsPanel", args);
    },
    markAllRead(...args) {
      return callLegacy("markAllAccountNotificationsRead", args);
    },
    openItem(...args) {
      return callLegacy("openAccountNotificationItem", args);
    },
    deleteItem(...args) {
      return callLegacy("deleteAccountNotificationItem", args);
    },
    closePanel(...args) {
      return callLegacy("closeAccountNotificationsPanel", args);
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

  function setDelegatedActionBusy(el, isBusy) {
    if (!el) return;
    el.dataset.cmaxBusy = isBusy ? "true" : "false";
    el.classList.toggle("is-loading", isBusy);
    if ("disabled" in el) {
      el.disabled = isBusy;
    }
    el.setAttribute("aria-busy", isBusy ? "true" : "false");
  }

  const delegatedDebounceMap = new WeakMap();
  const delegatedThrottleMap = new WeakMap();

  function getDelegatedDelay(el, attributeName) {
    const value = Number(el?.getAttribute(attributeName) || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function createEventSnapshot(event) {
    return {
      type: event?.type || "click",
      target: event?.target || null,
      currentTarget: event?.currentTarget || null,
      key: event?.key || "",
      preventDefault() {},
      stopPropagation() {},
    };
  }

  async function dispatchDelegatedAction(el, event) {
    const isServerAction = el.getAttribute("data-cmax-server-action") === "true";
    const loadingKey = el.getAttribute("data-cmax-loading-key") || "loadingDefault";
    if (isServerAction && typeof showLoading === "function") {
      setDelegatedActionBusy(el, true);
      showLoading(loadingKey);
    }
    try {
      await Promise.resolve(CMAX.events.dispatch(el.getAttribute("data-cmax-action"), el, event));
    } finally {
      if (isServerAction) {
        setDelegatedActionBusy(el, false);
        if (typeof hideLoading === "function") hideLoading();
      }
    }
  }

  async function handleDelegatedEvent(event) {
    const el = event.target.closest("[data-cmax-action]");
    if (!el) return;

    const expectedEvent = el.getAttribute("data-cmax-event") || "click";
    if (expectedEvent !== event.type) return;
    if (el.dataset.cmaxBusy === "true") {
      event.preventDefault();
      return;
    }

    const debounceMs = getDelegatedDelay(el, "data-cmax-debounce");
    if (debounceMs > 0 && typeof global.cmaxDebounce === "function") {
      let debounced = delegatedDebounceMap.get(el);
      if (!debounced) {
        debounced = global.cmaxDebounce((nextEvent) => {
          dispatchDelegatedAction(el, nextEvent).catch((error) => console.error(error));
        }, debounceMs);
        delegatedDebounceMap.set(el, debounced);
      }
      debounced(createEventSnapshot(event));
      return;
    }

    const throttleMs = getDelegatedDelay(el, "data-cmax-throttle");
    if (throttleMs > 0 && typeof global.cmaxThrottle === "function") {
      let throttled = delegatedThrottleMap.get(el);
      if (!throttled) {
        throttled = global.cmaxThrottle((nextEvent) => {
          dispatchDelegatedAction(el, nextEvent).catch((error) => console.error(error));
        }, throttleMs);
        delegatedThrottleMap.set(el, throttled);
      }
      throttled(createEventSnapshot(event));
      return;
    }
    await dispatchDelegatedAction(el, event);
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
