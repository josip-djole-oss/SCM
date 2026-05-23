const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "..");
const runId = `toolroom-architecture-proof-${Date.now()}`;
const outputDir = path.join(appRoot, "tmp", runId);
const screenshotDir = path.join(outputDir, "screenshots");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function mockHtml() {
  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Toolroom Architecture Proof</title>
  <style>
    :root {
      --ink: #172033;
      --muted: #667085;
      --line: #dde5f0;
      --card: #ffffff;
      --soft: #f4f7fb;
      --accent: #0f766e;
      --accent2: #d97706;
      --danger: #b42318;
      --shadow: 0 18px 50px rgba(15, 23, 42, .12);
      font-family: "Aptos", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: linear-gradient(135deg, #eef6f4, #f7f3ea 55%, #eef2f8); }
    .app { min-height: 100vh; display: grid; grid-template-columns: 260px 1fr; }
    .side { background: #132236; color: #fff; padding: 24px 18px; display: grid; align-content: start; gap: 16px; }
    .brand { font-weight: 900; letter-spacing: .08em; }
    .nav { display: grid; gap: 8px; }
    .nav span { padding: 12px 14px; border-radius: 14px; color: #cbd5e1; }
    .nav .active { background: rgba(255,255,255,.14); color: #fff; }
    main { padding: 22px; display: grid; gap: 18px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .title h1 { margin: 0; font-size: clamp(28px, 4vw, 42px); }
    .title p { margin: 6px 0 0; color: var(--muted); }
    .search { min-width: min(520px, 100%); padding: 14px 16px; border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); background: #fff; }
    .crumb { display: flex; gap: 8px; flex-wrap: wrap; color: var(--muted); font-size: 14px; }
    .crumb span { padding: 6px 10px; background: #fff; border: 1px solid var(--line); border-radius: 999px; }
    .stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
    .stat, .card, .panel { background: var(--card); border: 1px solid var(--line); border-radius: 22px; box-shadow: var(--shadow); }
    .stat { padding: 16px; display: grid; gap: 4px; }
    .stat strong { font-size: 26px; }
    .stat span { color: var(--muted); font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 16px; align-items: start; }
    .panel { padding: 18px; }
    .panel h2 { margin: 0 0 14px; }
    .tool-list { display: grid; gap: 10px; }
    .tool-row { display: grid; grid-template-columns: 64px 1fr auto; gap: 12px; align-items: center; padding: 12px; border: 1px solid var(--line); border-radius: 18px; background: #fbfdff; }
    .icon { width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; background: #e0f2f1; color: var(--accent); font-weight: 900; }
    .meta { display: grid; gap: 2px; }
    .meta small { color: var(--muted); }
    .badge { display: inline-flex; align-items: center; min-height: 28px; padding: 4px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-weight: 800; font-size: 12px; }
    .badge.warn { background: #fef3c7; color: #92400e; }
    .badge.danger { background: #fee2e2; color: var(--danger); }
    .actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    button, .btn { border: 0; border-radius: 15px; min-height: 44px; padding: 10px 12px; font-weight: 800; color: #fff; background: var(--accent); cursor: pointer; }
    .btn.secondary { background: #344054; }
    .btn.warn { background: var(--accent2); }
    .btn.danger { background: var(--danger); }
    .detail { display: grid; gap: 14px; }
    .detail-head { display: grid; grid-template-columns: 84px 1fr; gap: 14px; align-items: center; }
    .big-icon { width: 84px; height: 84px; border-radius: 24px; display: grid; place-items: center; background: #ccfbf1; color: var(--accent); font-size: 24px; font-weight: 900; }
    .mobile-tools { display: none; }
    .wizard { display: grid; gap: 12px; }
    .stepper { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .stepper span { padding: 10px; border-radius: 14px; background: #eef2f7; font-size: 12px; font-weight: 800; }
    .stepper .active { background: var(--accent); color: #fff; }
    .range { padding: 14px; border-radius: 18px; background: #ecfdf5; border: 1px solid #99f6e4; font-weight: 900; color: #115e59; }
    .proof { display: grid; gap: 10px; }
    .proof li { padding: 10px 12px; border-radius: 14px; background: #f8fafc; border: 1px solid var(--line); }
    @media (max-width: 900px) {
      .app { grid-template-columns: 1fr; }
      .side { display: none; }
      main { padding: 14px; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid { grid-template-columns: 1fr; }
      .actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 520px) {
      .title h1 { font-size: 30px; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .stat { padding: 12px; border-radius: 18px; }
      .stat strong { font-size: 22px; }
      .desktop-tools { display: none; }
      .mobile-tools { display: grid; gap: 12px; }
      .tool-card { padding: 16px; border-radius: 22px; border: 1px solid var(--line); background: #fff; box-shadow: var(--shadow); display: grid; gap: 10px; }
      .tool-card .card-top { display: grid; grid-template-columns: 58px 1fr; gap: 12px; align-items: center; }
      .mobile-actions { display: grid; grid-template-columns: 1fr; gap: 8px; }
      .actions { grid-template-columns: 1fr; }
      .stepper { grid-template-columns: repeat(2, 1fr); }
      .tool-row { grid-template-columns: 50px 1fr; }
      .tool-row .badge { grid-column: 1 / -1; justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="side">
      <div class="brand">CMAX SCM</div>
      <div class="nav">
        <span>Home</span>
        <span>Planner</span>
        <span>Tidplan</span>
        <span class="active">Skladiste / Alatnica</span>
        <span>Store</span>
        <span>Admin</span>
      </div>
    </aside>
    <main>
      <section class="top">
        <div class="title">
          <h1>Alatnica</h1>
          <p>Tool Asset Management: svaki alat ima svoj broj, status, zaduzenje i historiju.</p>
        </div>
        <input class="search" value="B054, Marko, Karlatornet..." aria-label="Toolroom search">
      </section>
      <div class="crumb">
        <span>Skladiste</span><span>Alatnica</span><span>Masine</span><span>Busilice</span><span>SDS+</span>
      </div>
      <section class="stats">
        <div class="stat"><strong>418</strong><span>Ukupno alata</span></div>
        <div class="stat"><strong>126</strong><span>Dostupno</span></div>
        <div class="stat"><strong>214</strong><span>Zaduzeno</span></div>
        <div class="stat"><strong>19</strong><span>Na servisu</span></div>
        <div class="stat"><strong>7</strong><span>Ceka graviranje</span></div>
      </section>
      <section class="grid">
        <div class="panel desktop-tools">
          <h2>Registar alata</h2>
          <div class="tool-list">
            <div class="tool-row"><div class="icon">B</div><div class="meta"><strong>B054 - Milwaukee M18 FPD3</strong><small>Marko Markovic | Karlatornet | serial SN-054</small></div><span class="badge">Aktivno</span></div>
            <div class="tool-row"><div class="icon">BR</div><div class="meta"><strong>BR022 - Makita brusilica</strong><small>Vraca se danas | gradiliste Liseberg</small></div><span class="badge warn">Ceka povrat</span></div>
            <div class="tool-row"><div class="icon">L</div><div class="meta"><strong>L009 - Leica laser</strong><small>Servis: kalibracija</small></div><span class="badge danger">Servis</span></div>
          </div>
        </div>
        <div class="mobile-tools">
          <div class="tool-card">
            <div class="card-top"><div class="icon">B</div><div><strong>B054</strong><br><span>Milwaukee M18 FPD3</span></div></div>
            <span class="badge">Aktivno</span>
            <small>Karlatornet | zaduzeno Marku</small>
            <div class="mobile-actions"><button>Prijavi kvar</button><button class="secondary btn">Dodaj sliku</button><button class="warn btn">Zatrazi zamjenu</button></div>
          </div>
          <div class="tool-card">
            <div class="card-top"><div class="icon">L</div><div><strong>L009</strong><br><span>Leica laser</span></div></div>
            <span class="badge danger">Servis</span>
            <small>Karlatornet | zaprimljeno u servis</small>
            <div class="mobile-actions"><button>Vidi detalje</button><button class="secondary btn">Historija</button></div>
          </div>
        </div>
        <div class="panel detail">
          <div class="detail-head">
            <div class="big-icon">B054</div>
            <div>
              <h2>Milwaukee M18 FPD3</h2>
              <p>Interni broj B054, ugravirano, kod Marko Markovic na Karlatornet.</p>
            </div>
          </div>
          <div class="actions">
            <button>Zaduzi</button>
            <button>Razduzi</button>
            <button>Prebaci</button>
            <button class="warn">Servis</button>
            <button class="warn">Prijavi kvar</button>
            <button class="secondary">Historija</button>
            <button class="danger">Otpisi</button>
            <button class="secondary">Export</button>
          </div>
        </div>
      </section>
      <section class="grid">
        <div class="panel wizard">
          <h2>Bulk add wizard</h2>
          <div class="stepper"><span>Preset</span><span class="active">Kolicina</span><span>Serijski brojevi</span><span>Status</span><span>Pregled</span></div>
          <p>Tip: Busilica, Marka: Milwaukee, Model: M18 FPD3, Prefix: B, Kolicina: 20</p>
          <div class="range">Backend rezervise brojeve: B054 - B073</div>
        </div>
        <div class="panel">
          <h2>Multi-user proof plan</h2>
          <ul class="proof">
            <li>User A zaduzi B054 - entity patch only</li>
            <li>User B uredi B055 - no conflict with B054</li>
            <li>User C vrati BR022 - return workflow only</li>
            <li>User D bulk-adds tools - atomic prefix reservation</li>
            <li>Expected: no overwrite, no global save, no duplicate internal numbers</li>
          </ul>
        </div>
      </section>
    </main>
  </div>
</body>
</html>`;
}

async function main() {
  ensureDir(screenshotDir);
  const html = mockHtml();
  fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "desktop-1440", width: 1440, height: 1000 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "mobile-390", width: 390, height: 844 },
    { name: "mobile-430", width: 430, height: 932 },
  ];
  const rows = [];
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const file = path.join(screenshotDir, `${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const metrics = await page.evaluate(() => ({
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        quickActions: document.querySelectorAll(".actions button").length,
        mobileCards: document.querySelectorAll(".tool-card").length,
        breadcrumbItems: document.querySelectorAll(".crumb span").length,
      }));
      rows.push({
        viewport: viewport.name,
        status: metrics.horizontalOverflow || metrics.quickActions < 7 || metrics.breadcrumbItems < 5 ? "MAJOR" : "GOOD",
        screenshot: path.relative(outputDir, file).replace(/\\/g, "/"),
        metrics,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const md = [
    "# Toolroom Architecture Proof",
    "",
    "This is a static architecture/mock proof. It is not production UI implementation.",
    "",
  ];
  rows.forEach((row) => {
    md.push(`## ${row.status} - ${row.viewport}`, "", `![${row.viewport}](${row.screenshot})`, "", "```json", JSON.stringify(row.metrics, null, 2), "```", "");
  });
  fs.writeFileSync(path.join(outputDir, "REPORT.md"), md.join("\n"), "utf8");
  console.log(JSON.stringify({ ok: rows.every((row) => row.status === "GOOD"), report: path.join(outputDir, "REPORT.md"), rows }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
