function saveCurrentView(view) {
  localStorage.setItem(CURRENT_VIEW_KEY, view);
}

function routeForView(view = currentView) {
  const routes = {
    main: "/planner",
    home: "/home",
    planner: "/planner",
    tidplan: "/tidplan",
    warehouse: "/warehouse",
    warehouseLogs: "/warehouse",
    warehouseGraph: "/warehouse",
    notifications: "/notifications",
    surveys: "/surveys",
    bins: "/bins",
  };
  return routes[view] || "/planner";
}

function viewFromPath(pathname = window.location.pathname) {
  const path = String(pathname || "/").toLowerCase();
  if (path === "/login") return "login";
  if (path === "/" || path === "/home" || path === "/planner") return "main";
  if (path === "/tidplan") return "tidplan";
  if (path === "/warehouse") return "warehouse";
  if (path === "/notifications") return "notifications";
  if (path === "/surveys") return "surveys";
  if (path === "/bins" || path === "/kante") return "bins";
  return null;
}

function pushRouteForView(view = currentView, options = {}) {
  if (suppressRoutePush || !window.history) return;
  const path = options.path || routeForView(view);
  if (window.location.pathname === path) return;
  const state = { view };
  if (options.replace) history.replaceState(state, "", path);
  else history.pushState(state, "", path);
}

function applyRouteFromPath(pathname = window.location.pathname) {
  const view = viewFromPath(pathname);
  if (!view) return false;
  suppressRoutePush = true;
  try {
    if (view === "login") {
      showLogin();
    } else if (view === "main") {
      showPlanner();
    } else if (view === "tidplan") {
      showTidplan();
    } else if (view === "warehouse") {
      showWarehouse();
    } else if (view === "notifications") {
      showNotifications();
    } else if (view === "surveys") {
      showSurveys();
    } else if (view === "bins") {
      if (currentView !== "bins") toggleBinsView();
    }
  } finally {
    suppressRoutePush = false;
  }
  return true;
}

function restoreLastView() {
  if (applyRouteFromPath(window.location.pathname)) return;
  const savedView = localStorage.getItem(CURRENT_VIEW_KEY) || "main";
  if (savedView === "tidplan") {
    if (document.getElementById("tidplan-section").style.display !== "block") {
      showTidplan();
    }
    return;
  }
  if (savedView === "notifications") {
    showNotifications();
    return;
  }
  if (savedView === "bins") {
    if (currentView !== "bins") {
      toggleBinsView();
    }
    return;
  }
  if (savedView === "warehouse") {
    showWarehouse();
    return;
  }
  if (savedView === "warehouseLogs") {
    showWarehouseLogs();
    return;
  }
  if (savedView === "warehouseGraph") {
    showWarehouseGraph();
  }
}
