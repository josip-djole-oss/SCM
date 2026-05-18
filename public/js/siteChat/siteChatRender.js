function renderSiteChatModule() {
  const root = document.getElementById("siteChatRoot");
  if (!root) return;
  const activeSite = siteChatState.activeSiteId;
  const threadOpenClass = activeSite ? " is-thread-open" : "";
  root.innerHTML = `
    <section class="site-chat-shell${threadOpenClass}">
      ${renderSiteChatListPane()}
      ${renderSiteChatThreadPane(activeSite)}
    </section>
  `;
  siteChatRenderSidebarBadge();
}

function renderSiteChatListPane() {
  const sites = siteChatState.sites || [];
  const totalUnread = Object.values(siteChatState.unreadBySite || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (!sites.length) {
    return `
      <aside class="site-chat-list-pane">
        <div class="site-chat-list-head">
          <div>
            <p class="site-chat-eyebrow">Gradilisni chat</p>
            <h2>Chatovi</h2>
          </div>
          ${totalUnread ? `<span class="site-chat-total-badge">${totalUnread > 99 ? "99+" : totalUnread}</span>` : ""}
        </div>
        <div class="site-chat-empty">Nema dostupnih chatova za ovaj account.</div>
      </aside>
    `;
  }
  return `
    <aside class="site-chat-list-pane">
      <div class="site-chat-list-head">
        <div>
          <p class="site-chat-eyebrow">Gradilisni chat</p>
          <h2>Chatovi</h2>
        </div>
        ${totalUnread ? `<span class="site-chat-total-badge">${totalUnread > 99 ? "99+" : totalUnread}</span>` : ""}
      </div>
      <div class="site-chat-list" role="list">
        ${sites.map((site) => renderSiteChatListItem(site)).join("")}
      </div>
    </aside>
  `;
}

function renderSiteChatListItem(site) {
  const siteId = String(site.siteId || site.siteName || "");
  const unread = Number(siteChatState.unreadBySite[siteId] ?? site.unreadCount ?? 0) || 0;
  const activeClass = siteId === siteChatState.activeSiteId ? " is-active" : "";
  const last = site.lastMessage || {};
  const preview = last.text || "Nema poruka";
  return `
    <button class="site-chat-list-item${activeClass}" type="button" data-cmax-action="siteChat.openSite" data-cmax-args='${siteChatSafeText(JSON.stringify([siteId]))}'>
      <span class="site-chat-site-icon" aria-hidden="true">${siteChatSafeText((site.siteName || siteId || "?").slice(0, 1).toUpperCase())}</span>
      <span class="site-chat-list-main">
        <span class="site-chat-list-title-row">
          <strong>${siteChatSafeText(site.siteName || siteId)}</strong>
          <small>${siteChatSafeText(siteChatFormatTime(last.createdAt))}</small>
        </span>
        <span class="site-chat-list-preview">${siteChatSafeText(preview)}</span>
      </span>
      <span class="site-chat-list-meta">
        <span class="site-chat-online-dot" title="Online"></span>
        ${unread ? `<span class="site-chat-unread-badge">${unread > 99 ? "99+" : unread}</span>` : ""}
      </span>
    </button>
  `;
}

function renderSiteChatThreadPane(siteId) {
  if (!siteId) {
    return `
      <section class="site-chat-thread-pane site-chat-thread-empty">
        <div class="site-chat-empty-hero">
          <h2>Odaberi gradiliste</h2>
          <p>Jedno gradiliste ima jedan jednostavan chat. Odaberi chat lijevo i nastavi komunikaciju.</p>
        </div>
      </section>
    `;
  }
  const site = siteChatState.sites.find((entry) => entry.siteId === siteId) || { siteName: siteId, onlineCount: 0 };
  const messages = siteChatGetMessages(siteId);
  const pinned = messages.filter((message) => message.pinned && !message.deletedAt).slice(-3);
  return `
    <section class="site-chat-thread-pane">
      <header class="site-chat-thread-head">
        <button class="site-chat-back-btn" type="button" data-cmax-action="siteChat.backToList" aria-label="Nazad na listu">‹</button>
        <div class="site-chat-thread-title">
          <p class="site-chat-eyebrow">${siteChatSafeText(siteChatFormatOnline(site.onlineCount))}</p>
          <h2>${siteChatSafeText(site.siteName || siteId)}</h2>
        </div>
        <div class="site-chat-thread-actions">
          <button class="btn btn-small btn-secondary" type="button" data-cmax-action="siteChat.jumpLatest">Najnovije</button>
        </div>
      </header>
      ${pinned.length ? `<div class="site-chat-pinned-bar">${pinned.map(renderSiteChatPinnedMessage).join("")}</div>` : ""}
      <div id="siteChatMessages" class="site-chat-messages">
        ${siteChatState.hasMoreBySite[siteId] ? `<button class="site-chat-load-older" type="button" data-cmax-action="siteChat.loadOlder">Ucitaj starije</button>` : ""}
        ${messages.length ? renderSiteChatMessages(messages) : `<div class="site-chat-empty">Nema poruka za ovo gradiliste.</div>`}
      </div>
      ${renderSiteChatComposer(siteId)}
    </section>
  `;
}

function siteChatFormatOnline(count) {
  const value = Math.max(0, Number(count) || 0);
  return value === 1 ? "1 korisnik online" : `${value} korisnika online`;
}

function renderSiteChatPinnedMessage(message) {
  const text = message.text || (message.attachments?.length ? "Attachment" : "Poruka");
  return `<button class="site-chat-pinned-item" type="button" data-cmax-action="siteChat.jumpLatest">📌 ${siteChatSafeText(text.slice(0, 90))}</button>`;
}

function renderSiteChatMessages(messages) {
  let lastDay = "";
  const html = [];
  messages.forEach((message) => {
    const day = siteChatFormatDay(message.createdAt);
    if (day !== lastDay) {
      html.push(`<div class="site-chat-day-separator"><span>${siteChatSafeText(day)}</span></div>`);
      lastDay = day;
    }
    html.push(renderSiteChatMessage(message));
  });
  return html.join("");
}

function renderSiteChatMessage(message) {
  const own = String(message.authorEmail || "").toLowerCase() === siteChatCurrentUserEmail();
  const deleted = Boolean(message.deletedAt);
  const failed = message.status === "failed";
  const sending = message.status === "sending";
  const classes = ["site-chat-message", own ? "is-own" : "", deleted ? "is-deleted" : "", failed ? "is-failed" : "", message.pinned ? "is-pinned" : ""].filter(Boolean).join(" ");
  const reply = message.replyToMessageId ? siteChatFindMessage(message.replyToMessageId) : null;
  return `
    <article class="${classes}" data-message-id="${siteChatSafeText(message.id)}">
      <div class="site-chat-message-bubble">
        <div class="site-chat-message-meta">
          <strong>${siteChatSafeText(message.authorName || message.authorEmail || "Unknown")}</strong>
          ${siteChatFunctionBadges(message.authorFunctions)}
          <small>${siteChatSafeText(siteChatFormatTime(message.createdAt))}${message.editedAt ? " · edited" : ""}${message.pinned ? " · pinned" : ""}</small>
        </div>
        ${reply ? `<div class="site-chat-reply-card">↪ ${siteChatSafeText(reply.authorName || "")}: ${siteChatSafeText((reply.text || "Attachment").slice(0, 120))}</div>` : ""}
        ${deleted ? `<div class="site-chat-deleted-text">Poruka je obrisana.</div>` : `<div class="site-chat-message-text">${siteChatLinkifyMentions(message.text || "")}</div>`}
        ${deleted ? "" : renderSiteChatAttachments(message.attachments || [])}
        ${renderSiteChatReactions(message)}
        ${renderSiteChatMessageActions(message, { own, deleted, failed, sending })}
      </div>
    </article>
  `;
}

function siteChatFindMessage(messageId) {
  const messages = siteChatGetMessages();
  return messages.find((message) => message.id === messageId) || null;
}

function siteChatLinkifyMentions(text) {
  return siteChatSafeText(text).replace(/@([^\s,.;:!?()[\]{}&lt;&gt;]+)/g, '<span class="site-chat-mention">@$1</span>');
}

function renderSiteChatAttachments(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return "";
  return `<div class="site-chat-attachments">${attachments.map((file) => {
    if (file.type === "image") {
      return `<a class="site-chat-image-attachment" href="${siteChatSafeText(file.url)}" target="_blank" rel="noopener"><img src="${siteChatSafeText(file.url)}" alt="${siteChatSafeText(file.fileName)}" loading="lazy" /></a>`;
    }
    return `<a class="site-chat-file-card" href="${siteChatSafeText(file.url)}" target="_blank" rel="noopener"><span>${file.type === "pdf" ? "PDF" : "DOC"}</span><strong>${siteChatSafeText(file.fileName)}</strong><small>${siteChatSafeText(siteChatFormatBytes(file.size))}</small></a>`;
  }).join("")}</div>`;
}

function siteChatFormatBytes(bytes) {
  const size = Math.max(0, Number(bytes) || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function renderSiteChatReactions(message) {
  if (message.deletedAt) return "";
  const reactions = message.reactions || {};
  return `<div class="site-chat-reactions">${SITE_CHAT_REACTIONS.map((reaction) => {
    const users = Array.isArray(reactions[reaction]) ? reactions[reaction] : [];
    const selected = users.includes(siteChatCurrentUserEmail()) ? " is-selected" : "";
    return `<button class="site-chat-reaction${selected}" type="button" data-cmax-action="siteChat.react" data-cmax-args='${siteChatSafeText(JSON.stringify([message.id, reaction]))}'>${reaction}${users.length ? ` <span>${users.length}</span>` : ""}</button>`;
  }).join("")}</div>`;
}

function renderSiteChatMessageActions(message, flags) {
  if (flags.sending) return `<div class="site-chat-status">Sending...</div>`;
  if (flags.failed) return `<button class="site-chat-status is-retry" type="button" data-cmax-action="siteChat.retry" data-cmax-args='${siteChatSafeText(JSON.stringify([message.id]))}'>Failed · retry</button>`;
  if (flags.deleted) return "";
  const canEdit = flags.own;
  const canDelete = flags.own || siteChatState.canModerate;
  return `
    <div class="site-chat-message-actions">
      <button type="button" data-cmax-action="siteChat.reply" data-cmax-args='${siteChatSafeText(JSON.stringify([message.id]))}'>Reply</button>
      ${canEdit ? `<button type="button" data-cmax-action="siteChat.edit" data-cmax-args='${siteChatSafeText(JSON.stringify([message.id]))}'>Edit</button>` : ""}
      ${canDelete ? `<button type="button" data-cmax-action="siteChat.delete" data-cmax-args='${siteChatSafeText(JSON.stringify([message.id]))}'>Delete</button>` : ""}
      ${siteChatState.canModerate ? (message.pinned
        ? `<button type="button" data-cmax-action="siteChat.unpin" data-cmax-args='${siteChatSafeText(JSON.stringify([message.id]))}'>Unpin</button>`
        : `<button type="button" data-cmax-action="siteChat.pin" data-cmax-args='${siteChatSafeText(JSON.stringify([message.id]))}'>Pin</button>`)
        : ""}
    </div>
  `;
}

function renderSiteChatComposer(siteId) {
  const draft = siteChatState.draftsBySite[siteId] || "";
  const attachments = siteChatState.pendingAttachmentsBySite[siteId] || [];
  const replyToId = siteChatState.replyToBySite[siteId] || "";
  const reply = replyToId ? siteChatFindMessage(replyToId) : null;
  return `
    <footer class="site-chat-composer">
      ${reply ? `<div class="site-chat-reply-preview"><span>Reply to ${siteChatSafeText(reply.authorName || "message")}</span><button type="button" data-cmax-action="siteChat.cancelReply">×</button></div>` : ""}
      ${attachments.length ? `<div class="site-chat-pending-files">${attachments.map((file, index) => `<span>${siteChatSafeText(file.fileName)} <button type="button" data-cmax-action="siteChat.removeAttachment" data-cmax-args='${siteChatSafeText(JSON.stringify([index]))}'>×</button></span>`).join("")}</div>` : ""}
      <div class="site-chat-composer-row">
        <label class="site-chat-upload-btn" title="Upload">
          +
          <input id="siteChatFileInput" type="file" data-cmax-action="siteChat.attachFile" data-cmax-event="change" data-cmax-pass-event accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
        </label>
        <textarea id="siteChatDraft" maxlength="${Number(siteChatState.messageLimit) || 4000}" placeholder="Napisite poruku... @ime za mention" data-cmax-action="siteChat.setDraft" data-cmax-event="input" data-cmax-pass-event>${siteChatSafeText(draft)}</textarea>
        <button class="site-chat-send-btn" type="button" data-cmax-action="siteChat.send" ${siteChatState.sending ? "disabled" : ""}>Send</button>
      </div>
    </footer>
  `;
}

function siteChatRenderSidebarBadge() {
  const badge = document.getElementById("siteChatSidebarBadge");
  if (!badge) return;
  const total = Object.values(siteChatState.unreadBySite || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  badge.textContent = total > 99 ? "99+" : String(total);
  badge.style.display = total > 0 ? "inline-flex" : "none";
}
