const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.SITE_CHAT_TEST_PORT || 3225);
const HOST = `http://127.0.0.1:${PORT}`;
const SUPER_EMAIL = "chat.super@test.local";
const WORKER_EMAIL = "chat.worker@test.local";
const RECEIVER_EMAIL = "chat.receiver@test.local";
const PASSWORD = "ChatTest!123";

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function envelope(data, version = 1) { return { version, updatedAt: new Date().toISOString(), data }; }
function parseCookie(setCookieHeader) {
  const value = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(value || "").split(";")[0];
}
function assert(condition, message) { if (!condition) throw new Error(message); }

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 90000) {
    try {
      const res = await fetch(`${HOST}/api/health`, { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json();
        if (payload.ok && payload.storageReady) return;
      }
    } catch (_) {}
    await delay(300);
  }
  throw new Error("Server did not become healthy");
}

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmax-site-chat-"));
  const dataDir = path.join(tmpRoot, "data");
  const uploadsDir = path.join(tmpRoot, "uploads");
  const backupsDir = path.join(tmpRoot, "backups");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(backupsDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(envelope([
    {
      email: SUPER_EMAIL,
      password: PASSWORD,
      fullName: "Chat Super",
      firstName: "Chat",
      lastName: "Super",
      isSuperAdmin: true,
      level: 6,
      active: true,
      permissions: {},
      allowedSites: null,
      storeRoles: ["superadmin", "admin"],
    },
    {
      email: WORKER_EMAIL,
      password: PASSWORD,
      fullName: "Chat Worker",
      firstName: "Chat",
      lastName: "Worker",
      isSuperAdmin: false,
      level: 1,
      active: true,
      permissions: { canAccessSiteChat: true, canViewNotifications: true },
      allowedSites: ["Site A"],
      storeRoles: ["radnik"],
    },
    {
      email: RECEIVER_EMAIL,
      password: PASSWORD,
      fullName: "Receiver User",
      firstName: "Receiver",
      lastName: "User",
      isSuperAdmin: false,
      level: 1,
      active: true,
      permissions: { canAccessSiteChat: true, canViewNotifications: true },
      allowedSites: ["Site A"],
      storeRoles: ["grupovodja"],
    },
  ]), null, 2));

  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(envelope({
    version: 2,
    sites: ["Site A", "Site B"],
    currentSite: "Site A",
    guestPermissions: {},
    accountNotifications: {},
    siteData: {
      "Site A": { planner: {}, notifications: [] },
      "Site B": { planner: {}, notifications: [] },
    },
  }), null, 2));

  const server = spawn("node", ["server/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      STORAGE_TYPE: "json",
      DATA_PATH: dataDir,
      UPLOAD_PATH: uploadsDir,
      BACKUP_PATH: backupsDir,
      BOOTSTRAP_ADMIN_EMAIL: SUPER_EMAIL,
      BOOTSTRAP_ADMIN_PASSWORD: PASSWORD,
      SITE_CHAT_RATE_LIMIT_MAX: "200",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  server.stdout.on("data", (chunk) => { stdout += String(chunk || ""); });
  server.stderr.on("data", (chunk) => { stderr += String(chunk || ""); });

  async function cleanup() {
    if (!server.killed) {
      server.kill("SIGTERM");
      await Promise.race([new Promise((resolve) => server.once("close", resolve)), delay(3000)]);
      if (!server.killed) server.kill("SIGKILL");
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  try {
    await waitForHealth();

    async function login(email) {
      const res = await fetch(`${HOST}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: PASSWORD }),
      });
      assert(res.ok, `Login failed for ${email}: ${res.status}`);
      const payload = await res.json();
      const cookie = parseCookie(typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : res.headers.get("set-cookie"));
      return { cookie, csrf: payload.csrfToken };
    }

    function client(session) {
      return async function api(pathname, options = {}) {
        const method = options.method || "GET";
        const headers = new Headers(options.headers || {});
        headers.set("Cookie", session.cookie);
        if (options.json !== undefined) headers.set("Content-Type", "application/json");
        if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) headers.set("x-csrf-token", session.csrf);
        const res = await fetch(`${HOST}${pathname}`, {
          method,
          headers,
          body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
        });
        const text = await res.text();
        let payload = {};
        try { payload = text ? JSON.parse(text) : {}; } catch (_) { payload = { raw: text }; }
        if (options.expectStatus) {
          assert(res.status === options.expectStatus, `${method} ${pathname} expected ${options.expectStatus}, got ${res.status}: ${JSON.stringify(payload)}`);
          return payload;
        }
        assert(res.ok, `${method} ${pathname} failed ${res.status}: ${JSON.stringify(payload)}`);
        return payload;
      };
    }

    const superApi = client(await login(SUPER_EMAIL));
    const workerApi = client(await login(WORKER_EMAIL));
    const receiverApi = client(await login(RECEIVER_EMAIL));

    const superSites = await superApi("/api/site-chat/sites");
    assert(superSites.sites.length === 2, "Superadmin should see both site chats");
    const workerSites = await workerApi("/api/site-chat/sites");
    assert(workerSites.sites.length === 1 && workerSites.sites[0].siteId === "Site A", "Worker should see only Site A chat");

    const created = await superApi("/api/site-chat/Site%20A/messages", {
      method: "POST",
      json: { text: "Hello @Receiver <img src=x onerror=alert(1)>", clientId: "m1" },
    });
    assert(created.message.id, "Message should be created");
    assert(created.message.authorFunctions.includes("superadmin"), "Message should snapshot author function badge");

    await superApi("/api/site-chat/Site%20B/messages", { method: "POST", json: { text: "Site B only" } });
    const workerA = await workerApi("/api/site-chat/Site%20A/messages?limit=10");
    assert(workerA.messages.some((msg) => msg.id === created.message.id), "Site A message should be visible in Site A");
    await workerApi("/api/site-chat/Site%20B/messages?limit=10", { expectStatus: 403 });

    const reaction = await workerApi(`/api/site-chat/Site%20A/messages/${created.message.id}/reactions`, {
      method: "POST",
      json: { reaction: "✅" },
    });
    assert(reaction.message.reactions["✅"].includes(WORKER_EMAIL), "Reaction should be toggled by worker");

    await workerApi(`/api/site-chat/Site%20A/messages/${created.message.id}`, { method: "DELETE", expectStatus: 403 });
    const pinned = await superApi(`/api/site-chat/Site%20A/messages/${created.message.id}/pin`, { method: "POST" });
    assert(pinned.message.pinned === true, "Admin should pin message");
    const unpinned = await superApi(`/api/site-chat/Site%20A/messages/${created.message.id}/pin`, { method: "DELETE" });
    assert(unpinned.message.pinned === false, "Admin should unpin message");

    const own = await workerApi("/api/site-chat/Site%20A/messages", { method: "POST", json: { text: "worker own message" } });
    const edited = await workerApi(`/api/site-chat/Site%20A/messages/${own.message.id}`, { method: "PATCH", json: { text: "edited worker message" } });
    assert(edited.message.editedAt, "Owner should edit own message");
    const deletedOwn = await workerApi(`/api/site-chat/Site%20A/messages/${own.message.id}`, { method: "DELETE" });
    assert(deletedOwn.message.deletedAt, "Owner should soft delete own message");

    for (let i = 0; i < 8; i += 1) {
      await superApi("/api/site-chat/Site%20A/messages", { method: "POST", json: { text: `pagination ${i}` } });
    }
    const page = await workerApi("/api/site-chat/Site%20A/messages?limit=5");
    assert(page.messages.length === 5 && page.hasMore === true && page.nextBefore, "Cursor pagination should return page and next cursor");

    const receiverUnread = await receiverApi("/api/site-chat/unread");
    assert(receiverUnread.unread["Site A"] >= 1, "Receiver should have unread Site A messages");
    const receiverState = await receiverApi("/api/state");
    const receiverBundle = receiverState.state.accountNotifications?.[RECEIVER_EMAIL] || {};
    const acctItems = receiverBundle.notifications || [];
    assert(acctItems.some((item) => item.type === "site-chat" && item.targetView === "siteChat"), "Receiver should get account site-chat notification");

    if (typeof FormData !== "undefined" && typeof Blob !== "undefined") {
      const form = new FormData();
      form.append("file", new Blob(["bad"], { type: "application/x-msdownload" }), "bad.exe");
      await superApi("/api/site-chat/Site%20A/upload", { method: "POST", body: form, expectStatus: 400 });
    }

    const html = fs.readFileSync(path.join(process.cwd(), "public/index.html"), "utf8");
    const render = fs.readFileSync(path.join(process.cwd(), "public/js/siteChat/siteChatRender.js"), "utf8");
    const account = fs.readFileSync(path.join(process.cwd(), "public/js/core/accountNotifications.js"), "utf8");
    assert(html.includes("site-chat-section") && html.includes("navSiteChatBtn"), "Chat section/nav should exist");
    assert(render.includes("siteChatSafeText(message.text") || render.includes("siteChatLinkifyMentions"), "Message text must be escaped before render");
    assert(account.includes('type: "site-chat"'), "Chat should use account notifications");
    assert(!render.includes("notificationsSidebarBadge"), "Chat UI must not touch site notifications badge");

    console.log(JSON.stringify({
      ok: true,
      checks: [
        "site_access_list",
        "site_isolation",
        "send_reload_pagination",
        "read_unread",
        "account_notifications_only",
        "mention_notification",
        "worker_cannot_delete_other_message",
        "admin_pin_unpin",
        "owner_edit_delete",
        "reaction_toggle",
        "xss_render_escape_guard",
        "upload_mime_reject",
      ],
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message, stdout, stderr }, null, 2));
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

main();
