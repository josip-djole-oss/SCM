function registerPlannerRoutes(apiRouter, deps) {
  const {
    buildReadableExport,
    canAccessSite,
    extractPdfText,
    exportModulePDF,
    exportModuleWorkbook,
    getModulePayload,
    importModulePayload,
    logActivity,
    parseModulePayloadFromExcel,
    parseModulePayloadFromPdfText,
    requirePermission,
    sanitizeString,
    sendModuleDownload,
    upload,
  } = deps;

  apiRouter.get('/planner/export/:format(excel|pdf)', requirePermission('canExportPlanner'), async (req, res, next) => {
    try {
      const site = sanitizeString(req.query.site || 'default', 80);
      if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
      const payload = await getModulePayload('planner', site);
      const readable = buildReadableExport('planner', payload);
      if (req.params.format === 'pdf') {
        const buffer = await exportModulePDF(`Planner - ${site}`, payload, readable.text);
        sendModuleDownload(res, buffer, 'application/pdf', `planner-${site}-${Date.now()}.pdf`);
      } else {
        const buffer = await exportModuleWorkbook(payload, readable.sheets);
        sendModuleDownload(res, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `planner-${site}-${Date.now()}.xlsx`);
      }
      await logActivity(req.session.email, `export_planner_${req.params.format}`, { site });
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post('/planner/import/:format(excel|pdf)', requirePermission('canImportPlanner'), upload.single('file'), async (req, res, next) => {
    try {
      if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot import' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const site = sanitizeString(req.body?.site || 'default', 80);
      if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
      const payload = req.params.format === 'pdf'
        ? parseModulePayloadFromPdfText(await extractPdfText(req.file.path), 'planner')
        : await parseModulePayloadFromExcel(req.file.path, 'planner');
      if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) return res.status(400).json({ error: 'Planner import data must be an object' });
      await importModulePayload('planner', site, payload, req.session);
      await logActivity(req.session.email, `import_planner_${req.params.format}`, { site });
      deps.unlinkUpload(req.file.path);
      res.json({ ok: true, imported: true });
    } catch (error) {
      if (req.file) deps.unlinkUpload(req.file.path);
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      if (error?.message === 'PDF_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'PDF structure not recognized' });
      if (error?.message === 'EXCEL_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'Excel structure not recognized' });
      next(error);
    }
  });
}

module.exports = { registerPlannerRoutes };
