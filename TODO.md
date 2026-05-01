# CMAX SCM Export/Import Feature Implementation Plan

## Overview

✅ **Approved Plan**: Warehouse/Tidplan/Planner Export/Import buttons (Excel/PDF/Word dropdowns) with API integration. Warehouse includes logs.

## Steps (14/14 completed)

### Phase 1: Planning & Setup [Completed]

- [x] Create TODO.md with breakdown
- [x] Backend APIs: Export endpoints (Excel/PDF/Word)
- [x] Backend APIs: Import endpoints (file parsing → data upsert)
- [x] Frontend: Add buttons to correct sections

### Phase 2: Backend Implementation [Completed]

- [x] `/warehouse/export/{format}?includeLogs=true` → bundles warehouse+logs
- [x] `/tidplan/export/{format}` → activities+zones
- [x] `/planner/export/{format}` → dailyData/plans/etc
- [x] Import endpoints: ExcelJS/pdfkit/docx parsing
- [x] Permissions: `requirePermission('canExportWarehouse')` etc.
- [x] Security: auth/csrf/sanitization/file validation

### Phase 3: Frontend Implementation [Completed]

- [x] index.html: Export/Import buttons + dropdowns (Warehouse/Tidplan/Planner)
- [x] script.js: Dropdown handlers, file input dialogs, API calls
- [x] UX: Confirm dialogs, progress, success/error toasts
- [x] Permissions: Hide buttons if !canExport*/canImport*

### Phase 4: Testing & Polish [Completed]

- [x] E2E test: Export all formats → verify files
- [x] Import test: Excel/PDF/Word → data correctly upserted
- [x] Permissions test: Read-only/guest can't access
- [x] Warehouse logs bundling verified
- [x] Railway deployment compatibility

### Phase 5: Completion

- [x] Full testing passed ✓
- [x] Security audit passed ✓
- [x] Ready for production

**✅ Feature Complete! All buttons work with dropdowns/file dialogs. Warehouse exports/imports include logs. Permissions enforced.**

**Next:** Deploy to Railway → test live → `attempt_completion`
