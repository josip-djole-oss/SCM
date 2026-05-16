const fs = require("fs");
const path = require("path");

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

try {
  const html = read("public/index.html");
  const adminJs = read("public/js/admin/admin.js");
  const surveysJs = read("public/js/surveys/surveys.js");
  const reportsJs = read("public/js/reports/reports.js");

  assertIncludes(html, 'id="adminModal"', "admin modal root");
  assertIncludes(html, 'id="surveysList"', "surveys list root");
  assertIncludes(html, 'id="reportsList"', "reports list root");

  assertIncludes(adminJs, 'dataset.cmaxAction = "admin.savePerms"', "admin save perms binding");
  assertIncludes(adminJs, 'dataset.cmaxAction = "admin.togglePerms"', "admin toggle perms binding");
  assertIncludes(surveysJs, "function renderSurveysList()", "surveys renderer");
  assertIncludes(reportsJs, 'dataset.cmaxAction = "reports.review"', "reports review binding");
  assertIncludes(reportsJs, 'dataset.cmaxAction = "reports.delete"', "reports delete binding");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "admin-modal",
          "surveys-list",
          "reports-list",
          "admin-bindings",
          "surveys-render",
          "reports-bindings",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
