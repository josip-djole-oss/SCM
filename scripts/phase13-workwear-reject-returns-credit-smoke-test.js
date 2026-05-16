const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(process.cwd(), "public/js/workwear/workwearEvents.js"), "utf8");

try {
  const required = ["order_rejected", "workwearReleaseReservedCredit(order.workerId, order.creditReserved", "order_cancelled", "workwearReleaseReservedCredit(order.workerId, order.creditReserved"];
  required.forEach((t) => {
    if (!src.includes(t)) throw new Error(`Missing ${t}`);
  });
  console.log(JSON.stringify({ ok: true, check: "reject_cancel_release_reserved_credit" }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
