const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const server = read("server/server.js");
  const api = read("public/js/workwear/workwearApi.js");
  const events = read("public/js/workwear/workwearEvents.js");

  mustContain(server, "apiRouter.get('/store/orders'", "store orders GET endpoint");
  mustContain(server, "apiRouter.post('/store/orders'", "store orders POST endpoint");
  mustContain(server, "apiRouter.patch('/store/orders/:orderId/status'", "store orders status PATCH endpoint");
  mustContain(server, "const autoApproveOrders = settings?.autoApproveOrders === true;", "explicit auto approve setting");
  mustContain(server, "return res.json({ ok: true, site, order: updatedOrder, budget: updatedBudget });", "status update budget snapshot response");
  mustContain(server, "buildServerPricedStoreOrder", "server-side order pricing builder");
  mustContain(server, "sanitizeStoreOrderDraft", "minimal order payload sanitizer");
  mustContain(server, "priceAtOrder", "order item price snapshot");
  mustContain(server, "creditCostAtOrder", "order item credit snapshot");
  mustContain(server, "upgradeApplied", "upgrade snapshot");
  mustContain(server, "differenceAmount", "difference snapshot");
  mustContain(server, "ruleSnapshot", "rule snapshot");
  mustContain(server, "STORE_INSUFFICIENT_BUDGET", "budget validation");
  mustContain(server, "STORE_PRODUCT_INACTIVE", "inactive product validation");
  mustContain(server, "STORE_PRODUCT_SITE_BLOCKED", "site availability validation");
  mustContain(server, "STORE_PRODUCT_ROLE_BLOCKED", "role availability validation");
  mustContain(server, "STORE_SIZE_INVALID", "size validation");
  mustContain(server, "STORE_VARIANT_INVALID", "variant validation");
  mustContain(server, "STORE_PERIOD_LIMIT_EXCEEDED", "period limit validation");
  mustContain(server, "order_created_server_priced", "server priced audit event");
  mustContain(server, "budget_reserved", "budget reserve audit event");
  mustContain(server, "rejected_invalid_client_price", "client tamper audit event");
  mustContain(server, "canTransitionStoreOrderStatus", "server lifecycle guard");
  mustContain(server, "budgetReleasedTotal", "single-refund tracking");
  mustContain(server, "reason: toStatus === 'Rejected' ? 'order_rejected' : 'order_cancelled'", "refund reason guard");
  mustContain(server, "if (toStatus === 'Delivered' && Number(current.creditReserved || 0) > 0)", "delivered reserve lock");
  mustContain(server, "status: nextStatus", "status snapshot write");
  mustContain(server, "serverPriced: true", "server authoritative order mark");
  mustContain(api, "fetch(`/api/store/orders?site=", "client load orders from server");
  mustContain(api, "fetch(\"/api/store/orders\"", "client save order to server");
  mustContain(api, "fetch(`/api/store/orders/${encodeURIComponent(orderId)}/status`", "client update order status on server");
  mustContain(api, "__budgetSnapshot", "server budget snapshot bridge");
  mustContain(events, "requestStoreOrderPasswordConfirmation", "submit order confirmation gateway");
  mustContain(events, "const orderDraft = {", "minimal order draft payload");
  mustContain(events, "productId: String(item.productId || \"\").trim()", "order draft product id");
  mustContain(events, "variantId: String(item.variantId || \"\").trim()", "order draft variant id");
  mustContain(events, "size: String(item.size || \"\").trim()", "order draft size");
  mustContain(events, "quantity: Math.max(1, Number(item.quantity) || 1)", "order draft quantity");
  mustContain(events, "Narudzba nije spremljena na server", "server save error feedback");

  console.log(JSON.stringify({ ok: true, checks: 36 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
