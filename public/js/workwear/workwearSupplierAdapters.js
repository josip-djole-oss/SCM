var WORKWEAR_SUPPLIER_ADAPTERS = {
  manualSupplierAdapter: {
    id: "manual",
    fetchProducts() {
      return Promise.resolve([]);
    },
    syncProduct(product) {
      return Promise.resolve({ ok: true, product });
    },
    createOrder(order) {
      return Promise.resolve({ ok: true, orderId: order.id, status: "queued_manual" });
    },
    getOrderStatus(order) {
      return Promise.resolve({ ok: true, status: order.status || "pending" });
    },
  },
  futureApiSupplierAdapter: {
    id: "future-api",
    fetchProducts() {
      return Promise.resolve([]);
    },
    syncProduct(product) {
      return Promise.resolve({ ok: false, reason: "NOT_IMPLEMENTED", productId: product?.id || "" });
    },
    createOrder(order) {
      return Promise.resolve({ ok: false, reason: "NOT_IMPLEMENTED", orderId: order?.id || "" });
    },
    getOrderStatus(order) {
      return Promise.resolve({ ok: false, reason: "NOT_IMPLEMENTED", orderId: order?.id || "" });
    },
  },
};

function getWorkwearSupplierAdapter(adapterId) {
  return WORKWEAR_SUPPLIER_ADAPTERS[adapterId] || WORKWEAR_SUPPLIER_ADAPTERS.manualSupplierAdapter;
}
