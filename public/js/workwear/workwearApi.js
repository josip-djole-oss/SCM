var workwearOrdersListAbortController = null;

function workwearApiParseResponse(response, fallbackError) {
  if (response.ok) {
    return response.json();
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

async function workwearApiSaveProduct(product) {
  const state = getWorkwearState();
  const normalized = normalizeStoreProduct(product);
  const idx = state.products.findIndex((entry) => entry.id === normalized.id);
  if (idx >= 0) state.products[idx] = normalized;
  else state.products.push(normalized);
  if (!await persistWorkwearState()) throw new Error("STORE_PRODUCT_NOT_SAVED");
  return normalized;
}

function workwearApiListOrders() {
  if (typeof BACKEND_ENABLED !== "undefined" && BACKEND_ENABLED) {
    const site = String(currentSite || "default").trim() || "default";
    const context = captureAppContext();
    if (workwearOrdersListAbortController) workwearOrdersListAbortController.abort();
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    workwearOrdersListAbortController = controller;
    return fetch(`/api/store/orders?site=${encodeURIComponent(site)}`, {
      cache: "no-store",
      signal: workwearOrdersListAbortController?.signal,
    })
      .then((res) => workwearApiParseResponse(res, "STORE_ORDERS_LOAD_FAILED"))
      .then((payload) => {
        if (!isAppContextCurrent(context)) throw new Error("STALE_APP_CONTEXT");
        if (!Array.isArray(payload.orders)) throw new Error("STORE_ORDERS_INVALID_RESPONSE");
        const state = getWorkwearState(site);
        state.orders = Array.isArray(payload?.orders) ? payload.orders : [];
        saveWorkwearState(site, { track: false });
        return (state.orders || []).slice();
      })
      .finally(() => {
        if (workwearOrdersListAbortController === controller) workwearOrdersListAbortController = null;
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
        const saved = payload?.order;
        if (!saved?.id) throw new Error("STORE_ORDER_SAVE_UNCONFIRMED");
        if (saved && payload?.budget) {
          saved.__budgetSnapshot = payload.budget;
        }
        return workwearApiUpsertOrderLocal(saved, site);
      });
  }
  return Promise.reject(new Error("STORE_BACKEND_REQUIRED"));
}

function workwearApiUpdateOrderStatus(orderId, status, extra = {}) {
  if (typeof BACKEND_ENABLED === "undefined" || !BACKEND_ENABLED) {
    return Promise.reject(new Error("STORE_BACKEND_REQUIRED"));
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
      if (!updated?.id) throw new Error("STORE_ORDER_UPDATE_UNCONFIRMED");
      if (updated && payload?.budget) {
        updated.__budgetSnapshot = payload.budget;
      }
      if (updated) workwearApiUpsertOrderLocal(updated, site);
      return updated;
    });
}

function workwearApiPreviewProductLink(url) {
  if (typeof BACKEND_ENABLED === "undefined" || !BACKEND_ENABLED) {
    return Promise.reject(new Error("STORE_LINK_PREVIEW_BACKEND_REQUIRED"));
  }
  const site = String(currentSite || "default").trim() || "default";
  return fetch("/api/store/product-link-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ site, url }),
  })
    .then((res) => workwearApiParseResponse(res, "STORE_LINK_PREVIEW_FAILED"))
    .then((payload) => payload?.preview || null);
}
