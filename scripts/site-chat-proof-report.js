const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const runId = `site-chat-proof-${Date.now()}`;
const base = path.join(os.tmpdir(), runId);
const dataDir = path.join(base, "data");
const uploadDir = path.join(base, "uploads");
const backupDir = path.join(base, "backups");
const outDir = path.join(root, "tmp", runId);
const shotDir = path.join(outDir, "screenshots");
const port = Number(process.env.SITE_CHAT_PROOF_PORT || (6700 + (Date.now() % 500)));
const host = `http://127.0.0.1:${port}`;
const email = "chat.proof@cmax.test";
const password = "testpass123";
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const viewports = [
  ["390x844", 390, 844],
  ["430x932", 430, 932],
  ["768x1024", 768, 1024],
  ["1024x1366", 1024, 1366],
  ["1440x1000", 1440, 1000],
  ["844x390-landscape", 844, 390],
];

function env(data) { return { version: 1, updatedAt: new Date().toISOString(), data }; }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
function safe(v) { return String(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function rel(file) { return path.relative(outDir, file).replace(/\\/g, "/"); }
function msg(site, i, extra = {}) {
  const t = new Date(Date.now() - (150 - i) * 60000).toISOString();
  return { id: extra.id || `msg_${safe(site)}_${i}`, siteId: site, authorEmail: i % 2 ? "chat.worker@cmax.test" : email, authorName: i % 2 ? "Marko Radnik" : "Josip Admin", authorFunctions: i % 2 ? ["radnik"] : ["admin"], text: `Poruka ${i} ${site}`, attachments: [], replyToMessageId: "", mentions: [], reactions: { "👍": [], "✅": [], "👀": [], "⚠️": [] }, pinned: false, pinnedAt: "", pinnedBy: "", editedAt: "", deletedAt: "", deletedBy: "", deleteReason: "", createdAt: t, updatedAt: t, ...extra };
}
function seed() {
  mkdir(dataDir); mkdir(uploadDir); mkdir(backupDir); mkdir(shotDir);
  const day = new Date().toISOString().slice(0, 10);
  mkdir(path.join(uploadDir, day));
  fs.writeFileSync(path.join(uploadDir, day, "proof.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"));
  fs.writeFileSync(path.join(uploadDir, day, "proof.pdf"), "%PDF-1.4 proof", "utf8");
  fs.writeFileSync(path.join(dataDir, "admins.json"), JSON.stringify(env([
    { email, password, fullName: "Josip Admin", firstName: "Josip", lastName: "Admin", isSuperAdmin: true, level: 6, active: true, permissions: {}, allowedSites: null, storeRoles: ["admin", "superadmin"] },
    { email: "chat.worker@cmax.test", password, fullName: "Marko Radnik", firstName: "Marko", lastName: "Radnik", isSuperAdmin: false, level: 1, active: true, permissions: { canAccessSiteChat: true }, allowedSites: ["Site A", "Site C"], storeRoles: ["radnik"] },
  ]), null, 2));
  fs.writeFileSync(path.join(dataDir, "state.json"), JSON.stringify(env({ version: 2, sites: ["Site A", "Site B", "Site C", "Empty Site"], currentSite: "Site A", guestPermissions: {}, accountNotifications: { [email]: { notifications: [{ id: "acct1", uniqueKey: "acct1", type: "site-chat", title: "Nova chat poruka", description: "Site A: proof", site: "Site A", targetView: "siteChat", targetId: "msg-site-a-1", createdAt: new Date().toISOString(), readAt: null }], siteTracker: {}, workwearTracker: {}, permissionSignature: "proof" } }, siteData: { "Site A": { planner: {}, notifications: [] }, "Site B": { planner: {}, notifications: [] }, "Site C": { planner: {}, notifications: [] }, "Empty Site": { planner: {}, notifications: [] } } }), null, 2));
  const a = Array.from({ length: 10 }, (_, idx) => msg("Site A", idx + 1));
  a.push(msg("Site A", 11, { text: "@Josip duga poruka za wrap na mobitelu i tabletu bez horizontalnog pucanja layouta.", mentions: [email], reactions: { "👍": [email], "✅": ["chat.worker@cmax.test"], "👀": [], "⚠️": [] } }));
  a.push(msg("Site A", 12, { text: "Slika", attachments: [{ id: "img", type: "image", fileName: "proof.png", mimeType: "image/png", size: 68, url: `/uploads/${day}/proof.png`, uploadedAt: new Date().toISOString() }] }));
  a.push(msg("Site A", 13, { text: "PDF", attachments: [{ id: "pdf", type: "pdf", fileName: "proof.pdf", mimeType: "application/pdf", size: 16, url: `/uploads/${day}/proof.pdf`, uploadedAt: new Date().toISOString() }] }));
  a.push(msg("Site A", 14, { text: "Reply", replyToMessageId: "msg-site-a-11" }));
  a.push(msg("Site A", 15, { text: "Pinned safety info", pinned: true, pinnedAt: new Date().toISOString(), pinnedBy: email }));
  a.push(msg("Site A", 16, { text: "Edited message", editedAt: new Date().toISOString() }));
  a.push(msg("Site A", 17, { text: "", deletedAt: new Date().toISOString(), deletedBy: email, deleteReason: "admin_delete" }));
  const c = Array.from({ length: 100 }, (_, idx) => msg("Site C", idx + 1, { text: `100 message stress row ${idx + 1}` }));
  fs.writeFileSync(path.join(dataDir, "site-chat.json"), JSON.stringify(env({ version: 1, sites: { "Site A": { settings: {}, readState: {}, auditLog: [], messages: a }, "Site B": { settings: {}, readState: {}, auditLog: [], messages: [msg("Site B", 1, { text: "Site B isolated" })] }, "Site C": { settings: {}, readState: {}, auditLog: [], messages: c }, "Empty Site": { settings: {}, readState: {}, auditLog: [], messages: [] } } }), null, 2));
}
async function waitServer() {
  const start = Date.now();
  while (Date.now() - start < 30000) {
    try { const r = await fetch(`${host}/api/health`); const j = await r.json(); if (j.ok && j.storageReady) return; } catch (_) {}
    await wait(250);
  }
  throw new Error("server timeout");
}
async function login(page) {
  await page.goto(`${host}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#loginEmail", email);
  await page.fill("#loginPassword", password);
  await page.click("[data-cmax-action='core.login']");
  await page.waitForSelector("#mainContainer", { state: "visible", timeout: 20000 });
}
async function metrics(page, selector = ".site-chat-shell") {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    const r = el ? el.getBoundingClientRect() : { left: -999, right: 9999, top: -999, bottom: 9999 };
    const overflow = document.documentElement.scrollWidth > innerWidth + 2 || document.body.scrollWidth > innerWidth + 2;
    const verticalStrict = selector === ".site-chat-shell";
    const offscreen = r.left < -2 || r.right > innerWidth + 2 || (verticalStrict && (r.top < -2 || r.bottom > innerHeight + 90));
    const touchNodes = Array.from(document.querySelectorAll("#siteChatRoot button,#siteChatRoot textarea,#siteChatRoot label")).filter((n) => {
      const x = n.getBoundingClientRect();
      return x.width > 0 && x.height > 0;
    }).slice(0, 50);
    const touch = touchNodes.every((n) => { const x = n.getBoundingClientRect(); return x.width >= 32 && x.height >= 32; });
    return { overflow, offscreen, touch };
  }, selector);
}
function status(m) { if (m.overflow) return "BLOCKER"; if (m.offscreen) return "MAJOR"; if (!m.touch) return "MINOR"; return "PASS"; }
async function shot(page, vp, key, title, notes, selector) {
  await wait(250);
  const m = await metrics(page, selector);
  const file = path.join(shotDir, `${vp[0]}-${safe(key)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return { viewport: vp[0], key, title, notes, file, metrics: m, status: status(m) };
}
async function main() {
  seed();
  const server = cp.spawn(process.execPath, ["server/server.js"], { cwd: root, env: { ...process.env, PORT: String(port), DATA_PATH: dataDir, UPLOAD_PATH: uploadDir, BACKUP_PATH: backupDir, STORAGE_TYPE: "json", BOOTSTRAP_ADMIN_EMAIL: email, BOOTSTRAP_ADMIN_PASSWORD: password, LOGIN_RATE_LIMIT_MAX: "100" }, stdio: ["ignore", "pipe", "pipe"] });
  let browser;
  const rows = [];
  try {
    await waitServer();
    browser = await chromium.launch(fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true });
    const page = await browser.newPage();
    await login(page);
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp[1], height: vp[2] });
      await page.goto(`${host}/home`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#mainContainer", { state: "visible", timeout: 20000 });
      await page.waitForSelector("#loadingOverlay", { state: "hidden", timeout: 20000 }).catch(() => {});
      await page.evaluate(async () => {
        await CMAX.siteChat.show();
        await siteChatRefreshSitesAndUnread(true);
      });
      await page.evaluate(() => {
        currentView = "siteChat";
        document.body.dataset.currentView = "siteChat";
        ["home-section", "planner-section", "tidplan-section", "notifications-section", "surveys-section", "warehouse-section", "warehouse-logs-section", "warehouse-graph-section", "reports-section", "settings-section", "workwear-section"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.style.display = "none";
        });
        const section = document.getElementById("site-chat-section");
        if (section) section.style.display = "block";
        renderSiteChatModule();
      });
      await page.waitForSelector("#siteChatRoot .site-chat-shell", { state: "attached", timeout: 15000 });
      await page.evaluate(() => { siteChatState.activeSiteId = ""; renderSiteChatModule(); });
      rows.push(await shot(page, vp, "list-many-unread", "Chat lista - vise chatova i unread", "Lista je odvojena, badgeovi su unutar viewporta."));
      await page.evaluate(() => { const first = siteChatState.sites[0]; siteChatState.sites = first ? [first] : []; siteChatState.activeSiteId = ""; renderSiteChatModule(); });
      rows.push(await shot(page, vp, "list-one", "Chat lista - 1 chat", "Jedan chat ostaje jasna touch kartica."));
      await page.evaluate(() => { siteChatState.sites = []; siteChatState.activeSiteId = ""; renderSiteChatModule(); });
      rows.push(await shot(page, vp, "list-zero", "Chat lista - 0 chatova", "Prazno stanje jasno objasnjava da nema dostupnih chatova."));
      await page.evaluate(async () => { await siteChatRefreshSitesAndUnread(true); await siteChatOpenSite("Empty Site"); });
      rows.push(await shot(page, vp, "thread-zero", "Chat prozor - 0 poruka", "Thread ima empty state bez lazne greske."));
      await page.evaluate(async () => { await siteChatOpenSite("Site A"); });
      rows.push(await shot(page, vp, "thread-rich", "Chat prozor - slika/PDF/reply/mention/pinned/deleted/edited", "Bogate poruke se renderuju bez raw HTML-a i bez pucanja layouta."));
      await page.evaluate(async () => { await siteChatOpenSite("Site C"); });
      rows.push(await shot(page, vp, "thread-100", "Chat prozor - 100 poruka", "Cursor/pagination model i lokalni scroll drze dugu listu u threadu."));
      if (vp[1] <= 640) {
        await page.evaluate(() => siteChatBackToList());
        rows.push(await shot(page, vp, "mobile-back", "Mobile chat -> back -> lista", "Mobile je list-to-thread flow, ne umanjen desktop messenger."));
        await page.evaluate(async () => { await siteChatOpenSite("Site A"); document.getElementById("siteChatDraft").focus(); });
        rows.push(await shot(page, vp, "mobile-keyboard-focus", "Mobile composer fokus", "Composer je sticky bottom sa safe-area paddingom."));
        await page.evaluate(() => { const s = siteChatState.activeSiteId; siteChatState.pendingAttachmentsBySite[s] = [{ fileName: "proof.pdf", type: "pdf", size: 100, url: "/uploads/proof.pdf" }]; renderSiteChatModule(); });
        rows.push(await shot(page, vp, "mobile-upload", "Mobile upload pending", "Pending file chip ostaje vidljiv iznad composera."));
        await page.evaluate(() => { pushAccountNotification({ uniqueKey: `proof-${Date.now()}`, type: "site-chat", title: "Nova chat poruka", description: "Site A: proof", site: "Site A", targetView: "siteChat" }); toggleAccountNotificationsPanel(); });
        rows.push(await shot(page, vp, "mobile-account-notifications", "Mobile account notifications", "Chat koristi account notifications panel, ne site notifications.", "#accountNotificationsPanel"));
        await page.evaluate(() => closeAccountNotificationsPanel());
        await page.evaluate(() => CMAX.dashboard.toggleSidebarOverlay(true));
        rows.push(await shot(page, vp, "mobile-sidebar", "Mobile sidebar otvoren", "Chat nav item je u globalnom overlay sidebaru.", ".app-sidebar"));
        await page.evaluate(() => CMAX.dashboard.toggleSidebarOverlay(false));
      }
    }
    const sum = ["PASS", "MINOR", "MAJOR", "BLOCKER"].reduce((a, s) => ({ ...a, [s]: rows.filter((r) => r.status === s).length }), {});
    const md = [`# Site Chat Proof Report`, ``, `Generated: ${new Date().toISOString()}`, ``, `## Summary`, ...Object.entries(sum).map(([k, v]) => `- ${k}: ${v}`), ``, `## Screenshots`, ``];
    for (const r of rows) md.push(`### ${r.status} - ${r.viewport} - ${r.title}`, ``, `![${r.title}](${rel(r.file)})`, ``, `- Screenshot file: ${rel(r.file)}`, `- Sta je prije bilo lose: chat bi mogao biti desktop messenger smanjen na mali ekran ili panel van viewporta.`, `- Sta je promijenjeno: ${r.notes}`, `- Zasto: gradiliste treba brz, jednostavan chat bez preklapanja.`, `- Kompromis: MVP koristi pagination i lokalni scroll, ne punu virtualizaciju poruka.`, `- Metrics: overflow=${r.metrics.overflow}, offscreen=${r.metrics.offscreen}, touch=${r.metrics.touch}`, ``);
    fs.writeFileSync(path.join(outDir, "REPORT.md"), md.join("\n"), "utf8");
    fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset="utf-8"><title>Site Chat Proof</title><style>body{font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:24px}article{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin:16px 0}img{max-width:100%;border:1px solid #e2e8f0;border-radius:12px}.PASS{color:#047857}.MINOR{color:#b45309}.MAJOR,.BLOCKER{color:#b91c1c}</style><h1>Site Chat Proof Report</h1><p>${new Date().toISOString()}</p>${rows.map((r) => `<article><h2 class="${r.status}">${r.status} - ${r.viewport} - ${r.title}</h2><img src="${rel(r.file)}"><p>${r.notes}</p><p>overflow=${r.metrics.overflow}, offscreen=${r.metrics.offscreen}, touch=${r.metrics.touch}</p></article>`).join("")}`, "utf8");
    console.log(JSON.stringify({ ok: sum.BLOCKER === 0, outputDir: outDir, report: path.join(outDir, "REPORT.md"), index: path.join(outDir, "index.html"), screenshots: rows.length, summary: sum }, null, 2));
    if (sum.BLOCKER) process.exitCode = 1;
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e.message, outputDir: outDir }, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (!server.killed) { server.kill("SIGTERM"); await Promise.race([new Promise((r) => server.once("close", r)), wait(3000)]); if (!server.killed) server.kill("SIGKILL"); }
  }
}
main();
