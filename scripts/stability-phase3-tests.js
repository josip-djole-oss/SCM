const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tidplanRender = read("public/js/tidplan/tidplanRender.js");
const importExport = read("public/js/importExport/importExport.js");
const auth = read("public/js/core/auth.js");
const siteChat = read("public/js/siteChat/siteChat.js");
const siteChatRender = read("public/js/siteChat/siteChatRender.js");
const siteChatState = read("public/js/siteChat/siteChatState.js");

assert(
  tidplanRender.includes('inputKomentar.addEventListener("input"') &&
    tidplanRender.includes('markTidplanChanged(activityIndex, "komentar");'),
  "Tidplan comment input must update local draft/change tracking without waiting for full module save.",
);
assert(
  tidplanRender.includes("__baseFieldVersions") &&
    tidplanRender.includes("baseFieldVersions: activity.__baseFieldVersions || activity.fieldVersions || {}"),
  "Tidplan comment/activity saves must keep edit-start base field versions for conflict accuracy.",
);
assert(
  !/inputKomentar\.addEventListener\("input"[\s\S]{0,240}patchTidplanActivity/.test(tidplanRender),
  "Tidplan comment typing must not PATCH on every input event.",
);
assert(
  importExport.includes('if (currentView === "bins")') &&
    importExport.includes("saveBinsData();") &&
    importExport.includes('} else if (currentView === "tidplan")') &&
    importExport.includes("saveTidplanData();") &&
    importExport.includes('} else if (currentView === "main")') &&
    importExport.includes("saveData();"),
  "Save-all/autosave must be view-scoped and not save Planner and Bins together.",
);
assert(
  auth.includes("siteChatCleanupDom") &&
    siteChat.includes("function siteChatCleanupDom()") &&
    siteChat.includes("root.replaceChildren();"),
  "Site Chat DOM must be cleared when leaving the module.",
);
assert(
  siteChatState.includes("renderLimit: 120") &&
    siteChatRender.includes("const renderLimit = Number(siteChatState.renderLimit) || 120") &&
    siteChatRender.includes("allMessages.slice(-renderLimit)"),
  "Site Chat must render a bounded message window during long sessions.",
);

console.log(JSON.stringify({
  ok: true,
  checks: [
    "tidplan_comment_local_draft_no_per_key_patch",
    "tidplan_base_field_versions_preserved",
    "planner_bins_view_scoped_save",
    "site_chat_dom_cleanup_on_leave",
    "site_chat_bounded_message_render_window",
  ],
}, null, 2));
