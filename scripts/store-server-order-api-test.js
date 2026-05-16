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
  mustContain(api, "fetch(`/api/store/orders?site=", "client load orders from server");
  mustContain(api, "fetch(\"/api/store/orders\"", "client save order to server");
  mustContain(api, "fetch(`/api/store/orders/${encodeURIComponent(orderId)}/status`", "client update order status on server");
  mustContain(events, "requestStoreOrderPasswordConfirmation", "submit order confirmation gateway");
  mustContain(events, "Narudzba nije spremljena na server", "server save error feedback");

  console.log(JSON.stringify({ ok: true, checks: 8 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}

