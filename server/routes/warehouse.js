function registerWarehouseRoutes(apiRouter, deps) {
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
    sessionHasPermission,
    upload,
  } = deps;

  apiRouter.get('/warehouse/export/:format(excel|pdf)', requirePermission('canExportWarehouse'), async (req, res, next) => {
    try {
      const site = sanitizeString(req.query.site || req.session.currentSite || 'default', 80);
      if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
      if (!sessionHasPermission(req.session, 'canViewLogs')) return res.status(403).json({ error: 'Warehouse export includes logs. Missing canViewLogs permission.' });
      const payload = await getModulePayload('warehouse', site);
      const readable = buildReadableExport('warehouse', payload);
      if (req.params.format === 'pdf') {
        const buffer = await exportModulePDF(`Skladiste - ${site}`, payload, readable.text);
        sendModuleDownload(res, buffer, 'application/pdf', `skladiste-${site}-${Date.now()}.pdf`);
      } else {
        const buffer = await exportModuleWorkbook(payload, readable.sheets);
        sendModuleDownload(res, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `skladiste-${site}-${Date.now()}.xlsx`);
      }
      await logActivity(req.session.email, `export_warehouse_${req.params.format}`, { site, includeLogs: true });
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post('/warehouse/import/:format(excel|pdf)', requirePermission('canImportWarehouse'), upload.single('file'), async (req, res, next) => {
    try {
      if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot import' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const site = sanitizeString(req.body?.site || req.session.currentSite || 'default', 80);
      if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
      if (!sessionHasPermission(req.session, 'canViewLogs')) return res.status(403).json({ error: 'Warehouse import includes logs. Missing canViewLogs permission.' });
      const payload = req.params.format === 'pdf'
        ? parseModulePayloadFromPdfText(await extractPdfText(req.file.path), 'warehouse')
        : await parseModulePayloadFromExcel(req.file.path, 'warehouse');
      await importModulePayload('warehouse', site, payload, req.session);
      await logActivity(req.session.email, `import_warehouse_${req.params.format}`, { site, includeLogs: true });
      deps.unlinkUpload(req.file.path);
      res.json({ ok: true, imported: true, logsImported: Array.isArray(payload.logs) ? payload.logs.length : 0 });
    } catch (error) {
      if (req.file) deps.unlinkUpload(req.file.path);
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      if (error?.message === 'PDF_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'PDF structure not recognized' });
      if (error?.message === 'EXCEL_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'Excel structure not recognized' });
      next(error);
    }
  });
}

module.exports = { registerWarehouseRoutes };
