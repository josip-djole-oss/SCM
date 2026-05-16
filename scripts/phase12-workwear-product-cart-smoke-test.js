const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function has(file, text) {
  return read(file).includes(text);
}

try {
  const checks = [
    ["public/js/workwear/workwearEvents.js", "function workwearAddToCart("],
    ["public/js/workwear/workwearEvents.js", "function workwearSubmitOrder("],
    ["public/js/workwear/workwearRender.js", "renderWorkwearCart"],
    ["public/js/workwear/workwearRender.js", "renderWorkwearProducts"],
  ];

  checks.forEach(([file, text]) => {
    if (!has(file, text)) throw new Error(`Missing ${text} in ${file}`);
  });

  console.log(JSON.stringify({ ok: true, checks: checks.map(([f, t]) => `${f}:${t}`) }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
