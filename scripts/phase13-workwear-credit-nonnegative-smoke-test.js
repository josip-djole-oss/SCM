const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(process.cwd(), "public/js/workwear/workwearEvents.js"), "utf8");

function ensure(text) {
  if (!src.includes(text)) throw new Error(`Missing token: ${text}`);
}

try {
  ensure("WORKWEAR_INVALID_CREDIT_RESERVATION");
  ensure("Math.max(0, currentBalance - value)");
  console.log(JSON.stringify({ ok: true, check: "credit_non_negative_guard" }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
