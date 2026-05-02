const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');
const { Document, Packer, Paragraph, Table, TableRow, TableCell } = require('docx');
const { VersionConflictError, createStorage } = require('./services/storage');
const authHelpers = require('./middleware/auth');
const { registerPlannerRoutes } = require('./routes/planner');
const { registerTidplanRoutes } = require('./routes/tidplan');
const { registerWarehouseRoutes } = require('./routes/warehouse');

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const API_BODY_LIMIT = process.env.API_BODY_LIMIT || '5mb';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 15000;
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 8 * 60 * 60 * 1000;
const PRESENCE_TTL_MS = 60000;
const AUTO_BACKUP_INTERVAL_MS = Number(process.env.AUTO_BACKUP_INTERVAL_MS) || 6 * 60 * 60 * 1000; // 6 hours
const STORAGE_INIT_RETRY_MS = Number(process.env.STORAGE_INIT_RETRY_MS) || 3000;
const STORAGE_INIT_MAX_ATTEMPTS = Number(process.env.STORAGE_INIT_MAX_ATTEMPTS) || 0;
const STORAGE_INIT_MAX_RETRY_MS = Number(process.env.STORAGE_INIT_MAX_RETRY_MS) || 30000;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'cmax_session';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'json';
const DATABASE_URL = process.env.DATABASE_URL || '';
const APP_ROOT = path.join(__dirname, '..');
const STATIC_DIR = path.join(APP_ROOT, 'public');

function resolveRuntimePath(value, fallbackPath) {
  if (!value) return fallbackPath;
  return path.isAbsolute(value) ? value : path.resolve(APP_ROOT, value);
}

const DATA_DIR = resolveRuntimePath(process.env.DATA_PATH, path.join(__dirname, 'data'));
const UPLOADS_DIR = resolveRuntimePath(process.env.UPLOAD_PATH, path.join(APP_ROOT, 'uploads'));
const BACKUPS_DIR = resolveRuntimePath(process.env.BACKUP_PATH, path.join(DATA_DIR, 'backups'));
const dataStorage = createStorage({
  storageType: STORAGE_TYPE,
  dataDir: DATA_DIR,
  uploadsDir: UPLOADS_DIR,
  backupsDir: BACKUPS_DIR,
  databaseUrl: DATABASE_URL,
});
const storageAdapter = dataStorage;
const dataDir = dataStorage.dataDir;
const uploadsDir = dataStorage.uploadsDir;
const backupsDir = dataStorage.backupsDir;
const errorLogFile = dataStorage.files?.errorLog || path.join(dataDir, 'server-errors.log');
const stateFile = dataStorage.files?.state || path.join(dataDir, 'state.json');
const adminsFile = dataStorage.files?.admins || path.join(dataDir, 'admins.json');
const logsFile = dataStorage.files?.logs || path.join(dataDir, 'logs.json');
const warehouseFile = dataStorage.files?.warehouse || path.join(dataDir, 'warehouse.json');
const warehouseLogsFile = dataStorage.files?.warehouseLogs || path.join(dataDir, 'warehouse-logs.json');
const sessions = new Map();
const activePresence = new Map();
const storageRuntime = {
  ready: false,
  initializing: false,
  attempts: 0,
  lastError: dataStorage.startupError ? String(dataStorage.startupError.message || dataStorage.startupError) : null,
  lastReadyAt: null,
  retryTimer: null,
  nextRetryAt: null,
  backupIntervalStarted: false,
};

const DEFAULT_PERMISSIONS = {
  canAccessPlanner: true,
  canAccessTidplan: true,
  canAccessBins: true,
  canViewNotifications: true,
  canManageNotifications: false,
  canDeleteNotifications: false,
  canCreateReports: true,
  canOpenAdminPanel: true,
  canManageAdmins: false,
  canManageSiteAccess: false,
  canViewSettings: true,
  canManageGuestAccess: false,
  canPrint: true,
  canExport: true,
  canClear: true,
  canManageTidplan: true,
  canAddTidplanActivity: true,
  canDeleteTidplanActivity: true,
  canManageTidplanZones: true,
  canPrintTidplan: true,
  canClearTidplan: true,
  canManageWorkers: true,
  canManageLifts: true,
  canManageMoments: true,
  canManagePlans: true,
  canManageKarnas: true,
  canEditBinsData: true,
  canManageBinsPlans: true,
  canManageBinsPermissions: true,
  canViewReports: true,
  canApproveReports: true,
  canDeleteReports: true,
  canViewLogs: true,
  canClearLogs: true,
  canViewBackups: true,
  canManageBackups: true,
  canAccessWarehouse: false,
  canViewWarehouse: false,
  canManageWarehouse: false,
  canManageWarehouseStock: false,
  canManageWarehouseIssue: false,
  canExportWarehouse: false,
  canImportWarehouse: false,
  canExportTidplan: true,
  canImportTidplan: true,
  canExportPlanner: true,
  canImportPlanner: true,
  canUnlockPastDays: false,
  canViewSurveys: true,
  canCreateSurveys: false,
  canEditSurveys: false,
  canPublishSurveys: false,
  canViewSurveyResults: false,
  canViewAnonymousSurveyVoters: false,
  canViewBackups: false,
  canManageBackups: false,
  canAssignWarehouseToAdmin: false,
  canModifyReadOnly: false,
  canToggleReadOnly: false,
};

const DEFAULT_GUEST_PERMISSIONS = {
  canAccessPlanner: true,
  canAccessTidplan: true,
  canAccessBins: false,
  canViewNotifications: false,
  canDeleteNotifications: false,
  canCreateReports: true,
  canPrint: false,
  canExport: false,
  canAccessWarehouse: false,
  canViewWarehouse: false,
  canManageWarehouse: false,
  canManageWarehouseStock: false,
  canManageWarehouseIssue: false,
  canExportWarehouse: false,
  canImportWarehouse: false,
  canExportTidplan: false,
  canImportTidplan: false,
  canExportPlanner: false,
  canImportPlanner: false,
  canUnlockPastDays: false,
  canViewSurveys: false,
  canCreateSurveys: false,
  canEditSurveys: false,
  canPublishSurveys: false,
  canViewSurveyResults: false,
  canViewAnonymousSurveyVoters: false,
  canAssignWarehouseToAdmin: false,
  canModifyReadOnly: false,
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

(async () => {
  await dataStorage.ensureBaseStructure();
})().catch((error) => {
  console.error('Failed to prepare storage directories', error);
});

function getStorageStatusPayload() {
  const nextRetryInMs = storageRuntime.nextRetryAt
    ? Math.max(0, storageRuntime.nextRetryAt - Date.now())
    : null;
  return {
    ready: storageRuntime.ready,
    retrying: storageRuntime.initializing || Boolean(storageRuntime.retryTimer),
    attempts: storageRuntime.attempts,
    lastError: storageRuntime.lastError,
    lastReadyAt: storageRuntime.lastReadyAt,
    nextRetryInMs,
    connected: storageRuntime.ready,
    databaseConfigured: DATABASE_URL ? 'set' : 'missing',
  };
}

function logServerError(error, context = 'server') {
  const timestamp = new Date().toISOString();
  const message = error && error.stack ? error.stack : String(error);
  const line = `[${timestamp}] [${context}] ${message}\n`;
  try {
    fs.appendFileSync(errorLogFile, line, 'utf8');
  } catch (_) {
    console.error('Failed to write server error log');
  }
  console.error(line);
}

function sanitizeString(value, maxLength = 5000) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeObject(value, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(value)) {
    return value.slice(0, 500).map((entry) => sanitizeObject(entry, depth + 1));
  }
  if (value && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([key, entry]) => {
      const safeKey = sanitizeString(key, 120);
      result[safeKey] = sanitizeObject(entry, depth + 1);
    });
    return result;
  }
  if (typeof value === 'string') return sanitizeString(value);
  return value;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function sanitizeSiteKey(site) {
  return sanitizeString(site || 'default', 80).replace(/[^a-zA-Z0-9_-]/g, '_') || 'default';
}

function getReportsFilePath(site) {
  return dataStorage.getReportsFilePath(sanitizeSiteKey(site));
}

function getNotificationsFilePath(site) {
  return dataStorage.getNotificationsFilePath(sanitizeSiteKey(site));
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    return await dataStorage.readJson(filePath, fallbackValue);
  } catch (error) {
    logServerError(error, `read:${path.basename(filePath)}`);
    return fallbackValue;
  }
}

async function writeJsonFile(filePath, value) {
  await dataStorage.writeJson(filePath, value);
}

async function readVersionedJsonFile(filePath, fallbackValue) {
  return dataStorage.readDocument(filePath, fallbackValue);
}

async function writeVersionedJsonFile(filePath, value, options = {}) {
  return dataStorage.writeDocument(filePath, value, options);
}

async function mutateVersionedJsonFile(filePath, fallbackValue, mutator) {
  return dataStorage.mutateDocument(filePath, fallbackValue, mutator);
}

function isVersionConflictError(error) {
  return error instanceof VersionConflictError || error?.code === 'VERSION_CONFLICT';
}

function sendVersionConflict(res, latestPayloadBuilder) {
  const latest = typeof latestPayloadBuilder === 'function' ? latestPayloadBuilder() : latestPayloadBuilder;
  return Promise.resolve(latest).then((payload) =>
    res.status(409).json({
      error: 'VERSION_CONFLICT',
      latest: payload,
    }));
}

function normalizePermissions(permissions, fallback = DEFAULT_PERMISSIONS) {
  return { ...fallback, ...(permissions || {}) };
}

function normalizeAdminRecord(admin) {
  const firstName = sanitizeString(admin?.firstName || '', 120);
  const lastName = sanitizeString(admin?.lastName || '', 120);
  const fullName = sanitizeString(
    admin?.fullName || `${firstName} ${lastName}`.trim(),
    180,
  );

  return {
    email: sanitizeString(admin?.email || '', 160).toLowerCase(),
    password: String(admin?.password || ''),
    firstName,
    lastName,
    fullName,
    isSuperAdmin: Boolean(admin?.isSuperAdmin),
    isReadonly: Boolean(admin?.isReadonly),
    level: Number(admin?.level) || (admin?.isSuperAdmin ? 6 : 1),
    permissions: normalizePermissions(admin?.permissions),
    allowedSites: Array.isArray(admin?.allowedSites)
      ? admin.allowedSites.map((site) => sanitizeString(site, 80)).filter(Boolean)
      : null,
  };
}

/* ==================== SITE-SPECIFIC DATA MANAGEMENT ==================== */

function getSiteDataDir(site) {
  const safeSite = sanitizeSiteKey(site);
  return path.join(dataDir, 'sites', safeSite);
}

function getTidplanFilePath(site) {
  return path.join(getSiteDataDir(site), 'tidplan.json');
}

function getPlannerFilePath(site) {
  return path.join(getSiteDataDir(site), 'planner.json');
}

async function ensureSiteDir(site) {
  const siteDir = getSiteDataDir(site);
  if (!fs.existsSync(siteDir)) {
    fs.mkdirSync(siteDir, { recursive: true });
  }
}

async function readTidplan(site) {
  await ensureSiteDir(site);
  return readJsonFile(getTidplanFilePath(site), []);
}

async function writeTidplan(site, data) {
  await ensureSiteDir(site);
  return writeVersionedJsonFile(getTidplanFilePath(site), data, { fallbackValue: [] });
}

async function readPlanner(site) {
  await ensureSiteDir(site);
  return readJsonFile(getPlannerFilePath(site), []);
}

async function writePlanner(site, data) {
  await ensureSiteDir(site);
  return writeVersionedJsonFile(getPlannerFilePath(site), data, { fallbackValue: [] });
}

/* ==================== EXPORT/IMPORT FUNCTIONS ==================== */

async function exportToExcel(data, columns) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Podaci');

  // Add header
  worksheet.columns = columns.map((col) => ({
    header: col,
    key: col.toLowerCase().replace(/\s+/g, '_'),
  }));

  // Style header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };

  // Add data rows
  if (Array.isArray(data)) {
    data.forEach((row) => {
      worksheet.addRow(row);
    });
  }

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = column.header.length;
    if (column.values) {
      const lengths = column.values.map((v) => String(v || '').length);
      maxLength = Math.max(maxLength, ...lengths);
    }
    column.width = Math.min(maxLength + 2, 50);
  });

  return workbook.xlsx.writeBuffer();
}

async function exportModuleWorkbook(payload, readableSheets = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CMAX SCM';
  workbook.created = new Date();

  readableSheets.forEach(({ name, rows, columns }) => {
    const sheet = workbook.addWorksheet(String(name || 'Data').slice(0, 31));
    const safeRows = Array.isArray(rows) ? rows : [];
    const sheetColumns = Array.isArray(columns) && columns.length
      ? columns
      : Array.from(safeRows.reduce((keys, row) => {
        Object.keys(row || {}).forEach((key) => keys.add(key));
        return keys;
      }, new Set()));
    sheet.columns = sheetColumns.map((key) => ({ header: key, key, width: 24 }));
    safeRows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE9EEF7' },
    };
    sheet.columns.forEach((column) => {
      let maxLength = String(column.header || '').length;
      column.eachCell({ includeEmpty: true }, (cell) => {
        maxLength = Math.max(maxLength, String(cell.value || '').length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 42);
    });
    if (!safeRows.length) sheet.addRow([]);
  });

  return workbook.xlsx.writeBuffer();
}

async function exportToPDF(title, content) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown();

      // Date
      doc.fontSize(10).font('Helvetica').text(`Generirano: ${new Date().toLocaleString('hr-HR')}`, {
        align: 'left',
      });
      doc.moveDown();

      // Content
      doc.fontSize(11).font('Helvetica');
      if (Array.isArray(content)) {
        content.forEach((item) => {
          Object.entries(item).forEach(([key, value]) => {
            doc.text(`${key}: ${value}`, { continued: false });
          });
          doc.moveDown();
        });
      } else if (typeof content === 'string') {
        doc.text(content);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function exportModulePDF(title, payload, readableText = '') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generirano: ${new Date().toLocaleString('hr-HR')}`);
      doc.moveDown();
      doc.fontSize(9).font('Courier').text(readableText || 'Nema podataka.', {
        lineGap: 2,
      });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function extractPdfText(filePath) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, disableFontFace: true });
  const pdf = await loadingTask.promise;
  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join('\n'));
  }
  return pages.join('\n');
}

function parseModulePayloadFromPdfText(text, expectedModule) {
  return parseReadableDelimitedLines(String(text || ''), expectedModule, 'PDF_STRUCTURE_NOT_RECOGNIZED');
}

async function parseModulePayloadFromExcel(filePath, expectedModule) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const meta = workbook.getWorksheet('CMAX_EXPORT');
  if (meta) {
    const values = {};
    meta.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      values[String(row.getCell(1).value || '')] = row.getCell(2).value;
    });
    if (values.format === 'cmax-module-export-v1' && values.module === expectedModule && values.payloadJson) {
      const payload = JSON.parse(String(values.payloadJson));
      if (payload && payload.module === expectedModule) return payload;
    }
  }
  return parseReadableWorkbook(workbook, expectedModule);
}

function getSiteEntryFromState(state, site) {
  const safeSite = sanitizeSiteKey(site);
  const siteData = state && typeof state.siteData === 'object' ? state.siteData : {};
  return siteData[safeSite] || siteData[site] || {};
}

function buildModulePayload(module, site, data, extra = {}) {
  return {
    format: 'cmax-module-export-v1',
    module,
    site: site || 'global',
    exportedAt: new Date().toISOString(),
    data: sanitizeObject(data),
    ...extra,
  };
}

function cellValueToText(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (value.text) return String(value.text);
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
    if (value.result != null) return String(value.result);
  }
  return String(value).trim();
}

function normalizeImportHeader(value) {
  return cellValueToText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function worksheetToObjects(sheet) {
  if (!sheet) return [];
  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = normalizeImportHeader(cell.value);
  });
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item = {};
    let hasValue = false;
    headers.forEach((header, colNumber) => {
      if (!header) return;
      const value = cellValueToText(row.getCell(colNumber).value);
      if (value) hasValue = true;
      item[header] = value;
    });
    if (hasValue) rows.push(item);
  });
  return rows;
}

function pickImportValue(row, aliases, fallback = '') {
  for (const alias of aliases) {
    const key = normalizeImportHeader(alias);
    if (row[key] != null && row[key] !== '') return row[key];
  }
  return fallback;
}

function splitListValue(value) {
  return cellValueToText(value)
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeImportDate(value) {
  const text = cellValueToText(value);
  if (!text) return '';
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (local) {
    const day = local[1].padStart(2, '0');
    const month = local[2].padStart(2, '0');
    return `${local[3]}-${month}-${day}`;
  }
  return text.slice(0, 10);
}

function numberFromImport(value, fallback = 0) {
  const numeric = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function plannerRowsForExport(planner) {
  return Object.entries(planner?.dailyData || {}).flatMap(([date, day]) =>
    (Array.isArray(day?.planningRows) ? day.planningRows : []).map((row, index) => ({
      Datum: date,
      Red: index + 1,
      Radnik1: row.w1 || '',
      Radnik2: row.w2 || '',
      Radnik3: row.w3 || '',
      Plan: row.plan || '',
      Karna: row.karna || '',
      Moment1: row.m1 || '',
      Moment2: row.m2 || '',
      Lift1: row.l1 || '',
      Lift2: row.l2 || '',
      Lift3: row.l3 || '',
      Komentar: row.comment || '',
    })),
  );
}

function tidplanRowsForExport(tidplan) {
  return (Array.isArray(tidplan) ? tidplan : []).map((row, index) => ({
    Red: index + 1,
    Plan: row.plan || '',
    Zona: row.zona || '',
    Karna: row.karna || '',
    Moment: row.moment || '',
    Resursi: row.resursi || 0,
    Start: row.start || '',
    End: row.end || '',
    Komentar: row.komentar || row.comment || '',
    Aktivno: row.active === false ? 'Ne' : 'Da',
  }));
}

function warehouseItemRowsForExport(warehouse) {
  const catalog = Array.isArray(warehouse?.catalog) ? warehouse.catalog : [];
  const stock = warehouse?.stock && typeof warehouse.stock === 'object' ? warehouse.stock : {};
  return catalog.map((item, index) => {
    const itemStock = stock[item.id] || {};
    return {
      Red: index + 1,
      Naziv: item.name || '',
      Jedinica: item.unit || 'kom',
      Stanje: Number(itemStock.current) || 0,
      UkupnoIzdano: Number(itemStock.totalIssued) || 0,
      UkupnoZaprimljeno: Number(itemStock.totalReceived) || 0,
      Minimum: Number(item.minimum) || 0,
      ObavijestiOsobu: item.notifyPerson || '',
      Sifra: item.id || '',
    };
  });
}

function warehouseLogRowsForExport(logs) {
  return (Array.isArray(logs) ? logs : []).map((entry, index) => ({
    Red: index + 1,
    Datum: entry.timestamp || entry.date || '',
    Tip: entry.type || '',
    Radnik: entry.worker || '',
    Materijal: entry.itemName || entry.item || entry.itemId || '',
    Kolicina: entry.quantity || '',
    Smjer: entry.direction || entry.flow || '',
    Komentar: entry.comment || '',
    StanjeNakon: entry.balanceAfter || '',
    Upisao: entry.author || entry.createdBy || '',
  }));
}

function rowsToDelimitedText(title, rows, columns) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeColumns = Array.isArray(columns) && columns.length ? columns : Object.keys(safeRows[0] || {});
  return [
    `## ${title}`,
    safeColumns.join(' | '),
    ...safeRows.map((row) => safeColumns.map((key) => cellValueToText(row[key]).replace(/\s*\|\s*/g, '/')).join(' | ')),
    '',
  ].join('\n');
}

function buildReadableExport(module, payload) {
  if (module === 'planner') {
    const rows = plannerRowsForExport(payload.data);
    const columns = ['Datum', 'Red', 'Radnik1', 'Radnik2', 'Radnik3', 'Plan', 'Karna', 'Moment1', 'Moment2', 'Lift1', 'Lift2', 'Lift3', 'Komentar'];
    return {
      sheets: [{ name: 'Planner', rows, columns }],
      text: rowsToDelimitedText('Planner', rows, columns),
    };
  }
  if (module === 'tidplan') {
    const rows = tidplanRowsForExport(payload.data);
    const columns = ['Red', 'Plan', 'Zona', 'Karna', 'Moment', 'Resursi', 'Start', 'End', 'Komentar', 'Aktivno'];
    return {
      sheets: [{ name: 'Tidplan', rows, columns }],
      text: rowsToDelimitedText('Tidplan', rows, columns),
    };
  }
  if (module === 'warehouse') {
    const itemRows = warehouseItemRowsForExport(payload.data);
    const logRows = warehouseLogRowsForExport(payload.logs || payload.data?.logs || []);
    const itemColumns = ['Red', 'Naziv', 'Jedinica', 'Stanje', 'UkupnoIzdano', 'UkupnoZaprimljeno', 'Minimum', 'ObavijestiOsobu', 'Sifra'];
    const logColumns = ['Red', 'Datum', 'Tip', 'Radnik', 'Materijal', 'Kolicina', 'Smjer', 'Komentar', 'StanjeNakon', 'Upisao'];
    return {
      sheets: [
        { name: 'Skladiste', rows: itemRows, columns: itemColumns },
        { name: 'Warehouse logs', rows: logRows, columns: logColumns },
      ],
      text: [
        rowsToDelimitedText('Skladiste', itemRows, itemColumns),
        rowsToDelimitedText('Warehouse logs', logRows, logColumns),
      ].join('\n'),
    };
  }
  throw new Error('UNKNOWN_MODULE');
}

function parsePlannerRows(rows, site) {
  const dailyData = {};
  rows.forEach((row) => {
    const date = normalizeImportDate(pickImportValue(row, ['Datum', 'Date']));
    if (!date) return;
    if (!dailyData[date]) dailyData[date] = { planningRows: [] };
    dailyData[date].planningRows.push({
      w1: pickImportValue(row, ['Radnik1', 'W1', 'Worker1']),
      w2: pickImportValue(row, ['Radnik2', 'W2', 'Worker2']),
      w3: pickImportValue(row, ['Radnik3', 'W3', 'Worker3']),
      plan: pickImportValue(row, ['Plan']),
      karna: pickImportValue(row, ['Karna']),
      m1: pickImportValue(row, ['Moment1', 'M1']),
      m2: pickImportValue(row, ['Moment2', 'M2']),
      l1: pickImportValue(row, ['Lift1', 'L1']),
      l2: pickImportValue(row, ['Lift2', 'L2']),
      l3: pickImportValue(row, ['Lift3', 'L3']),
      comment: pickImportValue(row, ['Komentar', 'Comment']),
    });
  });
  return buildModulePayload('planner', site || 'import', { dailyData });
}

function parseTidplanRows(rows, site) {
  const data = rows.map((row) => ({
    plan: pickImportValue(row, ['Plan']),
    zona: pickImportValue(row, ['Zona', 'Zone']),
    karna: pickImportValue(row, ['Karna']),
    moment: pickImportValue(row, ['Moment']),
    resursi: Math.max(numberFromImport(pickImportValue(row, ['Resursi', 'Resources']), 1), 1),
    start: normalizeImportDate(pickImportValue(row, ['Start', 'Pocetak'])),
    end: normalizeImportDate(pickImportValue(row, ['End', 'Kraj'])),
    komentar: pickImportValue(row, ['Komentar', 'Comment']),
    active: !['ne', 'no', 'false', '0'].includes(String(pickImportValue(row, ['Aktivno', 'Active'], 'Da')).trim().toLowerCase()),
  })).filter((row) => row.plan || row.zona || row.karna || row.moment || row.start || row.end);
  return buildModulePayload('tidplan', site || 'import', data);
}

function parseWarehouseRows(itemRows, logRows, site) {
  const catalog = [];
  const stock = {};
  itemRows.forEach((row, index) => {
    const name = pickImportValue(row, ['Naziv', 'Name', 'Materijal']);
    if (!name) return;
    const id = pickImportValue(row, ['Sifra', 'ID']) || `itm_${Date.now()}_${index}`;
    catalog.push({
      id,
      name,
      unit: pickImportValue(row, ['Jedinica', 'Unit'], 'kom') || 'kom',
      minimum: Math.max(numberFromImport(pickImportValue(row, ['Minimum']), 0), 0),
      notifyPerson: pickImportValue(row, ['ObavijestiOsobu', 'NotifyPerson', 'Obavijesti']),
    });
    stock[id] = {
      current: numberFromImport(pickImportValue(row, ['Stanje', 'Current', 'Quantity']), 0),
      totalIssued: numberFromImport(pickImportValue(row, ['UkupnoIzdano', 'TotalIssued']), 0),
      totalReceived: numberFromImport(pickImportValue(row, ['UkupnoZaprimljeno', 'TotalReceived']), 0),
    };
  });
  const logs = logRows.map((row, index) => ({
    id: pickImportValue(row, ['ID', 'Sifra']) || `log_${Date.now()}_${index}`,
    timestamp: pickImportValue(row, ['Datum', 'Date']) || new Date().toISOString(),
    type: pickImportValue(row, ['Tip', 'Type']),
    worker: pickImportValue(row, ['Radnik', 'Worker']),
    itemName: pickImportValue(row, ['Materijal', 'Item']),
    quantity: numberFromImport(pickImportValue(row, ['Kolicina', 'Quantity']), 0),
    direction: pickImportValue(row, ['Smjer', 'Flow', 'Direction']),
    comment: pickImportValue(row, ['Komentar', 'Comment']),
    balanceAfter: numberFromImport(pickImportValue(row, ['StanjeNakon', 'BalanceAfter']), 0),
    author: pickImportValue(row, ['Upisao', 'Author']),
  })).filter((row) => row.itemName || row.worker || row.type);
  return buildModulePayload('warehouse', site || 'import', { catalog, stock, logs }, { logs });
}

function parseReadableWorkbook(workbook, expectedModule) {
  if (expectedModule === 'planner') {
    const rows = worksheetToObjects(workbook.getWorksheet('Planner') || workbook.worksheets[0]);
    if (!rows.length) throw new Error('EXCEL_STRUCTURE_NOT_RECOGNIZED');
    return parsePlannerRows(rows);
  }
  if (expectedModule === 'tidplan') {
    const rows = worksheetToObjects(workbook.getWorksheet('Tidplan') || workbook.worksheets[0]);
    if (!rows.length) throw new Error('EXCEL_STRUCTURE_NOT_RECOGNIZED');
    return parseTidplanRows(rows);
  }
  if (expectedModule === 'warehouse') {
    const itemRows = worksheetToObjects(workbook.getWorksheet('Skladiste') || workbook.getWorksheet('Warehouse') || workbook.worksheets[0]);
    const logRows = worksheetToObjects(workbook.getWorksheet('Warehouse logs') || workbook.getWorksheet('Logs'));
    if (!itemRows.length) throw new Error('EXCEL_STRUCTURE_NOT_RECOGNIZED');
    return parseWarehouseRows(itemRows, logRows);
  }
  throw new Error('EXCEL_STRUCTURE_NOT_RECOGNIZED');
}

function parseDelimitedSection(text, heading) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headingIndex = lines.findIndex((line) => normalizeImportHeader(line.replace(/^#+\s*/, '')) === normalizeImportHeader(heading));
  if (headingIndex < 0 || !lines[headingIndex + 1]) return [];
  const headers = lines[headingIndex + 1].split('|').map((part) => normalizeImportHeader(part));
  const rows = [];
  for (let index = headingIndex + 2; index < lines.length; index += 1) {
    if (lines[index].startsWith('##')) break;
    if (!lines[index].includes('|')) continue;
    const parts = lines[index].split('|').map((part) => part.trim());
    const row = {};
    headers.forEach((header, columnIndex) => {
      if (header) row[header] = parts[columnIndex] || '';
    });
    rows.push(row);
  }
  return rows;
}

function parseReadableDelimitedLines(text, expectedModule, errorCode) {
  if (expectedModule === 'planner') {
    const rows = parseDelimitedSection(text, 'Planner');
    if (!rows.length) throw new Error(errorCode);
    return parsePlannerRows(rows);
  }
  if (expectedModule === 'tidplan') {
    const rows = parseDelimitedSection(text, 'Tidplan');
    if (!rows.length) throw new Error(errorCode);
    return parseTidplanRows(rows);
  }
  if (expectedModule === 'warehouse') {
    const itemRows = parseDelimitedSection(text, 'Skladiste');
    const logRows = parseDelimitedSection(text, 'Warehouse logs');
    if (!itemRows.length) throw new Error(errorCode);
    return parseWarehouseRows(itemRows, logRows);
  }
  throw new Error(errorCode);
}

async function exportToWord(title, content) {
  const paragraphs = [];

  // Title
  paragraphs.push(
    new Paragraph({
      text: title,
      bold: true,
      size: 32,
    }),
  );

  // Date
  paragraphs.push(
    new Paragraph({
      text: `Generirano: ${new Date().toLocaleString('hr-HR')}`,
      size: 20,
    }),
  );

  // Content
  if (Array.isArray(content)) {
    content.forEach((item) => {
      const rows = [];
      Object.entries(item).forEach(([key, value]) => {
        rows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(key)] }),
              new TableCell({ children: [new Paragraph(String(value))] }),
            ],
          }),
        );
      });

      if (rows.length > 0) {
        paragraphs.push(
          new Table({
            width: { size: 100, type: 'percent' },
            rows,
          }),
        );
        paragraphs.push(new Paragraph(''));
      }
    });
  }

  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}

/* ==================== BACKUP FUNCTIONS ==================== */

async function createBackupSnapshotWithLabel(label = 'manual', includeNotification = true) {
  try {
    const safeLabel = sanitizeString(label, 60).replace(/[^a-zA-Z0-9_-]/g, '_') || 'manual';
    const snapshot = await storageAdapter.exportAll();
    
    if (typeof storageAdapter.saveBackupSnapshot === 'function') {
      return storageAdapter.saveBackupSnapshot(snapshot, { label: safeLabel });
    }

    ensureDir(backupsDir);
    const timestamp = Date.now();
    const filename = `${safeLabel}-${timestamp}.json`;
    const filePath = path.join(backupsDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    
    return {
      id: filename,
      filename,
      filePath,
      createdAt: new Date().toISOString(),
      storage: 'filesystem',
      label: safeLabel,
      timestamp,
    };
  } catch (error) {
    logServerError(error, 'backup');
    return null;
  }
}

async function listBackups(limit = 20) {
  try {
    if (typeof storageAdapter.listBackups === 'function') {
      const backups = await storageAdapter.listBackups(limit);
      return Array.isArray(backups) ? backups : [];
    }
    if (!fs.existsSync(backupsDir)) return [];
    
    const files = fs.readdirSync(backupsDir)
      .filter((f) => f.endsWith('.json'))
      .map((filename) => {
        const filePath = path.join(backupsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
    
    return files;
  } catch (error) {
    logServerError(error, 'listBackups');
    return [];
  }
}

async function readBackupSnapshotById(identifier) {
  const rawIdentifier = sanitizeString(identifier, 255);
  if (!rawIdentifier) {
    const error = new Error('INVALID_BACKUP_ID');
    error.statusCode = 400;
    throw error;
  }
  if (typeof storageAdapter.readBackupSnapshot === 'function') {
    return storageAdapter.readBackupSnapshot(rawIdentifier);
  }
  const safeFilename = path.basename(rawIdentifier);
  if (safeFilename !== rawIdentifier || !safeFilename.endsWith('.json')) {
    const error = new Error('INVALID_BACKUP_ID');
    error.statusCode = 400;
    throw error;
  }
  const backupRoot = path.resolve(backupsDir);
  const filePath = path.resolve(backupsDir, safeFilename);
  if (!filePath.startsWith(backupRoot) || !fs.existsSync(filePath)) {
    const error = new Error('BACKUP_NOT_FOUND');
    error.statusCode = 404;
    throw error;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function restoreBackupSnapshot(identifier, userEmail) {
  const snapshot = await readBackupSnapshotById(identifier);
  if (!snapshot || typeof snapshot !== 'object') {
    const error = new Error('BACKUP_STRUCTURE_INVALID');
    error.statusCode = 400;
    throw error;
  }

  await createBackupSnapshotWithLabel(`pre-restore-${userEmail || 'admin'}`, false);

  if ('admins' in snapshot) await writeAdmins(Array.isArray(snapshot.admins) ? snapshot.admins : []);
  if ('state' in snapshot) await writeVersionedJsonFile(stateFile, snapshot.state || {}, { fallbackValue: {} });
  if ('logs' in snapshot) await writeVersionedJsonFile(logsFile, Array.isArray(snapshot.logs) ? snapshot.logs : [], { fallbackValue: [] });
  if ('warehouse' in snapshot) await writeVersionedJsonFile(warehouseFile, snapshot.warehouse || null, { fallbackValue: null });
  if ('warehouseLogs' in snapshot) {
    await writeVersionedJsonFile(
      warehouseLogsFile,
      Array.isArray(snapshot.warehouseLogs) ? snapshot.warehouseLogs : [],
      { fallbackValue: [] },
    );
  }

  const reports = snapshot.reports && typeof snapshot.reports === 'object' ? snapshot.reports : {};
  for (const [site, list] of Object.entries(reports)) {
    await writeVersionedJsonFile(getReportsFilePath(site), Array.isArray(list) ? list : [], { fallbackValue: [] });
  }

  const notifications = snapshot.notifications && typeof snapshot.notifications === 'object' ? snapshot.notifications : {};
  for (const [site, list] of Object.entries(notifications)) {
    await writeVersionedJsonFile(getNotificationsFilePath(site), Array.isArray(list) ? list : [], { fallbackValue: [] });
  }

  await logActivity(userEmail, 'backup_restored', {
    backup: sanitizeString(identifier, 255),
    storageType: STORAGE_TYPE,
  });

  return snapshot;
}

function redactAdminRecord(admin) {
  const { password, ...safeAdmin } = normalizeAdminRecord(admin);
  return safeAdmin;
}

async function readAdmins() {
  const admins = await readJsonFile(adminsFile, []);
  return admins.map((admin) => normalizeAdminRecord(admin));
}

async function writeAdmins(admins) {
  await writeVersionedJsonFile(
    adminsFile,
    admins.map((admin) => normalizeAdminRecord(admin)),
    { fallbackValue: [] },
  );
}

function getSessionLevel(session) {
  return Math.max(1, Math.min(6, Number(session?.level) || 1));
}

function canActorManageAdmin(actorSession, targetAdmin) {
  if (!actorSession || !sessionHasPermission(actorSession, 'canManageAdmins')) return false;
  if (actorSession.isSuperAdmin) return true;
  if (!targetAdmin) return true;
  if (targetAdmin.isSuperAdmin) return false;
  if (targetAdmin.email === actorSession.email) return false;
  return (Number(targetAdmin.level) || 1) < getSessionLevel(actorSession);
}

function clampAdminForActor(candidate, existingAdmin, actorSession) {
  if (!actorSession || actorSession.isSuperAdmin) return candidate;
  const actorLevel = getSessionLevel(actorSession);
  const next = { ...candidate };
  next.isSuperAdmin = false;
  next.level = Math.max(1, Math.min(actorLevel - 1, Number(next.level) || 1));

  const existingPermissions = normalizePermissions(existingAdmin?.permissions || {});
  const requestedPermissions = normalizePermissions(next.permissions || {});
  const clampedPermissions = {};
  Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
    if (sessionHasPermission(actorSession, key)) {
      clampedPermissions[key] = requestedPermissions[key] === true;
    } else {
      clampedPermissions[key] = existingAdmin ? existingPermissions[key] === true : false;
    }
  });
  next.permissions = clampedPermissions;

  if (Array.isArray(actorSession.allowedSites)) {
    const allowed = new Set(actorSession.allowedSites);
    next.allowedSites = Array.isArray(next.allowedSites)
      ? next.allowedSites.filter((site) => allowed.has(site))
      : [...allowed];
  }

  return next;
}

async function persistAdmins(adminsInput, actorSession = null) {
  const existingAdmins = await readAdmins();
  const existingByEmail = new Map(existingAdmins.map((admin) => [admin.email, admin]));
  const nextAdmins = [];
  const submittedEmails = new Set();

  for (const candidate of Array.isArray(adminsInput) ? adminsInput : []) {
    const normalized = normalizeAdminRecord(candidate);
    if (!normalized.email || !isValidEmail(normalized.email)) continue;
    submittedEmails.add(normalized.email);
    const existing = existingByEmail.get(normalized.email);
    if (actorSession && !canActorManageAdmin(actorSession, existing)) {
      if (existing) nextAdmins.push(existing);
      continue;
    }
    if (normalized.password) {
      normalized.password = isPasswordHash(normalized.password)
        ? normalized.password
        : await bcrypt.hash(normalized.password, BCRYPT_ROUNDS);
    } else if (existing?.password) {
      normalized.password = existing.password;
    }
    nextAdmins.push(clampAdminForActor(normalized, existing, actorSession));
  }

  if (actorSession && !actorSession.isSuperAdmin) {
    existingAdmins.forEach((existing) => {
      if (!submittedEmails.has(existing.email) && !canActorManageAdmin(actorSession, existing)) {
        nextAdmins.push(existing);
      }
    });
  }

  await writeVersionedJsonFile(adminsFile, nextAdmins, { fallbackValue: [] });
  return nextAdmins;
}

async function getState() {
  const state = await readJsonFile(stateFile, null);
  return state && typeof state === 'object' ? state : null;
}

async function getStateDocument() {
  const document = await readVersionedJsonFile(stateFile, null);
  const state = document.data && typeof document.data === 'object' ? document.data : null;
  return {
    ...document,
    data: state,
  };
}

function sessionHasPermission(session, permissionKey) {
  return authHelpers.sessionHasPermission(session, permissionKey);
}

function canViewWarehouseInState(session) {
  return sessionHasPermission(session, 'canViewWarehouse') ||
    sessionHasPermission(session, 'canAccessWarehouse') ||
    sessionHasPermission(session, 'canExportWarehouse') ||
    sessionHasPermission(session, 'canImportWarehouse');
}

async function buildPublicStatePayload(document, session) {
  const responseState = document?.data && typeof document.data === 'object'
    ? { ...document.data }
    : null;

  if (responseState) {
    const canAccessPlannerState = sessionHasPermission(session, 'canAccessPlanner') || sessionHasPermission(session, 'canViewPlanner');
    const canAccessTidplanState = sessionHasPermission(session, 'canAccessTidplan') || sessionHasPermission(session, 'canViewTidplan');
    const canAccessBinsState = sessionHasPermission(session, 'canAccessBins') || sessionHasPermission(session, 'canViewBins');
    const canAccessResourceState = canAccessPlannerState || canAccessTidplanState || canAccessBinsState;
    const allowedSites = Array.isArray(responseState.sites)
      ? responseState.sites.filter((site) => canAccessSite(session || {}, site))
      : [];
    responseState.sites = allowedSites;
    if (!allowedSites.includes(responseState.currentSite)) {
      responseState.currentSite = allowedSites[0] || 'default';
    }

    const originalSiteData = responseState.siteData && typeof responseState.siteData === 'object'
      ? responseState.siteData
      : {};
    responseState.siteData = {};
    allowedSites.forEach((site) => {
      const entry = originalSiteData[site];
      if (!entry || typeof entry !== 'object') return;
      const nextEntry = { ...entry };
      if (!canAccessPlannerState) {
        delete nextEntry.planner;
      }
      if (!canAccessTidplanState) {
        delete nextEntry.tidplan;
        delete nextEntry.tidplanZones;
      }
      if (!canAccessBinsState) {
        delete nextEntry.bins;
      }
      if (!canViewWarehouseInState(session)) {
        delete nextEntry.warehouse;
      }
      if (!sessionHasPermission(session, 'canViewReports')) {
        delete nextEntry.reports;
      }
      if (!sessionHasPermission(session, 'canViewNotifications')) {
        delete nextEntry.notifications;
      }
      delete nextEntry.surveys;
      responseState.siteData[site] = nextEntry;
    });

    if (!canAccessResourceState) {
      delete responseState.workers;
      delete responseState.lifts;
      delete responseState.moments;
      delete responseState.plans;
      delete responseState.karnas;
      delete responseState.resourceHistory;
    }
    if (!canAccessPlannerState) {
      delete responseState.dailyData;
    }
    if (!canAccessBinsState) {
      delete responseState.binsData;
      delete responseState.binPermissions;
    } else if (!sessionHasPermission(session, 'canManageBinsPermissions')) {
      delete responseState.binPermissions;
    }
    if (!canAccessTidplanState) {
      delete responseState.tidplan;
      delete responseState.tidplanZones;
    }
    if (!sessionHasPermission(session, 'canViewReports')) {
      delete responseState.reports;
    }
    if (!sessionHasPermission(session, 'canViewNotifications')) {
      delete responseState.notifications;
    }
    if (!canViewWarehouseInState(session)) {
      delete responseState.warehouse;
      delete responseState.warehouseData;
    }
    delete responseState.backups;
    delete responseState.logs;
    delete responseState.warehouseLogs;

    if (sessionHasPermission(session, 'canManageAdmins')) {
      const admins = await readAdmins();
      responseState.admins = admins.map((admin) => redactAdminRecord(admin));
    } else {
      delete responseState.admins;
      delete responseState.adminRemovalNotices;
    }

    if (!sessionHasPermission(session, 'canManageGuestAccess')) {
      delete responseState.guestPermissions;
    }
  }

  return {
    state: responseState,
    version: document?.version || 1,
    updatedAt: document?.updatedAt || null,
  };
}

async function getGuestPermissionsFromState() {
  const state = await getState();
  return normalizePermissions(state?.guestPermissions || DEFAULT_GUEST_PERMISSIONS, DEFAULT_GUEST_PERMISSIONS);
}

function isPasswordHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ''));
}

function generateToken(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

async function ensureBootstrapAdmin() {
  const admins = await readAdmins();
  if (admins.length > 0) {
    return false;
  }

  const bootstrapEmail = sanitizeString(process.env.BOOTSTRAP_ADMIN_EMAIL || '', 160).toLowerCase();
  const bootstrapPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');

  if (bootstrapEmail && bootstrapPassword && isValidEmail(bootstrapEmail)) {
    const passwordHash = await bcrypt.hash(bootstrapPassword, BCRYPT_ROUNDS);
    await writeAdmins([
      {
        email: bootstrapEmail,
        password: passwordHash,
        isSuperAdmin: true,
        level: 6,
        permissions: { ...DEFAULT_PERMISSIONS },
        allowedSites: null,
      },
    ]);
    console.log(`Bootstrap admin created for ${bootstrapEmail}`);
    return true;
  }

  console.warn('No bootstrap admin created. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD.');
  return false;
}

const configuredCorsOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '';
const allowedOrigins = configuredCorsOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllCorsOrigins = String(process.env.CORS_ALLOW_ALL || '').toLowerCase() === 'true';

function normalizeOriginValue(value) {
  if (!value) return '';
  return String(value).trim().replace(/\/+$/, '').toLowerCase();
}

function getRequestHost(req) {
  return normalizeOriginValue(req.headers['x-forwarded-host'] || req.headers.host || '');
}

function isAllowedOrigin(origin, req) {
  const normalizedOrigin = normalizeOriginValue(origin);
  if (!normalizedOrigin) return true;
  if (allowAllCorsOrigins || allowedOrigins.length === 0) return true;
  if (allowedOrigins.some((entry) => normalizeOriginValue(entry) === normalizedOrigin)) {
    return true;
  }

  try {
    const originUrl = new URL(normalizedOrigin);
    const requestHost = getRequestHost(req);
    if (requestHost && originUrl.host.toLowerCase() === requestHost) {
      return true;
    }
  } catch (_) {
    return false;
  }

  return false;
}

function buildPublicAuthPayload(session) {
  return {
    email: session.email,
    fullName: session.fullName,
    isAdmin: session.role === 'admin',
    isSuperAdmin: session.isSuperAdmin,
    isReadonly: session.isReadonly,
    permissions: session.permissions,
    level: session.level,
  };
}

function createSession(res, payload) {
  const sessionId = generateToken(32);
  const csrfToken = generateToken(24);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const session = {
    id: sessionId,
    csrfToken,
    expiresAt,
    ...payload,
  };
  sessions.set(sessionId, session);
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'none',
    secure: IS_PRODUCTION,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
  return session;
}

function clearSession(req, res) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'none',
    secure: IS_PRODUCTION,
    path: '/',
  });
}

function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) {
      sessions.delete(sessionId);
    }
  }
}

function cleanupPresence() {
  const now = Date.now();
  for (const [sessionId, entry] of activePresence.entries()) {
    if (!entry || now - (entry.lastSeen || 0) > PRESENCE_TTL_MS) {
      activePresence.delete(sessionId);
    }
  }
}

function requireAuth(req, res, next) {
  cleanupSessions();
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId) return res.status(401).json({ error: 'Authentication required' });
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expired' });
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  req.session = session;
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'none',
    secure: IS_PRODUCTION,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
  return next();
}

function requireCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const token = req.get('x-csrf-token');
  if (!req.session || !token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session || req.session.role !== 'admin' || req.session.isReadonly) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.session || !req.session.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  return next();
}

function requireStorageReady(req, res, next) {
  if (storageRuntime.ready) return next();
  const status = getStorageStatusPayload();
  if (status.nextRetryInMs !== null) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil(status.nextRetryInMs / 1000))));
  }
  return res.status(503).json({
    error: 'Storage not ready',
    storage: status,
  });
}

function canAccessSite(session, site) {
  return authHelpers.canAccessSite(session, site || 'default');
}

function requirePermission(permissionKey) {
  return authHelpers.createPermissionMiddleware(permissionKey);
}

function getUploadUrl(filePath) {
  const relative = path.relative(uploadsDir, filePath).split(path.sep).join('/');
  return `/uploads/${relative}`;
}

async function createBackupSnapshot(label = 'manual') {
  try {
    const safeLabel = sanitizeString(label, 60).replace(/[^a-zA-Z0-9_-]/g, '_') || 'manual';
    const snapshot = await storageAdapter.exportAll();
    if (typeof storageAdapter.saveBackupSnapshot === 'function') {
      return storageAdapter.saveBackupSnapshot(snapshot, { label: safeLabel });
    }
    ensureDir(backupsDir);
    const filename = `${safeLabel}-${Date.now()}.json`;
    const filePath = path.join(backupsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    return {
      id: filename,
      filename,
      filePath,
      createdAt: new Date().toISOString(),
      storage: 'filesystem',
    };
  } catch (error) {
    logServerError(error, 'backup');
    return null;
  }
}

async function getLastBackupTime() {
  if (typeof storageAdapter.getLastBackupTime === 'function') {
    return storageAdapter.getLastBackupTime();
  }
  if (!fs.existsSync(backupsDir)) return 0;
  let latest = 0;
  for (const entry of fs.readdirSync(backupsDir)) {
    const filePath = path.join(backupsDir, entry);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      latest = Math.max(latest, stats.mtimeMs);
    }
  }
  return latest;
}

async function ensureAutoBackupCurrent(label = 'auto') {
  if (!storageRuntime.ready) return null;
  const lastBackupTime = await getLastBackupTime();
  if (Date.now() - lastBackupTime > AUTO_BACKUP_INTERVAL_MS) {
    return createBackupSnapshot(label);
  }
  return null;
}

function validateStatePayload(state) {
  return Boolean(state && typeof state === 'object' && !Array.isArray(state));
}

function isPastDateString(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ''))) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateValue}T00:00:00`);
  return date < today;
}

function canUnlockPastDays(session) {
  return Boolean(session?.isSuperAdmin || Number(session?.level) >= 6 || session?.permissions?.canUnlockPastDays === true);
}

function stableJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function hasPastPlannerDayChanges(previousState, nextState) {
  const previousSiteData = previousState?.siteData && typeof previousState.siteData === 'object' ? previousState.siteData : {};
  const nextSiteData = nextState?.siteData && typeof nextState.siteData === 'object' ? nextState.siteData : {};
  return Object.keys(nextSiteData).some((site) => {
    const previousDaily = previousSiteData[site]?.planner?.dailyData || {};
    const nextDaily = nextSiteData[site]?.planner?.dailyData || {};
    return Object.keys(nextDaily).some((date) =>
      isPastDateString(date) && stableJson(previousDaily[date]) !== stableJson(nextDaily[date]),
    );
  });
}

function hasPastBinsDayChanges(previousState, nextState) {
  const previousSiteData = previousState?.siteData && typeof previousState.siteData === 'object' ? previousState.siteData : {};
  const nextSiteData = nextState?.siteData && typeof nextState.siteData === 'object' ? nextState.siteData : {};
  return Object.keys(nextSiteData).some((site) => {
    const previousBins = previousSiteData[site]?.bins || {};
    const nextBins = nextSiteData[site]?.bins || {};
    return Object.keys(nextBins).some((date) =>
      isPastDateString(date) && stableJson(previousBins[date]) !== stableJson(nextBins[date]),
    );
  });
}

function getTidplanPastDates(list) {
  const dates = new Set();
  (Array.isArray(list) ? list : []).forEach((activity) => {
    if (isPastDateString(activity?.start)) dates.add(activity.start);
    if (isPastDateString(activity?.end)) dates.add(activity.end);
  });
  return dates;
}

function hasPastTidplanChanges(previousState, nextState) {
  const previousSiteData = previousState?.siteData && typeof previousState.siteData === 'object' ? previousState.siteData : {};
  const nextSiteData = nextState?.siteData && typeof nextState.siteData === 'object' ? nextState.siteData : {};
  return Object.keys(nextSiteData).some((site) => {
    const previousTidplan = previousSiteData[site]?.tidplan || [];
    const nextTidplan = nextSiteData[site]?.tidplan || [];
    const pastDates = new Set([...getTidplanPastDates(previousTidplan), ...getTidplanPastDates(nextTidplan)]);
    return pastDates.size > 0 && stableJson(previousTidplan) !== stableJson(nextTidplan);
  });
}

function hasLockedPastChanges(previousState, nextState) {
  return hasPastPlannerDayChanges(previousState, nextState) ||
    hasPastBinsDayChanges(previousState, nextState) ||
    hasPastTidplanChanges(previousState, nextState);
}

function canWriteStateField(session, permissionKey) {
  return Boolean(session?.isSuperAdmin || sessionHasPermission(session, permissionKey));
}

function canWriteTidplanState(session) {
  return canWriteStateField(session, 'canManageTidplan') ||
    canWriteStateField(session, 'canAddTidplanActivity') ||
    canWriteStateField(session, 'canDeleteTidplanActivity') ||
    canWriteStateField(session, 'canManageTidplanZones');
}

function canWriteBinsState(session) {
  return canWriteStateField(session, 'canAccessBins') && canWriteStateField(session, 'canEditBinsData');
}

function mergePlannerStateForSession(previousPlanner, submittedPlanner, session) {
  const previous = previousPlanner && typeof previousPlanner === 'object' ? previousPlanner : {};
  const submitted = submittedPlanner && typeof submittedPlanner === 'object' ? submittedPlanner : {};
  const next = { ...previous };
  const listPermissions = {
    workers: 'canManageWorkers',
    lifts: 'canManageLifts',
    moments: 'canManageMoments',
    plans: 'canManagePlans',
    karnas: 'canManageKarnas',
  };

  Object.entries(listPermissions).forEach(([field, permissionKey]) => {
    if (canWriteStateField(session, permissionKey) && Array.isArray(submitted[field])) {
      next[field] = submitted[field];
    }
  });

  const canManageResources = Object.values(listPermissions)
    .some((permissionKey) => canWriteStateField(session, permissionKey));
  if (canManageResources && Array.isArray(submitted.resourceHistory)) {
    const allowedTypes = new Set(
      Object.entries(listPermissions)
        .filter(([, permissionKey]) => canWriteStateField(session, permissionKey))
        .map(([field]) => field),
    );
    const previousHistory = Array.isArray(previous.resourceHistory) ? previous.resourceHistory : [];
    const submittedHistory = submitted.resourceHistory.filter((entry) => allowedTypes.has(entry?.type));
    next.resourceHistory = [
      ...previousHistory.filter((entry) => !allowedTypes.has(entry?.type)),
      ...submittedHistory,
    ];
  }

  if (canWriteStateField(session, 'canAccessPlanner') && submitted.dailyData && typeof submitted.dailyData === 'object') {
    next.dailyData = submitted.dailyData;
  }

  return next;
}

function mergeStateForSession(previousState, submittedState, session) {
  const previous = previousState && typeof previousState === 'object' ? previousState : {};
  const submitted = submittedState && typeof submittedState === 'object' ? submittedState : {};
  const merged = {
    ...previous,
    version: Number(submitted.version) || Number(previous.version) || 2,
  };

  if (canWriteStateField(session, 'canManageSiteAccess')) {
    if (Array.isArray(submitted.sites)) merged.sites = submitted.sites;
    if (submitted.currentSite) merged.currentSite = submitted.currentSite;
  }

  if (canWriteStateField(session, 'canManageAdmins')) {
    if (Array.isArray(submitted.admins)) merged.admins = submitted.admins;
    if (submitted.adminRemovalNotices && typeof submitted.adminRemovalNotices === 'object') {
      merged.adminRemovalNotices = submitted.adminRemovalNotices;
    }
  }

  if (canWriteStateField(session, 'canManageGuestAccess') && submitted.guestPermissions) {
    merged.guestPermissions = submitted.guestPermissions;
  }

  if (canWriteStateField(session, 'canManageBinsPermissions') && submitted.binPermissions) {
    merged.binPermissions = submitted.binPermissions;
  }

  const previousSiteData = previous.siteData && typeof previous.siteData === 'object' ? previous.siteData : {};
  const submittedSiteData = submitted.siteData && typeof submitted.siteData === 'object' ? submitted.siteData : {};
  const nextSiteData = { ...previousSiteData };

  Object.entries(submittedSiteData).forEach(([rawSite, submittedEntry]) => {
    const site = sanitizeString(rawSite, 80);
    if (!site || !canAccessSite(session, site)) return;
    const previousEntry = previousSiteData[site] && typeof previousSiteData[site] === 'object' ? previousSiteData[site] : {};
    const entry = { ...previousEntry };
    const incoming = submittedEntry && typeof submittedEntry === 'object' ? submittedEntry : {};

    if (incoming.planner && typeof incoming.planner === 'object') {
      entry.planner = mergePlannerStateForSession(previousEntry.planner, incoming.planner, session);
    }
    if (canWriteBinsState(session) && incoming.bins) entry.bins = incoming.bins;
    if (canWriteTidplanState(session)) {
      if (incoming.tidplan && canWriteStateField(session, 'canManageTidplan')) entry.tidplan = incoming.tidplan;
      if (incoming.tidplanZones && canWriteStateField(session, 'canManageTidplanZones')) entry.tidplanZones = incoming.tidplanZones;
    }
    if (canWriteStateField(session, 'canManageWarehouse') && incoming.warehouse) {
      entry.warehouse = incoming.warehouse;
    }
    if ((canWriteStateField(session, 'canApproveReports') || canWriteStateField(session, 'canDeleteReports')) && incoming.reports) {
      entry.reports = incoming.reports;
    }
    if (canWriteStateField(session, 'canManageNotifications') && incoming.notifications) {
      entry.notifications = incoming.notifications;
    }
    if ((canWriteStateField(session, 'canEditSurveys') || canWriteStateField(session, 'canPublishSurveys')) && incoming.surveys) {
      entry.surveys = incoming.surveys;
    }

    nextSiteData[site] = entry;
  });

  merged.siteData = nextSiteData;
  return merged;
}

async function logActivity(userEmail, action, details = {}) {
  try {
    await mutateVersionedJsonFile(logsFile, [], async (logs) => {
      const nextLogs = Array.isArray(logs) ? [...logs] : [];
      nextLogs.push({
        timestamp: new Date().toISOString(),
        user: sanitizeString(userEmail || 'unknown', 160),
        action: sanitizeString(action || 'unknown', 160),
        details: sanitizeObject(details),
      });
      return nextLogs.slice(-2000);
    });
  } catch (error) {
    logServerError(error, 'logActivity');
  }
}

async function logWarehouseActivity(userEmail, action, details = {}) {
  try {
    await mutateVersionedJsonFile(warehouseLogsFile, [], async (logs) => {
      const nextLogs = Array.isArray(logs) ? [...logs] : [];
      nextLogs.push({
        timestamp: new Date().toISOString(),
        user: sanitizeString(userEmail || 'unknown', 160),
        action: sanitizeString(action || 'unknown', 160),
        details: sanitizeObject(details),
      });
      return nextLogs.slice(-5000);
    });
  } catch (error) {
    logServerError(error, 'logWarehouseActivity');
  }
}

async function migrateAdminPasswords() {
  const admins = await readAdmins();
  let changed = false;
  for (const admin of admins) {
    if (admin.password && !isPasswordHash(admin.password)) {
      admin.password = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);
      changed = true;
    }
  }
  if (changed) await writeAdmins(admins);
}

async function initializeData() {
  await dataStorage.init();
  await dataStorage.ensureBaseStructure();
  await dataStorage.ensureJsonFile(adminsFile, []);

  await ensureBootstrapAdmin();

  await dataStorage.ensureJsonFile(stateFile, {
    version: 2,
    savedAt: new Date().toISOString(),
    workers: [],
    lifts: [],
    moments: [],
    plans: [],
    karnas: [],
    dailyData: {},
    guestPermissions: { ...DEFAULT_GUEST_PERMISSIONS },
    siteData: {},
    sites: ['default'],
    currentSite: 'default',
  });

  await dataStorage.ensureJsonFile(logsFile, []);
  await dataStorage.ensureJsonFile(warehouseLogsFile, []);
  await dataStorage.ensureJsonFile(warehouseFile, {
    version: 1,
    items: [],
    adminAssignments: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const reportsFile = getReportsFilePath('default');
  await dataStorage.ensureJsonFile(reportsFile, []);
  const notificationsFile = getNotificationsFilePath('default');
  await dataStorage.ensureJsonFile(notificationsFile, []);

  await migrateAdminPasswords();
  try {
    await ensureAutoBackupCurrent('startup');
  } catch (error) {
    logServerError(error, 'startup_backup');
  }
}

function scheduleStorageInitializationRetry() {
  if (storageRuntime.retryTimer) return;
  if (STORAGE_INIT_MAX_ATTEMPTS > 0 && storageRuntime.attempts >= STORAGE_INIT_MAX_ATTEMPTS) {
    console.error(`Storage init stopped after ${storageRuntime.attempts} failed attempts.`);
    return;
  }
  const delayMs = Math.min(
    STORAGE_INIT_MAX_RETRY_MS,
    Math.round(STORAGE_INIT_RETRY_MS * Math.pow(1.8, Math.max(0, storageRuntime.attempts - 1))),
  );
  storageRuntime.nextRetryAt = Date.now() + delayMs;
  storageRuntime.retryTimer = setTimeout(() => {
    storageRuntime.retryTimer = null;
    storageRuntime.nextRetryAt = null;
    startStorageInitialization();
  }, delayMs);
  storageRuntime.retryTimer.unref?.();
  console.warn(`Storage init retry scheduled in ${delayMs}ms.`);
}

function startBackupScheduler() {
  if (storageRuntime.backupIntervalStarted) return;
  storageRuntime.backupIntervalStarted = true;
  setInterval(() => {
    ensureAutoBackupCurrent('auto').catch((error) => logServerError(error, 'auto_backup'));
  }, AUTO_BACKUP_INTERVAL_MS).unref();
}

async function startStorageInitialization() {
  if (storageRuntime.ready || storageRuntime.initializing) return;
  storageRuntime.initializing = true;
  storageRuntime.attempts += 1;

  try {
    await initializeData();
    storageRuntime.ready = true;
    storageRuntime.lastError = null;
    storageRuntime.lastReadyAt = new Date().toISOString();
    storageRuntime.nextRetryAt = null;
    startBackupScheduler();
    console.log(`Storage ready after ${storageRuntime.attempts} attempt(s).`);
  } catch (error) {
    storageRuntime.ready = false;
    storageRuntime.lastError = error && error.message ? error.message : String(error);
    logServerError(error, `storage_init_attempt_${storageRuntime.attempts}`);
    if (dataStorage.retryable === false) {
      console.error('Storage init is blocked by configuration and will not retry automatically.');
    } else {
      scheduleStorageInitializationRetry();
    }
  } finally {
    storageRuntime.initializing = false;
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const today = new Date().toISOString().slice(0, 10);
    const uploadPath = path.join(uploadsDir, today);
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_BYTES || process.env.MAX_UPLOAD_SIZE_BYTES) || 10 * 1024 * 1024,
  },
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts' },
  skip: (req) => req.method !== 'POST',
});

const backupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.BACKUP_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many backup requests' },
});

/**
 * Ä‚ËÄąâ€şĂ˘â‚¬Â¦ CORS FIX (RAILWAY + DEV SAFE)
 * - allows Railway + custom domains
 * - supports cookies/session auth
 */
app.use(cors((req, callback) => {
  const requestOrigin = req.headers.origin || '';
  callback(null, {
    origin: isAllowedOrigin(requestOrigin, req),
    credentials: true,
  });
}));

app.use(express.json({ limit: API_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: API_BODY_LIMIT }));

/**
 * Request timeout handler
 */
app.use((req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timeout' });
    }
  });
  next();
});

app.post('/api/login', loginLimiter, async (req, res, next) => {
  try {
    const email = sanitizeString(req.body?.email || '', 160).toLowerCase();
    const password = String(req.body?.password || '');
    if (!isValidEmail(email) || !password || password.length > 200) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const admins = await readAdmins();
    const admin = admins.find((entry) => entry.email === email);
    if (!admin) {
      await logActivity(email, 'login', { success: false });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const matches = await bcrypt.compare(password, admin.password || '');
    if (!matches) {
      await logActivity(email, 'login', { success: false });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const session = createSession(res, {
      email: admin.email,
      fullName: admin.fullName,
      role: 'admin',
      isSuperAdmin: admin.isSuperAdmin,
      isReadonly: false,
      permissions: normalizePermissions(admin.permissions),
      allowedSites: admin.allowedSites,
      level: admin.level,
    });

    await logActivity(email, 'login', { success: true });
    return res.json({
      auth: buildPublicAuthPayload(session),
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/login/guest', loginLimiter, async (req, res, next) => {
  try {
    const permissions = await getGuestPermissionsFromState();
    const session = createSession(res, {
      email: 'readonly',
      fullName: 'Read only',
      role: 'user',
      isSuperAdmin: false,
      isReadonly: true,
      permissions,
      allowedSites: null,
      level: 1,
    });
    return res.json({
      auth: buildPublicAuthPayload(session),
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/logout', requireAuth, requireCsrf, async (req, res) => {
  await logActivity(req.session.email, 'logout', {});
  clearSession(req, res);
  cleanupPresence();
  res.json({ success: true });
});

app.get('/api/session', requireAuth, (req, res) => {
  res.json({
    auth: buildPublicAuthPayload(req.session),
    csrfToken: req.session.csrfToken,
    expiresAt: req.session.expiresAt,
  });
});

app.use(
  express.static(STATIC_DIR, {
    setHeaders: (res, filePath) => {
      if (/\.(html|js|css)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  }),
);

app.get('/uploads/*', requireAuth, (req, res) => {
  const relativePath = req.params[0];
  const resolvedPath = path.resolve(uploadsDir, relativePath || '');
  if (!resolvedPath.startsWith(path.resolve(uploadsDir))) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return res.status(404).json({ error: 'File not found' });
  }
  return res.sendFile(resolvedPath);
});

app.get('/api/health', (req, res) => {
  const storage = getStorageStatusPayload();
  res.json({
    ok: true,
    storageReady: storage.ready,
    storage,
    timestamp: new Date().toISOString(),
  });
});

const apiRouter = express.Router();
apiRouter.use(requireAuth);
apiRouter.use(requireCsrf);

apiRouter.get('/state', async (req, res, next) => {
  try {
    const document = await getStateDocument();
    res.json(await buildPublicStatePayload(document, req.session));
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/state', requireAdmin, async (req, res, next) => {
  try {
    const state = sanitizeObject(req.body?.state);
    const lastKnownVersion = Number(req.body?.lastKnownVersion);
    if (!validateStatePayload(state)) {
      return res.status(400).json({ error: 'Invalid state payload' });
    }
    if (!Number.isFinite(lastKnownVersion) || lastKnownVersion < 1) {
      return res.status(400).json({ error: 'Missing lastKnownVersion' });
    }
    
    // Read-only users cannot modify state
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot modify state' });
    }

    const currentDocument = await getStateDocument();
    if (Number(currentDocument.version) !== lastKnownVersion) {
      return sendVersionConflict(res, async () => buildPublicStatePayload(await getStateDocument(), req.session));
    }
    const mergedState = mergeStateForSession(currentDocument.data, state, req.session);
    if (!canUnlockPastDays(req.session) && hasLockedPastChanges(currentDocument.data, mergedState)) {
      return res.status(403).json({ error: 'Past days are locked' });
    }

    if (!mergedState.siteData || typeof mergedState.siteData !== 'object' || Object.keys(mergedState.siteData).length === 0) {
      return res.status(400).json({ error: 'Empty state payload rejected' });
    }

    if (canWriteStateField(req.session, 'canManageAdmins') && Array.isArray(mergedState.admins)) {
      mergedState.admins = await persistAdmins(mergedState.admins, req.session);
    }
    
    const savedDocument = await writeVersionedJsonFile(stateFile, {
      ...mergedState,
      savedAt: new Date().toISOString(),
      savedBy: req.session.email,
    }, {
      lastKnownVersion,
      fallbackValue: null,
    });
    res.json({
      ok: true,
      version: savedDocument.version,
      updatedAt: savedDocument.updatedAt,
    });
  } catch (error) {
    if (isVersionConflictError(error)) {
      return sendVersionConflict(res, async () => buildPublicStatePayload(await getStateDocument(), req.session));
    }
    next(error);
  }
});

/* ==================== READ-ONLY MODE MANAGEMENT ==================== */

apiRouter.post('/admin/toggle-readonly', requirePermission('canToggleReadOnly'), async (req, res, next) => {
  try {
    const targetEmail = sanitizeString(req.body?.email || '', 160).toLowerCase();
    
    if (!targetEmail || !isValidEmail(targetEmail)) {
      return res.status(400).json({ error: 'Invalid admin email' });
    }
    
    // Only super admins can manage read-only mode
    if (!req.session.isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admins can manage read-only mode' });
    }
    
    let updatedAdmin = null;
    await mutateVersionedJsonFile(adminsFile, [], async (admins) => {
      const nextAdmins = Array.isArray(admins) ? admins.map((admin) => normalizeAdminRecord(admin)) : [];
      const adminIndex = nextAdmins.findIndex((admin) => admin.email === targetEmail);
      if (adminIndex < 0) {
        throw new Error('ADMIN_NOT_FOUND');
      }
      nextAdmins[adminIndex].isReadonly = !nextAdmins[adminIndex].isReadonly;
      updatedAdmin = nextAdmins[adminIndex];
      return nextAdmins;
    });
    if (!updatedAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    await logActivity(req.session.email, 'toggle_readonly_mode', {
      targetEmail,
      newStatus: updatedAdmin.isReadonly,
    });
    
    res.json({
      ok: true,
      email: updatedAdmin.email,
      isReadonly: updatedAdmin.isReadonly,
    });
  } catch (error) {
    if (error?.message === 'ADMIN_NOT_FOUND') {
      return res.status(404).json({ error: 'Admin not found' });
    }
    next(error);
  }
});

apiRouter.post('/admin/set-readonly-sites', requirePermission('canModifyReadOnly'), async (req, res, next) => {
  try {
    const targetEmail = sanitizeString(req.body?.email || '', 160).toLowerCase();
    const sites = Array.isArray(req.body?.sites) ? req.body.sites : [];
    
    if (!targetEmail || !isValidEmail(targetEmail)) {
      return res.status(400).json({ error: 'Invalid admin email' });
    }
    
    // Only super admins can manage read-only access
    if (!req.session.isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admins can manage read-only access' });
    }
    
    let updatedAdmin = null;
    await mutateVersionedJsonFile(adminsFile, [], async (admins) => {
      const nextAdmins = Array.isArray(admins) ? admins.map((admin) => normalizeAdminRecord(admin)) : [];
      const adminIndex = nextAdmins.findIndex((admin) => admin.email === targetEmail);
      if (adminIndex < 0) {
        throw new Error('ADMIN_NOT_FOUND');
      }
      const admin = nextAdmins[adminIndex];
      if (!admin.isReadonly) {
        throw new Error('ADMIN_NOT_READONLY');
      }
      if (sites === null || sites === undefined) {
        admin.allowedSites = null;
      } else if (Array.isArray(sites)) {
        admin.allowedSites = sites.map((s) => sanitizeString(s, 80)).filter(Boolean);
        if (admin.allowedSites.length === 0) {
          admin.allowedSites = null;
        }
      } else {
        throw new Error('INVALID_SITES');
      }
      updatedAdmin = admin;
      return nextAdmins;
    });
    await logActivity(req.session.email, 'set_readonly_sites', {
      targetEmail,
      sites: updatedAdmin?.allowedSites || null,
    });
    
    res.json({
      ok: true,
      email: updatedAdmin.email,
      isReadonly: updatedAdmin.isReadonly,
      allowedSites: updatedAdmin.allowedSites,
    });
  } catch (error) {
    if (error?.message === 'ADMIN_NOT_FOUND') {
      return res.status(404).json({ error: 'Admin not found' });
    }
    if (error?.message === 'ADMIN_NOT_READONLY') {
      return res.status(400).json({ error: 'Admin is not in read-only mode' });
    }
    if (error?.message === 'INVALID_SITES') {
      return res.status(400).json({ error: 'Sites must be null or an array' });
    }
    next(error);
  }
});

apiRouter.get('/admin/readonly-status', requirePermission('canViewSettings'), async (req, res) => {
  try {
    const targetEmail = sanitizeString(req.query?.email || '', 160).toLowerCase();
    
    if (!targetEmail || !isValidEmail(targetEmail)) {
      return res.status(400).json({ error: 'Invalid admin email' });
    }
    
    // Only super admins or the user themselves can view this
    if (!req.session.isSuperAdmin && req.session.email !== targetEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const admins = await readAdmins();
    const admin = admins.find((a) => a.email === targetEmail);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json({
      email: admin.email,
      isReadonly: admin.isReadonly,
      allowedSites: admin.allowedSites,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


apiRouter.get('/presence', (req, res) => {
  cleanupPresence();
  const currentSite = sanitizeString(req.query.site || '', 80);
  const users = Array.from(activePresence.values())
    .filter((entry) => !currentSite || entry.currentSite === currentSite)
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
    .map((entry) => ({
      sessionId: entry.sessionId,
      email: entry.email,
      displayName: entry.displayName,
      initials: entry.initials,
      mode: entry.mode,
      editingArea: entry.editingArea,
      currentSite: entry.currentSite,
      currentView: entry.currentView,
      lastEditAt: entry.lastEditAt,
      lastSeen: entry.lastSeen,
    }));
  res.json({ users });
});

apiRouter.post('/presence', (req, res) => {
  cleanupPresence();
  const body = sanitizeObject(req.body || {});
  const sessionId = sanitizeString(body.sessionId || '', 120);
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  if (body.active === false) {
    activePresence.delete(sessionId);
    return res.json({ success: true });
  }
  activePresence.set(sessionId, {
    sessionId,
    email: req.session.email,
    displayName: sanitizeString(body.displayName || req.session.fullName || req.session.email, 160),
    initials: sanitizeString(body.initials || '?', 8),
    mode: body.mode === 'viewing' ? 'viewing' : 'editing',
    editingArea: sanitizeString(body.editingArea || body.currentView || 'planner', 80),
    currentSite: sanitizeString(body.currentSite || 'default', 80),
    currentView: sanitizeString(body.currentView || 'planner', 80),
    lastEditAt: Number(body.lastEditAt) || null,
    lastSeen: Date.now(),
  });
  res.json({ success: true });
});

apiRouter.post('/upload', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot upload files' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileInfo = {
      originalName: sanitizeString(req.file.originalname, 255),
      filename: req.file.filename,
      url: getUploadUrl(req.file.path),
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadDate: new Date().toISOString(),
    };
    await logActivity(req.session.email, 'file_upload', {
      filename: fileInfo.originalName,
      size: fileInfo.size,
    });
    res.json({ success: true, file: fileInfo });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/files', requireAdmin, (req, res) => {
  const files = [];
  const today = new Date().toISOString().slice(0, 10);
  const todayDir = path.join(uploadsDir, today);
  if (fs.existsSync(todayDir)) {
    for (const filename of fs.readdirSync(todayDir)) {
      const filePath = path.join(todayDir, filename);
      const stats = fs.statSync(filePath);
      files.push({
        filename,
        path: getUploadUrl(filePath),
        size: stats.size,
        uploadDate: stats.mtime.toISOString(),
      });
    }
  }
  res.json({ files });
});

apiRouter.get('/reports', requirePermission('canViewReports'), async (req, res, next) => {
  try {
    const site = sanitizeString(req.query.site || 'default', 80);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }
    const document = await readVersionedJsonFile(getReportsFilePath(site), []);
    res.json({
      reports: Array.isArray(document.data) ? document.data : [],
      version: document.version || 1,
      updatedAt: document.updatedAt || null,
    });
  } catch (error) {
    next(error);
  }
});

function mergeCreatedReports(existingReports, submittedReports) {
  const existing = Array.isArray(existingReports) ? existingReports : [];
  const submitted = Array.isArray(submittedReports) ? submittedReports : [];
  const existingIds = new Set(existing.map((report) => String(report?.id || '')));
  const created = submitted.filter((report) => {
    const id = String(report?.id || '');
    return id && !existingIds.has(id);
  });
  return [...existing, ...created];
}

apiRouter.post('/reports', requirePermission('canCreateReports'), async (req, res, next) => {
  try {
  if (req.session.isReadonly) {
    return res.status(403).json({ error: 'Read-only users cannot modify reports' });
  }
  const site = sanitizeString(req.body?.site || 'default', 80);
  if (!canAccessSite(req.session, site)) {
    return res.status(403).json({ error: 'Access denied to this site' });
  }
  const reports = sanitizeObject(req.body?.reports);
  const lastKnownVersion = Number(req.body?.lastKnownVersion);
  if (!Array.isArray(reports)) {
    return res.status(400).json({ error: 'Invalid reports payload' });
  }
  const canProcessReports =
    sessionHasPermission(req.session, 'canApproveReports') ||
    sessionHasPermission(req.session, 'canDeleteReports');
  if (canProcessReports && (!Number.isFinite(lastKnownVersion) || lastKnownVersion < 1)) {
    return res.status(400).json({ error: 'Missing lastKnownVersion' });
  }
  const savedDocument = canProcessReports
    ? await writeVersionedJsonFile(getReportsFilePath(site), reports, {
        lastKnownVersion,
        fallbackValue: [],
      })
    : await mutateVersionedJsonFile(getReportsFilePath(site), [], (existingReports) =>
        mergeCreatedReports(existingReports, reports),
      );
  await logActivity(req.session.email, 'save_reports', { count: reports.length, site });
  res.json({ ok: true, version: savedDocument.version, updatedAt: savedDocument.updatedAt });
  } catch (error) {
    if (isVersionConflictError(error)) {
      const site = sanitizeString(req.body?.site || 'default', 80);
      return sendVersionConflict(res, async () => {
        const latest = await readVersionedJsonFile(getReportsFilePath(site), []);
        return {
          reports: Array.isArray(latest.data) ? latest.data : [],
          version: latest.version || 1,
          updatedAt: latest.updatedAt || null,
        };
      });
    }
    next(error);
  }
});

apiRouter.get('/notifications', requirePermission('canViewNotifications'), async (req, res, next) => {
  try {
    const site = sanitizeString(req.query.site || 'default', 80);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }
    const document = await readVersionedJsonFile(getNotificationsFilePath(site), []);
    res.json({
      notifications: Array.isArray(document.data) ? document.data : [],
      version: document.version || 1,
      updatedAt: document.updatedAt || null,
    });
  } catch (error) {
    next(error);
  }
});

function mergeNotificationsById(existingNotifications, submittedNotifications) {
  const mergedById = new Map();
  (Array.isArray(existingNotifications) ? existingNotifications : []).forEach((notification) => {
    const id = String(notification?.id || '');
    if (id) mergedById.set(id, notification);
  });
  (Array.isArray(submittedNotifications) ? submittedNotifications : []).forEach((notification) => {
    const id = String(notification?.id || '');
    if (id) mergedById.set(id, notification);
  });
  return Array.from(mergedById.values()).sort((a, b) =>
    String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')),
  );
}

apiRouter.post('/notifications', requirePermission('canManageNotifications'), async (req, res, next) => {
  try {
  if (req.session.isReadonly) {
    return res.status(403).json({ error: 'Read-only users cannot modify notifications' });
  }
  const site = sanitizeString(req.body?.site || 'default', 80);
  if (!canAccessSite(req.session, site)) {
    return res.status(403).json({ error: 'Access denied to this site' });
  }
  const notifications = sanitizeObject(req.body?.notifications);
  const lastKnownVersion = Number(req.body?.lastKnownVersion);
  if (!Array.isArray(notifications)) {
    return res.status(400).json({ error: 'Invalid notifications payload' });
  }
  const savedDocument = await mutateVersionedJsonFile(
    getNotificationsFilePath(site),
    [],
    (existingNotifications, documentInfo) => {
      if (
        Number.isFinite(lastKnownVersion) &&
        lastKnownVersion >= 1 &&
        Number(lastKnownVersion) === Number(documentInfo.version)
      ) {
        return notifications;
      }
      return mergeNotificationsById(existingNotifications, notifications);
    },
  );
  await logActivity(req.session.email, 'save_notifications', { count: notifications.length, site });
  res.json({ ok: true, version: savedDocument.version, updatedAt: savedDocument.updatedAt });
  } catch (error) {
    if (isVersionConflictError(error)) {
      const site = sanitizeString(req.body?.site || 'default', 80);
      return sendVersionConflict(res, async () => {
        const latest = await readVersionedJsonFile(getNotificationsFilePath(site), []);
        return {
          notifications: Array.isArray(latest.data) ? latest.data : [],
          version: latest.version || 1,
          updatedAt: latest.updatedAt || null,
        };
      });
    }
    next(error);
  }
});

function getSurveyListFromState(state, site) {
  const entry = state?.siteData?.[site];
  return Array.isArray(entry?.surveys) ? entry.surveys : [];
}

function getSurveyWindow(survey) {
  const startAt = new Date(survey?.startAt || 0);
  const endAt = new Date(survey?.endAt || 0);
  return { startAt, endAt };
}

function isSurveyActive(survey, now = new Date()) {
  const { startAt, endAt } = getSurveyWindow(survey);
  return Number.isFinite(startAt.getTime()) &&
    Number.isFinite(endAt.getTime()) &&
    now >= startAt &&
    now <= endAt;
}

function isSurveyFinished(survey, now = new Date()) {
  const { endAt } = getSurveyWindow(survey);
  return Number.isFinite(endAt.getTime()) && now > endAt;
}

function userCanReceiveSurvey(session, survey, site) {
  if (!session || !survey) return false;
  if (session.isSuperAdmin || session.email === survey.createdBy) return true;
  const recipients = survey.recipients || {};
  const email = sanitizeString(session.email || '', 160).toLowerCase();
  if (recipients.all === true) return true;
  if (recipients.site === true && survey.site === site) return true;
  return Array.isArray(recipients.users) && recipients.users.includes(email);
}

function canViewSurveyVoters(session, survey) {
  if (!session || !survey) return false;
  if (session.isSuperAdmin || Number(session.level) >= 6) return true;
  if (survey.privacy === 'anonymous') {
    return sessionHasPermission(session, 'canViewAnonymousSurveyVoters');
  }
  if (survey.privacy === 'public') return sessionHasPermission(session, 'canViewSurveyResults');
  return false;
}

function buildSurveyResults(survey, session) {
  const answers = Array.isArray(survey.answers) ? survey.answers : [];
  const votes = Array.isArray(survey.votes) ? survey.votes : [];
  const showVoters = canViewSurveyVoters(session, survey);
  return answers.map((answer) => {
    const answerVotes = votes.filter((vote) => vote.answerId === answer.id);
    const result = {
      id: answer.id,
      text: answer.text,
      count: answerVotes.length,
    };
    if (showVoters) {
      result.voters = answerVotes.map((vote) => ({
        email: vote.email,
        name: vote.name || vote.email,
        votedAt: vote.votedAt,
      }));
    }
    return result;
  });
}

function redactSurveyForSession(survey, session, site) {
  const active = isSurveyActive(survey);
  const finished = isSurveyFinished(survey);
  const canViewResults = sessionHasPermission(session, 'canViewSurveyResults');
  const canSeeResults = finished || canViewResults || session?.isSuperAdmin || Number(session?.level) >= 6;
  const userEmail = sanitizeString(session?.email || '', 160).toLowerCase();
  const ownVote = Array.isArray(survey.votes)
    ? survey.votes.find((vote) => vote.email === userEmail)
    : null;
  const response = {
    id: survey.id,
    site: survey.site || site,
    question: survey.question,
    imageUrl: survey.imageUrl || '',
    answers: Array.isArray(survey.answers) ? survey.answers : [],
    privacy: survey.privacy,
    startAt: survey.startAt,
    endAt: survey.endAt,
    active,
    finished,
    createdAt: survey.createdAt,
    createdBy: survey.createdBy,
    createdByName: survey.createdByName || survey.createdBy || '',
    pinned: survey.pinned === true,
    allowVoteChange: survey.allowVoteChange === true,
    myVote: ownVote ? ownVote.answerId : null,
    canViewResults: canSeeResults,
    canDelete: session?.isSuperAdmin || Number(session?.level) >= 6,
    canPin: session?.isSuperAdmin || Number(session?.level) >= 6,
  };
  if (canSeeResults) {
    response.results = buildSurveyResults(survey, session);
  }
  return response;
}

function validateSurveyInput(body) {
  const question = sanitizeString(body?.question, 1000);
  const privacy = ['anonymous', 'semiAnonymous', 'public'].includes(body?.privacy)
    ? body.privacy
    : 'semiAnonymous';
  
  const startDateStr = sanitizeString(body?.startDate, 20);
  const startTimeStr = sanitizeString(body?.startTime, 20);
  const endDateStr = sanitizeString(body?.endDate, 20);
  const endTimeStr = sanitizeString(body?.endTime, 20);
  const timezoneOffset = Number(body?.timezoneOffset);
  const offsetMinutes = Number.isFinite(timezoneOffset) ? timezoneOffset : 0;
  
  const parseLocalDateTime = (dateStr, timeStr) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr || '');
    if (!match || !timeMatch) return null;
    const [, year, month, day] = match;
    const [, hour, minute] = timeMatch;
    const utcMs = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
      0,
    ) + offsetMinutes * 60 * 1000;
    const date = new Date(utcMs);
    return Number.isFinite(date.getTime()) ? date : null;
  };
  
  const startAt = parseLocalDateTime(startDateStr, startTimeStr);
  const endAt = parseLocalDateTime(endDateStr, endTimeStr);
  
  const rawAnswers = typeof body?.answers === 'string'
    ? JSON.parse(body.answers || '[]')
    : body?.answers;
  const answers = Array.isArray(rawAnswers)
    ? rawAnswers.map((answer) => sanitizeString(answer, 300)).filter(Boolean)
    : [];
  const rawUsers = typeof body?.targetUsers === 'string'
    ? JSON.parse(body.targetUsers || '[]')
    : body?.targetUsers;
  const targetUsers = Array.isArray(rawUsers)
    ? Array.from(new Set(rawUsers.map((email) => sanitizeString(email, 160).toLowerCase()).filter(isValidEmail)))
    : [];
  const recipients = {
    all: body?.targetAll === true || body?.targetAll === 'true',
    site: body?.targetSite === true || body?.targetSite === 'true',
    users: targetUsers,
  };
  if (!question) return { error: 'Question is required' };
  if (answers.length < 2) return { error: 'At least two answers are required' };
  if (!startAt || !endAt || !Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
    return { error: 'Invalid survey time range' };
  }
  if (!recipients.all && !recipients.site && !recipients.users.length) {
    return { error: 'At least one recipient is required' };
  }
  return { question, privacy, startAt, endAt, answers, recipients };
}

apiRouter.get('/surveys', requirePermission('canViewSurveys'), async (req, res, next) => {
  try {
    const site = sanitizeString(req.body?.site || req.query.site || req.session.currentSite || 'default', 80);
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    const document = await getStateDocument();
    const surveys = getSurveyListFromState(document.data || {}, site)
      .filter((survey) => userCanReceiveSurvey(req.session, survey, site))
      .map((survey) => redactSurveyForSession(survey, req.session, site))
      .sort((a, b) => {
        // Pinned surveys first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // Then by creation date (newest first)
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });
    res.json({ surveys, version: document.version || 1, updatedAt: document.updatedAt || null });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/surveys', requirePermission('canCreateSurveys'), upload.single('image'), async (req, res, next) => {
  try {
    if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot create surveys' });
    if (!sessionHasPermission(req.session, 'canPublishSurveys')) {
      return res.status(403).json({ error: 'Insufficient publish permissions' });
    }
    const site = sanitizeString(req.body?.site || req.session.currentSite || 'default', 80);
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    if (req.file) {
      const ext = path.extname(req.file.originalname || req.file.path).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) || !String(req.file.mimetype || '').startsWith('image/')) {
        fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Invalid image upload' });
      }
    }
    const parsed = validateSurveyInput(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const now = new Date().toISOString();
    const creatorEmail = sanitizeString(req.session.email || '', 160).toLowerCase();
    const creatorRecord = (await readAdmins()).find((admin) => admin.email === creatorEmail);
    const creatorName = sanitizeString(
      creatorRecord?.fullName ||
        `${creatorRecord?.firstName || ''} ${creatorRecord?.lastName || ''}`.trim() ||
        req.session.fullName ||
        creatorEmail,
      180,
    );
    const survey = {
      id: `survey_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      site,
      question: parsed.question,
      imageUrl: req.file ? getUploadUrl(req.file.path) : '',
      answers: parsed.answers.map((text, index) => ({ id: `a${index + 1}`, text })),
      recipients: parsed.recipients,
      privacy: parsed.privacy,
      startAt: parsed.startAt.toISOString(),
      endAt: parsed.endAt.toISOString(),
      allowVoteChange: req.body?.allowVoteChange === true || req.body?.allowVoteChange === 'true',
      createdAt: now,
      createdBy: creatorEmail,
      createdByName: creatorName,
      votes: [],
    };
    const saved = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = state && typeof state === 'object' ? { ...state } : {};
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const currentEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object' ? nextState.siteData[site] : {};
      const surveys = getSurveyListFromState(nextState, site).slice();
      surveys.push(survey);
      nextState.siteData[site] = { ...currentEntry, surveys };
      nextState.savedAt = now;
      nextState.savedBy = req.session.email;
      return nextState;
    });
    await logActivity(req.session.email, 'survey_created', { site, surveyId: survey.id });
    res.json({ ok: true, survey: redactSurveyForSession(survey, req.session, site), version: saved.version || 1 });
  } catch (error) {
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid survey payload' });
    next(error);
  }
});

apiRouter.post('/surveys/:surveyId/vote', requirePermission('canViewSurveys'), async (req, res, next) => {
  try {
    if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot vote' });
    const site = sanitizeString(req.body?.site || req.query.site || req.session.currentSite || 'default', 80);
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    const surveyId = sanitizeString(req.params.surveyId, 120);
    const answerId = sanitizeString(req.body?.answerId, 80);
    const email = sanitizeString(req.session.email || '', 160).toLowerCase();
    let updatedSurvey = null;
    const saved = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = state && typeof state === 'object' ? { ...state } : {};
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const currentEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object' ? nextState.siteData[site] : {};
      const surveys = getSurveyListFromState(nextState, site).slice();
      const index = surveys.findIndex((survey) => survey.id === surveyId);
      if (index < 0) {
        const error = new Error('Survey not found');
        error.statusCode = 404;
        throw error;
      }
      const survey = { ...surveys[index], votes: Array.isArray(surveys[index].votes) ? surveys[index].votes.slice() : [] };
      if (!userCanReceiveSurvey(req.session, survey, site)) {
        const error = new Error('Access denied to this survey');
        error.statusCode = 403;
        throw error;
      }
      if (!isSurveyActive(survey)) {
        const error = new Error('Survey is not active');
        error.statusCode = 400;
        throw error;
      }
      if (!Array.isArray(survey.answers) || !survey.answers.some((answer) => answer.id === answerId)) {
        const error = new Error('Invalid answer');
        error.statusCode = 400;
        throw error;
      }
      const existingIndex = survey.votes.findIndex((vote) => vote.email === email);
      if (existingIndex >= 0 && survey.allowVoteChange !== true) {
        const error = new Error('User already voted');
        error.statusCode = 409;
        throw error;
      }
      const vote = {
        email,
        name: sanitizeString(req.session.fullName || req.session.email || '', 180),
        answerId,
        votedAt: new Date().toISOString(),
      };
      if (existingIndex >= 0) survey.votes[existingIndex] = vote;
      else survey.votes.push(vote);
      surveys[index] = survey;
      updatedSurvey = survey;
      nextState.siteData[site] = { ...currentEntry, surveys };
      nextState.savedAt = new Date().toISOString();
      nextState.savedBy = req.session.email;
      return nextState;
    });
    await logActivity(req.session.email, 'survey_voted', { site, surveyId, answerId });
    res.json({ ok: true, survey: redactSurveyForSession(updatedSurvey, req.session, site), version: saved.version || 1 });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

// DELETE /surveys/:surveyId - Delete a survey (admin level 6+)
apiRouter.delete('/surveys/:surveyId', async (req, res, next) => {
  try {
    if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot delete surveys' });
    if (!req.session.isSuperAdmin && Number(req.session.level) < 6) {
      return res.status(403).json({ error: 'Only admin level 6+ can delete surveys' });
    }
    const site = sanitizeString(req.body?.site || req.query.site || req.session.currentSite || 'default', 80);
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    const surveyId = sanitizeString(req.params.surveyId, 120);
    const saved = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = state && typeof state === 'object' ? { ...state } : {};
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const currentEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object' ? nextState.siteData[site] : {};
      const surveys = getSurveyListFromState(nextState, site).slice();
      const index = surveys.findIndex((survey) => survey.id === surveyId);
      if (index < 0) {
        const error = new Error('Survey not found');
        error.statusCode = 404;
        throw error;
      }
      surveys.splice(index, 1);
      nextState.siteData[site] = { ...currentEntry, surveys };
      nextState.savedAt = new Date().toISOString();
      nextState.savedBy = req.session.email;
      return nextState;
    });
    await logActivity(req.session.email, 'survey_deleted', { site, surveyId });
    res.json({ ok: true, version: saved.version || 1 });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

// PATCH /surveys/:surveyId/pin - Pin/unpin a survey (admin level 6+)
apiRouter.patch('/surveys/:surveyId/pin', async (req, res, next) => {
  try {
    if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot pin surveys' });
    if (!req.session.isSuperAdmin && Number(req.session.level) < 6) {
      return res.status(403).json({ error: 'Only admin level 6+ can pin surveys' });
    }
    const site = sanitizeString(req.query.site || req.session.currentSite || 'default', 80);
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    const surveyId = sanitizeString(req.params.surveyId, 120);
    const pinned = req.body?.pinned === true || req.body?.pinned === 'true';
    let updatedSurvey = null;
    const saved = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = state && typeof state === 'object' ? { ...state } : {};
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const currentEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object' ? nextState.siteData[site] : {};
      const surveys = getSurveyListFromState(nextState, site).slice();
      const index = surveys.findIndex((survey) => survey.id === surveyId);
      if (index < 0) {
        const error = new Error('Survey not found');
        error.statusCode = 404;
        throw error;
      }
      const survey = { ...surveys[index], pinned };
      surveys[index] = survey;
      updatedSurvey = survey;
      nextState.siteData[site] = { ...currentEntry, surveys };
      nextState.savedAt = new Date().toISOString();
      nextState.savedBy = req.session.email;
      return nextState;
    });
    await logActivity(req.session.email, `survey_${pinned ? 'pinned' : 'unpinned'}`, { site, surveyId });
    res.json({ ok: true, survey: redactSurveyForSession(updatedSurvey, req.session, site), version: saved.version || 1 });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

apiRouter.get('/logs', requirePermission('canViewLogs'), async (req, res, next) => {
  try {
    const logs = await readJsonFile(logsFile, []);
    res.json(Array.isArray(logs) ? logs : []);
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/logs', async (req, res, next) => {
  try {
    const action = sanitizeString(req.body?.action || 'client_log', 200);
    const details = sanitizeObject(req.body?.details || {});
    await logActivity(req.session.email, action, details);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/logs', requirePermission('canClearLogs'), async (req, res, next) => {
  try {
    await writeVersionedJsonFile(logsFile, [], { fallbackValue: [] });
    await logActivity(req.session.email, 'clear_logs', {});
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ==================== WAREHOUSE MANAGEMENT ==================== */

apiRouter.get('/warehouse', requirePermission('canViewWarehouse'), async (req, res, next) => {
  try {
    const warehouse = await readJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} });
    res.json(warehouse);
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/warehouse', requirePermission('canManageWarehouse'), async (req, res, next) => {
  try {
    const item = sanitizeObject(req.body?.item);
    if (!item || !item.id) {
      return res.status(400).json({ error: 'Invalid item payload. Must include id.' });
    }
    
    const warehouseItem = {
      id: sanitizeString(item.id, 120),
      name: sanitizeString(item.name || '', 200),
      description: sanitizeString(item.description || '', 500),
      quantity: Number(item.quantity) || 0,
      unit: sanitizeString(item.unit || '', 50),
      category: sanitizeString(item.category || '', 100),
      location: sanitizeString(item.location || '', 200),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let warehouseAction = 'create_item';
    await mutateVersionedJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} }, async (warehouse) => {
      const nextWarehouse = warehouse && typeof warehouse === 'object'
        ? { ...warehouse }
        : { version: 1, items: [], adminAssignments: {} };
      nextWarehouse.items = Array.isArray(nextWarehouse.items) ? [...nextWarehouse.items] : [];
      nextWarehouse.adminAssignments =
        nextWarehouse.adminAssignments && typeof nextWarehouse.adminAssignments === 'object'
          ? { ...nextWarehouse.adminAssignments }
          : {};

      const existingIndex = nextWarehouse.items.findIndex((entry) => entry.id === item.id);
      if (existingIndex >= 0) {
        nextWarehouse.items[existingIndex] = warehouseItem;
        warehouseAction = 'update_item';
      } else {
        nextWarehouse.items.push(warehouseItem);
        warehouseAction = 'create_item';
      }
      nextWarehouse.updatedAt = new Date().toISOString();
      return nextWarehouse;
    });

    await logWarehouseActivity(req.session.email, warehouseAction, { id: item.id, name: warehouseItem.name });
    res.json({ ok: true, item: warehouseItem });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/warehouse/:itemId', requirePermission('canManageWarehouse'), async (req, res, next) => {
  try {
    const itemId = sanitizeString(req.params.itemId || '', 120);
    if (!itemId) {
      return res.status(400).json({ error: 'Missing itemId' });
    }
    
    let deletedItem = null;
    await mutateVersionedJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} }, async (warehouse) => {
      const nextWarehouse = warehouse && typeof warehouse === 'object'
        ? { ...warehouse }
        : { version: 1, items: [], adminAssignments: {} };
      nextWarehouse.items = Array.isArray(nextWarehouse.items) ? [...nextWarehouse.items] : [];
      nextWarehouse.adminAssignments =
        nextWarehouse.adminAssignments && typeof nextWarehouse.adminAssignments === 'object'
          ? { ...nextWarehouse.adminAssignments }
          : {};
      const index = nextWarehouse.items.findIndex((entry) => entry.id === itemId);
      if (index < 0) {
        throw new Error('WAREHOUSE_ITEM_NOT_FOUND');
      }
      deletedItem = nextWarehouse.items.splice(index, 1)[0];
      for (const adminEmail of Object.keys(nextWarehouse.adminAssignments)) {
        nextWarehouse.adminAssignments[adminEmail] = (nextWarehouse.adminAssignments[adminEmail] || []).filter(
          (id) => id !== itemId,
        );
        if (nextWarehouse.adminAssignments[adminEmail].length === 0) {
          delete nextWarehouse.adminAssignments[adminEmail];
        }
      }
      nextWarehouse.updatedAt = new Date().toISOString();
      return nextWarehouse;
    });
    await logWarehouseActivity(req.session.email, 'delete_item', { id: itemId, name: deletedItem.name });
    res.json({ ok: true });
  } catch (error) {
    if (error?.message === 'WAREHOUSE_ITEM_NOT_FOUND') {
      return res.status(404).json({ error: 'Item not found' });
    }
    next(error);
  }
});

apiRouter.get('/warehouse/admin-assignments', requirePermission('canViewWarehouse'), async (req, res, next) => {
  try {
    const warehouse = await readJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} });
    res.json(warehouse.adminAssignments || {});
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/warehouse/assign-admin', requirePermission('canAssignWarehouseToAdmin'), async (req, res, next) => {
  try {
    const adminEmail = sanitizeString(req.body?.adminEmail || '', 160).toLowerCase();
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : [];
    
    if (!adminEmail || !isValidEmail(adminEmail)) {
      return res.status(400).json({ error: 'Invalid admin email' });
    }
    
    if (itemIds.length === 0) {
      return res.status(400).json({ error: 'No items to assign' });
    }
    
    // Verify admin exists
    const admins = await readAdmins();
    const admin = admins.find((a) => a.email === adminEmail);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    let sanitizedItemIds = [];
    await mutateVersionedJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} }, async (warehouse) => {
      const nextWarehouse = warehouse && typeof warehouse === 'object'
        ? { ...warehouse }
        : { version: 1, items: [], adminAssignments: {} };
      nextWarehouse.items = Array.isArray(nextWarehouse.items) ? [...nextWarehouse.items] : [];
      nextWarehouse.adminAssignments =
        nextWarehouse.adminAssignments && typeof nextWarehouse.adminAssignments === 'object'
          ? { ...nextWarehouse.adminAssignments }
          : {};

      sanitizedItemIds = itemIds
        .map((id) => sanitizeString(id, 120))
        .filter((id) => nextWarehouse.items.some((item) => item.id === id));

      if (sanitizedItemIds.length === 0) {
        throw new Error('NO_VALID_ASSIGNMENTS');
      }

      const currentAssignments = nextWarehouse.adminAssignments[adminEmail] || [];
      nextWarehouse.adminAssignments[adminEmail] = Array.from(new Set([...currentAssignments, ...sanitizedItemIds]));
      nextWarehouse.updatedAt = new Date().toISOString();
      return nextWarehouse;
    });
    
    await logWarehouseActivity(req.session.email, 'assign_admin', {
      adminEmail,
      itemIds: sanitizedItemIds,
    });
    res.json({ ok: true, assignedItemIds: sanitizedItemIds });
  } catch (error) {
    if (error?.message === 'NO_VALID_ASSIGNMENTS') {
      return res.status(400).json({ error: 'No valid items to assign' });
    }
    next(error);
  }
});

apiRouter.post('/warehouse/unassign-admin', requirePermission('canAssignWarehouseToAdmin'), async (req, res, next) => {
  try {
    const adminEmail = sanitizeString(req.body?.adminEmail || '', 160).toLowerCase();
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : [];
    
    if (!adminEmail || !isValidEmail(adminEmail)) {
      return res.status(400).json({ error: 'Invalid admin email' });
    }
    
    if (itemIds.length === 0) {
      return res.status(400).json({ error: 'No items to unassign' });
    }
    
    const sanitizedItemIds = itemIds.map((id) => sanitizeString(id, 120));
    await mutateVersionedJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} }, async (warehouse) => {
      const nextWarehouse = warehouse && typeof warehouse === 'object'
        ? { ...warehouse }
        : { version: 1, items: [], adminAssignments: {} };
      nextWarehouse.adminAssignments =
        nextWarehouse.adminAssignments && typeof nextWarehouse.adminAssignments === 'object'
          ? { ...nextWarehouse.adminAssignments }
          : {};

      if (!nextWarehouse.adminAssignments[adminEmail]) {
        throw new Error('ADMIN_ASSIGNMENTS_NOT_FOUND');
      }

      nextWarehouse.adminAssignments[adminEmail] = nextWarehouse.adminAssignments[adminEmail].filter(
        (id) => !sanitizedItemIds.includes(id),
      );

      if (nextWarehouse.adminAssignments[adminEmail].length === 0) {
        delete nextWarehouse.adminAssignments[adminEmail];
      }

      nextWarehouse.updatedAt = new Date().toISOString();
      return nextWarehouse;
    });
    
    await logWarehouseActivity(req.session.email, 'unassign_admin', {
      adminEmail,
      itemIds: sanitizedItemIds,
    });
    res.json({ ok: true, unassignedItemIds: sanitizedItemIds });
  } catch (error) {
    if (error?.message === 'ADMIN_ASSIGNMENTS_NOT_FOUND') {
      return res.status(404).json({ error: 'Admin has no warehouse assignments' });
    }
    next(error);
  }
});

apiRouter.get('/warehouse-logs', requirePermission('canViewLogs'), async (req, res, next) => {
  try {
    const logs = await readJsonFile(warehouseLogsFile, []);
    res.json(Array.isArray(logs) ? logs : []);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/warehouse-logs', requirePermission('canClearLogs'), async (req, res, next) => {
  try {
    await writeVersionedJsonFile(warehouseLogsFile, [], { fallbackValue: [] });
    await logWarehouseActivity(req.session.email, 'clear_warehouse_logs', {});
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/* ==================== EXPORT/IMPORT ENDPOINTS ==================== */

async function getModulePayload(module, site) {
  const stateDocument = await getStateDocument();
  const siteEntry = getSiteEntryFromState(stateDocument.data || {}, site);
  if (module === 'planner') return buildModulePayload('planner', site, siteEntry.planner || {});
  if (module === 'tidplan') return buildModulePayload('tidplan', site, siteEntry.tidplan || []);
  if (module === 'warehouse') {
    const warehouse = siteEntry.warehouse || {};
    const logs = Array.isArray(warehouse.logs) ? warehouse.logs : await readJsonFile(warehouseLogsFile, []);
    return buildModulePayload('warehouse', site, warehouse, { logs: sanitizeObject(logs) });
  }
  throw new Error('UNKNOWN_MODULE');
}

async function importModulePayload(module, site, payload, session) {
  await mutateVersionedJsonFile(stateFile, null, async (state) => {
    const nextState = state && typeof state === 'object' ? { ...state } : {};
    nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
    const currentEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object' ? nextState.siteData[site] : {};
    if (module === 'warehouse') {
      const logs = Array.isArray(payload.logs) ? payload.logs : Array.isArray(payload.data?.logs) ? payload.data.logs : [];
      nextState.siteData[site] = { ...currentEntry, warehouse: { ...(payload.data || {}), logs } };
    } else if (module === 'planner') {
      const currentPlanner = currentEntry.planner && typeof currentEntry.planner === 'object' ? currentEntry.planner : {};
      const importedPlanner = payload.data && typeof payload.data === 'object' ? payload.data : {};
      const importedDaily = importedPlanner.dailyData && typeof importedPlanner.dailyData === 'object' ? importedPlanner.dailyData : {};
      nextState.siteData[site] = {
        ...currentEntry,
        planner: {
          ...currentPlanner,
          ...importedPlanner,
          dailyData: {
            ...(currentPlanner.dailyData || {}),
            ...importedDaily,
          },
        },
      };
    } else {
      nextState.siteData[site] = { ...currentEntry, [module]: payload.data };
    }
    if (!canUnlockPastDays(session) && hasLockedPastChanges(state, nextState)) {
      const error = new Error('Past days are locked');
      error.statusCode = 403;
      throw error;
    }
    nextState.savedAt = new Date().toISOString();
    nextState.savedBy = session?.email;
    return nextState;
  });
}

function sendModuleDownload(res, buffer, contentType, filename) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function unlinkUpload(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (_) {}
}

const moduleRouteDeps = {
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
  unlinkUpload,
  upload,
};

registerWarehouseRoutes(apiRouter, moduleRouteDeps);
registerTidplanRoutes(apiRouter, moduleRouteDeps);
registerPlannerRoutes(apiRouter, moduleRouteDeps);

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
    fs.unlinkSync(req.file.path);
    res.json({ ok: true, imported: true, logsImported: Array.isArray(payload.logs) ? payload.logs.length : 0 });
  } catch (error) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error?.message === 'PDF_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'PDF structure not recognized' });
    if (error?.message === 'EXCEL_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'Excel structure not recognized' });
    next(error);
  }
});

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
    fs.unlinkSync(req.file.path);
    res.json({ ok: true, itemsImported: payload.data.length });
  } catch (error) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error?.message === 'PDF_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'PDF structure not recognized' });
    if (error?.message === 'EXCEL_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'Excel structure not recognized' });
    next(error);
  }
});

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
    fs.unlinkSync(req.file.path);
    res.json({ ok: true, imported: true });
  } catch (error) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error?.message === 'PDF_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'PDF structure not recognized' });
    if (error?.message === 'EXCEL_STRUCTURE_NOT_RECOGNIZED') return res.status(400).json({ error: 'Excel structure not recognized' });
    next(error);
  }
});

// Warehouse Export to Excel
apiRouter.get('/warehouse/export/excel', requirePermission('canExportWarehouse'), async (req, res, next) => {
  try {
    const warehouse = await readJsonFile(warehouseFile, { items: [] });
    const data = Array.isArray(warehouse.items) ? warehouse.items.map((item) => ({
      ID: item.id,
      'Naziv': item.name,
      'Opis': item.description,
      'Količina': item.quantity,
      'Mjerna jedinica': item.unit,
      'Kategorija': item.category,
      'Lokacija': item.location,
      'Kreirano': item.createdAt,
      'Ažurirano': item.updatedAt,
    })) : [];

    const buffer = await exportToExcel(data, [
      'ID', 'Naziv', 'Opis', 'Količina', 'Mjerna jedinica', 'Kategorija', 'Lokacija', 'Kreirano', 'Ažurirano'
    ]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="skladiste-${Date.now()}.xlsx"`);
    res.send(buffer);
    
    await logActivity(req.session.email, 'export_warehouse_excel', {});
  } catch (error) {
    next(error);
  }
});

// Warehouse Import from Excel
apiRouter.post('/warehouse/import/excel', requirePermission('canImportWarehouse'), upload.single('file'), async (req, res, next) => {
  try {
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot import' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1);
    
    const items = [];
    let rowNumber = 0;
    worksheet.eachRow({ header: 1 }, (row, rn) => {
      if (rn === 1) return; // Skip header
      const [id, name, description, quantity, unit, category, location] = row;
      if (id) {
        items.push({
          id: String(id).trim(),
          name: sanitizeString(name || '', 200),
          description: sanitizeString(description || '', 500),
          quantity: Number(quantity) || 0,
          unit: sanitizeString(unit || '', 50),
          category: sanitizeString(category || '', 100),
          location: sanitizeString(location || '', 200),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    await writeVersionedJsonFile(warehouseFile, {
      version: 1,
      items,
      adminAssignments: {},
      updatedAt: new Date().toISOString(),
    }, { fallbackValue: { version: 1, items: [], adminAssignments: {} } });

    await logActivity(req.session.email, 'import_warehouse_excel', { itemsCount: items.length });
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ ok: true, itemsImported: items.length });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(error);
  }
});

// TidPlan Export to PDF
apiRouter.get('/tidplan/export/pdf', requirePermission('canExportTidplan'), async (req, res, next) => {
  try {
    const site = sanitizeString(req.query.site || 'default', 80);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    const tidplan = await readTidplan(site);
    const content = Array.isArray(tidplan) ? tidplan.map((item) => ({
      'Datum': item.date || '-',
      'Naziv': item.name || '-',
      'Opis': item.description || '-',
      'Status': item.status || '-',
    })) : [];

    const buffer = await exportToPDF(`TidPlan - ${site}`, content);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="tidplan-${site}-${Date.now()}.pdf"`);
    res.send(buffer);
    
    await logActivity(req.session.email, 'export_tidplan_pdf', { site });
  } catch (error) {
    next(error);
  }
});

// TidPlan Import from PDF (extract text data)
apiRouter.post('/tidplan/import/pdf', requirePermission('canImportTidplan'), upload.single('file'), async (req, res, next) => {
  try {
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot import' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const site = sanitizeString(req.body?.site || 'default', 80);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    // Read PDF and extract text
    const fileData = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFLibDocument.load(fileData);
    const pages = pdfDoc.getPages();
    
    let extractedText = '';
    for (const page of pages) {
      const text = page.getTextContent?.();
      if (text) extractedText += text;
    }

    // Parse extracted data (simple parsing - can be enhanced)
    const tidplan = [];
    const lines = extractedText.split('\n').filter((l) => l.trim());
    
    lines.slice(2).forEach((line) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        tidplan.push({
          date: parts[0] || new Date().toISOString().split('T')[0],
          name: sanitizeString(parts[1] || '', 200),
          description: sanitizeString(parts[2] || '', 500),
          status: sanitizeString(parts[3] || 'pending', 50),
        });
      }
    });

    await writeTidplan(site, tidplan);
    await logActivity(req.session.email, 'import_tidplan_pdf', { site, itemsCount: tidplan.length });
    
    fs.unlinkSync(req.file.path);
    
    res.json({ ok: true, itemsImported: tidplan.length });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(error);
  }
});

// Planner Export to Excel
apiRouter.get('/planner/export/excel', requirePermission('canExportPlanner'), async (req, res, next) => {
  try {
    const site = sanitizeString(req.query.site || 'default', 80);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    const planner = await readPlanner(site);
    const data = Array.isArray(planner) ? planner.map((item) => ({
      'Datum': item.date || '-',
      'Naziv zadatka': item.taskName || '-',
      'Opis': item.description || '-',
      'Status': item.status || '-',
      'Prioritet': item.priority || '-',
      'Dodijeljen': item.assignedTo || '-',
    })) : [];

    const buffer = await exportToExcel(data, [
      'Datum', 'Naziv zadatka', 'Opis', 'Status', 'Prioritet', 'Dodijeljen'
    ]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="planner-${site}-${Date.now()}.xlsx"`);
    res.send(buffer);
    
    await logActivity(req.session.email, 'export_planner_excel', { site });
  } catch (error) {
    next(error);
  }
});

// Planner Export to PDF
apiRouter.get('/planner/export/pdf', requirePermission('canExportPlanner'), async (req, res, next) => {
  try {
    const site = sanitizeString(req.query.site || 'default', 80);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    const planner = await readPlanner(site);
    const content = Array.isArray(planner) ? planner.map((item) => ({
      'Datum': item.date || '-',
      'Naziv': item.taskName || '-',
      'Opis': item.description || '-',
      'Status': item.status || '-',
    })) : [];

    const buffer = await exportToPDF(`Planner - ${site}`, content);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="planner-${site}-${Date.now()}.pdf"`);
    res.send(buffer);
    
    await logActivity(req.session.email, 'export_planner_pdf', { site });
  } catch (error) {
    next(error);
  }
});

// Planner Export to Word
apiRouter.get('/planner/export/word', requirePermission('canExportPlanner'), async (req, res, next) => {
  try {
    const site = sanitizeString(req.query.site || 'default', 80);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    const planner = await readPlanner(site);
    const content = Array.isArray(planner) ? planner.map((item) => ({
      'Datum': item.date || '-',
      'Naziv': item.taskName || '-',
      'Opis': item.description || '-',
      'Status': item.status || '-',
    })) : [];

    const buffer = await exportToWord(`Planner - ${site}`, content);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="planner-${site}-${Date.now()}.docx"`);
    res.send(buffer);
    
    await logActivity(req.session.email, 'export_planner_word', { site });
  } catch (error) {
    next(error);
  }
});

// Planner Import from Excel
apiRouter.post('/planner/import/excel', requirePermission('canImportPlanner'), upload.single('file'), async (req, res, next) => {
  try {
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot import' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const site = sanitizeString(req.body?.site || 'default', 80);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1);
    
    const tasks = [];
    worksheet.eachRow({ header: 1 }, (row, rn) => {
      if (rn === 1) return; // Skip header
      const [date, taskName, description, status, priority, assignedTo] = row;
      if (date || taskName) {
        tasks.push({
          date: sanitizeString(date || '', 50),
          taskName: sanitizeString(taskName || '', 200),
          description: sanitizeString(description || '', 500),
          status: sanitizeString(status || 'pending', 50),
          priority: sanitizeString(priority || 'normal', 50),
          assignedTo: sanitizeString(assignedTo || '', 160),
        });
      }
    });

    await writePlanner(site, tasks);
    await logActivity(req.session.email, 'import_planner_excel', { site, tasksCount: tasks.length });
    
    fs.unlinkSync(req.file.path);
    
    res.json({ ok: true, tasksImported: tasks.length });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(error);
  }
});

// Backup Management
apiRouter.get('/backups', requirePermission('canViewBackups'), async (req, res, next) => {
  try {
    const backups = await listBackups(50);
    res.json({ backups });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/backup', requirePermission('canManageBackups'), backupLimiter, async (req, res, next) => {
  try {
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot create backups' });
    }
    
    const backup = await createBackupSnapshotWithLabel(`manual-${req.session.email || 'admin'}`);
    if (!backup) {
      return res.status(500).json({ error: 'Failed to create backup' });
    }
    
    await logActivity(req.session.email, 'manual_backup_created', {
      file: backup.filename,
      size: backup.size,
      storageType: STORAGE_TYPE,
    });
    
    res.json({
      ok: true,
      id: backup.id || null,
      file: backup.filename,
      path: backup.filePath || null,
      storage: backup.storage || STORAGE_TYPE,
      createdAt: backup.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/backup/restore', requirePermission('canManageBackups'), backupLimiter, async (req, res, next) => {
  try {
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot restore backups' });
    }
    const backupId = sanitizeString(req.body?.id || req.body?.filename || '', 255);
    if (!backupId) return res.status(400).json({ error: 'Missing backup id' });
    const snapshot = await restoreBackupSnapshot(backupId, req.session.email);
    res.json({
      ok: true,
      restored: true,
      backup: backupId,
      restoredAt: new Date().toISOString(),
      storageType: snapshot.storageType || STORAGE_TYPE,
    });
  } catch (error) {
    if (error?.message === 'BACKUP_NOT_FOUND') return res.status(404).json({ error: 'Backup not found' });
    if (error?.message === 'INVALID_BACKUP_ID' || error?.message === 'BACKUP_STRUCTURE_INVALID') {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
    next(error);
  }
});

apiRouter.get('/backup/info', requirePermission('canViewBackups'), async (req, res, next) => {
  try {
    const info = {
      backupInterval: AUTO_BACKUP_INTERVAL_MS / (1000 * 60 * 60), // in hours
      backupIntervalMs: AUTO_BACKUP_INTERVAL_MS,
      storageType: STORAGE_TYPE,
      backupsDir,
      dataDir,
      lastBackupTime: await getLastBackupTime(),
      createdAt: new Date(await getLastBackupTime()).toISOString(),
    };
    res.json(info);
  } catch (error) {
    next(error);
  }
});

app.use('/api', apiRouter);

app.get(['/', '/login', '/home', '/planner', '/tidplan', '/bins', '/kante', '/warehouse', '/notifications', '/surveys'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.use((error, req, res, next) => {
  logServerError(error, req?.path || 'middleware');
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Invalid upload request' });
  }
  if (error && /cors/i.test(error.message || '')) {
    return res.status(403).json({ error: 'CORS blocked', origin: sanitizeString(req.headers.origin || '', 200) || null });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', (error) => logServerError(error, 'uncaughtException'));
process.on('unhandledRejection', (error) => logServerError(error, 'unhandledRejection'));

setInterval(cleanupSessions, 60 * 1000).unref();
setInterval(cleanupPresence, 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Storage type: ${STORAGE_TYPE}`);
  console.log(`DATABASE_URL: ${DATABASE_URL ? 'SET' : 'MISSING'}`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Uploads directory: ${uploadsDir}`);
  if (!IS_PRODUCTION) {
    console.log(`Access the app at: http://localhost:${PORT}`);
  }
  startStorageInitialization().catch((error) => logServerError(error, 'startup'));
});
