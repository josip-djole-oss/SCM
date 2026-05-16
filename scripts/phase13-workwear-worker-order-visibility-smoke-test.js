const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(process.cwd(), "public/js/workwear/workwearRender.js"), "utf8");

try {
  if (!src.includes("isManager ? true : order.workerId === userEmail")) {
    throw new Error("worker visibility filter missing");
  }
  console.log(JSON.stringify({ ok: true, check: "worker_own_orders_only_filter" }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
