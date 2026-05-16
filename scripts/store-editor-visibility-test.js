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

  mustContain(html, 'id="workwearManagerEditorToggle"', "editor toggle button");
  mustContain(render, "canManageWorkwearModule()", "manager permission gating");
  mustContain(render, "workwearManagerEditorOpen", "editor open/close state");
  mustContain(render, "manager.style.display = visible ? \"block\" : \"none\";", "manager panels hidden when closed");

  console.log(JSON.stringify({ ok: true, checks: 4 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
