const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(process.cwd(), "public/js/workwear/workwearEvents.js"), "utf8");

try {
  if (!src.includes("if ([\"Rejected\", \"Cancelled\", \"Delivered\"].includes(order.status)) return;")) {
    throw new Error("missing final state lock guard");
  }
  if (!src.includes("if (next === \"Delivered\")")) throw new Error("missing delivered transition block");
  console.log(JSON.stringify({ ok: true, check: "delivered_final_lock" }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
