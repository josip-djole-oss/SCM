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
  const events = read("public/js/tidplan/tidplanEvents.js");

  mustContain(html, 'id="tidplanFullscreenToggle"', "fullscreen toggle button");
  mustContain(events, "tidplan-container-fullscreen", "fullscreen container class");
  mustContain(events, "tidplanFullscreenClose", "fullscreen close button");
  mustContain(events, "document.body.classList.add(\"tidplan-fullscreen-open\")", "body lock on enter");
  mustContain(events, "if (e.key === \"Escape\" && isFullscreen)", "escape close handler");
  mustContain(styles, ".tidplan-container-fullscreen", "fullscreen container styles");
  mustContain(styles, ".tidplan-fullscreen-close", "fullscreen close styles");

  console.log(JSON.stringify({ ok: true, checks: 7 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
