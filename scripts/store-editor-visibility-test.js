const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(src, token, label) {
  if (!src.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const render = read("public/js/workwear/workwearRender.js");
  const html = read("public/index.html");
  const events = read("public/js/workwear/workwearEvents.js");

  mustContain(html, 'id="workwearManagerEditorToggle"', "editor toggle button");
  mustContain(html, 'id="workwearManagerOverlay"', "editor overlay markup");
  mustContain(render, "canManageWorkwearModule()", "manager permission gating");
  mustContain(render, "workwearManagerEditorOpen", "editor open/close state");
  mustContain(render, "overlay.style.display = shouldShow ? \"flex\" : \"none\";", "editor overlay visibility");
  mustContain(events, "workwearCloseManagerEditor", "editor close action");

  console.log(JSON.stringify({ ok: true, checks: 5 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
