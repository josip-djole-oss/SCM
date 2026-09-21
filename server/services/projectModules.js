const registry = require('../../public/js/core/moduleRegistry');

function configFor(state, site) {
  const saved = state?.projectModules?.[site];
  return { site, modules: registry.normalize(saved), version: Math.max(1, Number(saved?.version) || 1), updatedAt: saved?.updatedAt || null };
}

function isEnabled(state, site, moduleId) {
  return registry.isEnabled(configFor(state, site), moduleId);
}

function accessError(message, code = 403) {
  return Object.assign(new Error(message), { statusCode: code, code: message });
}

function assertEnabled(state, session, site, moduleId, canAccessSite) {
  if (!canAccessSite(session, site)) throw accessError('SITE_ACCESS_DENIED');
  if (!state?.sites?.includes(site)) throw accessError('PROJECT_NOT_FOUND', 404);
  if (!isEnabled(state, site, moduleId)) throw accessError('MODULE_DISABLED');
}

function canRead(session, definition) {
  return Boolean(session?.isSuperAdmin || definition.accessPermissions.some((key) => session?.permissions?.[key] === true));
}

function filterState(state, session, canAccessSite) {
  const sites = (state.sites || []).filter((site) => canAccessSite(session, site));
  const result = { ...state, sites, siteData: {}, projectModules: {} };
  for (const site of sites) {
    const entry = { ...(state.siteData?.[site] || {}) };
    const config = configFor(state, site);
    result.projectModules[site] = config;
    for (const definition of registry.list) {
      if (!registry.isEnabled(config, definition.id) || !canRead(session, definition)) {
        definition.stateKeys.forEach((key) => delete entry[key]);
      }
    }
    // Resource lists are shared by Planner, Tidplan and Sompturnor; they are not a dependency on Planner UI.
    if (!['planner', 'tidplan', 'bins'].some((id) => isEnabled(state, site, id) && canRead(session, registry.get(id)))) {
      ['workers', 'lifts', 'moments', 'plans', 'karnas', 'resourceHistory'].forEach((key) => delete entry[key]);
    }
    const store = entry.store;
    if (store) {
      entry.store = { ...store, passwordResetRequests: (store.passwordResetRequests || []).map(({ generatedPassword, ...request }) => request) };
    }
    if (store && !session.isSuperAdmin && !session.permissions?.canManageStore && !session.permissions?.canManageWorkwear) {
      const email = String(session.email || '').toLowerCase();
      entry.store.orders = (store.orders || []).filter((order) => session.permissions?.canViewStoreTeamOrders || String(order.workerId || '').toLowerCase() === email);
      if (!session.permissions?.canManageAdmins) entry.store.passwordResetRequests = entry.store.passwordResetRequests.filter((request) => request.userEmail === email);
      if (!session.permissions?.canManageStoreBudgets && !session.permissions?.canManageWorkwearCredits && !session.permissions?.canViewStoreManagerDashboard && !session.permissions?.canViewWorkwearAnalytics) {
        entry.store.workerProfiles = store.workerProfiles?.[email] ? { [email]: store.workerProfiles[email] } : {};
        entry.store.creditLedger = (store.creditLedger || []).filter((row) => String(row.workerId || row.email || '').toLowerCase() === email);
      }
      entry.store.carts = store.carts?.[email] ? { [email]: store.carts[email] } : {};
      for (const key of ['userCredits', 'credits', 'budgets', 'userBudgets']) {
        if (store[key] && !session.permissions?.canManageStoreBudgets && !session.permissions?.canManageWorkwearCredits) {
          entry.store[key] = Array.isArray(store[key]) ? store[key].filter((row) => String(row.workerId || row.email || '').toLowerCase() === email) : { [email]: store[key][email] };
        }
      }
    }
    result.siteData[site] = entry;
  }
  // Historical flat copies may belong to a different site. Recreate them only from the scoped active site.
  const activeSite = sites.includes(state.currentSite) ? state.currentSite : sites[0];
  result.currentSite = activeSite || '';
  const active = result.siteData[activeSite] || {};
  for (const definition of registry.list) definition.stateKeys.forEach((key) => { delete result[key]; });
  for (const key of ['workers', 'lifts', 'moments', 'plans', 'karnas', 'dailyData', 'resourceHistory']) {
    delete result[key];
    if (active.planner?.[key] !== undefined) result[key] = active.planner[key];
  }
  if (active.bins !== undefined) result.binsData = active.bins;
  if (active.tidplan !== undefined) result.tidplan = active.tidplan;
  if (active.tidplanZones !== undefined) result.tidplanZones = active.tidplanZones;
  if (state.accountNotifications) {
    result.accountNotifications = Object.fromEntries(Object.entries(state.accountNotifications).map(([email, bundle]) => [email, {
      ...bundle,
      notifications: (bundle.notifications || []).filter((item) => {
        const moduleId = registry.get(item.module)?.id || registry.forScreen(item.targetView)?.id || registry.get(item.type)?.id || (/chat/i.test(item.type || item.kind || '') ? 'chat' : null);
        return !moduleId || (item.site && sites.includes(item.site) && isEnabled(state, item.site, moduleId));
      }),
    }]));
  }
  return result;
}

function protectSubmittedState(previous, submitted, session, canAccessSite) {
  for (const [site, entry] of Object.entries(submitted?.siteData || {})) {
    if (!canAccessSite(session, site)) throw accessError('SITE_ACCESS_DENIED');
    for (const definition of registry.list) {
      if (isEnabled(previous, site, definition.id)) continue;
      for (const key of definition.stateKeys) {
        if (Object.hasOwn(entry, key) && JSON.stringify(entry[key]) !== JSON.stringify(previous.siteData?.[site]?.[key])) throw accessError('MODULE_DISABLED');
      }
    }
  }
}

module.exports = { registry, configFor, isEnabled, assertEnabled, accessError, filterState, protectSubmittedState, canRead };
