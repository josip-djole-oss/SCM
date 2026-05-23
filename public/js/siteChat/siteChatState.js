var siteChatState = {
  sites: [],
  activeSiteId: "",
  messagesBySite: {},
  draftsBySite: {},
  pendingAttachmentsBySite: {},
  failedDrafts: {},
  replyToBySite: {},
  unreadBySite: {},
  hasMoreBySite: {},
  nextBeforeBySite: {},
  loading: false,
  sending: false,
  canModerate: false,
  messageLimit: 4000,
  attachmentMaxBytes: 10 * 1024 * 1024,
  renderLimit: 120,
  lastRenderedMessageId: "",
  pollTimer: null,
};

var SITE_CHAT_REACTIONS = ["👍", "✅", "👀", "⚠️"];
var SITE_CHAT_PAGE_SIZE = 50;

function siteChatSafeText(value) {
  if (typeof escapeHtml === "function") return escapeHtml(String(value || ""));
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function siteChatFormatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString(getCurrentLocale ? getCurrentLocale() : undefined, { hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return "";
  }
}

function siteChatFormatDay(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  if (target.getTime() === today.getTime()) return "Danas";
  if (target.getTime() === yesterday.getTime()) return "Jucer";
  return target.toLocaleDateString(getCurrentLocale ? getCurrentLocale() : undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function siteChatCurrentUserEmail() {
  return String(appState.currentUser || "").trim().toLowerCase();
}

function siteChatRoleLabel(roleKey) {
  const labels = {
    radnik: "Worker",
    grupovodja: "Gruppledare",
    poslovodja: "Arbetsledare",
    projektledare: "Projektledare",
    kontor: "Kontor",
    store_manager: "Store Manager",
    admin: "Admin",
    superadmin: "Superadmin",
  };
  return labels[String(roleKey || "").toLowerCase()] || roleKey || "Worker";
}

function siteChatFunctionBadges(roles) {
  const source = Array.isArray(roles) && roles.length ? roles : ["radnik"];
  return Array.from(new Set(source.map((role) => String(role || "").trim()).filter(Boolean)))
    .map((role) => `<span class="site-chat-role-badge">${siteChatSafeText(siteChatRoleLabel(role))}</span>`)
    .join("");
}

function siteChatGetMessages(siteId = siteChatState.activeSiteId) {
  return siteChatState.messagesBySite[siteId] || [];
}

function siteChatSetMessages(siteId, messages, appendOlder = false) {
  const current = siteChatState.messagesBySite[siteId] || [];
  const map = new Map();
  (appendOlder ? [...messages, ...current] : [...current, ...messages]).forEach((message) => {
    if (message && message.id) map.set(message.id, message);
  });
  const next = Array.from(map.values()).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  siteChatState.messagesBySite[siteId] = next;
}

function siteChatUpdateMessage(siteId, message) {
  if (!message || !message.id) return;
  const messages = siteChatState.messagesBySite[siteId] || [];
  const index = messages.findIndex((entry) => entry.id === message.id);
  if (index >= 0) messages[index] = message;
  else messages.push(message);
  siteChatSetMessages(siteId, messages, false);
}

function siteChatIsMobile() {
  return window.innerWidth <= 640;
}

function siteChatScrollToBottom() {
  requestAnimationFrame(() => {
    const list = document.getElementById("siteChatMessages");
    if (list) list.scrollTop = list.scrollHeight;
  });
}
