const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(process.cwd(), "public/js/workwear/workwearEvents.js"), "utf8");

try {
  if (!src.includes("if (product.active === false)")) throw new Error("missing add-to-cart inactive guard");
  if (!src.includes("One or more products are inactive")) throw new Error("missing submit inactive guard");
  console.log(JSON.stringify({ ok: true, check: "inactive_product_blocked" }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
