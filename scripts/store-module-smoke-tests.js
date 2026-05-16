const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}

try {
  const html = read("public/index.html");
  const routing = read("public/js/core/routing.js");
  const render = read("public/js/workwear/workwearRender.js");
  const events = read("public/js/workwear/workwearEvents.js");
  const state = read("public/js/workwear/workwearState.js");
  const accountNotifications = read("public/js/core/accountNotifications.js");
  const notificationsBadgeSource = read("public/js/planner/resourceManagement.js");
  const server = read("server/server.js");

  mustContain(html, 'id="navWorkwearBtn"', "Store sidebar navigation");
  mustContain(html, 'id="workwear-section"', "Store section");
  mustContain(routing, '"/store"', "Store route");

  mustContain(state, "isStoreProductSiteAllowed", "site visibility helper");
  mustContain(state, "getVisibleStoreProducts", "site-scoped product list");

  mustContain(events, "function workwearAddToCart(", "cart add function");
  mustContain(events, "cart.items.push", "cart multi-item support");

  mustContain(events, "verifyStorePassword", "password verification function");
  mustContain(events, "/api/store/confirm-password", "password verification API call");
  mustContain(server, "apiRouter.post('/store/confirm-password'", "password confirmation backend route");

  mustContain(events, "function workwearApproveOrder(", "approve order workflow");
  mustContain(events, "function workwearRejectOrder(", "reject order workflow");
  mustContain(events, "function workwearMarkDelivered(", "delivered order workflow");

  mustContain(state, "getVisibleStoreOrders", "worker/manager order visibility function");
  mustContain(state, "const canManageAll", "manager sees all orders logic");

  mustContain(events, "WORKWEAR_INVALID_CREDIT_RESERVATION", "budget non-negative guard");
  mustContain(events, "Budget cannot go negative", "manual budget guard");
  mustContain(events, "order_rejected", "budget return on reject");
  mustContain(events, "order_cancelled", "budget return on cancel");

  mustContain(events, "product.active === false", "inactive product ordering block");
  mustContain(events, "workwearApplyBulkEdit", "bulk edit handler");
  mustContain(render, "runExportWizard", "export options entry");
  mustContain(render, "STEP 1 — Osnovno", "wizard step 1");
  mustContain(render, "STEP 9 — Pregled i spremi", "wizard review step");
  mustContain(render, "workwearWizardAllSites", "all sites checkbox");
  mustContain(render, "workwearWizardAllRoles", "role visibility checkboxes");
  mustContain(html, 'data-cmax-args=\'["categories"]\'', "categories manager tab");
  if (html.includes('data-cmax-args=\'["users"]\'')) throw new Error("Store users/role tab should not exist in Store manager tabs");
  mustContain(render, "renderWorkwearRulesPanel", "rules tab renderer");
  mustContain(events, "workwearToggleWizardSite", "wizard site checkbox handler");
  mustContain(events, "workwearToggleWizardRole", "wizard role checkbox handler");
  mustContain(events, "workwearAddWizardCustomSize", "custom size handler");
  mustContain(events, "workwearApplyBulkEdit", "bulk edit handler");
  mustContain(events, "workwearRequestPasswordReset", "password reset request flow");
  mustContain(events, "workwearApprovePasswordReset", "superadmin password reset approval");
  mustContain(events, "workwearRejectPasswordReset", "superadmin password reset reject");
  mustContain(state, "passwordResetRequests", "password reset state log");
  mustContain(state, "notificationEvents", "store account notification event queue");
  mustContain(state, "syncWorkwearAccountNotifications", "store-account sync function");
  mustContain(accountNotifications, "syncWorkwearAccountNotifications", "account notifications bridge");
  mustContain(accountNotifications, "window.pushAccountNotification", "account notification append export");
  mustContain(notificationsBadgeSource, "notificationsSidebarBadge", "site notification sidebar badge remains wired");
  mustContain(events, "workwearSelectVariantForProduct", "worker variant selector");
  mustContain(events, "workwearAddWizardVariant", "wizard variant add");
  mustContain(events, "variantId", "variant persisted in cart/order");
  mustContain(render, "Vise varijanti", "worker variant label");
  mustContain(render, "workwearWizardVariantName", "variant editor UI");
  mustContain(html, 'id="storeSidebarBadge"', "store manager pending badge");
  mustContain(html, 'id="workwearCartOverlay"', "store cart overlay");
  mustContain(html, 'id="workwearManagerEditorToggle"', "store manager editor toggle");
  mustContain(html, 'id="workwearOrdersDisclosure"', "orders disclosure");
  mustContain(events, "workwearToggleCartOverlay", "cart overlay toggle handler");
  mustContain(events, "workwearToggleManagerEditor", "manager editor toggle handler");
  mustContain(events, "workwearSetCheckoutBusy", "checkout busy state helper");
  mustContain(events, "showLoading(\"loadingStoreCheckout\")", "checkout loading overlay");
  mustContain(render, "data-cmax-server-action=\"true\"", "server action button wiring");
  mustContain(render, "storeSubmittingOrder", "checkout loading label");
  mustContain(events, "workwearAddCategory", "add category handler");
  mustContain(events, "workwearRenameCategory", "rename category handler");
  mustContain(events, "workwearArchiveCategory", "archive category handler");
  mustContain(events, "workwearRunExportWizard", "export handler");
  if (events.includes("store-export-${format}-${Date.now()}.json")) throw new Error("Store export should not download JSON");
  mustContain(events, "workwearRemoveOrArchiveProduct", "delete/archive handler");
  mustContain(render, "workwearManagerEditorOpen", "manager editor state");
  mustContain(render, "renderWorkwearCartBadge", "cart badge render");
  mustContain(render, "statusHistory", "order timeline rendering");
  mustContain(state, "product.freeRule?.enabled === true || product.freeEligible === true", "free-rule guard for totals");
  if (events.includes("getNotificationsForSite(")) throw new Error("Store module still reads site notifications for Store events");
  if (events.includes("saveNotificationsForSite(")) throw new Error("Store module still writes site notifications for Store events");
  if (render.includes("site1,site2")) throw new Error("Legacy technical site CSV input still present");
  if (render.includes("worker,foreman,store_manager")) throw new Error("Legacy technical role CSV input still present");
  if (render.includes("email1,email2")) throw new Error("Legacy technical email CSV input still present");

  mustContain(events, "addWorkwearNotification", "notification creation");
  mustContain(state, "currentSite", "site isolation context");

  console.log(JSON.stringify({ ok: true, checks: 58 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
