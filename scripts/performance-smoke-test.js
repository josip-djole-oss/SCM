const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

try {
  const storage = read("public/js/utils/storage.js");
  const namespace = read("public/js/core/namespace.js");
  const dataSync = read("public/js/core/dataSync.js");
  const sync = read("public/js/core/sync.js");
  const events = read("public/js/core/events.js");
  const workwearRender = read("public/js/workwear/workwearRender.js");
  const workwearEvents = read("public/js/workwear/workwearEvents.js");
  const workwearApi = read("public/js/workwear/workwearApi.js");
  const notifications = read("public/js/notifications/notifications.js");
  const warehouse = read("public/js/warehouse/warehouse.js");
  const reports = read("public/js/reports/reports.js");
  const surveys = read("public/js/surveys/surveys.js");
  const tidplanRender = read("public/js/tidplan/tidplanRender.js");
  const tidplanEvents = read("public/js/tidplan/tidplanEvents.js");
  const html = read("public/index.html");
  const styles = read("public/styles.css");

  mustContain(storage, "function debounce(", "debounce helper");
  mustContain(storage, "function throttle(", "throttle helper");
  mustContain(storage, "getCachedStorageJson", "cached JSON storage helper");
  mustContain(storage, "CMAX_PERF", "performance debug helper");

  mustContain(namespace, "data-cmax-debounce", "delegated debounce support");
  mustContain(namespace, "data-cmax-throttle", "delegated throttle support");
  mustContain(events, "document.body.dataset.cmaxCoreEventsBound", "listener duplication guard");
  mustContain(events, "cmaxDebounce", "debounced notifications search");

  mustContain(dataSync, "function renderActiveSharedModule()", "shared render scheduler");
  mustContain(dataSync, "setCachedStorageJson(STORAGE_KEY", "cached planner persistence");
  mustContain(dataSync, "CMAX_PERF?.begin?.(\"sync-server-state\"", "sync performance measurement");
  mustContain(sync, "renderActiveSharedModule", "sync render dedupe");

  mustContain(workwearRender, "WORKWEAR_PRODUCTS_PER_PAGE = 20", "store product page size");
  mustContain(workwearRender, "workwearOrderRenderLimit", "store order lazy render limit");
  mustContain(workwearRender, "data-cmax-debounce=\"160\"", "debounced quantity input");
  mustContain(workwearRender, "loading=\"lazy\"", "lazy-loaded store images");
  mustContain(workwearEvents, "function workwearNextProductPage()", "store product next page");
  mustContain(workwearEvents, "function workwearLoadMoreOrders()", "store load more orders");
  mustContain(workwearApi, "AbortController", "store order request cancellation");

  mustContain(notifications, "notificationsListRenderLimit", "notifications render limit");
  mustContain(notifications, "loadMoreNotificationsList", "notifications load more");
  mustContain(notifications, "AbortController", "notifications request cancellation");
  mustContain(warehouse, "warehouseLogRenderLimit", "warehouse log render limit");
  mustContain(warehouse, "loadMoreWarehouseLogs", "warehouse log load more");
  mustContain(reports, "reportRenderLimit", "reports render limit");
  mustContain(reports, "loadMoreReports", "reports load more");
  mustContain(surveys, "surveyRenderLimit", "surveys render limit");
  mustContain(surveys, "loadMoreSurveys", "surveys load more");
  mustContain(surveys, "AbortController", "surveys request cancellation");

  mustContain(tidplanRender, "cmaxScheduleFrame(\"tidplan-layout-sync\"", "tidplan frame-scheduled sync");
  mustContain(tidplanRender, "cmaxThrottle(syncFromLeft, 16)", "tidplan throttled scroll sync");
  mustContain(tidplanEvents, "resizer.dataset.cmaxResizerBound", "tidplan resizer duplicate listener guard");
  mustContain(tidplanEvents, "cmaxThrottle((e) => {", "tidplan throttled resize drag");

  mustContain(html, 'data-cmax-debounce="220"', "debounced store search input");
  mustContain(styles, "content-visibility: auto;", "content visibility optimization");
  mustContain(styles, "contain: layout paint style;", "paint containment optimization");

  console.log(JSON.stringify({ ok: true, checks: 30 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
