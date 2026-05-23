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
  const styles = read("public/styles.css");

  mustContain(render, "WORKWEAR_PRODUCT_WIZARD_STEPS", "central Store wizard steps");
  mustContain(render, "Store Product Wizard", "wizard header");
  mustContain(render, "Korak ${workwearProductWizardStep} / ${WORKWEAR_PRODUCT_WIZARD_STEPS.length}", "step count meta");
  mustContain(render, "workwear-step-pill", "modern step pill");
  mustContain(render, "is-done", "completed step state");
  mustContain(render, "Slijedi:", "next step hint");
  mustContain(render, "Odustani", "cancel action");
  mustContain(render, ">Dalje<", "next footer action");
  mustContain(render, ">Spremi<", "save footer action");
  mustContain(styles, ".workwear-wizard-progress", "wizard progress CSS");
  mustContain(styles, ".workwear-stepper-modern", "modern stepper CSS");
  mustContain(styles, ".workwear-step-pill.is-active", "active step CSS");
  mustContain(styles, ".workwear-step-pill.is-done", "done step CSS");

  console.log(JSON.stringify({ ok: true, checks: 13 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
