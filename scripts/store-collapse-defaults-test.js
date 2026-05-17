const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const html = read("public/index.html");
  const styles = read("public/styles.css");
  const render = read("public/js/workwear/workwearRender.js");
  const events = read("public/js/workwear/workwearEvents.js");

  mustContain(html, 'id="workwearOrdersOverlay" class="store-modal-overlay" style="display:none"', "orders overlay closed by default");
  mustContain(html, 'id="workwearManagerOverlay" class="store-modal-overlay store-manager-overlay" style="display:none"', "manager overlay closed by default");
  mustContain(html, 'id="workwearOrdersToggleBtn"', "orders launcher button");
  mustContain(styles, ".store-modal-overlay", "overlay styles");
  mustContain(render, "<details>", "advanced details sections remain collapsible");
  mustContain(events, "workwearOrdersOverlayOpen = false;", "orders overlay reset support");

  console.log(JSON.stringify({ ok: true, checks: 5 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
