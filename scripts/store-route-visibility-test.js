const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(src, token, label) {
  if (!src.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const auth = read("public/js/core/auth.js");
  const workwear = read("public/js/workwear/workwear.js");
  const html = read("public/index.html");

  mustContain(auth, 'view !== "workwear"', "view guard for Store section");
  mustContain(auth, 'workwearSection.style.display = "none"', "Store hide on non-Store views");
  mustContain(workwear, "hideWorkwearSection()", "Store hide function exists");
  mustContain(workwear, "workwearCartOverlayOpen = false", "cart overlay closes on hide");
  mustContain(html, 'id="workwearCartOverlay"', "cart overlay container");
  mustContain(html, 'id="workwearManagerEditorToggle"', "manager editor toggle button");

  console.log(JSON.stringify({ ok: true, checks: 6 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
