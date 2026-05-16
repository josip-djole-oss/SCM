function workwearApiParseResponse(response, fallbackError) {
  if (response.ok) {
    return response.json().catch(() => ({}));
  }
  return response.json()
    .catch(() => ({}))
    .then((payload) => {
      const error = new Error(payload?.error || fallbackError || "STORE_API_ERROR");
      error.status = response.status;
      error.payload = payload;
      throw error;
    });
}

function workwearApiUpsertOrderLocal(order, site = currentSite) {
  const state = getWorkwearState(site);
  const idx = (state.orders || []).findIndex((entry) => entry.id === order.id);
  if (idx >= 0) state.orders[idx] = order;
  else state.orders.push(order);
  saveWorkwearState(site, { track: false });
  return order;
}

function workwearApiListProducts() {
  const state = getWorkwearState();
  return Promise.resolve((state.products || []).slice());
}

function workwearApiSaveProduct(product) {
  const state = getWorkwearState();
  const normalized = normalizeStoreProduct(product);
  const idx = state.products.findIndex((entry) => entry.id === normalized.id);
  if (idx >= 0) state.products[idx] = normalized;
  else state.products.push(normalized);
  saveWorkwearState();
  return Promise.resolve(normalized);
}

function workwearApiListOrders() {
  if (typeof BACKEND_ENABLED !== "undefined" && BACKEND_ENABLED) {
    const site = String(currentSite || "default").trim() || "default";
    return fetch(`/api/store/orders?site=${encodeURIComponent(site)}`, { cache: "no-store" })
      .then((res) => workwearApiParseResponse(res, "STORE_ORDERS_LOAD_FAILED"))
      .then((payload) => {
        const state = getWorkwearState(site);
        state.orders = Array.isArray(payload?.orders) ? payload.orders : [];
        saveWorkwearState(site, { track: false });
        return (state.orders || []).slice();
      })
      .catch(() => {
        const state = getWorkwearState(site);
        return (state.orders || []).slice();
      });
  }
  const state = getWorkwearState();
  return Promise.resolve((state.orders || []).slice());
}

function workwearApiSaveOrder(order) {
  if (typeof BACKEND_ENABLED !== "undefined" && BACKEND_ENABLED) {
    const site = String(currentSite || "default").trim() || "default";
    return fetch("/api/store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site, order }),
    })
      .then((res) => workwearApiParseResponse(res, "STORE_ORDER_SAVE_FAILED"))
      .then((payload) => {
        const saved = payload?.order || order;
        if (saved && payload?.budget) {
          saved.__budgetSnapshot = payload.budget;
        }
        return workwearApiUpsertOrderLocal(saved, site);
      });
  }
  const state = getWorkwearState();
  const idx = state.orders.findIndex((entry) => entry.id === order.id);
  if (idx >= 0) state.orders[idx] = order;
  else state.orders.push(order);
  saveWorkwearState();
  return Promise.resolve(order);
}

function workwearApiUpdateOrderStatus(orderId, status, extra = {}) {
  if (typeof BACKEND_ENABLED === "undefined" || !BACKEND_ENABLED) {
    return Promise.resolve(null);
  }
  const site = String(currentSite || "default").trim() || "default";
  return fetch(`/api/store/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      site,
      status,
      internalNote: extra.internalNote || "",
      externalNote: extra.externalNote || "",
      reason: extra.reason || "",
    }),
  })
    .then((res) => workwearApiParseResponse(res, "STORE_ORDER_STATUS_UPDATE_FAILED"))
    .then((payload) => {
      const updated = payload?.order || null;
      if (updated && payload?.budget) {
        updated.__budgetSnapshot = payload.budget;
      }
      if (updated) workwearApiUpsertOrderLocal(updated, site);
      return updated;
    });
}
