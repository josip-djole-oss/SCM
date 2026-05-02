function sessionHasPermission(session, permissionKey) {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  return session.permissions && session.permissions[permissionKey] === true;
}

function canAccessSite(session, site = 'default') {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  if (!Array.isArray(session.allowedSites)) return true;
  return session.allowedSites.includes(site || 'default');
}

function createPermissionMiddleware(permissionKey) {
  return (req, res, next) => {
    if (!req.session) return res.status(401).json({ error: 'Authentication required' });
    if (sessionHasPermission(req.session, permissionKey)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = {
  canAccessSite,
  createPermissionMiddleware,
  sessionHasPermission,
};
