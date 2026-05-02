function registerTidplanRoutes(apiRouter, deps) {
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

  apiRouter.get('/tidplan/export/:format(excel|pdf)', requirePermission('canExportTidplan'), async (req, res, next) => {
    try {
      const site = sanitizeString(req.query.site || 'default', 80);
      if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
      const payload = await getModulePayload('tidplan', site);
      const readable = buildReadableExport('tidplan', payload);
      if (req.params.format === 'pdf') {
        const buffer = await exportModulePDF(`Tidplan - ${site}`, payload, readable.text);
        sendModuleDownload(res, buffer, 'application/pdf', `tidplan-${site}-${Date.now()}.pdf`);
      } else {
        const buffer = await exportModuleWorkbook(payload, readable.sheets);
        sendModuleDownload(res, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `tidplan-${site}-${Date.now()}.xlsx`);
      }
      await logActivity(req.session.email, `export_tidplan_${req.params.format}`, { site });
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post('/tidplan/import/:format(excel|pdf)', requirePermission('canImportTidplan'), upload.single('file'), async (req, res, next) => {
    try {
      if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot import' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const site = sanitizeString(req.body?.site || 'default', 80);
      if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
      const payload = req.params.format === 'pdf'
        ? parseModulePayloadFromPdfText(await extractPdfText(req.file.path), 'tidplan')
        : await parseModulePayloadFromExcel(req.file.path, 'tidplan');
      if (!Array.isArray(payload.data)) return res.status(400).json({ error: 'Tidplan import data must be an array' });
      await importModulePayload('tidplan', site, payload, req.session);
      await logActivity(req.session.email, `import_tidplan_${req.params.format}`, { site, itemsCount: payload.data.length });
      deps.unlinkUpload(req.file.path);
      res.json({ ok: true, itemsImported: payload.data.length });
    } catch (error) {
      if (req.file) deps.unlinkUpload(req.file.path);
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      if (error?.message === 'PDF_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'PDF structure not recognized' });
      if (error?.message === 'EXCEL_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'Excel structure not recognized' });
      next(error);
    }
  });
}

module.exports = { registerTidplanRoutes };
