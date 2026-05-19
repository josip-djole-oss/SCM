const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(src, token, label) {
  if (!src.includes(token)) {
    throw new Error(`Missing ${label}: ${token}`);
  }
}

try {
  const state = read("public/js/workwear/workwearState.js");
  const render = read("public/js/workwear/workwearRender.js");
  const events = read("public/js/workwear/workwearEvents.js");
  const namespace = read("public/js/core/namespace.js");
  const css = read("public/styles.css");

  mustContain(state, "STORE_DEFAULT_SIZE_PRESETS", "central size preset defaults");
  mustContain(state, '"35", "36", "37"', "shoe preset starts at 35");
  mustContain(state, '"48", "49", "50"', "shoe preset ends at 50");
  mustContain(state, "sizePresetCatalog", "saved custom size preset catalog");
  mustContain(state, "ensureStoreSizePreset", "custom size preset save helper");

  mustContain(render, "getWorkwearSizePresetOptions", "dynamic wizard size preset options");
  mustContain(render, 'data-cmax-action="workwear.updateWizardSizePreset"', "size preset change action");
  mustContain(render, 'data-cmax-action="workwear.saveWizardSizePreset"', "custom size preset action");
  mustContain(render, "workwear-size-checkbox-grid", "preset checkbox grid");
  mustContain(render, "workwear-product-wizard-scroll", "wizard internal scroll body");

  mustContain(events, "workwearUpdateWizardSizePreset", "preset change handler");
  mustContain(events, "workwearSaveWizardSizePreset", "preset save handler");
  mustContain(events, "size_preset_saved", "size preset audit log");
  mustContain(namespace, "updateWizardSizePreset", "namespace preset change action");
  mustContain(namespace, "saveWizardSizePreset", "namespace preset save action");

  mustContain(css, ".workwear-product-table-wrap", "product table scroll styling");
  mustContain(css, "max-height: min(58dvh, 640px)", "bounded product table height");
  mustContain(css, ".workwear-product-wizard-scroll", "wizard scroll styling");
  mustContain(css, ".workwear-product-wizard > .workwear-cart-actions", "sticky wizard action bar");
  mustContain(css, "max-height: min(62dvh, 680px)", "bounded wizard height");

  console.log(JSON.stringify({ ok: true, checks: 20 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
