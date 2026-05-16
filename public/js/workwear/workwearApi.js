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
  const state = getWorkwearState();
  return Promise.resolve((state.orders || []).slice());
}

function workwearApiSaveOrder(order) {
  const state = getWorkwearState();
  const idx = state.orders.findIndex((entry) => entry.id === order.id);
  if (idx >= 0) state.orders[idx] = order;
  else state.orders.push(order);
  saveWorkwearState();
  return Promise.resolve(order);
}
