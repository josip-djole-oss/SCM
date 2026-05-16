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
  mustContain(events, "fullscreen-active", "fullscreen active toggle state");
  mustContain(events, 'isFullscreen ? "✕" : "⛶"', "fullscreen toggle label swap");
  mustContain(events, "timeline.classList.add(\"tidplan-timeline-fullscreen\")", "timeline fullscreen enter");
  mustContain(events, "timeline.classList.remove(\"tidplan-timeline-fullscreen\")", "timeline fullscreen exit");
  mustContain(events, "if (e.key === \"Escape\" && isFullscreen)", "escape close handler");
  mustContain(styles, ".tidplan-timeline-fullscreen", "fullscreen timeline styles");
  mustContain(styles, ".tidplan-fullscreen-toggle.fullscreen-active", "fullscreen toggle styles");

  console.log(JSON.stringify({ ok: true, checks: 8 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
