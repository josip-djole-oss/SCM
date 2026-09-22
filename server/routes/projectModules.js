const modules = require('../services/projectModules');

function registerProjectModuleRoutes(router, deps) {
  const { getState, stateFile, mutateVersionedJsonFile, canAccessSite, requireSuperAdmin, realtime, logActivity } = deps;
  router.get('/events', realtime.connect);
  router.get('/projects/:site/modules', async (req, res, next) => {
    try {
      const site = req.params.site;
      const state = await getState();
      if (!canAccessSite(req.session, site)) throw modules.accessError('SITE_ACCESS_DENIED');
      if (!state.sites.includes(site)) throw modules.accessError('PROJECT_NOT_FOUND', 404);
      res.json({ ...modules.configFor(state, site), registry: modules.registry.list });
    } catch (error) { next(error); }
  });
  router.put('/projects/:site/modules', requireSuperAdmin, async (req, res, next) => {
    try {
      const site = req.params.site;
      const submitted = req.body?.modules;
      if (!submitted || Array.isArray(submitted) || typeof submitted !== 'object' ||
          Object.entries(submitted).some(([id, value]) => !modules.registry.list.some((item) => item.id === id) || typeof value !== 'boolean')) {
        throw modules.accessError('INVALID_MODULE_CONFIGURATION', 400);
      }
      if (!Number.isInteger(req.body.baseVersion) || req.body.baseVersion < 1) throw modules.accessError('MODULE_VERSION_REQUIRED', 400);
      let saved;
      let changed = false;
      await mutateVersionedJsonFile(stateFile, null, async (state) => {
        if (!state?.sites?.includes(site)) throw modules.accessError('PROJECT_NOT_FOUND', 404);
        const current = modules.configFor(state, site);
        const nextModules = modules.registry.normalize({ ...current.modules, ...submitted });
        if (current.version !== req.body.baseVersion && JSON.stringify(nextModules) !== JSON.stringify(current.modules)) {
          throw modules.accessError('MODULE_VERSION_CONFLICT', 409);
        }
        changed = JSON.stringify(nextModules) !== JSON.stringify(current.modules);
        saved = { site, modules: nextModules, version: current.version + (changed ? 1 : 0), updatedAt: changed ? new Date().toISOString() : current.updatedAt };
        return { ...state, projectModules: { ...state.projectModules, [site]: saved } };
      });
      if (changed) {
        await logActivity(req.session.email, 'project_modules_updated', { site, modules: saved.modules, version: saved.version });
        realtime.publish('project-modules-changed', saved, { site });
      }
      res.json({ ...saved, registry: modules.registry.list });
    } catch (error) { next(error); }
  });
}

function createProjectModuleGuard({ getState, canAccessSite, realtime, getToolroomDocument }) {
  return async (req, res, next) => {
    try {
      const path = req.path;
      const segments = path.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
      let definition = modules.registry.forScreen(segments[0]);
      if (path === '/state/module') {
        const target = req.body?.target;
        definition = modules.registry.get(/^store/.test(target || '') ? 'store' : target);
      }
      const pathSite = (segments[0] === 'site-chat' && !['sites', 'unread'].includes(segments[1])) ||
        (['planner', 'tidplan'].includes(segments[0]) && !['import', 'export'].includes(segments[1]));
      const site = String((pathSite ? segments[1] : '') || req.query.site || req.body?.siteId || req.body?.site || req.get('x-project-site') || req.session.currentSite || 'default');
      const readOnlyAction = req.method === 'GET' || req.method === 'HEAD' || path === '/presence' || /\/read$/.test(path);
      if (req.session.isReadonly && !readOnlyAction && path !== '/account/password') throw modules.accessError('READONLY_FORBIDDEN');
      if (definition && !['/site-chat/sites', '/site-chat/unread'].includes(path)) {
        if (!modules.canRead(req.session, definition)) throw modules.accessError('MODULE_ACCESS_DENIED');
        // Multipart fields are checked by the upload service after parsing them.
        if (!req.is('multipart/form-data')) {
          const state = await getState();
          modules.assertEnabled(state, req.session, site, definition.id, canAccessSite);
          if (req.get('x-project-site')) req.session.currentSite = site;
          if (definition.id === 'toolroom' && !readOnlyAction) {
            const document = await getToolroomDocument();
            const targetSite = req.body?.holderSiteId || req.body?.siteId;
            if (targetSite) modules.assertEnabled(state, req.session, targetSite, 'toolroom', canAccessSite);
            const targetId = req.body?.toolId || req.body?.replacementToolId || segments[2];
            const related = document.items.find((item) => item.id === targetId) || document.faults.find((row) => row.id === targetId);
            const item = related?.toolId ? document.items.find((row) => row.id === related.toolId) : related;
            if (item?.currentHolderSiteId) modules.assertEnabled(state, req.session, item.currentHolderSiteId, 'toolroom', canAccessSite);
          }
        }
        req.projectModule = definition.id;
        req.projectSite = site;
      }
      if (!readOnlyAction && !/^\/projects\//.test(path)) {
        res.once('finish', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) realtime.publish('state-changed', {
            site: req.projectSite || null,
            module: req.projectModule || null,
            clientInstanceId: String(req.get('x-client-instance-id') || '').slice(0, 120) || null,
          }, req.projectSite ? { site: req.projectSite } : {});
        });
      }
      next();
    } catch (error) { next(error); }
  };
}
module.exports = { registerProjectModuleRoutes, createProjectModuleGuard };
