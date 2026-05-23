async function showSiteChat(initialSiteId = "", messageId = "") {
  if (!canAccessSiteChatModule()) {
    showToast("Nemate dozvolu za Site Chat.", "error");
    return false;
  }
  const openView = async () => {
    const homeSection = document.getElementById("home-section");
    const plannerSection = document.getElementById("planner-section");
    const tidplanSection = document.getElementById("tidplan-section");
    const notificationsSection = document.getElementById("notifications-section");
    const surveysSection = document.getElementById("surveys-section");
    const warehouseSection = document.getElementById("warehouse-section");
    const warehouseLogsSection = document.getElementById("warehouse-logs-section");
    const warehouseGraphSection = document.getElementById("warehouse-graph-section");
    const reportsSection = document.getElementById("reports-section");
    const settingsSection = document.getElementById("settings-section");
    const siteChatSection = document.getElementById("site-chat-section");
    const binsSection = document.getElementById("binsSection");
    const listsContainer = document.querySelector(".lists-container");
    if (typeof hideWorkwearSection === "function") hideWorkwearSection();
    if (homeSection) homeSection.style.display = "none";
    if (plannerSection) plannerSection.style.display = "none";
    if (tidplanSection) tidplanSection.style.display = "none";
    if (notificationsSection) notificationsSection.style.display = "none";
    if (surveysSection) surveysSection.style.display = "none";
    if (warehouseSection) warehouseSection.style.display = "none";
    if (warehouseLogsSection) warehouseLogsSection.style.display = "none";
    if (warehouseGraphSection) warehouseGraphSection.style.display = "none";
    if (reportsSection) reportsSection.style.display = "none";
    if (settingsSection) settingsSection.style.display = "none";
    if (binsSection) binsSection.classList.remove("active");
    if (listsContainer) listsContainer.classList.add("hidden");
    if (siteChatSection) siteChatSection.style.display = "block";
    currentView = "siteChat";
    saveCurrentView("siteChat");
    pushRouteForView("siteChat");
    if (typeof updateShellForView === "function") updateShellForView("siteChat");
    sendPresence(true).catch(() => {});
    refreshPresence().catch(() => {});
    await siteChatRefreshSitesAndUnread(true);
    const pending = window.siteChatPendingFocus || null;
    window.siteChatPendingFocus = null;
    const targetSite = initialSiteId || pending?.siteId || siteChatState.activeSiteId || (siteChatState.sites[0]?.siteId || "");
    const targetMessage = messageId || pending?.messageId || "";
    if (targetSite && (!siteChatIsMobile() || initialSiteId || pending)) {
      await siteChatOpenSite(targetSite, targetMessage);
    } else {
      renderSiteChatModule();
    }
    siteChatStartPolling();
  };
  return withLoadingPromise("loadingDefault", openView);
}

async function siteChatRefreshSitesAndUnread(render = true) {
  const [sitesPayload, unreadPayload] = await Promise.all([
    siteChatApiGetSites(),
    siteChatApiGetUnread().catch(() => ({ unread: {}, total: 0 })),
  ]);
  siteChatState.sites = sitesPayload.sites || [];
  siteChatState.canModerate = sitesPayload.canModerate === true;
  siteChatState.messageLimit = Number(sitesPayload.messageLimit) || siteChatState.messageLimit;
  siteChatState.attachmentMaxBytes = Number(sitesPayload.attachmentMaxBytes) || siteChatState.attachmentMaxBytes;
  siteChatState.unreadBySite = unreadPayload.unread || Object.fromEntries(siteChatState.sites.map((site) => [site.siteId, site.unreadCount || 0]));
  siteChatState.sites.forEach((site) => {
    if (Object.prototype.hasOwnProperty.call(siteChatState.unreadBySite, site.siteId)) {
      site.unreadCount = siteChatState.unreadBySite[site.siteId];
    }
  });
  if (render) renderSiteChatModule();
}

function siteChatStartPolling() {
  siteChatStopPolling();
  siteChatState.pollTimer = setInterval(async () => {
    if (currentView !== "siteChat") {
      siteChatStopPolling();
      return;
    }
    try {
      await siteChatRefreshSitesAndUnread(false);
      if (siteChatState.activeSiteId) {
        await siteChatLoadMessages(siteChatState.activeSiteId, { initial: true });
        const messages = siteChatGetMessages(siteChatState.activeSiteId);
        const last = messages[messages.length - 1];
        if (last && document.hasFocus()) {
          await siteChatApiMarkRead(siteChatState.activeSiteId, last.id).catch(() => {});
          siteChatState.unreadBySite[siteChatState.activeSiteId] = 0;
        }
      }
      renderSiteChatModule();
    } catch (_) {}
  }, 12000);
}

function siteChatStopPolling() {
  if (siteChatState.pollTimer) {
    clearInterval(siteChatState.pollTimer);
    siteChatState.pollTimer = null;
  }
}

function siteChatCleanupDom() {
  const root = document.getElementById("siteChatRoot");
  if (root) root.replaceChildren();
}

window.showSiteChat = showSiteChat;
window.siteChatOpenSite = siteChatOpenSite;
window.siteChatBackToList = siteChatBackToList;
window.siteChatSendMessage = siteChatSendMessage;
window.siteChatRetryMessage = siteChatRetryMessage;
window.siteChatLoadOlder = siteChatLoadOlder;
window.siteChatJumpLatest = siteChatJumpLatest;
window.siteChatSetDraft = siteChatSetDraft;
window.siteChatAttachFile = siteChatAttachFile;
window.siteChatRemoveAttachment = siteChatRemoveAttachment;
window.siteChatReplyToMessage = siteChatReplyToMessage;
window.siteChatCancelReply = siteChatCancelReply;
window.siteChatEditMessage = siteChatEditMessage;
window.siteChatDeleteMessage = siteChatDeleteMessage;
window.siteChatToggleReaction = siteChatToggleReaction;
window.siteChatPinMessage = siteChatPinMessage;
window.siteChatUnpinMessage = siteChatUnpinMessage;
window.siteChatRefreshSitesAndUnread = siteChatRefreshSitesAndUnread;
window.siteChatStopPolling = siteChatStopPolling;
window.siteChatCleanupDom = siteChatCleanupDom;
