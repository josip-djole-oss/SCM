var workwearSelectedSizeByProduct = {};
var workwearSelectedVariantByProduct = {};
var workwearSelectedQuantityByProduct = {};
var workwearSelectedCommentByProduct = {};
var workwearBulkSelection = {};
function workwearSetCheckoutBusy(isBusy) {
  workwearCheckoutInFlight = isBusy === true;
  if (typeof renderWorkwearCart === "function") renderWorkwearCart();
}

function workwearApplyBudgetSnapshot(workerId, snapshot) {
  if (!snapshot) return;
  const profile = ensureWorkerWorkwearProfile(workerId);
  profile.creditBalance = Math.max(0, Number(snapshot.creditBalance || profile.creditBalance || 0));
  profile.reservedCredit = Math.max(0, Number(snapshot.reservedCredit || profile.reservedCredit || 0));
}

function workwearRefreshOrdersView() {
  if (typeof workwearApiListOrders === "function") {
    return workwearApiListOrders().catch(() => []).finally(() => {
      renderWorkwearModule();
    });
  }
  renderWorkwearModule();
  return Promise.resolve();
}
// Legacy workflow labels kept for backward-compatible smoke tests/report exports.
const LEGACY_WORKWEAR_WORKFLOW = ["Draft", "Pending", "Approved", "Ordered", "Purchased", "Ready for Pickup", "Delivered", "Rejected", "Cancelled"];

function getWorkwearStatusFlow() {
  return ["Pending", "Approved", "Delivered"];
}

function canTransitionWorkwearStatus(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  if (["Rejected", "Cancelled", "Delivered"].includes(fromStatus)) return false;
  if (fromStatus === "Pending" && toStatus === "Approved") return true;
  if (fromStatus === "Approved" && toStatus === "Delivered") return true;
  return false;
}

function addWorkwearNotification(message, options = {}) {
  const title = String(options.title || "Store obavijest").trim();
  const description = String(message || "").trim();
  const targetRoles = normalizeStoreRoleList(options.targetRoles || []);
  const targetUsers = Array.isArray(options.targetUsers)
    ? options.targetUsers.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
    : [];
  const event = pushWorkwearAccountEvent("store_notification", {
    site: options.site || currentSite,
    title,
    description,
    targetRoles,
    targetUsers,
    targetView: options.targetView || "workwear",
    targetId: options.targetId || "",
    metadata: options.metadata || {},
  });
  if (typeof syncWorkwearAccountNotifications === "function") syncWorkwearAccountNotifications();
  if (typeof updateAccountNotificationsBadge === "function") updateAccountNotificationsBadge();
  saveWorkwearState();
  return event;
}

function workwearSwitchManagerTab(tab) {
  const allowed = ["products", "categories", "orders", "budgets", "rules", "export", "audit"];
  workwearManagerTab = allowed.includes(tab) ? tab : "products";
  renderWorkwearModule();
}

function workwearSetOrderFilter(key, el) {
  if (!key || !el) return;
  workwearOrderFilters[key] = String(el.value || "").trim();
  workwearOrderRenderLimit = 20;
  renderWorkwearManagerOrders();
}

function workwearPrevProductPage() {
  workwearProductPage = Math.max(1, Number(workwearProductPage || 1) - 1);
  renderWorkwearProducts();
}

function workwearNextProductPage() {
  workwearProductPage = Math.max(1, Number(workwearProductPage || 1) + 1);
  renderWorkwearProducts();
}

function workwearLoadMoreOrders() {
  workwearOrderRenderLimit += 20;
  renderWorkwearOrders();
}

function workwearSetBulkSelection(productId, el) {
  if (!productId || !el) return;
  workwearBulkSelection[String(productId)] = el.checked === true;
  renderWorkwearAdminPanel();
  renderWorkwearBulkEditPanel();
}

function workwearSelectSizeForProduct(productId, el) {
  if (!el) return;
  workwearSelectedSizeByProduct[productId] = String(el.value || "");
}

function workwearSelectVariantForProduct(productId, el) {
  if (!el) return;
  workwearSelectedVariantByProduct[productId] = String(el.value || "");
}

function workwearSetQuantityForProduct(productId, el) {
  const qty = Math.max(1, Number(el?.value || 1));
  workwearSelectedQuantityByProduct[productId] = qty;
}

function workwearSetCommentForProduct(productId, el) {
  workwearSelectedCommentByProduct[productId] = String(el?.value || "").trim();
}

function getStoreOrderManagerTargetRoles() {
  return ["store_manager", "admin", "superadmin"];
}

function workwearToggleManagerEditor() {
  if (!canManageWorkwearModule()) return;
  workwearManagerEditorOpen = !workwearManagerEditorOpen;
  if (workwearManagerEditorOpen) {
    workwearOrdersOverlayOpen = false;
    workwearCartOverlayOpen = false;
  }
  renderWorkwearModule();
}

function workwearToggleCartOverlay() {
  workwearCartOverlayOpen = !workwearCartOverlayOpen;
  if (workwearCartOverlayOpen) {
    workwearOrdersOverlayOpen = false;
    workwearManagerEditorOpen = false;
  }
  renderWorkwearCartOverlay();
  renderWorkwearOrdersOverlay();
  renderWorkwearManagerOverlay();
  renderWorkwearHeaderControls();
}

function workwearCloseCartOverlay() {
  workwearCartOverlayOpen = false;
  renderWorkwearCartOverlay();
  renderWorkwearHeaderControls();
}

function workwearToggleOrdersOverlay() {
  workwearOrdersOverlayOpen = !workwearOrdersOverlayOpen;
  if (workwearOrdersOverlayOpen) {
    workwearCartOverlayOpen = false;
    workwearManagerEditorOpen = false;
  }
  renderWorkwearOrdersOverlay();
  renderWorkwearCartOverlay();
  renderWorkwearManagerOverlay();
  renderWorkwearHeaderControls();
}

function workwearCloseOrdersOverlay() {
  workwearOrdersOverlayOpen = false;
  renderWorkwearOrdersOverlay();
  renderWorkwearHeaderControls();
}

function workwearCloseManagerEditor() {
  workwearManagerEditorOpen = false;
  renderWorkwearManagerOverlay();
  renderWorkwearHeaderControls();
}

function workwearOpenProductImageViewer(productId, startIndex) {
  const product = getWorkwearProductById(productId);
  if (!product) return;
  const images = typeof getStoreProductGalleryImages === "function" ? getStoreProductGalleryImages(product) : [];
  if (!images.length) return;
  workwearImageViewerState.productId = String(productId || "");
  workwearImageViewerState.images = images;
  workwearImageViewerState.index = Math.max(0, Math.min(images.length - 1, Number(startIndex) || 0));
  workwearImageViewerState.title = String(product.name || "Store product");
  workwearImageViewerState.open = true;
  renderWorkwearImageViewer();
}

function workwearCloseProductImageViewer() {
  workwearImageViewerState.open = false;
  renderWorkwearImageViewer();
}

function workwearPrevProductImage() {
  if (!workwearImageViewerState.open || !workwearImageViewerState.images.length) return;
  const total = workwearImageViewerState.images.length;
  workwearImageViewerState.index = (Number(workwearImageViewerState.index) - 1 + total) % total;
  renderWorkwearImageViewer();
}

function workwearNextProductImage() {
  if (!workwearImageViewerState.open || !workwearImageViewerState.images.length) return;
  const total = workwearImageViewerState.images.length;
  workwearImageViewerState.index = (Number(workwearImageViewerState.index) + 1) % total;
  renderWorkwearImageViewer();
}

function workwearAddToCart(productId) {
  const product = getWorkwearProductById(productId);
  if (!product) return;
  if (product.active === false) {
    showToast(t("productInactive") || "Product inactive.", "error");
    return;
  }
  if (!isStoreProductSiteAllowed(product, currentSite) || !isStoreProductRoleAllowed(product)) {
    showToast("Product is unavailable for this site or role.", "error");
    return;
  }
  const size = workwearSelectedSizeByProduct[productId] || "";
  const variantId = workwearSelectedVariantByProduct[productId] || "";
  const activeVariants = getActiveStoreProductVariants(product);
  const hasVariants = activeVariants.length > 0;
  const selectedVariant = hasVariants ? getStoreProductVariantById(product, variantId) : null;
  const quantity = Math.max(1, Number(workwearSelectedQuantityByProduct[productId] || 1));
  const lineComment = String(workwearSelectedCommentByProduct[productId] || "").trim();
  if (hasVariants && (!variantId || !selectedVariant || selectedVariant.active === false)) {
    showToast("Odaberi varijantu prije dodavanja.", "error");
    return;
  }
  if ((Array.isArray(product.sizes) && product.sizes.length) && !size) {
    showToast(t("selectSize") || "Select size", "error");
    return;
  }

  const cart = getWorkwearCartForCurrentUser();
  const existing = cart.items.find((item) => (
    item.productId === productId &&
    item.size === size &&
    String(item.variantId || "") === String(variantId || "")
  ));
  if (existing) {
    existing.quantity = Number(existing.quantity || 1) + quantity;
    if (lineComment) existing.comment = lineComment;
  }
  else {
    cart.items.push({
      productId,
      productName: product.name,
      variantId: selectedVariant?.id || "",
      variantName: selectedVariant?.name || "",
      variantImage: selectedVariant?.image || selectedVariant?.imageUrl || "",
      size,
      quantity,
      useUpgrade: false,
      workerAcknowledgedUpgrade: false,
      comment: lineComment,
    });
  }
  cart.updatedAt = new Date().toISOString();
  saveWorkwearState();
  pushWorkwearAudit("cart_item_added", {
    entityType: "cart",
    entityId: String(productId),
    metadata: { size, variantId: selectedVariant?.id || "", variantName: selectedVariant?.name || "", quantity },
  });
  renderWorkwearCart();
  renderWorkwearCartBadge();
  showToast(t("addToCart") || "Add to cart", "success");
}

function workwearRemoveCartItem(index) {
  const cart = getWorkwearCartForCurrentUser();
  cart.items.splice(Number(index) || 0, 1);
  cart.updatedAt = new Date().toISOString();
  saveWorkwearState();
  renderWorkwearCart();
  renderWorkwearCartBadge();
}

function workwearSaveDraft() {
  const cart = getWorkwearCartForCurrentUser();
  cart.comment = (document.getElementById("workwearCartComment")?.value || "").trim();
  cart.urgent = document.getElementById("workwearCartUrgent")?.checked === true;
  saveWorkwearState();
  pushWorkwearAudit("cart_draft_saved", { entityType: "cart", entityId: String(appState.currentUser || "guest") });
  showToast(t("dataSaved") || "Saved", "success");
}

function workwearReserveCredit(workerId, amount, reason, orderId) {
  const profile = ensureWorkerWorkwearProfile(workerId);
  const value = Math.max(0, Number(amount) || 0);
  const currentBalance = Number(profile.creditBalance || 0);
  if (!Number.isFinite(currentBalance) || !Number.isFinite(value) || value < 0 || currentBalance < value) {
    throw new Error("WORKWEAR_INVALID_CREDIT_RESERVATION");
  }
  profile.creditBalance = Math.max(0, currentBalance - value);
  profile.reservedCredit = Number(profile.reservedCredit || 0) + value;
  const state = getWorkwearState();
  state.creditLedger.push({
    id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    workerId,
    delta: -value,
    reserve: value,
    reason,
    orderId,
    date: new Date().toISOString(),
    changedBy: appState.currentUser || "system",
  });
  pushWorkwearAudit("credit_reserved", { entityType: "order", entityId: orderId, metadata: { workerId, amount: value, reason } });
}

function workwearReleaseReservedCredit(workerId, amount, reason, orderId) {
  const profile = ensureWorkerWorkwearProfile(workerId);
  const value = Math.max(0, Number(amount) || 0);
  profile.creditBalance = Number(profile.creditBalance || 0) + value;
  profile.reservedCredit = Math.max(0, Number(profile.reservedCredit || 0) - value);
  const state = getWorkwearState();
  state.creditLedger.push({
    id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    workerId,
    delta: value,
    reserve: -value,
    reason,
    orderId,
    date: new Date().toISOString(),
    changedBy: appState.currentUser || "system",
  });
  pushWorkwearAudit("credit_released", { entityType: "order", entityId: orderId, metadata: { workerId, amount: value, reason } });
}

function workwearFinalizeDelivery(workerId, amount, orderId) {
  const profile = ensureWorkerWorkwearProfile(workerId);
  const value = Math.max(0, Number(amount) || 0);
  profile.reservedCredit = Math.max(0, Number(profile.reservedCredit || 0) - value);
  const state = getWorkwearState();
  state.creditLedger.push({
    id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    workerId,
    delta: 0,
    reserve: -value,
    reason: "delivery_locked",
    orderId,
    date: new Date().toISOString(),
    changedBy: appState.currentUser || "system",
  });
  pushWorkwearAudit("delivery_locked", { entityType: "order", entityId: orderId, metadata: { workerId, amount: value } });
}

function verifyStorePassword(password) {
  const pass = String(password || "");
  if (!pass) return Promise.resolve(false);
  if (typeof BACKEND_ENABLED !== "undefined" && BACKEND_ENABLED) {
    return fetch("/api/store/confirm-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    })
      .then((res) => res.ok)
      .catch(() => false);
  }
  return Promise.resolve(pass.length >= 4);
}

function applyStoreFreeUsage(order) {
  const state = getWorkwearState();
  const profile = ensureWorkerWorkwearProfile(order.workerId);
  const nowIso = new Date().toISOString();
  (order.items || []).forEach((item) => {
    if (!item.freeApplied) return;
    const product = getWorkwearProductById(item.productId);
    if (!product) return;
    const mode = product.freeRule?.mode || state.settings.freeRules?.mode || "firstItem";
    const key = mode === "category" ? `cat:${product.category || "general"}` : mode === "firstOrder" ? "order:first" : `product:${product.id}`;
    profile.freeEligibility[key] = nowIso;
  });
}

function requestStoreOrderPasswordConfirmation(callback) {
  const promptMessage = "Potvrdi narudzbu lozinkom:";
  if (typeof showPromptDialog === "function" && document.getElementById("customDialogOverlay")) {
    showPromptDialog(promptMessage, "🔐", "Password", callback);
    return;
  }
  const fallback = window.prompt(promptMessage, "");
  callback(fallback === null ? null : String(fallback || "").trim());
}

function upsertLocalStoreOrder(order) {
  const state = getWorkwearState();
  const idx = (state.orders || []).findIndex((entry) => entry.id === order.id);
  if (idx >= 0) state.orders[idx] = order;
  else state.orders.push(order);
}

function finalizeOrderSubmission(cart) {
  const workerId = String(appState.currentUser || "guest").trim().toLowerCase();
  const workerProfile = ensureWorkerWorkwearProfile(workerId);
  const totals = computeWorkwearOrderTotals(cart.items, workerId);

  if (totals.subtotal > Number(workerProfile.creditBalance || 0)) {
    showToast(t("insufficientBudget") || "Insufficient budget.", "error");
    return;
  }

  const state = getWorkwearState();
  const createdAt = new Date().toISOString();
  const orderDraft = {
    workerComment: cart.comment || "",
    urgent: cart.urgent === true,
    passwordConfirmedAt: createdAt,
    items: (cart.items || []).map((item) => ({
      productId: String(item.productId || "").trim(),
      variantId: String(item.variantId || "").trim(),
      size: String(item.size || "").trim(),
      quantity: Math.max(1, Number(item.quantity) || 1),
      comment: String(item.comment || "").trim(),
      useUpgrade: item.useUpgrade === true,
    })),
  };
  const fallbackRequiresApproval = totals.items.some((item) => {
    const product = getWorkwearProductById(item.productId);
    return product?.approvalRequired === true;
  });
  const fallbackAutoApprove = state.settings?.autoApproveOrders === true && !fallbackRequiresApproval;
  const fallbackStatus = fallbackAutoApprove ? "Approved" : "Pending";
  const fallbackOrder = {
    id: `SO-${Date.now().toString().slice(-8)}`,
    workerId,
    workerName: workerProfile.workerName,
    siteId: currentSite,
    siteName: currentSite,
    site: currentSite,
    items: totals.items,
    status: fallbackStatus,
    urgent: cart.urgent === true,
    workerComment: cart.comment || "",
    internalNote: "",
    externalNote: "",
    budgetImpact: Number(totals.subtotal || 0),
    totals,
    statusHistory: [{ status: fallbackStatus, at: createdAt, by: appState.currentUser || "system" }],
    cancelledAt: "",
    cancelledBy: "",
    cancelReason: "",
    passwordConfirmedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    creditReserved: 0,
  };
  const savePromise = (typeof workwearApiSaveOrder === "function")
    ? workwearApiSaveOrder(orderDraft)
    : Promise.resolve(fallbackOrder);
  workwearSetCheckoutBusy(true);
  if (typeof showLoading === "function") showLoading("loadingStoreCheckout");
  return savePromise
    .then((savedOrder) => {
      const persistedOrder = savedOrder && typeof savedOrder === "object" ? savedOrder : fallbackOrder;
      const isBackend = (typeof BACKEND_ENABLED !== "undefined" && BACKEND_ENABLED);
      if (!isBackend) {
        if (state.settings.reserveOnPending || fallbackStatus === "Approved") {
          workwearReserveCredit(workerId, totals.subtotal, fallbackStatus === "Approved" ? "auto_approved_reserve" : "pending_reserve", persistedOrder.id);
          persistedOrder.creditReserved = totals.subtotal;
        }
        applyStoreFreeUsage(persistedOrder);
      } else if (persistedOrder.__budgetSnapshot) {
        const snapshot = persistedOrder.__budgetSnapshot;
        delete persistedOrder.__budgetSnapshot;
        workwearApplyBudgetSnapshot(workerId, snapshot);
      }
      upsertLocalStoreOrder(persistedOrder);
      state.workerProfiles[workerId] = state.workerProfiles[workerId] || ensureWorkerWorkwearProfile(workerId);
      const history = Array.isArray(state.workerProfiles[workerId].orderHistory) ? state.workerProfiles[workerId].orderHistory : [];
      if (!history.includes(persistedOrder.id)) history.push(persistedOrder.id);
      state.workerProfiles[workerId].orderHistory = history;
      resetWorkwearCartForUser(workerId);
      workwearCartOverlayOpen = false;
      saveWorkwearState();

      pushWorkwearAudit("order_submitted", { entityType: "order", entityId: persistedOrder.id, after: { status: persistedOrder.status }, metadata: { urgent: persistedOrder.urgent } });
      addWorkwearNotification(`Narudzba ${persistedOrder.id} je uspjesno poslana.`, {
        title: "Store narudzba poslana",
        targetUsers: [workerId],
        targetId: persistedOrder.id,
        metadata: { orderId: persistedOrder.id, status: persistedOrder.status },
      });
      addWorkwearNotification(`Nova narudzba ${persistedOrder.id} (${workerProfile.workerName}) ceka obradu.`, {
        title: "Nova Store narudzba",
        targetRoles: getStoreOrderManagerTargetRoles(),
        targetId: persistedOrder.id,
        metadata: { orderId: persistedOrder.id, status: persistedOrder.status, urgent: persistedOrder.urgent },
      });
      showToast("Order submitted", "success");
      return workwearRefreshOrdersView();
    })
    .catch((error) => {
      console.error("Store order submit failed:", error);
      showToast("Narudzba nije spremljena na server. Pokusaj ponovo.", "error");
      throw error;
    })
    .finally(() => {
      workwearSetCheckoutBusy(false);
      if (typeof hideLoading === "function") hideLoading();
    });
}

function workwearSubmitOrder() {
  if (workwearCheckoutInFlight) return Promise.resolve(false);
  const cart = getWorkwearCartForCurrentUser();
  cart.comment = (document.getElementById("workwearCartComment")?.value || "").trim();
  cart.urgent = document.getElementById("workwearCartUrgent")?.checked === true;
  if (!Array.isArray(cart.items) || !cart.items.length) {
    showToast(t("emptyCart") || "Cart is empty.", "error");
    return;
  }

  const totals = computeWorkwearOrderTotals(cart.items, appState.currentUser);
  if (totals.items.some((item) => !item.size && (getWorkwearProductById(item.productId)?.sizes || []).length > 0)) {
    showToast(t("selectSize") || "Select size", "error");
    return;
  }
  if (totals.items.some((item) => {
    const product = getWorkwearProductById(item.productId);
    const variants = getActiveStoreProductVariants(product);
    return variants.length > 0 && !item.variantId;
  })) {
    showToast("Odaberi varijantu za sve artikle.", "error");
    return;
  }
  if (totals.items.some((item) => {
    const product = getWorkwearProductById(item.productId);
    return !product || product.active === false || !isStoreProductSiteAllowed(product, currentSite) || !isStoreProductRoleAllowed(product);
  })) {
    showToast("One or more products are inactive or unavailable.", "error");
    return;
  }

  requestStoreOrderPasswordConfirmation((value) => {
    if (value === null) return;
    verifyStorePassword(value).then((ok) => {
      if (!ok) {
        showToast("Potvrda lozinke nije uspjela.", "error");
        return;
      }
      finalizeOrderSubmission(cart).catch(() => {});
    });
  });
  return Promise.resolve(true);
}

function workwearCancelOrder(orderId) {
  const state = getWorkwearState();
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  if (order.workerId !== String(appState.currentUser || "").trim().toLowerCase() && !canManageWorkwearModule()) return;
  if (["Rejected", "Cancelled", "Delivered"].includes(order.status)) return;

  showPromptDialog("Razlog otkazivanja (opcionalno):", "??", "Razlog", (reason) => {
    const cancelReason = String(reason || "").trim();
    if (typeof workwearApiUpdateOrderStatus === "function") {
      if (typeof showLoading === "function") showLoading("loadingStoreStatus");
      workwearApiUpdateOrderStatus(order.id, "Cancelled", { reason: cancelReason || "" })
        .then((updatedOrder) => {
          if (updatedOrder?.__budgetSnapshot) {
            workwearApplyBudgetSnapshot(order.workerId, updatedOrder.__budgetSnapshot);
            delete updatedOrder.__budgetSnapshot;
          }
          pushWorkwearAudit("order_cancelled", { entityType: "order", entityId: order.id, after: { status: "Cancelled" } });
          addWorkwearNotification(`Narudzba ${order.id} je otkazana.`, {
            title: "Store narudzba otkazana",
            targetUsers: [order.workerId],
            targetId: order.id,
            metadata: { orderId: order.id, status: "Cancelled" },
          });
          showToast("Narudzba je otkazana.", "success");
          return workwearRefreshOrdersView();
        })
        .catch(() => {
          showToast("Status nije sinkroniziran sa serverom.", "error");
        })
        .finally(() => {
          if (typeof hideLoading === "function") hideLoading();
        });
      return;
    }
    order.status = "Cancelled";
    order.updatedAt = new Date().toISOString();
    order.cancelledAt = order.updatedAt;
    order.cancelledBy = appState.currentUser || "system";
    order.cancelReason = cancelReason;
    order.statusHistory.push({ status: "Cancelled", at: order.updatedAt, by: appState.currentUser || "system" });
    if (Number(order.creditReserved || 0) > 0) {
      workwearReleaseReservedCredit(order.workerId, order.creditReserved, "order_cancelled", order.id);
      order.creditReserved = 0;
    }
    saveWorkwearState();
    pushWorkwearAudit("order_cancelled", { entityType: "order", entityId: order.id, after: { status: order.status } });
    addWorkwearNotification(`Narudzba ${order.id} je otkazana.`, {
      title: "Store narudzba otkazana",
      targetUsers: [order.workerId],
      targetId: order.id,
      metadata: { orderId: order.id, status: order.status },
    });
    renderWorkwearModule();
  });
}

function workwearApproveOrder(orderId) {
  if (!canManageWorkwearModule()) return;
  const state = getWorkwearState();
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  if (!canTransitionWorkwearStatus(order.status, "Approved") && order.status !== "Approved") {
    showToast("Invalid status transition.", "error");
    return;
  }

  const previous = order.status;
  if (typeof workwearApiUpdateOrderStatus === "function") {
    return workwearApiUpdateOrderStatus(order.id, "Approved")
      .then((updatedOrder) => {
        if (updatedOrder?.__budgetSnapshot) {
          workwearApplyBudgetSnapshot(order.workerId, updatedOrder.__budgetSnapshot);
          delete updatedOrder.__budgetSnapshot;
        }
        pushWorkwearAudit("order_approved", { entityType: "order", entityId: order.id, before: { status: previous }, after: { status: "Approved" } });
        addWorkwearNotification(`Narudzba ${order.id} je odobrena.`, {
          title: "Store narudzba odobrena",
          targetUsers: [order.workerId],
          targetId: order.id,
          metadata: { orderId: order.id, status: "Approved" },
        });
        showToast("Narudzba je odobrena.", "success");
        return workwearRefreshOrdersView();
      })
      .catch(() => {
        showToast("Status nije sinkroniziran sa serverom.", "error");
      });
  }
  if (Number(order.creditReserved || 0) === 0) {
    workwearReserveCredit(order.workerId, Number(order.totals?.subtotal || 0), "approved_reserve", order.id);
    order.creditReserved = Number(order.totals?.subtotal || 0);
  }
  order.status = "Approved";
  order.updatedAt = new Date().toISOString();
  order.statusHistory.push({ status: "Approved", at: order.updatedAt, by: appState.currentUser || "system" });
  saveWorkwearState();
  pushWorkwearAudit("order_approved", { entityType: "order", entityId: order.id, before: { status: previous }, after: { status: order.status } });
  addWorkwearNotification(`Narudzba ${order.id} je odobrena.`, {
    title: "Store narudzba odobrena",
    targetUsers: [order.workerId],
    targetId: order.id,
    metadata: { orderId: order.id, status: order.status },
  });
  renderWorkwearModule();
  return Promise.resolve(order);
}

function workwearMarkDelivered(orderId) {
  if (!canManageWorkwearModule()) return;
  const state = getWorkwearState();
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  if (!canTransitionWorkwearStatus(order.status, "Delivered") && order.status !== "Delivered") {
    showToast("Invalid status transition.", "error");
    return;
  }

  const previous = order.status;
  if (typeof workwearApiUpdateOrderStatus === "function") {
    return workwearApiUpdateOrderStatus(order.id, "Delivered")
      .then((updatedOrder) => {
        if (updatedOrder?.__budgetSnapshot) {
          workwearApplyBudgetSnapshot(order.workerId, updatedOrder.__budgetSnapshot);
          delete updatedOrder.__budgetSnapshot;
        }
        pushWorkwearAudit("order_delivered", { entityType: "order", entityId: order.id, before: { status: previous }, after: { status: "Delivered" } });
        addWorkwearNotification(`Narudzba ${order.id} je isporucena.`, {
          title: "Store narudzba isporucena",
          targetUsers: [order.workerId],
          targetId: order.id,
          metadata: { orderId: order.id, status: "Delivered" },
        });
        showToast("Narudzba je oznacena kao isporucena.", "success");
        return workwearRefreshOrdersView();
      })
      .catch(() => {
        showToast("Status nije sinkroniziran sa serverom.", "error");
      });
  }
  if (Number(order.creditReserved || 0) > 0) {
    workwearFinalizeDelivery(order.workerId, Number(order.creditReserved || 0), order.id);
    order.creditReserved = 0;
  }
  order.status = "Delivered";
  order.updatedAt = new Date().toISOString();
  order.statusHistory.push({ status: "Delivered", at: order.updatedAt, by: appState.currentUser || "system" });
  saveWorkwearState();
  pushWorkwearAudit("order_delivered", { entityType: "order", entityId: order.id, before: { status: previous }, after: { status: order.status } });
  addWorkwearNotification(`Narudzba ${order.id} je isporucena.`, {
    title: "Store narudzba isporucena",
    targetUsers: [order.workerId],
    targetId: order.id,
    metadata: { orderId: order.id, status: order.status },
  });
  renderWorkwearModule();
  return Promise.resolve(order);
}

function workwearTransitionOrderStatus(order, next) {
  if (!order) return false;
  if (["Rejected", "Cancelled", "Delivered"].includes(order.status)) return;
  if (next === "Delivered") {
    return canTransitionWorkwearStatus(order.status, "Delivered");
  }
  return canTransitionWorkwearStatus(order.status, next);
}

function workwearAdvanceStatus(orderId) {
  const state = getWorkwearState();
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  if (order.status === "Pending" && workwearTransitionOrderStatus(order, "Approved")) return workwearApproveOrder(orderId);
  if (order.status === "Approved" && workwearTransitionOrderStatus(order, "Delivered")) return workwearMarkDelivered(orderId);
}

function workwearRejectOrder(orderId) {
  if (!canManageWorkwearModule()) return;
  const state = getWorkwearState();
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order || ["Rejected", "Cancelled", "Delivered"].includes(order.status)) return;

  showPromptDialog("Razlog odbijanja (opcionalno):", "??", "Razlog", (reason) => {
    const rejectionReason = String(reason || "").trim();
    if (typeof workwearApiUpdateOrderStatus === "function") {
      if (typeof showLoading === "function") showLoading("loadingStoreStatus");
      workwearApiUpdateOrderStatus(order.id, "Rejected", { reason: rejectionReason || "" })
        .then((updatedOrder) => {
          if (updatedOrder?.__budgetSnapshot) {
            workwearApplyBudgetSnapshot(order.workerId, updatedOrder.__budgetSnapshot);
            delete updatedOrder.__budgetSnapshot;
          }
          pushWorkwearAudit("order_rejected", { entityType: "order", entityId: order.id, after: { status: "Rejected" } });
          addWorkwearNotification(`Narudzba ${order.id} je odbijena.`, {
            title: "Store narudzba odbijena",
            targetUsers: [order.workerId],
            targetId: order.id,
            metadata: { orderId: order.id, status: "Rejected" },
          });
          showToast("Narudzba je odbijena.", "success");
          return workwearRefreshOrdersView();
        })
        .catch(() => {
          showToast("Status nije sinkroniziran sa serverom.", "error");
        })
        .finally(() => {
          if (typeof hideLoading === "function") hideLoading();
        });
      return;
    }
    order.status = "Rejected";
    order.updatedAt = new Date().toISOString();
    order.rejectedBy = appState.currentUser || "";
    order.externalNote = rejectionReason;
    order.statusHistory.push({ status: "Rejected", at: order.updatedAt, by: appState.currentUser || "system" });
    if (Number(order.creditReserved || 0) > 0) {
      workwearReleaseReservedCredit(order.workerId, order.creditReserved, "order_rejected", order.id);
      order.creditReserved = 0;
    }
    saveWorkwearState();
    pushWorkwearAudit("order_rejected", { entityType: "order", entityId: order.id, after: { status: order.status } });
    addWorkwearNotification(`Narudzba ${order.id} je odbijena.`, {
      title: "Store narudzba odbijena",
      targetUsers: [order.workerId],
      targetId: order.id,
      metadata: { orderId: order.id, status: order.status },
    });
    renderWorkwearModule();
  });
}

function splitCsv(input) {
  return String(input || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function workwearCollectWizardImages(wizard) {
  return [
    wizard?.imagePrimary || "",
    ...splitCsv(wizard?.imageGallery || ""),
  ].map((url) => String(url || "").trim()).filter(Boolean);
}

function workwearApplyWizardImages(wizard, images) {
  const uniqueImages = Array.from(new Set((Array.isArray(images) ? images : [])
    .map((url) => String(url || "").trim())
    .filter(Boolean)));
  wizard.imagePrimary = uniqueImages[0] || "";
  wizard.imageGallery = uniqueImages.slice(1).join(", ");
  return wizard;
}

function workwearReadWizardFormState() {
  const wizard = getWorkwearWizardState();
  const inputValue = (id, fallback = "") => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };
  const textValue = (id, fallback = "") => String(inputValue(id, fallback) || "").trim();
  const checkedValue = (id, fallback = false) => {
    const el = document.getElementById(id);
    return el ? el.checked === true : fallback === true;
  };
  const checkedDefaultTrue = (id, fallback = true) => {
    const el = document.getElementById(id);
    return el ? el.checked !== false : fallback !== false;
  };
  const numberValue = (id, fallback = 0) => {
    const el = document.getElementById(id);
    if (!el) return Number(fallback || 0);
    return Number(el.value || fallback || 0);
  };
  const next = {
    ...wizard,
    name: textValue("workwearProductName", wizard.name || ""),
    description: textValue("workwearProductDescription", wizard.description || ""),
    category: inputValue("workwearProductCategory", wizard.category || getWorkwearCategories()[0]),
    subcategory: textValue("workwearProductSubcategory", wizard.subcategory || ""),
    active: checkedDefaultTrue("workwearProductActive", wizard.active !== false),
    isNew: checkedValue("workwearProductNew", wizard.isNew === true),
    imagePrimary: textValue("workwearProductImage", wizard.imagePrimary || ""),
    imageGallery: textValue("workwearProductGallery", wizard.imageGallery || ""),
    sizePreset: inputValue("workwearWizardSizePreset", wizard.sizePreset || "odjeca"),
    allSites: checkedValue("workwearWizardAllSites", wizard.allSites === true),
    allRoles: checkedValue("workwearWizardAllRoles", wizard.allRoles === true),
    variants: Array.isArray(wizard.variants) ? wizard.variants.map((variant) => ({ ...variant })) : [],
    price: numberValue("workwearProductPrice", wizard.price || 0),
    showPriceToWorker: checkedDefaultTrue("workwearProductShowPrice", wizard.showPriceToWorker !== false),
    usesBudget: checkedValue("workwearProductUsesBudget", wizard.usesBudget === true),
    creditCost: numberValue("workwearProductCredit", wizard.creditCost || 0),
    budgetGroup: textValue("workwearProductBudgetGroup", wizard.budgetGroup || ""),
    approvalRequired: checkedValue("workwearProductApproval", wizard.approvalRequired === true),
    freeRuleEnabled: checkedValue("workwearProductFree", wizard.freeRuleEnabled === true),
    periodLimitEnabled: checkedValue("workwearProductLimitEnabled", wizard.periodLimitEnabled === true),
    upgradeEnabled: checkedValue("workwearProductUpgrade", wizard.upgradeEnabled === true),
    urgentSafety: checkedValue("workwearProductUrgent", wizard.urgentSafety === true),
    freeRuleMode: inputValue("workwearProductFreeMode", wizard.freeRuleMode || "firstItem"),
    freeRulePeriodDays: numberValue("workwearProductFreePeriodDays", wizard.freeRulePeriodDays || 180),
    periodLimitCycle: inputValue("workwearProductLimitCycle", wizard.periodLimitCycle || "6m"),
    periodLimitQty: numberValue("workwearProductLimitQty", wizard.periodLimitQty || 1),
    periodLimitDays: numberValue("workwearProductLimitDays", wizard.periodLimitDays || 180),
    companyCoveredAmount: numberValue("workwearProductCovered", wizard.companyCoveredAmount || 0),
    differenceAmount: numberValue("workwearProductDifference", wizard.differenceAmount || 0),
    workerUpgradeWarning: checkedDefaultTrue("workwearProductUpgradeWarning", wizard.workerUpgradeWarning !== false),
    supplierId: textValue("workwearProductSupplier", wizard.supplierId || "manual") || "manual",
    supplierProductId: textValue("workwearProductSupplierProductId", wizard.supplierProductId || ""),
    supplierLink: textValue("workwearProductSupplierLink", wizard.supplierLink || ""),
    supplierPrice: numberValue("workwearProductSupplierPrice", wizard.supplierPrice || 0),
    externalSync: checkedValue("workwearProductExternalSync", wizard.externalSync === true),
  };
  workwearProductWizardSeed = next;
  return next;
}

function workwearResetProductWizard(product) {
  workwearProductWizardSeed = workwearCreateWizardState(product || null);
  workwearProductWizardStep = 1;
}

function workwearSetProductWizardStep(step) {
  workwearReadWizardFormState();
  workwearProductWizardStep = Math.max(1, Math.min(9, Number(step) || 1));
  renderWorkwearModule();
}

function workwearPrevProductWizardStep() {
  workwearSetProductWizardStep((Number(workwearProductWizardStep) || 1) - 1);
}

function workwearNextProductWizardStep() {
  workwearSetProductWizardStep((Number(workwearProductWizardStep) || 1) + 1);
}

function workwearStartNewProductWizard() {
  workwearManagerEditorOpen = true;
  workwearEditingProductId = "";
  workwearResetProductWizard(null);
  renderWorkwearModule();
}

function workwearEditProductWizard(productId) {
  const product = getWorkwearProductById(productId);
  if (!product) return;
  workwearManagerEditorOpen = true;
  workwearEditingProductId = product.id;
  workwearResetProductWizard(product);
  renderWorkwearModule();
}

function workwearRemoveOrArchiveProduct(productId) {
  if (!canManageWorkwearModule()) return;
  const id = String(productId || "").trim();
  if (!id) return;
  const state = getWorkwearState();
  const product = getWorkwearProductById(id);
  if (!product) return;
  const hasOrderHistory = (state.orders || []).some((order) => (order.items || []).some((item) => item.productId === id));
  const baseMessage = `Jeste li sigurni da zelite ukloniti ovaj artikal?\n\n${product.name || id}`;
  const archiveNote = hasOrderHistory
    ? "\n\nOvaj artikal ima historiju narudzbi i bit ce arhiviran umjesto trajno obrisan."
    : "";
  showConfirm(`${baseMessage}${archiveNote}`, "Potvrda", "⚠️", () => {
    if (hasOrderHistory) {
      state.products = (state.products || []).map((entry) => {
        const normalized = normalizeStoreProduct(entry);
        if (normalized.id !== id) return normalized;
        return {
          ...normalized,
          active: false,
          archived: true,
          archivedAt: new Date().toISOString(),
          archivedBy: String(appState.currentUser || "").trim().toLowerCase(),
        };
      });
      pushWorkwearAudit("product_archived", {
        entityType: "product",
        entityId: id,
        metadata: { productName: product.name || id, reason: "has_order_history" },
      });
    } else {
      state.products = (state.products || []).filter((entry) => String(entry.id || "").trim() !== id);
      pushWorkwearAudit("product_deleted", {
        entityType: "product",
        entityId: id,
        metadata: { productName: product.name || id, reason: "no_order_history" },
      });
    }
    delete workwearBulkSelection[id];
    saveWorkwearState();
    workwearEditingProductId = workwearEditingProductId === id ? "" : workwearEditingProductId;
    workwearResetProductWizard(null);
    renderWorkwearModule();
    showToast(hasOrderHistory ? "Artikal je arhiviran." : "Artikal je obrisan.", "success");
  });
}

function workwearUpdateWizardCategory(el) {
  const category = String(el?.value || "").trim();
  const wizard = workwearReadWizardFormState();
  wizard.category = category || wizard.category;
  const subcategories = getStoreSubcategoryOptions(wizard.category);
  if (!subcategories.includes(wizard.subcategory)) {
    wizard.subcategory = "";
  }
  workwearProductWizardSeed = wizard;
  renderWorkwearModule();
}

function workwearQuickAddWizardCategory() {
  const input = document.getElementById("workwearWizardQuickCategory");
  const name = String(input?.value || "").trim();
  if (!name) return;
  ensureStoreCategory(name);
  saveWorkwearState();
  pushWorkwearAudit("category_added", { entityType: "category", entityId: name });
  const wizard = workwearReadWizardFormState();
  wizard.category = name;
  wizard.subcategory = "";
  workwearProductWizardSeed = wizard;
  if (input) input.value = "";
  renderWorkwearModule();
}

function workwearQuickAddWizardSubcategory() {
  const wizard = workwearReadWizardFormState();
  const category = String(wizard.category || "").trim();
  const input = document.getElementById("workwearWizardQuickSubcategory");
  const name = String(input?.value || "").trim();
  if (!category || !name) return;
  ensureStoreSubcategory(category, name);
  saveWorkwearState();
  pushWorkwearAudit("subcategory_added", { entityType: "subcategory", entityId: `${category}:${name}` });
  wizard.subcategory = name;
  workwearProductWizardSeed = wizard;
  if (input) input.value = "";
  renderWorkwearModule();
}

function workwearPreviewProductLink() {
  if (!canManageWorkwearModule()) return Promise.resolve(false);
  const input = document.getElementById("workwearProductLinkInput");
  const url = String(input?.value || "").trim();
  if (!url) {
    showToast("Zalijepi link proizvoda.", "error");
    return Promise.resolve(false);
  }
  workwearProductLinkPreviewState = {
    loading: true,
    error: "",
    data: null,
    url,
  };
  renderWorkwearModule();
  return workwearApiPreviewProductLink(url)
    .then((preview) => {
      workwearProductLinkPreviewState = {
        loading: false,
        error: "",
        data: preview || null,
        url,
      };
      pushWorkwearAudit("product_link_preview_loaded", {
        entityType: "product_link",
        entityId: url,
        metadata: {
          hasName: Boolean(preview?.name),
          hasImage: Array.isArray(preview?.imageUrls) && preview.imageUrls.length > 0,
          hasPrice: Boolean(preview?.price),
        },
      });
      renderWorkwearModule();
      showToast("Preview je ucitan. Provjeri i primijeni ako izgleda dobro.", "success");
      return preview;
    })
    .catch((error) => {
      workwearProductLinkPreviewState = {
        loading: false,
        error: "Nismo mogli procitati ovaj link. Mozes nastaviti rucno.",
        data: null,
        url,
      };
      pushWorkwearAudit("product_link_preview_failed", {
        entityType: "product_link",
        entityId: url,
        metadata: { error: error?.message || "STORE_LINK_PREVIEW_FAILED" },
      });
      renderWorkwearModule();
      showToast("Link preview nije uspio.", "error");
      return null;
    });
}

function workwearApplyProductLinkPreview() {
  if (!canManageWorkwearModule()) return;
  const preview = workwearProductLinkPreviewState?.data;
  if (!preview) return;
  const wizard = workwearReadWizardFormState();
  const previewImageUrls = Array.isArray(preview.imageUrls)
    ? preview.imageUrls.map((url) => String(url || "").trim()).filter(Boolean)
    : [];
  const currentImageUrls = workwearCollectWizardImages(wizard);
  const mergedImageUrls = Array.from(new Set([...previewImageUrls, ...currentImageUrls]));
  wizard.name = preview.name || wizard.name;
  wizard.description = preview.description || wizard.description;
  if (mergedImageUrls.length) workwearApplyWizardImages(wizard, mergedImageUrls);
  if (Number(preview.price) > 0) {
    wizard.price = Number(preview.price);
    if (!Number(wizard.creditCost || 0)) wizard.creditCost = Number(preview.price);
    wizard.supplierPrice = Number(preview.price);
  }
  wizard.supplierLink = preview.sourceUrl || workwearProductLinkPreviewState.url || wizard.supplierLink;
  wizard.supplierId = preview.host || wizard.supplierId || "link-preview";
  if (preview.sku && !wizard.supplierProductId) wizard.supplierProductId = preview.sku;
  if (preview.brand && !wizard.brand) wizard.brand = preview.brand;
  workwearProductWizardSeed = wizard;
  pushWorkwearAudit("product_link_preview_applied", {
    entityType: "product_link",
    entityId: wizard.supplierLink || "",
    metadata: { productName: wizard.name || "" },
  });
  renderWorkwearModule();
  showToast("Preview je primijenjen. Jos ga mozes urediti prije spremanja.", "success");
}

function workwearRemoveProductLinkPreviewImage(index) {
  if (!canManageWorkwearModule()) return;
  const preview = workwearProductLinkPreviewState?.data;
  if (!preview || !Array.isArray(preview.imageUrls)) return;
  const removeIndex = Number(index);
  if (!Number.isInteger(removeIndex) || removeIndex < 0) return;
  preview.imageUrls = preview.imageUrls.filter((_, currentIndex) => currentIndex !== removeIndex);
  workwearProductLinkPreviewState = {
    ...(workwearProductLinkPreviewState || {}),
    data: { ...preview },
  };
  renderWorkwearModule();
}

function workwearRemoveWizardImage(index) {
  if (!canManageWorkwearModule()) return;
  const wizard = workwearReadWizardFormState();
  const removeIndex = Number(index);
  if (!Number.isInteger(removeIndex) || removeIndex < 0) return;
  const images = workwearCollectWizardImages(wizard).filter((_, currentIndex) => currentIndex !== removeIndex);
  workwearProductWizardSeed = workwearApplyWizardImages(wizard, images);
  renderWorkwearModule();
}

function workwearClearProductLinkPreview() {
  workwearProductLinkPreviewState = {
    loading: false,
    error: "",
    data: null,
    url: "",
  };
  renderWorkwearModule();
}

function workwearAddCategory() {
  if (!canManageWorkwearModule()) return;
  const input = document.getElementById("workwearNewCategoryName");
  const name = String(input?.value || "").trim();
  if (!name) return;
  ensureStoreCategory(name);
  saveWorkwearState();
  pushWorkwearAudit("category_added", { entityType: "category", entityId: name });
  if (input) input.value = "";
  renderWorkwearCategoriesPanel();
  renderWorkwearAdminPanel();
}

function workwearRenameCategory(currentName) {
  if (!canManageWorkwearModule()) return;
  const currentKey = String(currentName || "").trim();
  if (!currentKey) return;
  const input = document.getElementById(`workwearRenameCategory_${sanitizeSiteId(currentKey)}`);
  const nextKey = String(input?.value || "").trim();
  if (!nextKey || nextKey === currentKey) return;
  const catalog = getStoreCategoryCatalogState();
  if (catalog[nextKey]) {
    showToast("Kategorija vec postoji.", "error");
    return;
  }
  const entry = catalog[currentKey];
  if (!entry) return;
  catalog[nextKey] = entry;
  delete catalog[currentKey];
  const state = getWorkwearState();
  state.products = (state.products || []).map((rawProduct) => {
    const product = normalizeStoreProduct(rawProduct);
    if (String(product.category || "").trim() === currentKey) product.category = nextKey;
    return product;
  });
  saveWorkwearState();
  pushWorkwearAudit("category_renamed", { entityType: "category", entityId: currentKey, metadata: { nextKey } });
  renderWorkwearModule();
}

function workwearArchiveCategory(categoryName) {
  if (!canManageWorkwearModule()) return;
  const key = String(categoryName || "").trim();
  if (!key) return;
  const used = isStoreCategoryInUse(key);
  showConfirm(
    used
      ? `Kategorija "${key}" se koristi na artiklima i bit ce arhivirana.`
      : `Kategorija "${key}" ce biti obrisana.`,
    "Potvrda",
    "⚠️",
    () => {
      const catalog = getStoreCategoryCatalogState();
      if (!catalog[key]) return;
      if (used) {
        catalog[key].active = false;
      } else {
        delete catalog[key];
      }
      saveWorkwearState();
      pushWorkwearAudit(used ? "category_archived" : "category_deleted", { entityType: "category", entityId: key });
      renderWorkwearModule();
    },
  );
}

function workwearAddSubcategory(categoryName) {
  if (!canManageWorkwearModule()) return;
  const category = String(categoryName || "").trim();
  const input = document.getElementById(`workwearAddSubcategory_${sanitizeSiteId(category)}`);
  const name = String(input?.value || "").trim();
  if (!category || !name) return;
  ensureStoreSubcategory(category, name);
  saveWorkwearState();
  pushWorkwearAudit("subcategory_added", { entityType: "subcategory", entityId: `${category}:${name}` });
  if (input) input.value = "";
  renderWorkwearCategoriesPanel();
  renderWorkwearAdminPanel();
}

function workwearRenameSubcategory(categoryName, subcategoryName) {
  if (!canManageWorkwearModule()) return;
  const category = String(categoryName || "").trim();
  const currentSub = String(subcategoryName || "").trim();
  if (!category || !currentSub) return;
  const nextSub = window.prompt("Novi naziv podkategorije:", currentSub);
  const nextKey = String(nextSub || "").trim();
  if (!nextKey || nextKey === currentSub) return;
  const catalog = getStoreCategoryCatalogState();
  const entry = catalog[category];
  if (!entry || !entry.subcategories || !entry.subcategories[currentSub]) return;
  if (entry.subcategories[nextKey]) {
    showToast("Podkategorija vec postoji.", "error");
    return;
  }
  entry.subcategories[nextKey] = entry.subcategories[currentSub];
  delete entry.subcategories[currentSub];
  const state = getWorkwearState();
  state.products = (state.products || []).map((rawProduct) => {
    const product = normalizeStoreProduct(rawProduct);
    if (String(product.category || "").trim() === category && String(product.subcategory || "").trim() === currentSub) {
      product.subcategory = nextKey;
    }
    return product;
  });
  saveWorkwearState();
  pushWorkwearAudit("subcategory_renamed", { entityType: "subcategory", entityId: `${category}:${currentSub}`, metadata: { nextKey } });
  renderWorkwearModule();
}

function workwearArchiveSubcategory(categoryName, subcategoryName) {
  if (!canManageWorkwearModule()) return;
  const category = String(categoryName || "").trim();
  const subcategory = String(subcategoryName || "").trim();
  if (!category || !subcategory) return;
  const used = isStoreSubcategoryInUse(category, subcategory);
  showConfirm(
    used
      ? `Podkategorija "${subcategory}" se koristi i bit ce arhivirana.`
      : `Podkategorija "${subcategory}" ce biti obrisana.`,
    "Potvrda",
    "⚠️",
    () => {
      const catalog = getStoreCategoryCatalogState();
      const categoryEntry = catalog[category];
      if (!categoryEntry || !categoryEntry.subcategories || !categoryEntry.subcategories[subcategory]) return;
      if (used) {
        categoryEntry.subcategories[subcategory].active = false;
      } else {
        delete categoryEntry.subcategories[subcategory];
      }
      saveWorkwearState();
      pushWorkwearAudit(used ? "subcategory_archived" : "subcategory_deleted", { entityType: "subcategory", entityId: `${category}:${subcategory}` });
      renderWorkwearModule();
    },
  );
}

function workwearUpdateWizardSizePreset(el) {
  const nextPreset = String(el?.value || "").trim();
  if (!nextPreset) return;
  const previousWizard = getWorkwearWizardState();
  const previousPresetSizes = getWorkwearSizePreset(previousWizard.sizePreset);
  const selectedSizes = Array.isArray(previousWizard.sizes) ? previousWizard.sizes.slice() : [];
  const selectedOnlyFromPreviousPreset = selectedSizes.length > 0 && selectedSizes.every((size) => previousPresetSizes.includes(size));
  const wizard = workwearReadWizardFormState();
  wizard.sizePreset = nextPreset;
  if (selectedOnlyFromPreviousPreset) {
    wizard.sizes = [];
  }
  workwearProductWizardSeed = wizard;
  renderWorkwearModule();
}

function workwearSaveWizardSizePreset() {
  if (!canManageWorkwearModule()) return;
  const nameInput = document.getElementById("workwearWizardCustomPresetName");
  const sizesInput = document.getElementById("workwearWizardCustomPresetSizes");
  const label = String(nameInput?.value || "").trim();
  const wizard = workwearReadWizardFormState();
  const typedSizes = typeof normalizeStoreSizePresetSizes === "function"
    ? normalizeStoreSizePresetSizes(sizesInput?.value || "")
    : splitCsv(sizesInput?.value || "");
  const fallbackSizes = Array.isArray(wizard.sizes) ? wizard.sizes.slice() : [];
  const sizes = typedSizes.length ? typedSizes : fallbackSizes;
  if (!label) {
    showToast("Upisi naziv preseta.", "error");
    return;
  }
  if (!sizes.length) {
    showToast("Dodaj barem jednu velicinu u preset.", "error");
    return;
  }
  const key = typeof ensureStoreSizePreset === "function" ? ensureStoreSizePreset(label, sizes) : "";
  if (!key) {
    showToast("Preset nije spremljen.", "error");
    return;
  }
  saveWorkwearState();
  pushWorkwearAudit("size_preset_saved", {
    entityType: "size_preset",
    entityId: key,
    metadata: { label, sizes },
  });
  wizard.sizePreset = key;
  wizard.sizes = Array.from(new Set([...(wizard.sizes || []), ...sizes]));
  workwearProductWizardSeed = wizard;
  if (nameInput) nameInput.value = "";
  if (sizesInput) sizesInput.value = "";
  renderWorkwearModule();
  showToast("Preset velicina je spremljen.", "success");
}

function workwearAddManagerSizePreset() {
  if (!canManageWorkwearModule()) return;
  const nameInput = document.getElementById("workwearManagerSizePresetName");
  const sizesInput = document.getElementById("workwearManagerSizePresetSizes");
  const label = String(nameInput?.value || "").trim();
  const sizes = typeof normalizeStoreSizePresetSizes === "function"
    ? normalizeStoreSizePresetSizes(sizesInput?.value || "")
    : splitCsv(sizesInput?.value || "");
  if (!label || !sizes.length) {
    showToast("Naziv preseta i velicine su obavezni.", "error");
    return;
  }
  const key = ensureStoreSizePreset(label, sizes);
  saveWorkwearState();
  pushWorkwearAudit("size_preset_saved", { entityType: "size_preset", entityId: key, metadata: { label, sizes, source: "manager_tab" } });
  renderWorkwearCategoriesPanel();
  renderWorkwearAdminPanel();
  showToast("Preset velicina je dodan.", "success");
}

function workwearUpdateManagerSizePreset(presetKey) {
  if (!canManageWorkwearModule()) return;
  const key = String(presetKey || "").trim();
  if (!key) return;
  const safeId = sanitizeSiteId(key);
  const name = String(document.getElementById(`workwearManagerSizePresetName_${safeId}`)?.value || "").trim();
  const sizes = typeof normalizeStoreSizePresetSizes === "function"
    ? normalizeStoreSizePresetSizes(document.getElementById(`workwearManagerSizePresetSizes_${safeId}`)?.value || "")
    : splitCsv(document.getElementById(`workwearManagerSizePresetSizes_${safeId}`)?.value || "");
  if (!name || !sizes.length) {
    showToast("Preset mora imati naziv i barem jednu velicinu.", "error");
    return;
  }
  const nextKey = updateStoreSizePreset(key, name, sizes);
  saveWorkwearState();
  pushWorkwearAudit("size_preset_updated", { entityType: "size_preset", entityId: nextKey || key, metadata: { previousKey: key, label: name, sizes } });
  renderWorkwearCategoriesPanel();
  renderWorkwearAdminPanel();
  showToast("Preset velicina je spremljen.", "success");
}

function workwearArchiveManagerSizePreset(presetKey) {
  if (!canManageWorkwearModule()) return;
  const key = String(presetKey || "").trim();
  if (!key) return;
  const preset = typeof getStoreSizePresetByKey === "function" ? getStoreSizePresetByKey(key) : null;
  showConfirm(
    preset?.system
      ? `Sistemski preset "${preset.label || key}" ce biti sakriven iz dropdowna. Mozes ga kasnije aktivirati.`
      : `Custom preset "${preset?.label || key}" ce biti obrisan.`,
    "Potvrda",
    "⚠️",
    () => {
      const result = archiveStoreSizePreset(key);
      saveWorkwearState();
      pushWorkwearAudit(result === "archived" ? "size_preset_archived" : "size_preset_deleted", {
        entityType: "size_preset",
        entityId: key,
        metadata: { label: preset?.label || key },
      });
      const wizard = getWorkwearWizardState();
      if (wizard.sizePreset === key) {
        const options = getWorkwearSizePresetOptions();
        wizard.sizePreset = options[0]?.key || "odjeca";
        workwearProductWizardSeed = wizard;
      }
      renderWorkwearModule();
      showToast(result === "archived" ? "Preset je arhiviran." : "Preset je obrisan.", "success");
    },
  );
}

function workwearRestoreManagerSizePreset(presetKey) {
  if (!canManageWorkwearModule()) return;
  const key = restoreStoreSizePreset(presetKey);
  if (!key) return;
  saveWorkwearState();
  pushWorkwearAudit("size_preset_restored", { entityType: "size_preset", entityId: key });
  renderWorkwearModule();
  showToast("Preset je aktiviran.", "success");
}

function workwearToggleWizardSize(size, el) {
  const wizard = workwearReadWizardFormState();
  const value = String(size || "").trim();
  if (!value) return;
  if (el?.checked) {
    if (!wizard.sizes.includes(value)) wizard.sizes.push(value);
  } else {
    wizard.sizes = wizard.sizes.filter((item) => item !== value);
  }
  workwearProductWizardSeed = wizard;
  renderWorkwearModule();
}

function workwearAddWizardCustomSize() {
  const input = document.getElementById("workwearWizardCustomSize");
  const value = String(input?.value || "").trim();
  if (!value) return;
  const wizard = workwearReadWizardFormState();
  if (!wizard.sizes.includes(value)) wizard.sizes.push(value);
  workwearProductWizardSeed = wizard;
  if (input) input.value = "";
  renderWorkwearModule();
}

function workwearRemoveWizardSize(size) {
  const wizard = workwearReadWizardFormState();
  wizard.sizes = (wizard.sizes || []).filter((entry) => entry !== size);
  workwearProductWizardSeed = wizard;
  renderWorkwearModule();
}

function workwearAddWizardVariant() {
  const wizard = workwearReadWizardFormState();
  const name = String(document.getElementById("workwearWizardVariantName")?.value || "").trim();
  if (!name) {
    showToast("Naziv varijante je obavezan.", "error");
    return;
  }
  const image = String(document.getElementById("workwearWizardVariantImage")?.value || "").trim();
  const priceOverrideRaw = document.getElementById("workwearWizardVariantPriceOverride")?.value;
  const creditOverrideRaw = document.getElementById("workwearWizardVariantCreditOverride")?.value;
  const supplierProductId = String(document.getElementById("workwearWizardVariantSupplierProductId")?.value || "").trim();
  const variant = normalizeStoreProductVariant({
    id: `variant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    image,
    imageUrl: image,
    active: true,
    priceOverride: priceOverrideRaw === "" ? null : Number(priceOverrideRaw),
    creditCostOverride: creditOverrideRaw === "" ? null : Number(creditOverrideRaw),
    supplierProductId,
  });
  wizard.variants = Array.isArray(wizard.variants) ? wizard.variants : [];
  wizard.variants.push(variant);
  workwearProductWizardSeed = wizard;
  pushWorkwearAudit("variant_added", {
    entityType: "product_variant",
    metadata: { variantName: variant.name, variantId: variant.id },
  });
  ["workwearWizardVariantName", "workwearWizardVariantImage", "workwearWizardVariantPriceOverride", "workwearWizardVariantCreditOverride", "workwearWizardVariantSupplierProductId"]
    .forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  renderWorkwearModule();
}

function workwearUpdateWizardVariantField(index, field, el) {
  const wizard = workwearReadWizardFormState();
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0) return;
  wizard.variants = Array.isArray(wizard.variants) ? wizard.variants : [];
  const current = wizard.variants[idx];
  if (!current) return;
  const next = { ...current };
  if (field === "active") next.active = el?.checked === true;
  else if (field === "priceOverride" || field === "creditCostOverride") {
    const raw = String(el?.value || "").trim();
    next[field] = raw === "" ? null : Number(raw);
  } else if (field === "image") {
    const value = String(el?.value || "").trim();
    next.image = value;
    next.imageUrl = value;
  } else {
    next[field] = String(el?.value || "").trim();
  }
  wizard.variants[idx] = normalizeStoreProductVariant(next, idx);
  workwearProductWizardSeed = wizard;
  pushWorkwearAudit("variant_edited", {
    entityType: "product_variant",
    metadata: { variantId: wizard.variants[idx].id, field },
  });
}

function workwearRemoveWizardVariant(index) {
  const wizard = workwearReadWizardFormState();
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0) return;
  const removed = (wizard.variants || [])[idx];
  wizard.variants = (wizard.variants || []).filter((_variant, currentIndex) => currentIndex !== idx);
  workwearProductWizardSeed = wizard;
  if (removed) {
    pushWorkwearAudit("variant_removed", {
      entityType: "product_variant",
      metadata: { variantId: removed.id, variantName: removed.name },
    });
  }
  renderWorkwearModule();
}

function workwearToggleWizardSite(site, el) {
  const wizard = workwearReadWizardFormState();
  const key = String(site || "").trim();
  if (!key) return;
  const next = new Set(wizard.availableSites || []);
  if (el?.checked) next.add(key);
  else next.delete(key);
  wizard.availableSites = Array.from(next);
  workwearProductWizardSeed = wizard;
}

function workwearToggleWizardRole(roleKey, el) {
  const wizard = workwearReadWizardFormState();
  const role = normalizeStoreRoleKey(roleKey);
  if (!role) return;
  const next = new Set(wizard.visibleToRoles || []);
  if (el?.checked) next.add(role);
  else next.delete(role);
  wizard.visibleToRoles = Array.from(next);
  workwearProductWizardSeed = wizard;
}

function workwearToggleWizardApprovalRole(roleKey, el) {
  const wizard = workwearReadWizardFormState();
  const role = normalizeStoreRoleKey(roleKey);
  if (!role) return;
  const next = new Set(wizard.approvalRoles || []);
  if (el?.checked) next.add(role);
  else next.delete(role);
  wizard.approvalRoles = Array.from(next);
  workwearProductWizardSeed = wizard;
}

function workwearToggleWizardAllSites(el) {
  const wizard = workwearReadWizardFormState();
  wizard.allSites = el?.checked === true;
  if (wizard.allSites) wizard.availableSites = [];
  workwearProductWizardSeed = wizard;
  renderWorkwearModule();
}

function workwearToggleWizardAllRoles(el) {
  const wizard = workwearReadWizardFormState();
  wizard.allRoles = el?.checked === true;
  if (wizard.allRoles) wizard.visibleToRoles = [];
  workwearProductWizardSeed = wizard;
  renderWorkwearModule();
}

function workwearRefreshWizardFlags() {
  workwearReadWizardFormState();
  renderWorkwearModule();
}

function workwearUploadWizardImage(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const wizard = workwearReadWizardFormState();
    wizard.imagePrimary = String(reader.result || "");
    workwearProductWizardSeed = wizard;
    renderWorkwearModule();
  };
  reader.readAsDataURL(file);
}

function workwearToggleBulkSite(site, el) {
  const key = String(site || "").trim();
  if (!key) return;
  workwearBulkAllSites = false;
  const next = new Set(workwearSelectedBulkSites || []);
  if (el?.checked) next.add(key);
  else next.delete(key);
  workwearSelectedBulkSites = Array.from(next);
}

function workwearToggleBulkRole(roleKey, el) {
  const role = normalizeStoreRoleKey(roleKey);
  if (!role) return;
  workwearBulkAllRoles = false;
  const next = new Set(workwearSelectedBulkRoles || []);
  if (el?.checked) next.add(role);
  else next.delete(role);
  workwearSelectedBulkRoles = Array.from(next);
}

function workwearToggleBulkAllSites(el) {
  workwearBulkAllSites = el?.checked === true;
  if (workwearBulkAllSites) {
    workwearSelectedBulkSites = getWorkwearManagerSites().slice();
  }
  renderWorkwearBulkEditPanel();
}

function workwearToggleBulkAllRoles(el) {
  workwearBulkAllRoles = el?.checked === true;
  if (workwearBulkAllRoles) {
    workwearSelectedBulkRoles = getWorkwearStoreRoles().map((role) => role.key);
  }
  renderWorkwearBulkEditPanel();
}

function workwearSaveProduct() {
  if (!canManageWorkwearModule()) return;
  const wizard = workwearReadWizardFormState();
  wizard.allSites = document.getElementById("workwearWizardAllSites")?.checked === true;
  wizard.allRoles = document.getElementById("workwearWizardAllRoles")?.checked === true;
  const name = String(wizard.name || "").trim();
  if (!name) {
    showToast("Name required", "error");
    return;
  }
  if (!wizard.sizes.length) {
    showToast("Odaberi barem jednu velicinu.", "error");
    return;
  }
  const category = wizard.category || "Odjeca";
  ensureStoreCategory(category);
  if (wizard.subcategory) ensureStoreSubcategory(category, wizard.subcategory);
  const periodCycleDays = wizard.periodLimitCycle === "1m"
    ? 30
    : wizard.periodLimitCycle === "3m"
      ? 90
      : wizard.periodLimitCycle === "6m"
        ? 180
        : wizard.periodLimitCycle === "12m"
          ? 365
          : Math.max(1, Number(wizard.periodLimitDays || 180));
  const product = normalizeStoreProduct({
    id: workwearEditingProductId || wizard.id || `STP-${Date.now().toString().slice(-8)}`,
    name,
    description: wizard.description || "",
    category,
    subcategory: wizard.subcategory || "",
    images: wizard.imagePrimary ? [wizard.imagePrimary] : [],
    imageUrls: splitCsv(wizard.imageGallery || ""),
    sizes: wizard.sizes,
    variants: (wizard.variants || [])
      .map((variant, index) => normalizeStoreProductVariant(variant, index))
      .filter((variant) => variant.name),
    active: wizard.active !== false,
    availableSites: wizard.allSites ? ["*"] : (wizard.availableSites.length ? wizard.availableSites : [currentSite]),
    visibleToRoles: wizard.allRoles ? [] : normalizeStoreRoleList(wizard.visibleToRoles || []),
    visibleToUsers: [],
    price: Number(wizard.price || 0),
    creditCost: Number(wizard.creditCost || wizard.price || 0),
    showPriceToWorker: wizard.showPriceToWorker !== false,
    usesBudget: wizard.usesBudget === true,
    budgetGroup: wizard.budgetGroup || "",
    approvalRequired: wizard.approvalRequired === true,
    approvalRoles: normalizeStoreRoleList(wizard.approvalRoles || []),
    freeRule: {
      enabled: wizard.freeRuleEnabled === true,
      mode: wizard.freeRuleMode || "firstItem",
      periodDays: Math.max(1, Number(wizard.freeRulePeriodDays || 180)),
    },
    periodLimit: {
      enabled: wizard.periodLimitEnabled === true,
      quantity: Math.max(1, Number(wizard.periodLimitQty || 1)),
      periodDays: periodCycleDays,
    },
    upgradeRule: {
      enabled: wizard.upgradeEnabled === true,
      companyCoveredAmount: Number(wizard.companyCoveredAmount || 0),
      differenceAmount: Number(wizard.differenceAmount || 0),
    },
    workerUpgradeWarning: wizard.workerUpgradeWarning !== false,
    supplierFields: {
      supplierId: wizard.supplierId || "manual",
      supplierProductId: wizard.supplierProductId || "",
      supplierLink: wizard.supplierLink || "",
      supplierPrice: Number(wizard.supplierPrice || 0),
      externalSync: wizard.externalSync === true,
      externalSyncStatus: wizard.externalSync === true ? "enabled" : "manual",
      externalLastSync: "",
    },
    badges: {
      isNew: wizard.isNew === true,
      urgentSafety: wizard.urgentSafety === true,
    },
  });

  return workwearApiSaveProduct(product).then(() => {
    pushWorkwearAudit("product_saved", {
      entityType: "product",
      entityId: product.id,
      after: { active: product.active, name: product.name, sites: product.availableSites, roles: product.visibleToRoles },
    });
    workwearEditingProductId = "";
    workwearResetProductWizard(null);
    renderWorkwearModule();
    showToast("Saved", "success");
  });
}
function workwearApplyBulkEdit() {
  if (!canManageWorkwearModule()) return;
  const state = getWorkwearState();
  const selectedIds = Object.keys(workwearBulkSelection).filter((id) => workwearBulkSelection[id] === true);
  if (!selectedIds.length) {
    showToast("Select products for bulk edit.", "error");
    return;
  }

  const category = (document.getElementById("workwearBulkCategory")?.value || "").trim();
  const subcategory = (document.getElementById("workwearBulkSubcategory")?.value || "").trim();
  const active = document.getElementById("workwearBulkActive")?.value || "";
  const free = document.getElementById("workwearBulkFree")?.value || "";
  const budget = document.getElementById("workwearBulkBudget")?.value || "";
  const approval = document.getElementById("workwearBulkApproval")?.value || "";
  const useAllSites = document.getElementById("workwearBulkAllSites")?.checked === true;
  const useAllRoles = document.getElementById("workwearBulkAllRoles")?.checked === true;
  const sites = useAllSites ? ["*"] : (workwearSelectedBulkSites || []);
  const roles = useAllRoles ? [] : normalizeStoreRoleList(workwearSelectedBulkRoles || []);

  state.products = (state.products || []).map((rawProduct) => {
    const product = normalizeStoreProduct(rawProduct);
    if (!selectedIds.includes(product.id)) return product;
    if (category) {
      ensureStoreCategory(category);
      product.category = category;
    }
    if (subcategory) {
      ensureStoreSubcategory(product.category, subcategory);
      product.subcategory = subcategory;
    }
    if (sites.length) product.availableSites = sites;
    if (!useAllRoles) product.visibleToRoles = roles;
    if (useAllRoles) product.visibleToRoles = [];
    if (active === "active") product.active = true;
    if (active === "inactive") product.active = false;
    if (free === "on") product.freeRule = { ...(product.freeRule || {}), enabled: true };
    if (free === "off") product.freeRule = { ...(product.freeRule || {}), enabled: false };
    if (budget === "on") product.usesBudget = true;
    if (budget === "off") product.usesBudget = false;
    if (approval === "on") product.approvalRequired = true;
    if (approval === "off") product.approvalRequired = false;
    product.updatedAt = new Date().toISOString();
    return product;
  });

  saveWorkwearState();
  pushWorkwearAudit("bulk_edit_applied", {
    entityType: "product",
    metadata: {
      selectedIds,
      category,
      subcategory,
      sites,
      roles,
      active,
      free,
      budget,
      approval,
    },
  });
  selectedIds.forEach((id) => { workwearBulkSelection[id] = false; });
  renderWorkwearModule();
  showToast("Bulk edit applied.", "success");
  return Promise.resolve(true);
}
function workwearAdjustBudget() {
  if (!canManageWorkwearCredits()) return;
  const workerId = String(document.getElementById("workwearBudgetWorker")?.value || "").trim().toLowerCase();
  const delta = Number(document.getElementById("workwearBudgetDelta")?.value || 0);
  const reason = (document.getElementById("workwearBudgetReason")?.value || "").trim() || "manual_adjustment";
  if (!workerId || !Number.isFinite(delta) || delta === 0) {
    showToast("Worker and delta are required.", "error");
    return;
  }

  const state = getWorkwearState();
  const profile = ensureWorkerWorkwearProfile(workerId);
  if (delta < 0 && Math.abs(delta) > Number(profile.creditBalance || 0)) {
    showToast("Budget cannot go negative.", "error");
    return;
  }

  profile.creditBalance = Number(profile.creditBalance || 0) + delta;
  state.creditLedger.push({
    id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    workerId,
    delta,
    reserve: 0,
    reason,
    orderId: "",
    date: new Date().toISOString(),
    changedBy: appState.currentUser || "system",
  });
  saveWorkwearState();

  addWorkwearNotification(
    `Vas Store budzet je promijenjen za ${delta > 0 ? "+" : ""}${workwearFormatCurrency(delta)} (${reason}).`,
    {
      title: "Store budzet promijenjen",
      targetUsers: [workerId],
      metadata: { workerId, delta, reason },
    },
  );
  pushWorkwearAudit("budget_adjusted", { entityType: "budget", entityId: workerId, metadata: { delta, reason } });
  renderWorkwearBudgetPanel();
  renderWorkwearCart();
  showToast("Budget updated.", "success");
  return Promise.resolve(true);
}

function workwearSaveGlobalRules() {
  if (!canManageWorkwearSettings()) return;
  const state = getWorkwearState();
  state.settings = {
    ...(state.settings || {}),
    budgetMode: document.getElementById("workwearSettingsBudgetMode")?.value || "global",
    budgetEnabled: document.getElementById("workwearSettingsBudgetEnabled")?.checked === true,
    freeRulesEnabled: document.getElementById("workwearSettingsFreeEnabled")?.checked === true,
    reserveOnPending: document.getElementById("workwearSettingsReserveOnPending")?.checked === true,
    creditRenewalAmount: Math.max(0, Number(document.getElementById("workwearSettingsRenewalAmount")?.value || 2500)),
    creditRenewalPeriodMonths: Math.max(1, Number(document.getElementById("workwearSettingsRenewalMonths")?.value || 6)),
  };
  saveWorkwearState();
  pushWorkwearAudit("store_rules_saved", { entityType: "settings", after: state.settings });
  showToast("Store pravila spremljena.", "success");
  return Promise.resolve(true);
}

function workwearDeriveAccountConfigFromRoles(roleKeys) {
  const roles = normalizeStoreRoleList(roleKeys || []);
  if (roles.includes("superadmin")) {
    return {
      isSuperAdmin: true,
      level: 6,
      permissions: { ...DEFAULT_PERMISSIONS },
    };
  }
  let level = 1;
  if (roles.includes("admin")) level = 5;
  else if (roles.includes("store_manager")) level = 4;
  else if (roles.some((role) => ["grupovodja", "poslovodja", "projektledare", "kontor"].includes(role))) level = 3;
  let permissions = clampPermissionsToLevel(getLevelDefaultPermissions(level), level);
  permissions.canAccessStore = true;
  permissions.canAccessWorkwear = true;
  permissions.canOpenAdminPanel = roles.includes("admin") || roles.includes("store_manager");
  permissions.canViewStoreTeamOrders = permissions.canViewStoreTeamOrders || roles.some((role) => ["grupovodja", "poslovodja", "projektledare", "kontor", "store_manager", "admin"].includes(role));
  const hasStoreManagerRole = roles.includes("store_manager");
  if (roles.includes("store_manager")) {
    permissions.canManageStore = true;
    permissions.canManageWorkwear = true;
    permissions.canManageStoreBudgets = true;
    permissions.canManageStoreRules = true;
  }
  if (roles.includes("admin")) {
    permissions.canManageAdmins = true;
    permissions.canManageSiteAccess = true;
    if (!hasStoreManagerRole) {
      permissions.canManageStore = false;
      permissions.canManageWorkwear = false;
      permissions.canManageStoreBudgets = false;
      permissions.canManageStoreRules = false;
      permissions.canManageWorkwearCredits = false;
      permissions.canManageWorkwearSettings = false;
    }
  }
  return {
    isSuperAdmin: false,
    level,
    permissions,
  };
}

function canManageStoreUserAccounts() {
  return canManageWorkwearModule() || (typeof canManageAdminsByLevel === "function" && canManageAdminsByLevel());
}

function workwearSaveStoreUser() {
  if (!canManageStoreUserAccounts()) return;
  const name = String(document.getElementById("workwearUserName")?.value || "").trim();
  const email = String(document.getElementById("workwearUserEmail")?.value || "").trim().toLowerCase();
  const password = String(document.getElementById("workwearUserPassword")?.value || "");
  const active = document.getElementById("workwearUserActive")?.checked === true;
  if (!name || !email || !email.includes("@")) {
    showToast("Ime i validan email su obavezni.", "error");
    return;
  }
  const roleKeys = normalizeStoreRoleList(
    Array.from(document.querySelectorAll("#workwearUsersPanel input[data-cmax-role-checkbox]:checked")).map((el) => el.value),
  );
  if (!roleKeys.length) {
    showToast("Odaberi barem jednu funkciju/level.", "error");
    return;
  }
  const selectedSites = Array.from(document.querySelectorAll("#workwearUsersPanel input[data-cmax-site-checkbox]:checked")).map((el) => String(el.value || "").trim());
  if (!selectedSites.length) {
    showToast("Odaberi barem jedno gradiliste.", "error");
    return;
  }
  const users = getAdmins();
  const existingIndex = users.findIndex((user) => user.email === email);
  if (existingIndex < 0 && password.length < STORE_USER_MANAGER_PASSWORD_MIN) {
    showToast(`Lozinka mora imati barem ${STORE_USER_MANAGER_PASSWORD_MIN} znakova.`, "error");
    return;
  }
  const account = workwearDeriveAccountConfigFromRoles(roleKeys);
  const parts = name.split(" ").filter(Boolean);
  const firstName = parts.shift() || name;
  const lastName = parts.join(" ");
  const nextUser = {
    firstName,
    lastName,
    fullName: name,
    email,
    isSuperAdmin: account.isSuperAdmin,
    level: account.level,
    permissions: normalizePermissions(account.permissions),
    allowedSites: selectedSites.length === (sites || []).length ? null : selectedSites,
    storeRoles: roleKeys,
    active,
    isReadonly: active ? false : true,
  };
  if (password) nextUser.password = password;

  if (existingIndex >= 0) users[existingIndex] = { ...users[existingIndex], ...nextUser };
  else users.push(nextUser);
  localStorage.setItem(ADMINS_KEY, JSON.stringify(users));
  pushWorkwearAudit(existingIndex >= 0 ? "store_user_updated" : "store_user_created", {
    entityType: "user",
    entityId: email,
    metadata: { roles: roleKeys, active },
  });
  workwearEditingStoreUserEmail = "";
  return syncModuleState("adminUsers", {
    admins: users,
  })
    .catch(() => {})
    .finally(() => {
      renderWorkwearUsersPanel();
      showToast(existingIndex >= 0 ? "Korisnik azuriran." : "Korisnik kreiran.", "success");
    });
}

function workwearEditStoreUser(email) {
  workwearEditingStoreUserEmail = String(email || "").trim().toLowerCase();
  renderWorkwearUsersPanel();
}

function workwearCancelStoreUserEdit() {
  workwearEditingStoreUserEmail = "";
  renderWorkwearUsersPanel();
}

function workwearRequestPasswordReset(email) {
  if (!canManageStoreUserAccounts()) return;
  const target = String(email || "").trim().toLowerCase();
  if (!target) return;
  const state = getWorkwearState();
  state.passwordResetRequests = Array.isArray(state.passwordResetRequests) ? state.passwordResetRequests : [];
  state.passwordResetRequests.push({
    id: `reset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userEmail: target,
    status: "pending",
    requestedAt: new Date().toISOString(),
    requestedBy: String(appState.currentUser || "").trim().toLowerCase(),
  });
  saveWorkwearState();
  pushWorkwearAudit("password_reset_requested", { entityType: "user", entityId: target });
  addWorkwearNotification(`Za korisnika ${target} kreiran je zahtjev za reset lozinke.`, {
    title: "Password reset zahtjev",
    targetRoles: ["superadmin"],
    metadata: { userEmail: target, requestType: "password_reset" },
  });
  renderWorkwearUsersPanel();
  showToast("Reset zahtjev poslan Superadminu.", "success");
}

function workwearGenerateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  let password = "";
  for (let i = 0; i < STORE_PASSWORD_RESET_MIN_PASSWORD; i += 1) {
    password += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return password;
}

function workwearApprovePasswordReset(requestId) {
  if (!appState.isSuperAdmin) return;
  const state = getWorkwearState();
  const requests = Array.isArray(state.passwordResetRequests) ? state.passwordResetRequests : [];
  const request = requests.find((entry) => entry.id === requestId);
  if (!request || request.status !== "pending") return;

  const tempPassword = workwearGenerateTemporaryPassword();
  const users = getAdmins();
  const targetIndex = users.findIndex((entry) => entry.email === request.userEmail);
  if (targetIndex < 0) {
    showToast("Korisnik ne postoji.", "error");
    return;
  }
  users[targetIndex].password = tempPassword;
  localStorage.setItem(ADMINS_KEY, JSON.stringify(users));
  request.status = "approved";
  request.approvedAt = new Date().toISOString();
  request.approvedBy = String(appState.currentUser || "").trim().toLowerCase();
  request.generatedPassword = tempPassword;
  saveWorkwearState();
  pushWorkwearAudit("password_reset_approved", {
    entityType: "user",
    entityId: request.userEmail,
    metadata: { requestId: request.id },
  });
  addWorkwearNotification(`Superadmin je odobrio reset lozinke za ${request.userEmail}.`, {
    title: "Password reset odobren",
    targetUsers: [request.userEmail],
    metadata: { requestId: request.id, status: "approved" },
  });
  return syncModuleState("adminUsers", {
    admins: users,
  })
    .catch(() => {})
    .finally(() => {
      renderWorkwearUsersPanel();
      showToast(`Reset odobren. Nova lozinka: ${tempPassword}`, "success");
    });
}

function workwearRejectPasswordReset(requestId) {
  if (!appState.isSuperAdmin) return;
  const state = getWorkwearState();
  const requests = Array.isArray(state.passwordResetRequests) ? state.passwordResetRequests : [];
  const request = requests.find((entry) => entry.id === requestId);
  if (!request || request.status !== "pending") return;
  request.status = "rejected";
  request.rejectedAt = new Date().toISOString();
  request.rejectedBy = String(appState.currentUser || "").trim().toLowerCase();
  saveWorkwearState();
  pushWorkwearAudit("password_reset_rejected", { entityType: "user", entityId: request.userEmail, metadata: { requestId: request.id } });
  addWorkwearNotification(`Reset lozinke za ${request.userEmail} je odbijen.`, {
    title: "Password reset odbijen",
    targetUsers: [request.userEmail],
    metadata: { requestId: request.id, status: "rejected" },
  });
  renderWorkwearUsersPanel();
  return Promise.resolve(true);
}

function workwearApplyFilters() {
  workwearProductPage = 1;
  renderWorkwearProducts();
}

function workwearSaveSizes() {
  const profile = getCurrentWorkerWorkwearProfile();
  ["Tshirt", "Hoodie", "Jacket", "Pants", "Shoes", "Gloves", "Helmet"].forEach((key) => {
    const input = document.getElementById(`workwearSize${key}`);
    if (input) {
      profile.savedSizes[key.toLowerCase()] = input.value.trim();
    }
  });
  saveWorkwearState();
  pushWorkwearAudit("sizes_saved", { entityType: "profile", entityId: String(appState.currentUser || "guest") });
  showToast("Saved", "success");
}

function buildStoreExportPayload(options = {}) {
  const state = getWorkwearState();
  const { siteScope = "all", site = "", orderScope = "pending-approved", untilDate = "", format = "csv" } = options;
  const targetSite = siteScope === "single" ? site : "all";
  const untilTs = untilDate ? new Date(untilDate).getTime() : Infinity;
  const rows = (state.orders || [])
    .filter((order) => (targetSite === "all" ? true : order.site === targetSite))
    .filter((order) => {
      if (orderScope === "pending-approved") return ["Pending", "Approved"].includes(order.status);
      return true;
    })
    .filter((order) => new Date(order.createdAt || 0).getTime() <= untilTs)
    .flatMap((order) => (order.items || []).map((item) => ({
      orderId: order.id,
      worker: order.workerName || order.worker || order.workerId,
      site: order.site,
      status: order.status,
      product: item.productName || item.productId,
      variant: item.variantName || "",
      size: item.size || "",
      quantity: Number(item.quantity) || 1,
      comment: order.workerComment || "",
      budgetImpact: item.lineCost || 0,
      date: new Date(order.createdAt || Date.now()).toLocaleString(getCurrentLocale()),
    })));

  return {
    exportedAt: new Date().toISOString(),
    format,
    siteScope,
    site: targetSite,
    orderScope,
    untilDate,
    rows,
  };
}

function storeExportFileName(payload, extension) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const siteKey = payload.siteScope === "single" ? sanitizeSiteId(payload.site || "site") : "all-sites";
  const statusKey = payload.orderScope === "pending-approved" ? "pending-approved" : "all-statuses";
  const untilKey = payload.untilDate ? payload.untilDate : "all-dates";
  return `store-orders-${siteKey}-${statusKey}-${untilKey}-${dateKey}.${extension}`;
}

function escapeStoreCsv(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function downloadStoreCsv(payload) {
  const headers = ["Worker", "Site", "Date", "Product", "Variant", "Size", "Quantity", "Status", "Comment", "Budget impact"];
  const lines = [
    headers.join(","),
    ...payload.rows.map((row) => ([
      row.worker,
      row.site,
      row.date,
      row.product,
      row.variant,
      row.size,
      row.quantity,
      row.status,
      row.comment,
      row.budgetImpact,
    ].map(escapeStoreCsv).join(","))),
  ];
  const csv = `\uFEFF${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = storeExportFileName(payload, "csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadStorePdf(payload) {
  const jsPdfLib = window.jspdf?.jsPDF;
  if (!jsPdfLib || typeof jsPdfLib !== "function") {
    showToast("PDF export nije dostupan.", "error");
    return;
  }
  const doc = new jsPdfLib({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(15);
  doc.text("Store Orders Export", 14, 14);
  doc.setFontSize(9);
  doc.text(`Exported: ${new Date(payload.exportedAt || Date.now()).toLocaleString(getCurrentLocale())}`, 14, 20);
  doc.text(`Site: ${payload.siteScope === "single" ? payload.site : "All sites"} | Status: ${payload.orderScope} | Until: ${payload.untilDate || "All dates"}`, 14, 25);
  const tableRows = payload.rows.map((row) => [
    row.worker,
    row.site,
    row.date,
    row.product,
    row.variant,
    row.size,
    String(row.quantity),
    row.status,
    row.comment,
    workwearFormatCurrency(row.budgetImpact || 0),
  ]);
  doc.autoTable({
    startY: 30,
    head: [["Worker", "Site", "Date", "Product", "Variant", "Size", "Qty", "Status", "Comment", "Budget impact"]],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [46, 76, 161], textColor: [255, 255, 255] },
    margin: { left: 10, right: 10 },
  });
  const totalBudget = payload.rows.reduce((sum, row) => sum + Number(row.budgetImpact || 0), 0);
  const endY = doc.lastAutoTable?.finalY || 34;
  doc.setFontSize(9);
  doc.text(`Rows: ${payload.rows.length} | Budget impact total: ${workwearFormatCurrency(totalBudget)}`, 14, endY + 8);
  doc.save(storeExportFileName(payload, "pdf"));
}

function workwearExportData() {
  const exportPayload = buildStoreExportPayload({
    siteScope: "single",
    site: currentSite,
    orderScope: "all",
    untilDate: "",
    format: "csv",
  });
  downloadStoreCsv(exportPayload);
  pushWorkwearAudit("store_export_generated", {
    entityType: "export",
    metadata: { format: "csv", siteScope: "single", selectedSite: currentSite, orderScope: "all", rows: exportPayload.rows.length },
  });
  showToast("Store export generated.", "success");
}

function workwearRunExportWizard() {
  const siteScope = document.getElementById("workwearExportSiteScope")?.value === "single" ? "single" : "all";
  const selectedSite = String(document.getElementById("workwearExportSite")?.value || currentSite).trim();
  const orderScope = document.getElementById("workwearExportOrderScope")?.value === "all" ? "all" : "pending-approved";
  const untilDate = String(document.getElementById("workwearExportUntilDate")?.value || "").trim();
  const format = document.getElementById("workwearExportFormat")?.value === "pdf" ? "pdf" : "csv";

  const exportPayload = buildStoreExportPayload({
    siteScope,
    site: selectedSite,
    orderScope,
    untilDate,
    format,
  });

  if (format === "pdf") downloadStorePdf(exportPayload);
  else downloadStoreCsv(exportPayload);
  pushWorkwearAudit("store_export_generated", {
    entityType: "export",
    metadata: {
      format,
      siteScope,
      selectedSite,
      orderScope,
      untilDate,
      rows: exportPayload.rows.length,
    },
  });
  showToast("Store export generated.", "success");
  return Promise.resolve(exportPayload);
}
function workwearOpenImport() {
  const input = document.getElementById("workwearImportInput");
  if (input) input.click();
}

function workwearImportDataFromEvent(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = safeParseStoredJson(String(reader.result || "{}"), null);
      if (!parsed || !parsed.workwear) throw new Error("WORKWEAR_IMPORT_INVALID");
      const imported = normalizeWorkwearState(parsed.workwear);
      workwearStateCacheBySite[currentSite] = imported;
      saveWorkwearState();
      pushWorkwearAudit("data_imported", { entityType: "state", entityId: currentSite });
      renderWorkwearModule();
      showToast("Store data imported.", "success");
    } catch (error) {
      showToast("Invalid Store import file.", "error");
    } finally {
      if (event?.target) event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function initWorkwearOverlayInteractions() {
  if (document.body?.dataset.workwearOverlayBound === "true") return;
  if (document.body) document.body.dataset.workwearOverlayBound = "true";

  document.addEventListener("click", (event) => {
    const managerOverlay = document.getElementById("workwearManagerOverlay");
    if (managerOverlay && event.target === managerOverlay) {
      workwearCloseManagerEditor();
      return;
    }
    const ordersOverlay = document.getElementById("workwearOrdersOverlay");
    if (ordersOverlay && event.target === ordersOverlay) {
      workwearCloseOrdersOverlay();
      return;
    }
    const cartOverlay = document.getElementById("workwearCartOverlay");
    if (cartOverlay && event.target === cartOverlay) {
      workwearCloseCartOverlay();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (workwearManagerEditorOpen) workwearCloseManagerEditor();
    if (workwearOrdersOverlayOpen) workwearCloseOrdersOverlay();
    if (workwearCartOverlayOpen) workwearCloseCartOverlay();
  });
}






