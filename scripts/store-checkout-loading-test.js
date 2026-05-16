const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const render = read("public/js/workwear/workwearRender.js");
  const events = read("public/js/workwear/workwearEvents.js");
  const namespace = read("public/js/core/namespace.js");

  mustContain(events, "workwearCheckoutInFlight", "checkout in-flight guard");
  mustContain(events, "showLoading(\"loadingStoreCheckout\")", "checkout loading overlay");
  mustContain(events, "workwearSetCheckoutBusy(true)", "checkout busy enable");
  mustContain(events, "if (workwearCheckoutInFlight) return Promise.resolve(false);", "double submit protection");
  mustContain(render, "storeSubmittingOrder", "loading checkout button label");
  mustContain(render, "workwearCheckoutInFlight ? \"disabled aria-busy=\\\"true\\\"\" : \"\"", "checkout disabled state");
  mustContain(namespace, "data-cmax-server-action", "delegated server action loading guard");

  console.log(JSON.stringify({ ok: true, checks: 7 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
