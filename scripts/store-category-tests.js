const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, token, label) {
  if (!source.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const events = read("public/js/workwear/workwearEvents.js");
  const render = read("public/js/workwear/workwearRender.js");
  const state = read("public/js/workwear/workwearState.js");

  mustContain(state, "categoryCatalog", "category catalog state");
  mustContain(events, "workwearAddCategory", "category add handler");
  mustContain(events, "workwearRenameCategory", "category rename handler");
  mustContain(events, "workwearArchiveCategory", "category archive/delete handler");
  mustContain(events, "workwearAddSubcategory", "subcategory add handler");
  mustContain(events, "workwearRenameSubcategory", "subcategory rename handler");
  mustContain(events, "workwearArchiveSubcategory", "subcategory archive/delete handler");
  mustContain(render, "workwearCategoriesPanel", "categories manager panel");
  mustContain(render, "quickAddWizardCategory", "wizard quick category add");
  mustContain(render, "quickAddWizardSubcategory", "wizard quick subcategory add");

  console.log(JSON.stringify({ ok: true, checks: 10 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
