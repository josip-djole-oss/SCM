const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

try {
  const state = read("public/js/core/state.js");
  const perms = read("public/js/core/permissions.js");
  const auth = read("public/js/core/auth.js");

  ["canAccessWorkwear", "canManageWorkwear", "canManageWorkwearCredits", "canViewWorkwearAnalytics"].forEach((key) => {
    if (!state.includes(key)) throw new Error(`state missing permission key ${key}`);
  });

  ["canAccessWorkwearModule", "canManageWorkwearModule", "canViewWorkwearAnalyticsModule"].forEach((fn) => {
    if (!perms.includes(`function ${fn}`)) throw new Error(`permissions missing ${fn}`);
  });

  if (!auth.includes("navWorkwearBtn")) throw new Error("auth visibility missing navWorkwearBtn");

  console.log(JSON.stringify({ ok: true }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
