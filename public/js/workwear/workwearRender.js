var workwearManagerTab = "products";
var workwearOrderFilters = {
  worker: "",
  site: "",
  status: "",
  category: "",
  product: "",
  urgent: "",
  approvalRequired: "",
};
var workwearProductWizardStep = 1;
var workwearEditingProductId = "";
var workwearProductWizardSeed = null;
var workwearSelectedBulkSites = [];
var workwearSelectedBulkRoles = [];
var workwearBulkAllSites = true;
var workwearBulkAllRoles = true;
var workwearEditingStoreUserEmail = "";
var workwearManagerEditorOpen = false;
var workwearCartOverlayOpen = false;
var workwearOrdersOverlayOpen = false;
var workwearCheckoutInFlight = false;
var workwearProductPage = 1;
var WORKWEAR_PRODUCTS_PER_PAGE = 20;
var workwearImageViewerState = {
  open: false,
  productId: "",
  images: [],
  index: 0,
  title: "",
};
var workwearOrderRenderLimit = 20;
var WORKWEAR_SIZE_PRESETS = {
  odjeca: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  obuca: ["38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"],
  rukavice: ["7", "8", "9", "10", "11", "12"],
  ppe: ["S/M", "L/XL", "Universal"],
};

function getWorkwearCategories() {
  if (typeof getStoreCategoryOptions === "function") return getStoreCategoryOptions();
  return ["Odjeæa", "Obuæa", "PPE / Zaštitna oprema", "Alati", "Ostalo"];
}

function getWorkwearSeasons() {
  return ["All season", "Winter", "Summer"];
}

function getWorkwearManagerSites() {
  return (Array.isArray(sites) ? sites : []).slice().sort((a, b) => compareNaturally(a, b));
}

function getWorkwearStoreRoles() {
  if (typeof getStoreRoleOptions === "function") return getStoreRoleOptions();
  return [
    { key: "radnik", label: "Radnik" },
    { key: "grupovodja", label: "Grupovodja" },
    { key: "poslovodja", label: "Poslovodja" },
    { key: "projektledare", label: "Projektledare" },
    { key: "kontor", label: "Kontor" },
    { key: "store_manager", label: "Store Manager" },
    { key: "admin", label: "Admin" },
    { key: "superadmin", label: "Superadmin" },
  ];
}

function workwearRoleLabel(roleKey) {
  if (typeof getStoreRoleLabel === "function") return getStoreRoleLabel(roleKey);
  const matched = getWorkwearStoreRoles().find((role) => role.key === roleKey);
  return matched ? matched.label : roleKey;
}

function workwearGetSelectedBulkProductIds() {
  return Object.keys(workwearBulkSelection || {}).filter((id) => workwearBulkSelection[id] === true);
}

function workwearCreateWizardState(product) {
  const normalized = product ? normalizeStoreProduct(product) : normalizeStoreProduct({});
  return {
    id: normalized.id || "",
    name: normalized.name || "",
    description: normalized.description || "",
    category: normalized.category || getWorkwearCategories()[0] || "Odjeca",
    subcategory: normalized.subcategory || "",
    active: normalized.active !== false,
    isNew: normalized.badges?.isNew === true || normalized.isNew === true,
    imagePrimary: (normalized.images || [])[0] || (normalized.imageUrls || [])[0] || "",
    imageGallery: (normalized.imageUrls || []).join(", "),
    sizes: Array.isArray(normalized.sizes) ? normalized.sizes.slice() : [],
    variants: Array.isArray(normalized.variants) ? normalized.variants.map((variant) => ({ ...variant })) : [],
    sizePreset: "odjeca",
    allSites: !Array.isArray(normalized.availableSites) || normalized.availableSites.includes("*"),
    availableSites: Array.isArray(normalized.availableSites) ? normalized.availableSites.filter((site) => site !== "*") : [],
    allRoles: !Array.isArray(normalized.visibleToRoles) || !normalized.visibleToRoles.length,
    visibleToRoles: Array.isArray(normalized.visibleToRoles) ? normalized.visibleToRoles.slice() : [],
    price: Number(normalized.price || 0),
    creditCost: Number(normalized.creditCost || 0),
    showPriceToWorker: normalized.showPriceToWorker !== false,
    usesBudget: normalized.usesBudget !== false,
    budgetGroup: String(normalized.budgetGroup || normalized.category || "").trim(),
    approvalRequired: normalized.approvalRequired === true,
    approvalRoles: Array.isArray(normalized.approvalRoles) ? normalized.approvalRoles.slice() : ["store_manager"],
    freeRuleEnabled: normalized.freeRule?.enabled === true,
    freeRuleMode: normalized.freeRule?.mode || "firstItem",
    freeRulePeriodDays: Number(normalized.freeRule?.periodDays || 180),
    periodLimitEnabled: normalized.periodLimit?.enabled === true,
    periodLimitCycle: normalized.periodLimit?.periodDays === 30
      ? "1m"
      : normalized.periodLimit?.periodDays === 90
        ? "3m"
        : normalized.periodLimit?.periodDays === 180
          ? "6m"
          : normalized.periodLimit?.periodDays === 365
            ? "12m"
            : "custom",
    periodLimitDays: Number(normalized.periodLimit?.periodDays || 180),
    periodLimitQty: Number(normalized.periodLimit?.quantity || 1),
    upgradeEnabled: normalized.upgradeRule?.enabled === true || normalized.enableUpgradeDifference === true,
    companyCoveredAmount: Number(normalized.upgradeRule?.companyCoveredAmount || normalized.companyCoveredAmount || 0),
    differenceAmount: Number(normalized.upgradeRule?.differenceAmount || normalized.differencePrice || 0),
    workerUpgradeWarning: normalized.workerUpgradeWarning !== false,
    urgentSafety: normalized.badges?.urgentSafety === true || normalized.urgentSafety === true,
    supplierId: String(normalized.supplierFields?.supplierId || normalized.supplierId || "manual").trim() || "manual",
    supplierProductId: String(normalized.supplierFields?.supplierProductId || "").trim(),
    supplierLink: String(normalized.supplierFields?.supplierLink || "").trim(),
    supplierPrice: Number(normalized.supplierFields?.supplierPrice || 0),
    externalSync: normalized.supplierFields?.externalSync === true || normalized.externalSync === true,
  };
}

function getWorkwearWizardState() {
  if (!workwearProductWizardSeed) {
    workwearProductWizardSeed = workwearCreateWizardState(null);
  }
  return workwearProductWizardSeed;
}

function getWorkwearSizePreset(sizePreset) {
  return WORKWEAR_SIZE_PRESETS[sizePreset] || [];
}

function workwearFormatCurrency(value) {
  const num = Number(value || 0);
  return `${num.toFixed(0)} SEK`;
}

function workwearStatusBadge(status) {
  const map = {
    Pending: "badge-pending",
    Approved: "badge-approved",
    Delivered: "badge-approved",
    Rejected: "badge-rejected",
    Cancelled: "badge-rejected",
    Draft: "badge-pending",
  };
  const cls = map[status] || "badge-pending";
  return `<span class="report-status-badge ${cls}">${escapeHtml(status || "Pending")}</span>`;
}

function renderWorkwearFilters() {
  const state = getWorkwearState();
  const categoryFilter = document.getElementById("workwearCategoryFilter");
  const seasonFilter = document.getElementById("workwearSeasonFilter");
  if (!categoryFilter || !seasonFilter) return;

  categoryFilter.innerHTML = `<option value="">${escapeHtml(t("filterAll") || "All")}</option>`;
  getWorkwearCategories().forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  seasonFilter.innerHTML = `<option value="">${escapeHtml(t("filterAll") || "All")}</option>`;
  const seasons = new Set(getWorkwearSeasons());
  (state.products || []).forEach((product) => {
    if (product?.seasonalCollection) seasons.add(product.seasonalCollection);
  });
  Array.from(seasons).forEach((season) => {
    const option = document.createElement("option");
    option.value = season;
    option.textContent = season;
    seasonFilter.appendChild(option);
  });
}

function getStoreCardBadges(product) {
  const badges = [];
  if (product?.badges?.isNew || product?.isNew) badges.push("New");
  if (product?.badges?.urgentSafety || product?.urgentSafety) badges.push("Urgent safety");
  if (product?.badges?.free || product?.freeEligible || product?.freeRule?.enabled) badges.push("Free");
  if (product?.badges?.budget || product?.usesBudget !== false) badges.push("Budget");
  if (product?.approvalRequired) badges.push("Requires approval");
  if (product?.upgradeRule?.enabled || product?.enableUpgradeDifference) badges.push("Upgrade");
  return badges;
}

function getStoreProductGalleryImages(product) {
  const images = [];
  const pushIfValid = (value) => {
    const clean = String(value || "").trim();
    if (!clean) return;
    if (!images.includes(clean)) images.push(clean);
  };
  (Array.isArray(product?.images) ? product.images : []).forEach(pushIfValid);
  (Array.isArray(product?.imageUrls) ? product.imageUrls : []).forEach(pushIfValid);
  (Array.isArray(product?.variants) ? product.variants : []).forEach((variant) => {
    pushIfValid(variant?.image);
    pushIfValid(variant?.imageUrl);
  });
  return images;
}

function renderWorkwearProducts() {
  const root = getWorkwearProductsGrid();
  if (!root) return;
  const token = CMAX_PERF?.begin?.("render-workwear-products");

  const query = (document.getElementById("workwearSearch")?.value || "").trim().toLowerCase();
  const category = document.getElementById("workwearCategoryFilter")?.value || "";
  const season = document.getElementById("workwearSeasonFilter")?.value || "";
  const onlyNew = document.getElementById("workwearNewFilter")?.checked === true;

  const products = getVisibleStoreProducts(currentSite)
    .filter((product) => (category ? product.category === category : true))
    .filter((product) => (season ? (product.seasonalCollection || "") === season : true))
    .filter((product) => (onlyNew ? (product?.badges?.isNew || product.isNew) : true))
    .filter((product) => {
      if (!query) return true;
      const variantsText = (Array.isArray(product.variants) ? product.variants.map((variant) => variant?.name || "").join(" ") : "");
      const text = `${product.name || ""} ${product.description || ""} ${product.subcategory || ""} ${variantsText}`.toLowerCase();
      return text.includes(query);
    });
  const totalPages = Math.max(1, Math.ceil(products.length / WORKWEAR_PRODUCTS_PER_PAGE));
  const currentPage = Math.min(totalPages, Math.max(1, Number(workwearProductPage) || 1));
  workwearProductPage = currentPage;
  const pageStart = (currentPage - 1) * WORKWEAR_PRODUCTS_PER_PAGE;
  const visibleProducts = products.slice(pageStart, pageStart + WORKWEAR_PRODUCTS_PER_PAGE);

  if (!visibleProducts.length) {
    root.innerHTML = `<div class="module-empty-state">Nema dostupnih artikala za ovo gradiliste.</div>`;
    if (token) CMAX_PERF.end(token, { count: 0 });
    return;
  }

  root.innerHTML = visibleProducts
    .map((product) => {
      const sizes = Array.isArray(product.sizes) ? product.sizes : [];
      const activeVariants = getActiveStoreProductVariants(product);
      const hasVariants = activeVariants.length > 0;
      const defaultQty = Number(workwearSelectedQuantityByProduct[product.id] || 1);
      const selectedVariantId = String(workwearSelectedVariantByProduct[product.id] || "");
      const galleryImages = getStoreProductGalleryImages(product);
      const image = galleryImages[0] || "";
      const badges = getStoreCardBadges(product);
      const statusLabel = product.active === false ? "Unavailable" : "Available";
      return `
        <article class="workwear-product-card">
          <div class="workwear-product-image-wrap${image ? "" : " is-placeholder"}">
            ${image
              ? `
                <button
                  type="button"
                  class="workwear-product-image-trigger"
                  data-cmax-action="workwear.openProductImageViewer"
                  data-cmax-args='${escapeHtml(JSON.stringify([product.id, 0]))}'
                  title="Otvori sliku preko cijelog ekrana"
                >
                  <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" class="workwear-product-image" loading="lazy" decoding="async">
                </button>
                ${galleryImages.length > 1 ? `<span class="workwear-product-image-count">${galleryImages.length} slika</span>` : ""}
              `
              : `<div class="workwear-product-fallback">Store</div>`}
          </div>
          <div class="workwear-product-body">
            <h4>${escapeHtml(product.name || "Unnamed item")}</h4>
            <div class="workwear-product-meta">${escapeHtml(product.category || "-")} · ${escapeHtml(product.subcategory || "General")}</div>
            <p>${escapeHtml(product.description || "")}</p>
            <div class="workwear-product-meta">Status: ${escapeHtml(statusLabel)}</div>
            ${hasVariants ? `<div class="workwear-product-meta"><span class="warehouse-log-badge type-stock">Vise varijanti</span></div>` : ""}
            <div class="workwear-product-meta">${badges.map((b) => `<span class="warehouse-log-badge type-stock">${escapeHtml(b)}</span>`).join(" ")}</div>
            <div class="workwear-product-price-row">
              <strong>${product.showPriceToWorker === false ? "-" : workwearFormatCurrency(product.creditCost ?? product.price ?? 0)}</strong>
              ${(product.upgradeRule?.enabled || product.enableUpgradeDifference) ? `<span>Upgrade ${workwearFormatCurrency(product.upgradeRule?.differenceAmount || product.differencePrice || 0)}</span>` : ""}
            </div>
            <div class="workwear-product-actions">
              ${hasVariants ? `
                <select data-cmax-action="workwear.selectVariantForProduct" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([product.id]))}'>
                  <option value="">${escapeHtml(t("selectVariant") || "Select variant")}</option>
                  ${activeVariants.map((variant) => `<option value="${escapeHtml(variant.id)}" ${selectedVariantId === variant.id ? "selected" : ""}>${escapeHtml(variant.name)}</option>`).join("")}
                </select>
              ` : ""}
              <select data-cmax-action="workwear.selectSizeForProduct" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([product.id]))}'>
                <option value="">${escapeHtml(t("selectSize") || "Select size")}</option>
                ${sizes.map((size) => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join("")}
              </select>
              <input type="number" min="1" value="${escapeHtml(String(defaultQty))}" class="store-input" placeholder="${escapeHtml(t("quantity") || "Quantity")}" data-cmax-action="workwear.setQuantityForProduct" data-cmax-event="input" data-cmax-debounce="160" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([product.id]))}' />
              <input class="store-input" placeholder="${escapeHtml(t("comment") || "Comment")} (optional)" value="${escapeHtml(workwearSelectedCommentByProduct[product.id] || "")}" data-cmax-action="workwear.setCommentForProduct" data-cmax-event="input" data-cmax-debounce="220" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([product.id]))}' />
              <button class="btn btn-small" data-cmax-action="workwear.addToCart" data-cmax-args='${escapeHtml(JSON.stringify([product.id]))}'>${escapeHtml(t("addToCart") || "Add to cart")}</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  if (products.length > WORKWEAR_PRODUCTS_PER_PAGE) {
    root.insertAdjacentHTML(
      "beforeend",
      `
        <div class="store-pagination">
          <button class="btn btn-secondary" data-cmax-action="workwear.prevProductPage" ${currentPage <= 1 ? "disabled" : ""}>
            ‹ ${escapeHtml(t("previous") || "Prethodna")}
          </button>
          <div class="store-pagination-meta">
            <strong>${escapeHtml(String(currentPage))} / ${escapeHtml(String(totalPages))}</strong>
            <span>${escapeHtml(String(products.length))} artikala</span>
          </div>
          <button class="btn btn-secondary" data-cmax-action="workwear.nextProductPage" ${currentPage >= totalPages ? "disabled" : ""}>
            ${escapeHtml(t("next") || "Sljedeca")} ›
          </button>
        </div>
      `,
    );
  }
  CMAX_PERF?.count?.("renderWorkwearProducts");
  if (token) CMAX_PERF.end(token, { count: visibleProducts.length, total: products.length, page: currentPage, totalPages });
}

function renderWorkwearHeaderControls() {
  const managerBtn = document.getElementById("workwearManagerEditorToggle");
  const cartBtn = document.getElementById("workwearCartToggleBtn");
  const cartBadge = document.getElementById("workwearCartBadge");
  const ordersBtn = document.getElementById("workwearOrdersToggleBtn");
  const subtitle = document.getElementById("workwearHeaderSubtitle");
  if (subtitle) subtitle.textContent = t("storeHeaderSubtitle") || "Store catalog";
  if (managerBtn) {
    const canManage = canManageWorkwearModule();
    managerBtn.style.display = canManage ? "inline-flex" : "none";
    managerBtn.textContent = workwearManagerEditorOpen ? (t("storeCloseEditor") || "Zatvori editor") : (t("storeOpenEditor") || "Uredi artikle");
  }
  if (ordersBtn) {
    ordersBtn.textContent = workwearOrdersOverlayOpen ? "Zatvori narudzbe" : "Moje narudzbe";
  }
  if (cartBtn) {
    cartBtn.style.display = currentView === "workwear" ? "inline-flex" : "none";
    const cartLabel = cartBtn.querySelector(".store-cart-label");
    if (cartLabel) cartLabel.textContent = t("cart") || "Cart";
  }
  const drawerTitle = document.querySelector(".store-cart-drawer-head h3");
  if (drawerTitle) drawerTitle.textContent = t("cart") || "Cart";
}

function renderWorkwearCart() {
  const panel = getWorkwearCartPanel();
  if (!panel) return;
  const cart = getWorkwearCartForCurrentUser();
  const totals = computeWorkwearOrderTotals(cart.items, appState.currentUser);
  const profile = getCurrentWorkerWorkwearProfile();
  const remaining = Math.max(0, Number(profile.creditBalance || 0) - Number(totals.subtotal || 0));

  const itemsHtml = totals.items.length
    ? totals.items
        .map(
          (item, index) => {
            const product = getWorkwearProductById(item.productId) || {};
            const upgradeEnabled = product?.upgradeRule?.enabled || product?.enableUpgradeDifference;
            const upgradeWarning = upgradeEnabled
              ? `<div class="workwear-cart-note">Ovaj artikal nije standardni besplatni izbor. Firma pokriva ${workwearFormatCurrency(product?.upgradeRule?.companyCoveredAmount || 0)}, razlika ${workwearFormatCurrency(product?.upgradeRule?.differenceAmount || product?.differencePrice || 0)}.</div>`
              : "";
            const variantLabel = item.variantName ? `<div>Varijanta: ${escapeHtml(item.variantName)}</div>` : "";
            const lineComment = item.comment ? `<div>Komentar: ${escapeHtml(item.comment)}</div>` : "";
            return `
      <div class="workwear-cart-item">
        <div>
          <strong>${escapeHtml(item.productName)}</strong>
          ${variantLabel}
          <div>${escapeHtml(item.size || "-")} · x${Number(item.quantity) || 1}</div>
          ${lineComment}
          <div>${item.freeApplied ? "Free" : "Budget"}</div>
          ${upgradeWarning}
        </div>
        <div class="workwear-cart-item-actions">
          <span>${workwearFormatCurrency(item.lineCost)}</span>
          <button class="btn btn-small btn-danger" data-cmax-action="workwear.removeCartItem" data-cmax-args='${escapeHtml(JSON.stringify([index]))}'>×</button>
        </div>
      </div>
    `;
          },
        )
        .join("")
    : `<div class="module-empty-state">${escapeHtml(t("emptyCart") || "Cart is empty.")}</div>`;

  panel.innerHTML = `
    <div class="workwear-cart-header">
      <h3>${escapeHtml(t("cart") || "Cart")}</h3>
      <span>${totals.items.length}</span>
    </div>
    <div class="workwear-credit-card">
      <div><strong>${escapeHtml(t("budget") || "Budget")}</strong></div>
      <div>${workwearFormatCurrency(profile.creditBalance || 0)}</div>
      <small>Reserved: ${workwearFormatCurrency(profile.reservedCredit || 0)}</small>
      <small>Nakon narudzbe: ${workwearFormatCurrency(remaining)}</small>
    </div>
    <div class="workwear-cart-list">${itemsHtml}</div>
    <div class="form-group">
      <label>Komentar</label>
      <textarea id="workwearCartComment">${escapeHtml(cart.comment || "")}</textarea>
    </div>
    <label class="workwear-check-row"><input type="checkbox" id="workwearCartUrgent" ${cart.urgent ? "checked" : ""}> Urgent safety</label>
    <div class="workwear-cart-total">
      <strong>Ukupno: ${workwearFormatCurrency(totals.subtotal)}</strong>
      <small>Upgrade razlika: ${workwearFormatCurrency(totals.differenceTotal)}</small>
    </div>
    <div class="workwear-cart-actions">
      <button class="btn btn-secondary" data-cmax-action="workwear.saveDraft">Spremi draft</button>
      <button
        class="btn"
        data-cmax-action="workwear.submitOrder"
        ${workwearCheckoutInFlight ? "disabled aria-busy=\"true\"" : ""}
      >${escapeHtml(workwearCheckoutInFlight ? (t("storeSubmittingOrder") || "Saljemo narudzbu...") : (t("checkout") || "Checkout"))}</button>
    </div>
  `;
}

function renderWorkwearCartBadge() {
  const badge = document.getElementById("workwearCartBadge");
  if (!badge) return;
  const cart = getWorkwearCartForCurrentUser();
  const count = Array.isArray(cart.items)
    ? cart.items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0)
    : 0;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "inline-flex" : "none";
}

function workwearEnsureOverlayInBody(overlay) {
  if (overlay && overlay.parentElement !== document.body) {
    document.body.appendChild(overlay);
  }
  return overlay;
}

function renderWorkwearCartOverlay() {
  const overlay = workwearEnsureOverlayInBody(getWorkwearCartOverlay());
  if (!overlay) return;
  const shouldShow = currentView === "workwear" && workwearCartOverlayOpen === true;
  overlay.style.display = shouldShow ? "flex" : "none";
  document.body.classList.toggle("workwear-cart-open", shouldShow);
}

function renderWorkwearOrdersOverlay() {
  const overlay = workwearEnsureOverlayInBody(document.getElementById("workwearOrdersOverlay"));
  if (!overlay) return;
  const shouldShow = currentView === "workwear" && workwearOrdersOverlayOpen === true;
  overlay.style.display = shouldShow ? "flex" : "none";
  document.body.classList.toggle("workwear-orders-open", shouldShow);
}

function renderWorkwearManagerOverlay() {
  const overlay = workwearEnsureOverlayInBody(document.getElementById("workwearManagerOverlay"));
  if (!overlay) return;
  const shouldShow = currentView === "workwear" && workwearManagerEditorOpen === true && canManageWorkwearModule();
  overlay.style.display = shouldShow ? "flex" : "none";
  document.body.classList.toggle("workwear-manager-open", shouldShow);
}

function renderWorkwearImageViewer() {
  const overlay = workwearEnsureOverlayInBody(document.getElementById("workwearImageViewer"));
  const img = document.getElementById("workwearImageViewerImage");
  const titleEl = document.getElementById("workwearImageViewerTitle");
  const counterEl = document.getElementById("workwearImageViewerCounter");
  const prevBtn = document.getElementById("workwearImageViewerPrev");
  const nextBtn = document.getElementById("workwearImageViewerNext");
  const thumbs = document.getElementById("workwearImageViewerThumbs");
  if (!overlay || !img || !titleEl || !counterEl || !prevBtn || !nextBtn || !thumbs) return;

  const shouldShow = currentView === "workwear" && workwearImageViewerState.open === true && workwearImageViewerState.images.length > 0;
  overlay.style.display = shouldShow ? "flex" : "none";
  if (!shouldShow) {
    thumbs.innerHTML = "";
    return;
  }

  const total = workwearImageViewerState.images.length;
  const index = Math.max(0, Math.min(total - 1, Number(workwearImageViewerState.index) || 0));
  workwearImageViewerState.index = index;
  const currentImage = workwearImageViewerState.images[index] || "";
  img.src = currentImage;
  img.alt = workwearImageViewerState.title || "Store product image";
  titleEl.textContent = workwearImageViewerState.title || "Pregled slike";
  counterEl.textContent = `${index + 1} / ${total}`;
  prevBtn.disabled = total <= 1;
  nextBtn.disabled = total <= 1;

  thumbs.innerHTML = workwearImageViewerState.images
    .map((thumbSrc, thumbIndex) => `
      <button
        class="store-image-viewer-thumb ${thumbIndex === index ? "is-active" : ""}"
        data-cmax-action="workwear.openProductImageViewer"
        data-cmax-args='${escapeHtml(JSON.stringify([workwearImageViewerState.productId, thumbIndex]))}'
        title="Prikazi sliku ${thumbIndex + 1}"
      >
        <img src="${escapeHtml(thumbSrc)}" alt="Thumbnail ${thumbIndex + 1}" />
      </button>
    `)
    .join("");
}

function renderWorkwearOrders() {
  const list = getWorkwearOrdersList();
  if (!list) return;
  const token = CMAX_PERF?.begin?.("render-workwear-orders");
  const userEmail = String(appState.currentUser || "").trim().toLowerCase();
  const isManager = canManageWorkwearModule() || canViewStoreTeamOrders();

  const orders = getVisibleStoreOrders(currentSite)
    .filter((order) => (isManager ? true : order.workerId === userEmail))
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  const visibleOrders = orders.slice(0, workwearOrderRenderLimit);

  if (!visibleOrders.length) {
    list.innerHTML = `<div class="module-empty-state">Nema narudzbi.</div>`;
    if (token) CMAX_PERF.end(token, { count: 0 });
    return;
  }

  const canManage = canManageWorkwearModule();
  list.innerHTML = visibleOrders
    .map((order) => {
      const canCancel = !canManage && ["Pending", "Approved"].includes(order.status || "Pending");
      const canApprove = canManage && (order.status || "Pending") === "Pending";
      const canReject = canManage && ["Pending", "Approved"].includes(order.status || "Pending");
      const canDeliver = canManage && (order.status || "Pending") === "Approved";
      const timeline = Array.isArray(order.statusHistory)
        ? order.statusHistory.map((entry) => `<span class="warehouse-log-badge type-stock">${escapeHtml(entry.status || "-")}</span>`).join(" ")
        : "";
      return `
        <article class="workwear-order-card">
          <div class="workwear-order-head">
            <div>
              <strong>#${escapeHtml(order.id)}</strong>
              <div>${escapeHtml(order.workerName || order.worker || order.workerId)} · ${escapeHtml(order.site || "-")}</div>
            </div>
            ${workwearStatusBadge(order.status)}
          </div>
          <div class="workwear-order-items">
            ${(order.items || []).map((item) => `
              <div>
                ${escapeHtml(item.productName || item.productId)}
                ${item.variantName ? ` · ${escapeHtml(item.variantName)}` : ""}
                · ${escapeHtml(item.size || "-")}
                · x${Number(item.quantity) || 1}
                · ${workwearFormatCurrency(item.lineCost || 0)}
              </div>
            `).join("")}
          </div>
          ${timeline ? `<div class="workwear-product-meta">${timeline}</div>` : ""}
          <div class="workwear-order-foot">
            <div>Ukupno: <strong>${workwearFormatCurrency(order.totals?.subtotal || 0)}</strong></div>
            <div class="workwear-order-actions">
              ${canCancel ? `<button class="btn btn-small btn-danger" data-cmax-action="workwear.cancelOrder" data-cmax-args='${escapeHtml(JSON.stringify([order.id]))}'>Cancel</button>` : ""}
              ${canApprove ? `<button class="btn btn-small" data-cmax-action="workwear.approveOrder" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreStatus" data-cmax-args='${escapeHtml(JSON.stringify([order.id]))}'>Approve</button>` : ""}
              ${canReject ? `<button class="btn btn-small btn-danger" data-cmax-action="workwear.rejectOrder" data-cmax-args='${escapeHtml(JSON.stringify([order.id]))}'>Reject</button>` : ""}
              ${canDeliver ? `<button class="btn btn-small" data-cmax-action="workwear.markDelivered" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreStatus" data-cmax-args='${escapeHtml(JSON.stringify([order.id]))}'>Delivered</button>` : ""}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  if (orders.length > visibleOrders.length) {
    list.insertAdjacentHTML(
      "beforeend",
      `
        <div class="store-list-load-more">
          <button class="btn btn-secondary" data-cmax-action="workwear.loadMoreOrders">
            ${escapeHtml(t("loadMore") || "Ucitaj jos")} (${visibleOrders.length}/${orders.length})
          </button>
        </div>
      `,
    );
  }
  CMAX_PERF?.count?.("renderWorkwearOrders");
  if (token) CMAX_PERF.end(token, { count: visibleOrders.length, total: orders.length });
}

function renderWorkwearAdminPanel() {
  const panel = getWorkwearAdminPanel();
  if (!panel) return;
  if (!canManageWorkwearModule() || !workwearManagerEditorOpen) {
    panel.innerHTML = "";
    return;
  }
  const state = getWorkwearState();
  const products = (state.products || [])
    .map((product) => normalizeStoreProduct(product))
    .slice()
    .sort((a, b) => compareNaturally(a.name, b.name));
  const wizard = getWorkwearWizardState();
  const selectedIds = workwearGetSelectedBulkProductIds();
  const categories = getStoreCategoryOptions(true);
  if (wizard.category && !categories.includes(wizard.category)) categories.push(wizard.category);
  categories.sort((a, b) => compareNaturally(a, b));
  const subcategories = getStoreSubcategoryOptions(wizard.category, true);
  if (wizard.subcategory && !subcategories.includes(wizard.subcategory)) subcategories.push(wizard.subcategory);
  subcategories.sort((a, b) => compareNaturally(a, b));
  const storeRoles = getWorkwearStoreRoles();
  const allSites = getWorkwearManagerSites();
  const reviewSites = wizard.allSites ? "Sva gradilista (ukljucuje buduca)" : (wizard.availableSites.length ? wizard.availableSites.join(", ") : "Nije odabrano");
  const reviewRoles = wizard.allRoles ? "Dostupno svima" : (wizard.visibleToRoles.length ? wizard.visibleToRoles.map((role) => workwearRoleLabel(role)).join(", ") : "Nije odabrano");
  const showPeriodFields = wizard.periodLimitEnabled === true;
  const showApprovalRoles = wizard.approvalRequired === true;
  const showFreeFields = wizard.freeRuleEnabled === true;
  const showUpgradeFields = wizard.upgradeEnabled === true;
  const showBudgetFields = wizard.usesBudget === true;
  const showSiteCards = wizard.allSites !== true;
  const showRoleCards = wizard.allRoles !== true;

  panel.innerHTML = `
    <div class="workwear-admin-card">
      <div class="workwear-wizard-head">
        <div>
          <h3>Product wizard</h3>
          <div class="workwear-product-meta">${workwearEditingProductId ? "Uredjivanje artikla" : "Novi artikal"} · Korak ${workwearProductWizardStep} / 9</div>
        </div>
        <button class="btn btn-secondary" data-cmax-action="workwear.startNewProductWizard">Novi artikal</button>
      </div>
      <div class="workwear-manager-products-layout">
        <div class="workwear-product-table-wrap">
          <table class="workwear-manager-table">
            <thead>
              <tr><th></th><th>Artikal</th><th>Kategorija</th><th>Dostupnost</th><th>Status</th><th>Akcija</th></tr>
            </thead>
            <tbody>
              ${products.map((product) => `
                <tr>
                  <td><input type="checkbox" ${workwearBulkSelection[String(product.id)] ? "checked" : ""} data-cmax-action="workwear.setBulkSelection" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([product.id]))}' /></td>
                  <td><strong>${escapeHtml(product.name || "-")}</strong><div class="workwear-product-meta">${escapeHtml(product.subcategory || "-")}</div></td>
                  <td>${escapeHtml(product.category || "-")}</td>
                  <td>${Array.isArray(product.availableSites) && product.availableSites.includes("*") ? "Sva" : escapeHtml((product.availableSites || []).join(", ") || "-")}</td>
                  <td>${product.active === false ? "Neaktivan" : "Aktivan"}</td>
                  <td>
                    <div class="workwear-order-actions">
                      <button class="btn btn-small" data-cmax-action="workwear.editProductWizard" data-cmax-args='${escapeHtml(JSON.stringify([product.id]))}'>Uredi</button>
                      <button class="btn btn-small btn-danger" data-cmax-action="workwear.removeOrArchiveProduct" data-cmax-args='${escapeHtml(JSON.stringify([product.id]))}'>Ukloni</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ${!products.length ? `<div class="module-empty-state">Jos nema artikala.</div>` : ""}
          <div class="workwear-product-meta">Odabrano za bulk: ${selectedIds.length}</div>
        </div>
        <div class="workwear-product-wizard">
          <div class="workwear-stepper">
            ${[1,2,3,4,5,6,7,8,9].map((step) => `
              <button class="btn btn-small ${step === workwearProductWizardStep ? "" : "btn-secondary"}" data-cmax-action="workwear.setProductWizardStep" data-cmax-args='${escapeHtml(JSON.stringify([step]))}'>${step}</button>
            `).join("")}
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 1 ? "is-active" : ""}">
            <h4>STEP 1 — Osnovno</h4>
            <div class="workwear-admin-grid">
              <input id="workwearProductName" class="store-input" placeholder="Naziv" value="${escapeHtml(wizard.name)}" />
              <input id="workwearProductDescription" class="store-input" placeholder="Opis" value="${escapeHtml(wizard.description)}" />
              <select id="workwearProductCategory" class="store-input" data-cmax-action="workwear.updateWizardCategory" data-cmax-event="change" data-cmax-pass-element>
                ${categories.map((category) => `<option value="${escapeHtml(category)}" ${wizard.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
              </select>
              <div class="workwear-order-actions">
                <input id="workwearWizardQuickCategory" class="store-input" placeholder="+ Dodaj kategoriju" />
                <button class="btn btn-small" data-cmax-action="workwear.quickAddWizardCategory">Dodaj kategoriju</button>
              </div>
              <select id="workwearProductSubcategory" class="store-input">
                <option value="">Podkategorija</option>
                ${subcategories.map((subcategory) => `<option value="${escapeHtml(subcategory)}" ${wizard.subcategory === subcategory ? "selected" : ""}>${escapeHtml(subcategory)}</option>`).join("")}
              </select>
              <div class="workwear-order-actions">
                <input id="workwearWizardQuickSubcategory" class="store-input" placeholder="+ Dodaj podkategoriju" />
                <button class="btn btn-small" data-cmax-action="workwear.quickAddWizardSubcategory">Dodaj podkategoriju</button>
              </div>
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductActive" ${wizard.active ? "checked" : ""} /> Active</label>
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductNew" ${wizard.isNew ? "checked" : ""} /> New badge</label>
            </div>
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 2 ? "is-active" : ""}">
            <h4>STEP 2 — Slike</h4>
            <div class="workwear-admin-grid">
              <input type="file" id="workwearWizardImageFile" accept="image/*" data-cmax-action="workwear.uploadWizardImage" data-cmax-event="change" data-cmax-pass-event />
              <input id="workwearProductImage" class="store-input" placeholder="Image URL" value="${escapeHtml(wizard.imagePrimary)}" />
              <input id="workwearProductGallery" class="store-input" placeholder="Dodatni URL-ovi (zarez)" value="${escapeHtml(wizard.imageGallery)}" />
            </div>
            <div class="workwear-image-preview-box">
              ${wizard.imagePrimary ? `<img src="${escapeHtml(wizard.imagePrimary)}" alt="preview" class="workwear-product-image" />` : `<div class="workwear-product-fallback">Nema preview slike</div>`}
            </div>
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 3 ? "is-active" : ""}">
            <h4>STEP 3 — Velicine</h4>
            <div class="workwear-admin-grid">
              <select id="workwearWizardSizePreset" class="store-input">
                <option value="odjeca" ${wizard.sizePreset === "odjeca" ? "selected" : ""}>Odjeca (XS-3XL)</option>
                <option value="obuca" ${wizard.sizePreset === "obuca" ? "selected" : ""}>Obuca (38-48)</option>
                <option value="rukavice" ${wizard.sizePreset === "rukavice" ? "selected" : ""}>Rukavice (7-12)</option>
                <option value="ppe" ${wizard.sizePreset === "ppe" ? "selected" : ""}>Kacige/PPE</option>
              </select>
              <input id="workwearWizardCustomSize" class="store-input" placeholder="Dodaj custom velicinu" />
              <button class="btn btn-small" data-cmax-action="workwear.addWizardCustomSize">Dodaj velicinu</button>
            </div>
            <div class="workwear-chip-grid">
              ${getWorkwearSizePreset(wizard.sizePreset).map((size) => `
                <label class="workwear-chip">
                  <input type="checkbox" ${wizard.sizes.includes(size) ? "checked" : ""} data-cmax-action="workwear.toggleWizardSize" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([size]))}' />
                  <span>${escapeHtml(size)}</span>
                </label>
              `).join("")}
            </div>
            <div class="workwear-selected-list">
              ${(wizard.sizes || []).map((size) => `<span class="warehouse-log-badge type-stock">${escapeHtml(size)} <button class="workwear-mini-link" data-cmax-action="workwear.removeWizardSize" data-cmax-args='${escapeHtml(JSON.stringify([size]))}'>x</button></span>`).join(" ")}
            </div>
            <details>
              <summary>Varijante (boja / vrsta)</summary>
              <div class="workwear-admin-grid">
                <input id="workwearWizardVariantName" class="store-input" placeholder="Naziv varijante (npr. Crna)" />
                <input id="workwearWizardVariantImage" class="store-input" placeholder="Variant image URL (opcionalno)" />
                <input id="workwearWizardVariantPriceOverride" class="store-input" type="number" min="0" placeholder="Price override (opcionalno)" />
                <input id="workwearWizardVariantCreditOverride" class="store-input" type="number" min="0" placeholder="Credit override (opcionalno)" />
                <input id="workwearWizardVariantSupplierProductId" class="store-input" placeholder="supplierProductId (opcionalno)" />
                <button class="btn btn-small" data-cmax-action="workwear.addWizardVariant">Dodaj varijantu</button>
              </div>
              <div class="store-orders-list">
                ${(wizard.variants || []).map((variant, index) => `
                  <div class="workwear-cart-item">
                    <div class="workwear-admin-grid">
                      <input class="store-input" value="${escapeHtml(variant.name || "")}" data-cmax-action="workwear.updateWizardVariantField" data-cmax-event="input" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([index, "name"]))}' />
                      <input class="store-input" value="${escapeHtml(variant.image || variant.imageUrl || "")}" data-cmax-action="workwear.updateWizardVariantField" data-cmax-event="input" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([index, "image"]))}' />
                      <input class="store-input" type="number" min="0" value="${variant.priceOverride ?? ""}" data-cmax-action="workwear.updateWizardVariantField" data-cmax-event="input" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([index, "priceOverride"]))}' />
                      <input class="store-input" type="number" min="0" value="${variant.creditCostOverride ?? ""}" data-cmax-action="workwear.updateWizardVariantField" data-cmax-event="input" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([index, "creditCostOverride"]))}' />
                      <input class="store-input" value="${escapeHtml(variant.supplierProductId || "")}" data-cmax-action="workwear.updateWizardVariantField" data-cmax-event="input" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([index, "supplierProductId"]))}' />
                      <label class="workwear-check-row"><input type="checkbox" ${variant.active !== false ? "checked" : ""} data-cmax-action="workwear.updateWizardVariantField" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([index, "active"]))}' /> Aktivna</label>
                    </div>
                    <div class="workwear-order-actions">
                      <button class="btn btn-small btn-danger" data-cmax-action="workwear.removeWizardVariant" data-cmax-args='${escapeHtml(JSON.stringify([index]))}'>Ukloni</button>
                    </div>
                  </div>
                `).join("")}
                ${!(wizard.variants || []).length ? `<div class="module-empty-state">Nema varijanti. Ako ih ne dodas, artikal radi kao obicni single proizvod.</div>` : ""}
              </div>
            </details>
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 4 ? "is-active" : ""}">
            <h4>STEP 4 — Dostupnost gradilista</h4>
            <label class="workwear-check-row"><input type="checkbox" id="workwearWizardAllSites" ${wizard.allSites ? "checked" : ""} data-cmax-action="workwear.toggleWizardAllSites" data-cmax-event="change" data-cmax-pass-element /> Dostupno za sva gradilista</label>
            ${showSiteCards ? `
              <div class="workwear-chip-grid">
                ${allSites.map((site) => `
                  <label class="workwear-chip">
                    <input type="checkbox" data-cmax-action="workwear.toggleWizardSite" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([site]))}' ${wizard.availableSites.includes(site) ? "checked" : ""} />
                    <span>${escapeHtml(site)}</span>
                  </label>
                `).join("")}
              </div>
            ` : `<div class="workwear-product-meta">Artikal vrijedi i za nova gradilista.</div>`}
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 5 ? "is-active" : ""}">
            <h4>STEP 5 — Ko smije naruciti</h4>
            <label class="workwear-check-row"><input type="checkbox" id="workwearWizardAllRoles" ${wizard.allRoles ? "checked" : ""} data-cmax-action="workwear.toggleWizardAllRoles" data-cmax-event="change" data-cmax-pass-element /> Dostupno svima</label>
            ${showRoleCards ? `
              <div class="workwear-chip-grid">
                ${storeRoles.map((role) => `
                  <label class="workwear-chip">
                    <input type="checkbox" data-cmax-action="workwear.toggleWizardRole" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([role.key]))}' ${wizard.visibleToRoles.includes(role.key) ? "checked" : ""} />
                    <span>${escapeHtml(role.label)}</span>
                  </label>
                `).join("")}
              </div>
            ` : ""}
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 6 ? "is-active" : ""}">
            <h4>STEP 6 — Cijena / budzet</h4>
            <div class="workwear-admin-grid">
              <input id="workwearProductPrice" class="store-input" type="number" min="0" placeholder="Cijena SEK" value="${escapeHtml(String(wizard.price || 0))}" />
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductShowPrice" ${wizard.showPriceToWorker ? "checked" : ""} /> Prikazi cijenu radniku</label>
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductUsesBudget" ${wizard.usesBudget ? "checked" : ""} data-cmax-action="workwear.refreshWizardFlags" data-cmax-event="change" /> Koristi budzet</label>
              ${showBudgetFields ? `<input id="workwearProductCredit" class="store-input" type="number" min="0" placeholder="Credit cost" value="${escapeHtml(String(wizard.creditCost || 0))}" />` : ""}
              ${showBudgetFields ? `<input id="workwearProductBudgetGroup" class="store-input" placeholder="Budget grupa/kategorija" value="${escapeHtml(wizard.budgetGroup || "")}" />` : ""}
            </div>
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 7 ? "is-active" : ""}">
            <h4>STEP 7 — Pravila</h4>
            <div class="workwear-admin-grid">
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductApproval" ${wizard.approvalRequired ? "checked" : ""} data-cmax-action="workwear.refreshWizardFlags" data-cmax-event="change" /> Trazi odobrenje</label>
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductFree" ${wizard.freeRuleEnabled ? "checked" : ""} data-cmax-action="workwear.refreshWizardFlags" data-cmax-event="change" /> Free rule</label>
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductLimitEnabled" ${wizard.periodLimitEnabled ? "checked" : ""} data-cmax-action="workwear.refreshWizardFlags" data-cmax-event="change" /> Limit po periodu</label>
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductUpgrade" ${wizard.upgradeEnabled ? "checked" : ""} data-cmax-action="workwear.refreshWizardFlags" data-cmax-event="change" /> Upgrade / difference</label>
              <label class="workwear-check-row"><input type="checkbox" id="workwearProductUrgent" ${wizard.urgentSafety ? "checked" : ""} /> Urgent safety</label>
            </div>
            ${showApprovalRoles ? `
              <div class="workwear-product-meta">Ko moze odobriti:</div>
              <div class="workwear-chip-grid">
                ${["store_manager", "admin", "superadmin"].map((roleKey) => `
                  <label class="workwear-chip">
                    <input type="checkbox" data-cmax-action="workwear.toggleWizardApprovalRole" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([roleKey]))}' ${wizard.approvalRoles.includes(roleKey) ? "checked" : ""} />
                    <span>${escapeHtml(workwearRoleLabel(roleKey))}</span>
                  </label>
                `).join("")}
              </div>
            ` : ""}
            ${showFreeFields ? `
              <div class="workwear-admin-grid">
                <select id="workwearProductFreeMode" class="store-input">
                  <option value="item" ${wizard.freeRuleMode === "item" ? "selected" : ""}>Free po artiklu</option>
                  <option value="category" ${wizard.freeRuleMode === "category" ? "selected" : ""}>Free po kategoriji</option>
                  <option value="firstOrder" ${wizard.freeRuleMode === "firstOrder" ? "selected" : ""}>First order free</option>
                  <option value="firstItem" ${wizard.freeRuleMode === "firstItem" ? "selected" : ""}>First item free</option>
                  <option value="period" ${wizard.freeRuleMode === "period" ? "selected" : ""}>Period rule</option>
                </select>
                <input id="workwearProductFreePeriodDays" class="store-input" type="number" min="1" placeholder="Free period days" value="${escapeHtml(String(wizard.freeRulePeriodDays || 180))}" />
              </div>
            ` : ""}
            ${showPeriodFields ? `
              <div class="workwear-admin-grid">
                <select id="workwearProductLimitCycle" class="store-input">
                  <option value="1m" ${wizard.periodLimitCycle === "1m" ? "selected" : ""}>Svakih 1 mjesec</option>
                  <option value="3m" ${wizard.periodLimitCycle === "3m" ? "selected" : ""}>Svaka 3 mjeseca</option>
                  <option value="6m" ${wizard.periodLimitCycle === "6m" ? "selected" : ""}>Svakih 6 mjeseci</option>
                  <option value="12m" ${wizard.periodLimitCycle === "12m" ? "selected" : ""}>Svakih 12 mjeseci</option>
                  <option value="custom" ${wizard.periodLimitCycle === "custom" ? "selected" : ""}>Custom</option>
                </select>
                <input id="workwearProductLimitQty" class="store-input" type="number" min="1" placeholder="Limit qty" value="${escapeHtml(String(wizard.periodLimitQty || 1))}" />
                <input id="workwearProductLimitDays" class="store-input" type="number" min="1" placeholder="Limit period days" value="${escapeHtml(String(wizard.periodLimitDays || 180))}" />
              </div>
            ` : ""}
            ${showUpgradeFields ? `
              <div class="workwear-admin-grid">
                <input id="workwearProductCovered" class="store-input" type="number" min="0" placeholder="companyCoveredAmount" value="${escapeHtml(String(wizard.companyCoveredAmount || 0))}" />
                <input id="workwearProductDifference" class="store-input" type="number" min="0" placeholder="differenceAmount" value="${escapeHtml(String(wizard.differenceAmount || 0))}" />
                <label class="workwear-check-row"><input type="checkbox" id="workwearProductUpgradeWarning" ${wizard.workerUpgradeWarning ? "checked" : ""} /> Upozorenje radniku</label>
              </div>
            ` : ""}
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 8 ? "is-active" : ""}">
            <h4>STEP 8 — Supplier priprema</h4>
            <details>
              <summary>Otvori supplier opcije</summary>
              <div class="workwear-admin-grid">
                <input id="workwearProductSupplier" class="store-input" placeholder="supplierId" value="${escapeHtml(wizard.supplierId)}" />
                <input id="workwearProductSupplierProductId" class="store-input" placeholder="supplierProductId" value="${escapeHtml(wizard.supplierProductId)}" />
                <input id="workwearProductSupplierLink" class="store-input" placeholder="supplierLink" value="${escapeHtml(wizard.supplierLink)}" />
                <input id="workwearProductSupplierPrice" class="store-input" type="number" min="0" placeholder="supplierPrice" value="${escapeHtml(String(wizard.supplierPrice || 0))}" />
                <label class="workwear-check-row"><input type="checkbox" id="workwearProductExternalSync" ${wizard.externalSync ? "checked" : ""} /> externalSync</label>
              </div>
            </details>
          </div>

          <div class="workwear-wizard-step ${workwearProductWizardStep === 9 ? "is-active" : ""}">
            <h4>STEP 9 — Pregled i spremi</h4>
            <div class="workwear-review-list">
              <div><strong>Naziv:</strong> ${escapeHtml(wizard.name || "-")}</div>
              <div><strong>Kategorija:</strong> ${escapeHtml(wizard.category || "-")} / ${escapeHtml(wizard.subcategory || "-")}</div>
              <div><strong>Velicine:</strong> ${escapeHtml((wizard.sizes || []).join(", ") || "-")}</div>
              <div><strong>Dostupnost gradilista:</strong> ${escapeHtml(reviewSites)}</div>
              <div><strong>Ko moze naruciti:</strong> ${escapeHtml(reviewRoles)}</div>
              <div><strong>Approval:</strong> ${wizard.approvalRequired ? "Da" : "Ne"}</div>
              <div><strong>Budzet:</strong> ${wizard.usesBudget ? "Da" : "Ne"}</div>
              <div><strong>Free:</strong> ${wizard.freeRuleEnabled ? "Da" : "Ne"}</div>
              <div><strong>Upgrade:</strong> ${wizard.upgradeEnabled ? "Da" : "Ne"}</div>
            </div>
          </div>

          <div class="workwear-cart-actions">
            <button class="btn btn-secondary" data-cmax-action="workwear.prevProductWizardStep">Nazad</button>
            <button class="btn btn-secondary" data-cmax-action="workwear.nextProductWizardStep">Naprijed</button>
            <button class="btn" data-cmax-action="workwear.saveProduct" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreSave">Spremi artikal</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWorkwearBulkEditPanel() {
  const panel = document.getElementById("workwearBulkEditPanel");
  if (!panel) return;
  if (!canManageWorkwearModule() || !workwearManagerEditorOpen) {
    panel.innerHTML = "";
    return;
  }
  const selectedIds = workwearGetSelectedBulkProductIds();
  const allSites = getWorkwearManagerSites();
  const storeRoles = getWorkwearStoreRoles();
  if (workwearBulkAllSites && !workwearSelectedBulkSites.length) {
    workwearSelectedBulkSites = allSites.slice();
  }
  if (workwearBulkAllRoles && !workwearSelectedBulkRoles.length) {
    workwearSelectedBulkRoles = storeRoles.map((role) => role.key);
  }
  panel.innerHTML = `
    <div class="workwear-admin-card">
      <h3>Uredi odabrane artikle</h3>
      <div class="workwear-product-meta">Odabrano: ${selectedIds.length}</div>
      ${selectedIds.length ? `
        <div class="workwear-admin-grid">
          <select id="workwearBulkCategory" class="store-input"><option value="">Promijeni kategoriju</option>${getWorkwearCategories().map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}</select>
          <input id="workwearBulkSubcategory" class="store-input" placeholder="Promijeni podkategoriju" />
          <select id="workwearBulkActive" class="store-input"><option value="">Active/inactive</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <select id="workwearBulkFree" class="store-input"><option value="">Free rule</option><option value="on">Ukljuci</option><option value="off">Iskljuci</option></select>
          <select id="workwearBulkBudget" class="store-input"><option value="">Budget</option><option value="on">Ukljuci</option><option value="off">Iskljuci</option></select>
          <select id="workwearBulkApproval" class="store-input"><option value="">Approval required</option><option value="on">Ukljuci</option><option value="off">Iskljuci</option></select>
        </div>
        <div class="workwear-admin-grid">
          <label class="workwear-check-row"><input type="checkbox" id="workwearBulkAllSites" ${workwearBulkAllSites ? "checked" : ""} data-cmax-action="workwear.toggleBulkAllSites" data-cmax-event="change" data-cmax-pass-element /> Sva gradilista</label>
          <div class="workwear-chip-grid">
            ${allSites.map((site) => `
              <label class="workwear-chip">
                <input type="checkbox" data-cmax-action="workwear.toggleBulkSite" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([site]))}' ${workwearSelectedBulkSites.includes(site) ? "checked" : ""} />
                <span>${escapeHtml(site)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="workwear-admin-grid">
          <label class="workwear-check-row"><input type="checkbox" id="workwearBulkAllRoles" ${workwearBulkAllRoles ? "checked" : ""} data-cmax-action="workwear.toggleBulkAllRoles" data-cmax-event="change" data-cmax-pass-element /> Sve funkcije/role</label>
          <div class="workwear-chip-grid">
            ${storeRoles.map((role) => `
              <label class="workwear-chip">
                <input type="checkbox" data-cmax-action="workwear.toggleBulkRole" data-cmax-event="change" data-cmax-pass-element data-cmax-args='${escapeHtml(JSON.stringify([role.key]))}' ${workwearSelectedBulkRoles.includes(role.key) ? "checked" : ""} />
                <span>${escapeHtml(role.label)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="workwear-cart-actions">
          <button class="btn" data-cmax-action="workwear.applyBulkEdit" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreSave">Primijeni bulk edit</button>
        </div>
      ` : `<div class="module-empty-state">Oznaci artikle u tabeli da otvoris bulk editor.</div>`}
    </div>
  `;
}

function renderWorkwearCategoriesPanel() {
  const panel = document.getElementById("workwearCategoriesPanel");
  if (!panel) return;
  if (!canManageWorkwearModule() || !workwearManagerEditorOpen) {
    panel.innerHTML = "";
    return;
  }
  const catalog = getStoreCategoryCatalogState();
  const categories = getStoreCategoryOptions(true);
  panel.innerHTML = `
    <div class="workwear-admin-card">
      <h3>Kategorije i podkategorije</h3>
      <div class="workwear-admin-grid">
        <input id="workwearNewCategoryName" class="store-input" placeholder="+ Dodaj kategoriju" />
        <button class="btn" data-cmax-action="workwear.addCategory">Dodaj kategoriju</button>
      </div>
      <div class="store-orders-list">
        ${categories.map((category) => {
          const entry = catalog[category] || { active: true, subcategories: {} };
          const subcategories = Object.keys(entry.subcategories || {}).sort((a, b) => compareNaturally(a, b));
          return `
            <div class="workwear-cart-item">
              <div>
                <strong>${escapeHtml(category)}</strong>
                <div class="workwear-product-meta">${entry.active === false ? "Arhivirana" : "Aktivna"}</div>
                <div class="workwear-admin-grid" style="margin-top:8px;">
                  <input id="workwearRenameCategory_${sanitizeSiteId(category)}" class="store-input" value="${escapeHtml(category)}" />
                  <button class="btn btn-small" data-cmax-action="workwear.renameCategory" data-cmax-args='${escapeHtml(JSON.stringify([category]))}'>Preimenuj</button>
                  <button class="btn btn-small btn-danger" data-cmax-action="workwear.archiveCategory" data-cmax-args='${escapeHtml(JSON.stringify([category]))}'>Obrisi/Arhiviraj</button>
                </div>
                <div class="workwear-admin-grid" style="margin-top:8px;">
                  <input id="workwearAddSubcategory_${sanitizeSiteId(category)}" class="store-input" placeholder="+ Dodaj podkategoriju" />
                  <button class="btn btn-small" data-cmax-action="workwear.addSubcategory" data-cmax-args='${escapeHtml(JSON.stringify([category]))}'>Dodaj podkategoriju</button>
                </div>
                <div class="workwear-chip-grid" style="margin-top:8px;">
                  ${subcategories.map((subcategory) => {
                    const subEntry = entry.subcategories[subcategory] || { active: true };
                    return `
                      <span class="workwear-chip ${subEntry.active === false ? "is-muted" : ""}">
                        ${escapeHtml(subcategory)}
                        <button class="workwear-mini-link" data-cmax-action="workwear.renameSubcategory" data-cmax-args='${escapeHtml(JSON.stringify([category, subcategory]))}'>Preimenuj</button>
                        <button class="workwear-mini-link" data-cmax-action="workwear.archiveSubcategory" data-cmax-args='${escapeHtml(JSON.stringify([category, subcategory]))}'>Obrisi/Arhiviraj</button>
                      </span>
                    `;
                  }).join("") || `<span class="workwear-product-meta">Nema podkategorija</span>`}
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderWorkwearManagerOrders() {
  const list = document.getElementById("workwearManagerOrdersList");
  if (!list || !canManageWorkwearModule()) return;
  const state = getWorkwearState();
  const productsById = new Map((state.products || []).map((p) => [p.id, p]));

  const source = (state.orders || []).slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const filtered = source.filter((order) => {
    if (workwearOrderFilters.worker && !(order.workerName || order.worker || "").toLowerCase().includes(workwearOrderFilters.worker.toLowerCase())) return false;
    if (workwearOrderFilters.site && order.site !== workwearOrderFilters.site) return false;
    if (workwearOrderFilters.status && order.status !== workwearOrderFilters.status) return false;
    if (workwearOrderFilters.approvalRequired === "yes") {
      const hasApprovalItems = (order.items || []).some((item) => productsById.get(item.productId)?.approvalRequired === true);
      if (!hasApprovalItems) return false;
    }
    if (workwearOrderFilters.category) {
      const hasCategory = (order.items || []).some((item) => (productsById.get(item.productId)?.category || "") === workwearOrderFilters.category);
      if (!hasCategory) return false;
    }
    if (workwearOrderFilters.product) {
      const q = workwearOrderFilters.product.toLowerCase();
      const hasProduct = (order.items || []).some((item) => `${item.productName || ""} ${item.variantName || ""}`.toLowerCase().includes(q));
      if (!hasProduct) return false;
    }
    return true;
  });

  list.innerHTML = `
    <div class="workwear-admin-card">
      <h3>Narudzbe</h3>
      <div class="workwear-admin-grid">
        <input class="store-input" placeholder="Radnik" data-cmax-action="workwear.setOrderFilter" data-cmax-event="input" data-cmax-debounce="220" data-cmax-pass-element data-cmax-args='["worker"]' value="${escapeHtml(workwearOrderFilters.worker)}" />
        <select class="store-input" data-cmax-action="workwear.setOrderFilter" data-cmax-event="change" data-cmax-pass-element data-cmax-args='["site"]'>
          <option value="">Sva gradilista</option>
          ${getWorkwearManagerSites().map((site) => `<option value="${escapeHtml(site)}" ${workwearOrderFilters.site === site ? "selected" : ""}>${escapeHtml(site)}</option>`).join("")}
        </select>
        <select class="store-input" data-cmax-action="workwear.setOrderFilter" data-cmax-event="change" data-cmax-pass-element data-cmax-args='["status"]'>
          <option value="">Svi statusi</option>
          ${["Pending", "Approved", "Delivered", "Rejected", "Cancelled"].map((status) => `<option value="${escapeHtml(status)}" ${workwearOrderFilters.status === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
        </select>
        <select class="store-input" data-cmax-action="workwear.setOrderFilter" data-cmax-event="change" data-cmax-pass-element data-cmax-args='["category"]'>
          <option value="">Sve kategorije</option>
          ${getWorkwearCategories().map((category) => `<option value="${escapeHtml(category)}" ${workwearOrderFilters.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
        </select>
        <input class="store-input" placeholder="Artikal" data-cmax-action="workwear.setOrderFilter" data-cmax-event="input" data-cmax-debounce="220" data-cmax-pass-element data-cmax-args='["product"]' value="${escapeHtml(workwearOrderFilters.product)}" />
      </div>
      <div class="store-orders-list">
        ${filtered.length ? filtered.map((order) => `
          <article class="workwear-order-card">
            <div class="workwear-order-head">
              <div>
                <strong>#${escapeHtml(order.id)}</strong>
                <div>${escapeHtml(order.workerName || order.worker || order.workerId)} · ${escapeHtml(order.site || "-")} · ${new Date(order.createdAt || Date.now()).toLocaleString(getCurrentLocale())}</div>
              </div>
              ${workwearStatusBadge(order.status)}
            </div>
            <div>${(order.items || []).map((item) => `
              <div>
                ${escapeHtml(item.productName || item.productId)}
                ${item.variantName ? ` · ${escapeHtml(item.variantName)}` : ""}
                · ${escapeHtml(item.size || "-")}
                · x${Number(item.quantity) || 1}
                · ${workwearFormatCurrency(item.lineCost || 0)}
              </div>
            `).join("")}</div>
            <div class="workwear-order-foot">
              <div>Budget impact: <strong>${workwearFormatCurrency(order.totals?.subtotal || 0)}</strong></div>
              <div class="workwear-order-actions">
                ${order.status === "Pending" ? `<button class="btn btn-small" data-cmax-action="workwear.approveOrder" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreStatus" data-cmax-args='${escapeHtml(JSON.stringify([order.id]))}'>Approve</button>` : ""}
                ${["Pending", "Approved"].includes(order.status) ? `<button class="btn btn-small btn-danger" data-cmax-action="workwear.rejectOrder" data-cmax-args='${escapeHtml(JSON.stringify([order.id]))}'>Reject</button>` : ""}
                ${order.status === "Approved" ? `<button class="btn btn-small" data-cmax-action="workwear.markDelivered" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreStatus" data-cmax-args='${escapeHtml(JSON.stringify([order.id]))}'>Delivered</button>` : ""}
              </div>
            </div>
          </article>
        `).join("") : `<div class="module-empty-state">Nema narudzbi za odabrane filtere.</div>`}
      </div>
    </div>
  `;
}

function renderWorkwearBudgetPanel() {
  const panel = document.getElementById("workwearBudgetPanel");
  if (!panel || !canManageWorkwearModule()) return;
  const state = getWorkwearState();
  const profiles = Object.values(state.workerProfiles || {});
  const workerOptions = getStoreAssignableUsers({ onlyActive: true });
  panel.innerHTML = `
    <div class="workwear-admin-card">
      <h3>Budzeti</h3>
      <div class="workwear-admin-grid">
        <select id="workwearBudgetWorker" class="store-input">
          <option value="">Odaberi korisnika</option>
          ${workerOptions.map((user) => `<option value="${escapeHtml(user.email)}">${escapeHtml(user.fullName || user.email)} (${escapeHtml(user.email)})</option>`).join("")}
        </select>
        <input id="workwearBudgetDelta" class="store-input" type="number" placeholder="+/- amount" />
        <input id="workwearBudgetReason" class="store-input" placeholder="Reason" />
        <button class="btn" data-cmax-action="workwear.adjustBudget" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreSave">Apply</button>
      </div>
      <div class="store-orders-list">
        ${profiles.map((profile) => `<div class="workwear-cart-item"><div><strong>${escapeHtml(profile.workerName || profile.workerId)}</strong><div>${escapeHtml(profile.workerId || "")}</div></div><div>${workwearFormatCurrency(profile.creditBalance || 0)}</div></div>`).join("")}
      </div>
    </div>
  `;
}

function renderWorkwearRulesPanel() {
  const panel = document.getElementById("workwearRulesPanel");
  if (!panel || !canManageWorkwearModule()) return;
  const settings = getWorkwearState().settings || {};
  panel.innerHTML = `
    <div class="workwear-admin-card">
      <h3>Pravila</h3>
      <div class="workwear-admin-grid">
        <div class="workwear-setting-card">
          <strong>Koristi budzet sistem</strong>
          <small>Ako je ukljuceno, narudzbe mogu skidati iznos iz korisnikovog Store budzeta.</small>
          <label class="workwear-check-row"><input type="checkbox" id="workwearSettingsBudgetEnabled" ${settings.budgetEnabled !== false ? "checked" : ""} /> Ukljuceno</label>
        </div>
        <div class="workwear-setting-card">
          <strong>Budget mode</strong>
          <small>Global = jedan budzet, Po kategoriji = odvojena kontrola po kategorijama.</small>
          <select id="workwearSettingsBudgetMode" class="store-input">
            <option value="global" ${settings.budgetMode === "global" ? "selected" : ""}>Global</option>
            <option value="perCategory" ${settings.budgetMode === "perCategory" ? "selected" : ""}>Po kategoriji</option>
          </select>
        </div>
        <div class="workwear-setting-card">
          <strong>Prva narudzba gratis (default)</strong>
          <small>Ako je ukljuceno, korisnik moze imati jednu besplatnu narudzbu unutar odabranog perioda zavisno od pravila artikla.</small>
          <label class="workwear-check-row"><input type="checkbox" id="workwearSettingsFreeEnabled" ${settings.freeRulesEnabled === true ? "checked" : ""} /> Ukljuceno</label>
        </div>
        <div class="workwear-setting-card">
          <strong>Trazi odobrenje (rezervacija na pending)</strong>
          <small>Ako je ukljuceno, budzet se rezervira odmah na Pending statusu narudzbe.</small>
          <label class="workwear-check-row"><input type="checkbox" id="workwearSettingsReserveOnPending" ${settings.reserveOnPending === true ? "checked" : ""} /> Reserve on pending</label>
        </div>
        <div class="workwear-setting-card">
          <strong>Renewal amount</strong>
          <small>Koliko budzeta se automatski dodaje korisniku pri obnovi. Primjer: 2500 SEK.</small>
          <input id="workwearSettingsRenewalAmount" class="store-input" type="number" min="0" placeholder="Renewal amount (SEK)" value="${escapeHtml(String(settings.creditRenewalAmount || 2500))}" />
        </div>
        <div class="workwear-setting-card">
          <strong>Renewal months</strong>
          <small>Nakon koliko mjeseci se obnavlja budzet. Primjer: svakih 6 mjeseci.</small>
          <input id="workwearSettingsRenewalMonths" class="store-input" type="number" min="1" placeholder="Renewal months" value="${escapeHtml(String(settings.creditRenewalPeriodMonths || 6))}" />
        </div>
      </div>
      <div class="workwear-cart-actions">
        <button class="btn" data-cmax-action="workwear.saveGlobalRules" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreSave">Spremi pravila</button>
      </div>
    </div>
  `;
}

function renderWorkwearUsersPanel() {
  const panel = document.getElementById("workwearUsersPanel");
  const canManageAccounts = canManageWorkwearModule() || (typeof canManageAdminsByLevel === "function" && canManageAdminsByLevel());
  if (!panel || !canManageAccounts) return;
  const users = listStoreUsers();
  const state = getWorkwearState();
  const requests = (state.passwordResetRequests || []).slice().sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
  const roleOptions = getWorkwearStoreRoles();
  const siteOptions = getWorkwearManagerSites();
  const editing = workwearEditingStoreUserEmail ? users.find((user) => user.email === workwearEditingStoreUserEmail) : null;
  const selectedRoles = normalizeStoreRoleList(editing?.storeRoles || []);
  const selectedSites = Array.isArray(editing?.allowedSites) ? editing.allowedSites : siteOptions.slice();

  panel.innerHTML = `
    <div class="workwear-admin-card">
      <h3>Korisnici / Role</h3>
      <div class="workwear-product-meta">Kreiranje i uredjivanje korisnickih accounta po funkciji/levelu.</div>
      <div class="workwear-admin-grid">
        <input id="workwearUserName" class="store-input" placeholder="Ime i prezime" value="${escapeHtml(editing?.fullName || "")}" />
        <input id="workwearUserEmail" class="store-input" placeholder="Email" value="${escapeHtml(editing?.email || "")}" ${editing ? "disabled" : ""} />
        <input id="workwearUserPassword" class="store-input" type="password" placeholder="${editing ? "Nova lozinka (opcionalno)" : "Lozinka"}" />
        <label class="workwear-check-row"><input type="checkbox" id="workwearUserActive" ${editing ? (editing.active !== false ? "checked" : "") : "checked"} /> Aktivan</label>
      </div>
      <div class="workwear-product-meta">Funkcija/level</div>
      <div class="workwear-chip-grid">
        ${roleOptions.map((role) => `
          <label class="workwear-chip">
            <input type="checkbox" data-cmax-role-checkbox value="${escapeHtml(role.key)}" ${selectedRoles.includes(role.key) ? "checked" : ""} />
            <span>${escapeHtml(role.label)}</span>
          </label>
        `).join("")}
      </div>
      <div class="workwear-product-meta">Dozvoljena gradilista</div>
      <div class="workwear-chip-grid">
        ${siteOptions.map((site) => `
          <label class="workwear-chip">
            <input type="checkbox" data-cmax-site-checkbox value="${escapeHtml(site)}" ${selectedSites.includes(site) ? "checked" : ""} />
            <span>${escapeHtml(site)}</span>
          </label>
        `).join("")}
      </div>
      <div class="workwear-cart-actions">
        <button class="btn" data-cmax-action="workwear.saveStoreUser" data-cmax-server-action="true" data-cmax-loading-key="loadingAdminSave">${editing ? "Spremi korisnika" : "Kreiraj korisnika"}</button>
        ${editing ? `<button class="btn btn-secondary" data-cmax-action="workwear.cancelStoreUserEdit">Odustani</button>` : ""}
      </div>
      <div class="store-orders-list">
        ${users.map((user) => `
          <div class="workwear-cart-item">
            <div>
              <strong>${escapeHtml(user.fullName || user.email)}</strong>
              <div>${escapeHtml(user.email)}</div>
              <div>${escapeHtml((user.storeRoles || []).map((role) => workwearRoleLabel(role)).join(", ") || "Bez funkcije")}</div>
              <div>${Array.isArray(user.allowedSites) ? `Site: ${escapeHtml(user.allowedSites.join(", "))}` : "Sva gradilista"}</div>
            </div>
            <div class="workwear-order-actions">
              <span>${user.active === false ? "Neaktivan" : "Aktivan"}</span>
              <button class="btn btn-small" data-cmax-action="workwear.editStoreUser" data-cmax-args='${escapeHtml(JSON.stringify([user.email]))}'>Uredi</button>
              <button class="btn btn-small" data-cmax-action="workwear.requestPasswordReset" data-cmax-args='${escapeHtml(JSON.stringify([user.email]))}'>Zatrazi reset</button>
            </div>
          </div>
        `).join("")}
      </div>
      <h4>Password reset zahtjevi</h4>
      <div class="store-orders-list">
        ${requests.length ? requests.map((request) => `
          <div class="workwear-cart-item">
            <div>
              <strong>${escapeHtml(request.userEmail || "-")}</strong>
              <div>Status: ${escapeHtml(request.status || "pending")}</div>
              <div>Zatrazeno: ${escapeHtml(request.requestedBy || "-")} · ${new Date(request.requestedAt || Date.now()).toLocaleString(getCurrentLocale())}</div>
            </div>
            <div class="workwear-order-actions">
              ${request.status === "pending" && appState.isSuperAdmin ? `
                <button class="btn btn-small" data-cmax-action="workwear.approvePasswordReset" data-cmax-server-action="true" data-cmax-loading-key="loadingAdminSave" data-cmax-args='${escapeHtml(JSON.stringify([request.id]))}'>Odobri</button>
                <button class="btn btn-small btn-danger" data-cmax-action="workwear.rejectPasswordReset" data-cmax-args='${escapeHtml(JSON.stringify([request.id]))}'>Odbij</button>
              ` : `<span>${escapeHtml(request.status || "-")}</span>`}
            </div>
          </div>
        `).join("") : `<div class="module-empty-state">Nema zahtjeva.</div>`}
      </div>
    </div>
  `;
}

function renderWorkwearExportPanel() {
  const panel = document.getElementById("workwearExportPanel");
  if (!panel || !canManageWorkwearModule()) return;
  panel.innerHTML = `
    <div class="workwear-admin-card">
      <h3>Export</h3>
      <div class="workwear-admin-grid">
        <select id="workwearExportSiteScope" class="store-input">
          <option value="all">Export sva gradilista</option>
          <option value="single">Export po gradilistu</option>
        </select>
        <select id="workwearExportSite" class="store-input">
          ${getWorkwearManagerSites().map((site) => `<option value="${escapeHtml(site)}">${escapeHtml(site)}</option>`).join("")}
        </select>
        <select id="workwearExportOrderScope" class="store-input">
          <option value="pending-approved">Pending/Approved</option>
          <option value="all">Sve narudzbe</option>
        </select>
        <input id="workwearExportUntilDate" class="store-input" type="date" />
        <select id="workwearExportFormat" class="store-input">
          <option value="csv">Excel/CSV</option>
          <option value="pdf">PDF</option>
        </select>
      </div>
      <div class="workwear-cart-actions">
        <button class="btn" data-cmax-action="workwear.runExportWizard" data-cmax-server-action="true" data-cmax-loading-key="loadingStoreExport">Generiraj export</button>
      </div>
    </div>
  `;
}

function renderWorkwearDashboard() {
  const panel = getWorkwearDashboardPanel();
  if (!panel) return;
  panel.innerHTML = "";
}

function renderWorkwearManagerTabs() {
  const manager = document.getElementById("workwearManagerPanels");
  if (!manager) return;
  const visible = canManageWorkwearModule() && workwearManagerEditorOpen;
  manager.style.display = visible ? "block" : "none";
  if (!visible) return;
  ["products", "categories", "orders", "budgets", "rules", "export", "audit"].forEach((tab) => {
    const el = document.getElementById(`workwearManagerTab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`);
    if (el) el.classList.toggle("is-active", workwearManagerTab === tab);
  });
}

function renderWorkwearSidebarBadge() {
  const badge = document.getElementById("storeSidebarBadge");
  if (!badge) return;
  if (!canManageWorkwearModule()) {
    badge.style.display = "none";
    badge.textContent = "0";
    return;
  }
  const pendingCount = (getWorkwearState().orders || []).filter((order) => order.status === "Pending").length;
  badge.textContent = String(pendingCount);
  badge.style.display = pendingCount > 0 ? "inline-flex" : "none";
}

function renderWorkwearModule() {
  if (typeof initWorkwearOverlayInteractions === "function") initWorkwearOverlayInteractions();
  if (typeof syncWorkwearAccountNotifications === "function") {
    syncWorkwearAccountNotifications();
    if (typeof updateAccountNotificationsBadge === "function") updateAccountNotificationsBadge();
  }
  renderWorkwearFilters();
  renderWorkwearHeaderControls();
  renderWorkwearProducts();
  renderWorkwearCart();
  renderWorkwearCartBadge();
  renderWorkwearCartOverlay();
  renderWorkwearOrdersOverlay();
  renderWorkwearImageViewer();
  renderWorkwearOrders();
  renderWorkwearSidebarBadge();
  renderWorkwearManagerOverlay();
  renderWorkwearManagerTabs();
  renderWorkwearBulkEditPanel();
  renderWorkwearAdminPanel();
  renderWorkwearCategoriesPanel();
  renderWorkwearManagerOrders();
  renderWorkwearBudgetPanel();
  renderWorkwearRulesPanel();
  if (currentView === "admin" || currentView === "workwear") renderWorkwearUsersPanel();
  renderWorkwearExportPanel();
  renderWorkwearDashboard();
  renderWorkwearAuditLog();
}

function renderWorkwearAuditLog() {
  const container = document.getElementById("workwearAuditLog");
  if (!container) return;
  if (!canViewWorkwearAnalyticsModule()) {
    container.innerHTML = "";
    return;
  }
  const logs = (getWorkwearState().auditLog || []).slice(-40).reverse();
  if (!logs.length) {
    container.innerHTML = `<div class="module-empty-state">No store audit entries.</div>`;
    return;
  }
  container.innerHTML = logs
    .map((entry) => `
      <div class="workwear-audit-row">
        <strong>${escapeHtml(entry.eventType || "event")}</strong>
        <span>${escapeHtml(entry.actorName || entry.actor || "System")} · ${new Date(entry.timestamp || Date.now()).toLocaleString(getCurrentLocale())}</span>
      </div>
    `)
    .join("");
}
