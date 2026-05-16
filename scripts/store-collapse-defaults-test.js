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

  mustContain(html, '<details id="workwearOrdersDisclosure"', "orders collapsed disclosure");
  if (html.includes('<details id="workwearOrdersDisclosure" class="store-disclosure" open')) {
    throw new Error("Orders disclosure should default to closed");
  }
  mustContain(styles, ".store-disclosure", "disclosure styles");
  mustContain(render, "<details>", "advanced details sections remain collapsible");

  console.log(JSON.stringify({ ok: true, checks: 4 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
