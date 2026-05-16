const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(process.cwd(), "public/js/workwear/workwearEvents.js"), "utf8");

const required = [
  "Draft",
  "Pending",
  "Approved",
  "Ordered",
  "Purchased",
  "Ready for Pickup",
  "Delivered",
  "Rejected",
  "Cancelled",
  "workwearAdvanceStatus",
  "workwearRejectOrder",
  "workwearCancelOrder",
];

try {
  required.forEach((item) => {
    if (!source.includes(item)) throw new Error(`Missing workflow token: ${item}`);
  });
  console.log(JSON.stringify({ ok: true, checked: required.length }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
