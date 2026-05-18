function siteChatSetDraft(event) {
  const siteId = siteChatState.activeSiteId;
  if (!siteId) return;
  const el = event?.target || document.getElementById("siteChatDraft");
  siteChatState.draftsBySite[siteId] = String(el?.value || "");
}

function siteChatBackToList() {
  siteChatState.activeSiteId = "";
  renderSiteChatModule();
}

async function siteChatOpenSite(siteId, messageId = "") {
  const safeSite = String(siteId || "").trim();
  if (!safeSite) return;
  siteChatState.activeSiteId = safeSite;
  renderSiteChatModule();
  await siteChatLoadMessages(safeSite, { initial: true });
  const messages = siteChatGetMessages(safeSite);
  const last = messages[messages.length - 1];
  if (last) await siteChatApiMarkRead(safeSite, last.id).catch(() => {});
  siteChatState.unreadBySite[safeSite] = 0;
  renderSiteChatModule();
  if (messageId) {
    requestAnimationFrame(() => document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`)?.scrollIntoView({ block: "center" }));
  } else {
    siteChatScrollToBottom();
  }
}

async function siteChatLoadMessages(siteId, options = {}) {
  try {
    siteChatState.loading = true;
    const payload = await siteChatApiGetMessages(siteId, {
      limit: options.limit || SITE_CHAT_PAGE_SIZE,
      before: options.before || "",
    });
    siteChatSetMessages(siteId, payload.messages || [], Boolean(options.before));
    siteChatState.hasMoreBySite[siteId] = payload.hasMore === true;
    siteChatState.nextBeforeBySite[siteId] = payload.nextBefore || "";
    siteChatState.canModerate = payload.canModerate === true;
  } catch (error) {
    showToast(error.message || "Chat load failed", "error");
  } finally {
    siteChatState.loading = false;
  }
}

async function siteChatLoadOlder() {
  const siteId = siteChatState.activeSiteId;
  if (!siteId) return;
  const before = siteChatState.nextBeforeBySite[siteId] || "";
  if (!before) return;
  const list = document.getElementById("siteChatMessages");
  const previousHeight = list?.scrollHeight || 0;
  await siteChatLoadMessages(siteId, { before });
  renderSiteChatModule();
  requestAnimationFrame(() => {
    const nextList = document.getElementById("siteChatMessages");
    if (nextList) nextList.scrollTop = nextList.scrollHeight - previousHeight;
  });
}

async function siteChatSendMessage() {
  const siteId = siteChatState.activeSiteId;
  if (!siteId || siteChatState.sending) return;
  const text = String(siteChatState.draftsBySite[siteId] || document.getElementById("siteChatDraft")?.value || "").trim();
  const attachments = siteChatState.pendingAttachmentsBySite[siteId] || [];
  if (!text && !attachments.length) return;
  const clientId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const draft = {
    clientId,
    text,
    attachments,
    replyToMessageId: siteChatState.replyToBySite[siteId] || "",
  };
  const optimistic = {
    id: clientId,
    siteId,
    authorEmail: siteChatCurrentUserEmail(),
    authorName: appState.currentUserName || appState.currentUser || "Me",
    authorFunctions: appState.currentUserFunctions || [],
    text,
    attachments,
    replyToMessageId: draft.replyToMessageId,
    reactions: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "sending",
  };
  siteChatState.failedDrafts[clientId] = draft;
  siteChatUpdateMessage(siteId, optimistic);
  siteChatState.draftsBySite[siteId] = "";
  siteChatState.pendingAttachmentsBySite[siteId] = [];
  siteChatState.replyToBySite[siteId] = "";
  siteChatState.sending = true;
  renderSiteChatModule();
  siteChatScrollToBottom();
  try {
    const payload = await siteChatApiSendMessage(siteId, draft);
    const messages = siteChatGetMessages(siteId).filter((message) => message.id !== clientId);
    siteChatState.messagesBySite[siteId] = messages;
    siteChatUpdateMessage(siteId, payload.message);
    delete siteChatState.failedDrafts[clientId];
    await siteChatRefreshSitesAndUnread(false);
  } catch (error) {
    const failed = { ...optimistic, status: "failed" };
    siteChatUpdateMessage(siteId, failed);
    showToast(error.message || "Slanje poruke nije uspjelo.", "error");
  } finally {
    siteChatState.sending = false;
    renderSiteChatModule();
    siteChatScrollToBottom();
  }
}

async function siteChatRetryMessage(localId) {
  const siteId = siteChatState.activeSiteId;
  const draft = siteChatState.failedDrafts[localId];
  if (!siteId || !draft) return;
  const messages = siteChatGetMessages(siteId).map((message) => message.id === localId ? { ...message, status: "sending" } : message);
  siteChatState.messagesBySite[siteId] = messages;
  renderSiteChatModule();
  try {
    const payload = await siteChatApiSendMessage(siteId, draft);
    siteChatState.messagesBySite[siteId] = siteChatGetMessages(siteId).filter((message) => message.id !== localId);
    siteChatUpdateMessage(siteId, payload.message);
    delete siteChatState.failedDrafts[localId];
  } catch (error) {
    siteChatState.messagesBySite[siteId] = siteChatGetMessages(siteId).map((message) => message.id === localId ? { ...message, status: "failed" } : message);
    showToast(error.message || "Retry failed", "error");
  }
  renderSiteChatModule();
}

async function siteChatAttachFile(event) {
  const siteId = siteChatState.activeSiteId;
  const file = event?.target?.files?.[0];
  if (!siteId || !file) return;
  const max = Number(siteChatState.attachmentMaxBytes) || 10 * 1024 * 1024;
  if (file.size > max) {
    showToast(`Datoteka je prevelika (${siteChatFormatBytes(file.size)}).`, "error");
    event.target.value = "";
    return;
  }
  try {
    showLoading("loadingDefault");
    const payload = await siteChatApiUpload(siteId, file);
    siteChatState.pendingAttachmentsBySite[siteId] = [...(siteChatState.pendingAttachmentsBySite[siteId] || []), payload.attachment].slice(0, 5);
  } catch (error) {
    showToast(error.message || "Upload failed", "error");
  } finally {
    hideLoading();
    if (event?.target) event.target.value = "";
    renderSiteChatModule();
  }
}

function siteChatRemoveAttachment(index) {
  const siteId = siteChatState.activeSiteId;
  if (!siteId) return;
  const files = siteChatState.pendingAttachmentsBySite[siteId] || [];
  siteChatState.pendingAttachmentsBySite[siteId] = files.filter((_, idx) => idx !== Number(index));
  renderSiteChatModule();
}

function siteChatReplyToMessage(messageId) {
  const siteId = siteChatState.activeSiteId;
  if (!siteId) return;
  siteChatState.replyToBySite[siteId] = String(messageId || "");
  renderSiteChatModule();
  document.getElementById("siteChatDraft")?.focus();
}

function siteChatCancelReply() {
  const siteId = siteChatState.activeSiteId;
  if (!siteId) return;
  siteChatState.replyToBySite[siteId] = "";
  renderSiteChatModule();
}

async function siteChatEditMessage(messageId) {
  const siteId = siteChatState.activeSiteId;
  const message = siteChatFindMessage(messageId);
  if (!siteId || !message || message.deletedAt) return;
  const nextText = prompt("Uredi poruku", message.text || "");
  if (nextText === null) return;
  try {
    const payload = await siteChatApiEditMessage(siteId, messageId, nextText);
    siteChatUpdateMessage(siteId, payload.message);
    renderSiteChatModule();
  } catch (error) {
    showToast(error.message || "Edit failed", "error");
  }
}

async function siteChatDeleteMessage(messageId) {
  const siteId = siteChatState.activeSiteId;
  if (!siteId || !messageId) return;
  if (!confirm("Obrisati ovu poruku?")) return;
  try {
    const payload = await siteChatApiDeleteMessage(siteId, messageId);
    siteChatUpdateMessage(siteId, payload.message);
    renderSiteChatModule();
  } catch (error) {
    showToast(error.message || "Delete failed", "error");
  }
}

async function siteChatToggleReaction(messageId, reaction) {
  const siteId = siteChatState.activeSiteId;
  if (!siteId || !messageId) return;
  try {
    const payload = await siteChatApiReact(siteId, messageId, reaction);
    siteChatUpdateMessage(siteId, payload.message);
    renderSiteChatModule();
  } catch (error) {
    showToast(error.message || "Reaction failed", "error");
  }
}

async function siteChatPinMessage(messageId) {
  const siteId = siteChatState.activeSiteId;
  if (!siteId || !messageId) return;
  try {
    const payload = await siteChatApiPin(siteId, messageId);
    siteChatUpdateMessage(siteId, payload.message);
    renderSiteChatModule();
  } catch (error) {
    showToast(error.message || "Pin failed", "error");
  }
}

async function siteChatUnpinMessage(messageId) {
  const siteId = siteChatState.activeSiteId;
  if (!siteId || !messageId) return;
  try {
    const payload = await siteChatApiUnpin(siteId, messageId);
    siteChatUpdateMessage(siteId, payload.message);
    renderSiteChatModule();
  } catch (error) {
    showToast(error.message || "Unpin failed", "error");
  }
}

function siteChatJumpLatest() {
  siteChatScrollToBottom();
}
