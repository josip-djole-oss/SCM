const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadSource(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

try {
  const context = {
    console,
    currentSite: "Site-A",
    sites: ["Site-A"],
    appState: { currentUser: "worker@demo.test" },
    WORKWEAR_STORAGE_PREFIX: "cmax_workwear_data",
    localStorage: {
      _data: Object.create(null),
      getItem(key) { return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null; },
      setItem(key, value) { this._data[key] = String(value); },
      removeItem(key) { delete this._data[key]; },
    },
    getSiteStorageKey(prefix, site) { return `${prefix}_${site}`; },
    safeParseStoredJson(value, fallback) {
      if (!value) return fallback;
      try { return JSON.parse(value); } catch (_e) { return fallback; }
    },
    compareNaturally(a, b) { return String(a || "").localeCompare(String(b || "")); },
    getUserDisplayName(email) { return String(email || ""); },
    getAdmins() {
      return [
        { email: "worker@demo.test", fullName: "Worker Demo", storeRoles: ["radnik"], active: true },
      ];
    },
  };
  vm.createContext(context);
  vm.runInContext(loadSource("public/js/workwear/workwearState.js"), context);

  const state = context.getWorkwearState();
  state.settings.freeRulesEnabled = true;
  state.settings.freeRules = { enabled: true, mode: "firstProduct", periodDays: 180 };

  state.products = [
    context.normalizeStoreProduct({
      id: "P-500",
      name: "Jakna 500",
      category: "Odjeca",
      price: 500,
      creditCost: 0,
      usesBudget: true,
      freeRule: { enabled: false, mode: "none", periodDays: 180 },
      upgradeRule: { enabled: false, companyCoveredAmount: 0, differenceAmount: 0 },
      sizes: ["M"],
    }),
    context.normalizeStoreProduct({
      id: "P-FREE",
      name: "Majica free",
      category: "Odjeca",
      price: 500,
      creditCost: 500,
      usesBudget: true,
      freeRule: { enabled: true, mode: "firstProduct", periodDays: 180 },
      sizes: ["M"],
    }),
    context.normalizeStoreProduct({
      id: "P-UPG",
      name: "Cipele upgrade",
      category: "Obuca",
      price: 500,
      creditCost: 500,
      usesBudget: true,
      freeRule: { enabled: false, mode: "none", periodDays: 180 },
      upgradeRule: { enabled: true, companyCoveredAmount: 350, differenceAmount: 150 },
      sizes: ["42"],
    }),
  ];

  const profile = context.ensureWorkerWorkwearProfile("worker@demo.test");
  profile.creditBalance = 2000;

  const totalsOne = context.computeWorkwearOrderTotals([
    { productId: "P-500", size: "M", quantity: 1 },
  ], "worker@demo.test");
  assertEq(Math.round(totalsOne.subtotal), 500, "usesBudget price x1");

  const totalsTwo = context.computeWorkwearOrderTotals([
    { productId: "P-500", size: "M", quantity: 2 },
  ], "worker@demo.test");
  assertEq(Math.round(totalsTwo.subtotal), 1000, "usesBudget price x2");

  const fakePanel = { innerHTML: "" };
  context.document = {
    getElementById(id) {
      if (id === "workwearCartPanel") return fakePanel;
      return null;
    },
    querySelector() { return null; },
  };
  context.CMAX_PERF = null;
  context.escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  context.t = (key) => ({
    cart: "Cart",
    emptyCart: "Cart is empty.",
    budget: "Budget",
    checkout: "Checkout",
  }[key] || key);
  context.getWorkwearCartPanel = () => fakePanel;
  vm.runInContext(loadSource("public/js/workwear/workwearRender.js"), context);
  const cart = context.getWorkwearCartForCurrentUser();
  cart.items = [{ productId: "P-500", size: "M", quantity: 1 }];
  context.renderWorkwearCart();
  if (!fakePanel.innerHTML.includes("500 SEK")) {
    throw new Error(`UI cart total did not render 500 SEK for qty 1: ${fakePanel.innerHTML}`);
  }
  cart.items = [{ productId: "P-500", size: "M", quantity: 2 }];
  context.renderWorkwearCart();
  if (!fakePanel.innerHTML.includes("1000 SEK")) {
    throw new Error(`UI cart total did not render 1000 SEK for qty 2: ${fakePanel.innerHTML}`);
  }

  const totalsFree = context.computeWorkwearOrderTotals([
    { productId: "P-FREE", size: "M", quantity: 1 },
  ], "worker@demo.test");
  assertEq(Math.round(totalsFree.subtotal), 0, "free rule subtotal");

  const totalsUpgrade = context.computeWorkwearOrderTotals([
    { productId: "P-UPG", size: "42", quantity: 1, useUpgrade: true },
  ], "worker@demo.test");
  assertEq(Math.round(totalsUpgrade.subtotal), 150, "upgrade difference subtotal");
  assertEq(Math.round(totalsUpgrade.differenceTotal), 150, "upgrade difference total");

  const events = loadSource("public/js/workwear/workwearEvents.js");
  if (!events.includes("Insufficient budget") && !events.includes("insufficientBudget")) {
    throw new Error("Missing insufficient budget guard in submit flow");
  }

  console.log(JSON.stringify({
    ok: true,
    checks: [
      "usesBudget_x1_500",
      "usesBudget_x2_1000",
      "ui_cart_total_500",
      "ui_cart_total_1000",
      "free_rule_zero",
      "upgrade_difference",
      "insufficient_budget_guard_present",
    ],
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
