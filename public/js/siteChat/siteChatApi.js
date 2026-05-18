async function siteChatApiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: options.body instanceof FormData
      ? (options.headers || {})
      : { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.error || `HTTP_${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload || {};
}

function siteChatApiGetSites() {
  return siteChatApiRequest("/api/site-chat/sites", { cache: "no-store" });
}

function siteChatApiGetUnread() {
  return siteChatApiRequest("/api/site-chat/unread", { cache: "no-store" });
}

function siteChatApiGetMessages(siteId, options = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit || SITE_CHAT_PAGE_SIZE));
  if (options.before) params.set("before", options.before);
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/messages?${params.toString()}`, { cache: "no-store" });
}

function siteChatApiSendMessage(siteId, draft) {
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/messages`, {
    method: "POST",
    body: JSON.stringify(draft || {}),
  });
}

function siteChatApiEditMessage(siteId, messageId, text) {
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });
}

function siteChatApiDeleteMessage(siteId, messageId) {
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/messages/${encodeURIComponent(messageId)}`, { method: "DELETE" });
}

function siteChatApiReact(siteId, messageId, reaction) {
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/messages/${encodeURIComponent(messageId)}/reactions`, {
    method: "POST",
    body: JSON.stringify({ reaction }),
  });
}

function siteChatApiPin(siteId, messageId) {
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/messages/${encodeURIComponent(messageId)}/pin`, { method: "POST" });
}

function siteChatApiUnpin(siteId, messageId) {
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/messages/${encodeURIComponent(messageId)}/pin`, { method: "DELETE" });
}

function siteChatApiMarkRead(siteId, messageId) {
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/read`, {
    method: "POST",
    body: JSON.stringify({ messageId: messageId || "" }),
  });
}

function siteChatApiUpload(siteId, file) {
  const form = new FormData();
  form.append("file", file);
  return siteChatApiRequest(`/api/site-chat/${encodeURIComponent(siteId)}/upload`, {
    method: "POST",
    body: form,
  });
}
