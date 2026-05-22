const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
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
const API_BODY_LIMIT = process.env.API_BODY_LIMIT || '25mb';
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
const siteChatFile = dataStorage.files?.siteChat || path.join(dataDir, 'site-chat.json');
const sessions = new Map();
const activePresence = new Map();
const pendingRestoreApprovals = new Map();
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
const RESTORE_APPROVAL_TTL_MS = Number(process.env.RESTORE_APPROVAL_TTL_MS) || (10 * 60 * 1000);

const DEFAULT_PERMISSIONS = {
  canAccessPlanner: true,
  canAccessTidplan: true,
  canAccessBins: true,
  canViewNotifications: true,
  canManageNotifications: false,
  canDeleteNotifications: false,
  canAccessSiteChat: true,
  canModerateSiteChat: false,
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
  canRestoreBackups: true,
  canAccessWarehouse: false,
  canAccessStore: true,
  canManageStore: false,
  canViewStoreTeamOrders: false,
  canManageStoreBudgets: false,
  canManageStoreRules: false,
  canViewStoreManagerDashboard: false,
  canExportStore: false,
  canAccessWorkwear: true,
  canManageWorkwear: false,
  canManageWorkwearCredits: false,
  canManageWorkwearSettings: false,
  canViewWorkwearAnalytics: false,
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
  canDeleteSurveys: false,
  canManageSurveyPermissions: false,
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
  canAccessSiteChat: false,
  canModerateSiteChat: false,
  canCreateReports: true,
  canPrint: false,
  canExport: false,
  canAccessWarehouse: false,
  canAccessStore: true,
  canAccessWorkwear: true,
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

function redactSensitiveObject(value, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.slice(0, 500).map((entry) => redactSensitiveObject(entry, depth + 1));
  if (value && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([key, entry]) => {
      const safeKey = sanitizeString(key, 120);
      if (/(password|token|secret|authorization|cookie)/i.test(safeKey)) {
        result[safeKey] = '[REDACTED]';
      } else {
        result[safeKey] = redactSensitiveObject(entry, depth + 1);
      }
    });
    return result;
  }
  if (typeof value === 'string') return sanitizeString(value, 1200);
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

function getAdminLevel(admin) {
  const fallbackLevel = admin?.isSuperAdmin ? 6 : 1;
  return Math.max(1, Math.min(6, Number(admin?.level) || fallbackLevel));
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
    active: admin?.active !== false,
    level: getAdminLevel(admin),
    permissions: normalizePermissions(admin?.permissions),
    allowedSites: Array.isArray(admin?.allowedSites)
      ? admin.allowedSites.map((site) => sanitizeString(site, 80)).filter(Boolean)
      : null,
    storeRoles: Array.isArray(admin?.storeRoles)
      ? admin.storeRoles.map((role) => sanitizeString(role, 40).toLowerCase()).filter(Boolean)
      : [],
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

function countRecordsBySite(state, accessor) {
  const siteData = state?.siteData && typeof state.siteData === 'object' ? state.siteData : {};
  return Object.values(siteData).reduce((sum, siteEntry) => {
    const value = typeof accessor === 'function' ? accessor(siteEntry || {}) : [];
    if (Array.isArray(value)) return sum + value.length;
    if (value && typeof value === 'object') return sum + Object.keys(value).length;
    return sum;
  }, 0);
}

function countStoreRecords(state, key) {
  return countRecordsBySite(state, (siteEntry) => {
    const store = siteEntry?.store && typeof siteEntry.store === 'object' ? siteEntry.store : {};
    const value = store[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return value;
    return [];
  });
}

function buildBackupModuleSummary(snapshot) {
  const payload = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const admins = Array.isArray(payload.admins) ? payload.admins : [];
  const state = payload.state && typeof payload.state === 'object' ? payload.state : {};
  const warehouse = payload.warehouse && typeof payload.warehouse === 'object' ? payload.warehouse : {};
  const warehouseItems = Array.isArray(warehouse.items) ? warehouse.items : [];
  const reports = payload.reports && typeof payload.reports === 'object' ? payload.reports : {};
  const notifications = payload.notifications && typeof payload.notifications === 'object' ? payload.notifications : {};
  const siteChat = payload.siteChat && typeof payload.siteChat === 'object' ? payload.siteChat : {};
  const siteChatSites = siteChat.sites && typeof siteChat.sites === 'object' ? siteChat.sites : {};
  const stateSites = Array.isArray(state.sites) ? state.sites : [];
  const accountNotifications = state.accountNotifications && typeof state.accountNotifications === 'object'
    ? state.accountNotifications
    : {};
  const totalReports = Object.values(reports).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  const totalSiteNotifications = Object.values(notifications).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  return {
    users: admins.length,
    userFunctions: admins.reduce((sum, admin) => sum + (Array.isArray(admin?.storeRoles) ? admin.storeRoles.length : 0), 0),
    permissions: admins.reduce((sum, admin) => sum + Object.keys(admin?.permissions || {}).length, 0),
    sites: stateSites.length,
    planner: countRecordsBySite(state, (siteEntry) => siteEntry?.planner?.dailyData || siteEntry?.planner || []),
    tidplan: countRecordsBySite(state, (siteEntry) => siteEntry?.tidplan || []),
    bins: countRecordsBySite(state, (siteEntry) => siteEntry?.bins || []),
    warehouse: warehouseItems.length,
    reports: totalReports,
    siteNotifications: totalSiteNotifications,
    accountNotifications: Object.keys(accountNotifications).length,
    storeProducts: countStoreRecords(state, 'products'),
    storeOrders: countStoreRecords(state, 'orders'),
    storeCategories: countRecordsBySite(state, (siteEntry) => siteEntry?.store?.settings?.categoryCatalog || {}),
    storeBudgets: countRecordsBySite(state, (siteEntry) => siteEntry?.store?.workerProfiles || {}),
    storeLedger: countStoreRecords(state, 'creditLedger'),
    storeAudit: countStoreRecords(state, 'auditLog'),
    storeSupplier: countRecordsBySite(state, (siteEntry) => siteEntry?.store?.supplierConnections || []),
    siteChatSites: Object.keys(siteChatSites).length,
    siteChatMessages: Object.values(siteChatSites).reduce((sum, entry) => {
      const messages = Array.isArray(entry?.messages) ? entry.messages : [];
      return sum + messages.length;
    }, 0),
    siteChatReadStates: Object.values(siteChatSites).reduce((sum, entry) => {
      const readState = entry?.readState && typeof entry.readState === 'object' ? entry.readState : {};
      return sum + Object.keys(readState).length;
    }, 0),
  };
}

function buildSummaryDiff(beforeSummary, afterSummary) {
  const before = beforeSummary && typeof beforeSummary === 'object' ? beforeSummary : {};
  const after = afterSummary && typeof afterSummary === 'object' ? afterSummary : {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  return keys.map((key) => {
    const previous = Number(before[key]) || 0;
    const next = Number(after[key]) || 0;
    return {
      module: key,
      before: previous,
      after: next,
      delta: next - previous,
    };
  });
}

async function buildCurrentBackupEquivalentSnapshot() {
  const exported = await storageAdapter.exportAll();
  return exported && typeof exported === 'object' ? exported : {};
}

function cleanupRestoreApprovals() {
  const now = Date.now();
  for (const [token, entry] of pendingRestoreApprovals.entries()) {
    if (!entry || Number(entry.expiresAt) <= now) {
      pendingRestoreApprovals.delete(token);
    }
  }
}

function createRestoreApprovalToken({ backupId, userEmail, diff, previewSummary }) {
  cleanupRestoreApprovals();
  const token = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  pendingRestoreApprovals.set(token, {
    token,
    backupId: sanitizeString(backupId, 255),
    userEmail: sanitizeString(userEmail || '', 160).toLowerCase(),
    diffChecksum: stableChecksum(diff || []),
    previewChecksum: stableChecksum(previewSummary || {}),
    createdAt: now,
    expiresAt: now + RESTORE_APPROVAL_TTL_MS,
  });
  return token;
}

function validateRestoreApprovalToken({ token, backupId, userEmail, diff, previewSummary }) {
  cleanupRestoreApprovals();
  const key = sanitizeString(token || '', 120);
  if (!key || !pendingRestoreApprovals.has(key)) {
    const error = new Error('RESTORE_APPROVAL_REQUIRED');
    error.statusCode = 400;
    throw error;
  }
  const entry = pendingRestoreApprovals.get(key);
  const normalizedUser = sanitizeString(userEmail || '', 160).toLowerCase();
  if (!entry || entry.userEmail !== normalizedUser || entry.backupId !== sanitizeString(backupId, 255)) {
    pendingRestoreApprovals.delete(key);
    const error = new Error('RESTORE_APPROVAL_INVALID');
    error.statusCode = 400;
    throw error;
  }
  if (entry.expiresAt <= Date.now()) {
    pendingRestoreApprovals.delete(key);
    const error = new Error('RESTORE_APPROVAL_EXPIRED');
    error.statusCode = 400;
    throw error;
  }
  const diffChecksum = stableChecksum(diff || []);
  const previewChecksum = stableChecksum(previewSummary || {});
  if (entry.diffChecksum !== diffChecksum || entry.previewChecksum !== previewChecksum) {
    pendingRestoreApprovals.delete(key);
    const error = new Error('RESTORE_APPROVAL_STALE');
    error.statusCode = 409;
    throw error;
  }
  pendingRestoreApprovals.delete(key);
  return true;
}

async function verifyRestoreIntegrity(snapshot) {
  const expectedSummary = buildBackupModuleSummary(snapshot);
  const currentSnapshot = await buildCurrentBackupEquivalentSnapshot();
  const actualSummary = buildBackupModuleSummary(currentSnapshot);
  const diff = buildSummaryDiff(expectedSummary, actualSummary);
  const mismatches = diff.filter((entry) => entry.delta !== 0);
  return {
    ok: mismatches.length === 0,
    expected: expectedSummary,
    actual: actualSummary,
    diff,
    mismatches,
    checksumExpected: stableChecksum(expectedSummary),
    checksumActual: stableChecksum(actualSummary),
  };
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
  await writeVersionedJsonFile(
    siteChatFile,
    snapshot.siteChat && typeof snapshot.siteChat === 'object' ? snapshot.siteChat : createEmptySiteChatDocument(),
    { fallbackValue: createEmptySiteChatDocument() },
  );

  const reports = snapshot.reports && typeof snapshot.reports === 'object' ? snapshot.reports : {};
  for (const [site, list] of Object.entries(reports)) {
    await writeVersionedJsonFile(getReportsFilePath(site), Array.isArray(list) ? list : [], { fallbackValue: [] });
  }

  const notifications = snapshot.notifications && typeof snapshot.notifications === 'object' ? snapshot.notifications : {};
  for (const [site, list] of Object.entries(notifications)) {
    await writeVersionedJsonFile(getNotificationsFilePath(site), Array.isArray(list) ? list : [], { fallbackValue: [] });
  }

  const restoredSummary = buildBackupModuleSummary(snapshot);
  await logActivity(userEmail, 'backup_restored', {
    backup: sanitizeString(identifier, 255),
    storageType: STORAGE_TYPE,
    restoredSummary,
  });

  const integrity = await verifyRestoreIntegrity(snapshot);
  await logActivity(userEmail, 'backup_restore_integrity_check', {
    backup: sanitizeString(identifier, 255),
    ok: integrity.ok,
    mismatchCount: integrity.mismatches.length,
    checksumExpected: integrity.checksumExpected,
    checksumActual: integrity.checksumActual,
  });

  return { snapshot, integrity };
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
  if (!targetAdmin) return true;
  if (targetAdmin.email === actorSession.email) return false;
  if (actorSession.isSuperAdmin) return true;
  if (targetAdmin.isSuperAdmin) return false;
  return (Number(targetAdmin.level) || 1) < getSessionLevel(actorSession);
}

function assertActorCanSubmitAdminList(actorSession, existingAdmins, submittedAdmins) {
  if (!actorSession) return;
  const existingByEmail = new Map((Array.isArray(existingAdmins) ? existingAdmins : []).map((admin) => [admin.email, normalizeAdminRecord(admin)]));
  const submittedByEmail = new Map((Array.isArray(submittedAdmins) ? submittedAdmins : []).map((admin) => {
    const normalized = normalizeAdminRecord(admin);
    return [normalized.email, normalized];
  }));
  const actorEmail = sanitizeString(actorSession.email || '', 160).toLowerCase();

  for (const [email, existing] of existingByEmail.entries()) {
    const submitted = submittedByEmail.get(email);
    const removed = !submitted;
    const changed = submitted && stableJson(redactAdminRecord(existing)) !== stableJson(redactAdminRecord(submitted));
    if (!removed && !changed) continue;
    if (email === actorEmail) {
      continue;
    }
    if (!canActorManageAdmin(actorSession, existing)) {
      const error = new Error('Cannot modify same-level, higher-level, or root admin');
      error.statusCode = 403;
      throw error;
    }
  }

  for (const [email, submitted] of submittedByEmail.entries()) {
    const existing = existingByEmail.get(email);
    if (existing) continue;
    if (email === actorEmail) {
      const error = new Error('Admins cannot create or modify themselves');
      error.statusCode = 403;
      throw error;
    }
    const requestedLevel = Number(submitted.level) || 1;
    const maxLevel = actorSession.isSuperAdmin ? 6 : Math.max(1, getSessionLevel(actorSession) - 1);
    if (requestedLevel > maxLevel || (!actorSession.isSuperAdmin && submitted.isSuperAdmin)) {
      const error = new Error('Cannot create admin at same or higher level');
      error.statusCode = 403;
      throw error;
    }
  }
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
  assertActorCanSubmitAdminList(actorSession, existingAdmins, adminsInput);
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
  syncActiveSessionsWithAdmins(nextAdmins);
  return nextAdmins;
}

function syncActiveSessionsWithAdmins(admins) {
  const adminsByEmail = new Map(
    (Array.isArray(admins) ? admins : []).map((admin) => [String(admin.email || '').toLowerCase(), normalizeAdminRecord(admin)]),
  );
  for (const [sessionId, session] of sessions.entries()) {
    if (!session || session.role !== 'admin') continue;
    const admin = adminsByEmail.get(String(session.email || '').toLowerCase());
    if (!admin || admin.active === false) {
      sessions.delete(sessionId);
      continue;
    }
    session.fullName = admin.fullName || session.fullName || '';
    session.isSuperAdmin = admin.isSuperAdmin === true;
    session.isReadonly = admin.isReadonly === true;
    session.permissions = admin.isSuperAdmin ? { ...DEFAULT_PERMISSIONS } : normalizePermissions(admin.permissions || {});
    session.level = getAdminLevel(admin);
    session.allowedSites = Array.isArray(admin.allowedSites) ? admin.allowedSites.slice() : null;
    session.authzUpdatedAt = new Date().toISOString();
  }
}

function getEnabledPermissionKeys(permissions) {
  const normalized = normalizePermissions(permissions || {});
  return Object.keys(DEFAULT_PERMISSIONS)
    .filter((key) => normalized[key] === true)
    .sort();
}

function getAdminAuditSites(admin) {
  return Array.isArray(admin?.allowedSites)
    ? admin.allowedSites.map((site) => sanitizeString(site, 80)).filter(Boolean).sort()
    : ['ALL'];
}

function diffLists(beforeList, afterList) {
  const before = new Set(Array.isArray(beforeList) ? beforeList : []);
  const after = new Set(Array.isArray(afterList) ? afterList : []);
  return {
    added: [...after].filter((value) => !before.has(value)).sort(),
    removed: [...before].filter((value) => !after.has(value)).sort(),
  };
}

function buildAdminAuditEvents(beforeAdmins, afterAdmins) {
  const beforeByEmail = new Map((Array.isArray(beforeAdmins) ? beforeAdmins : []).map((admin) => [admin.email, normalizeAdminRecord(admin)]));
  const afterByEmail = new Map((Array.isArray(afterAdmins) ? afterAdmins : []).map((admin) => [admin.email, normalizeAdminRecord(admin)]));
  const events = [];

  afterByEmail.forEach((after, email) => {
    const before = beforeByEmail.get(email);
    if (!before) {
      events.push({
        action: 'admin_created',
        details: {
          targetEmail: email,
          targetName: after.fullName || '',
          level: after.level,
          permissionsAdded: getEnabledPermissionKeys(after.permissions),
          sitesAdded: getAdminAuditSites(after),
          readonlyChanged: after.isReadonly === true,
          toReadonly: after.isReadonly === true,
        },
      });
      return;
    }

    const beforePermissions = getEnabledPermissionKeys(before.permissions);
    const afterPermissions = getEnabledPermissionKeys(after.permissions);
    const permissionDiff = diffLists(beforePermissions, afterPermissions);
    const siteDiff = diffLists(getAdminAuditSites(before), getAdminAuditSites(after));
    const levelChanged = Number(before.level) !== Number(after.level);
    const readonlyChanged = Boolean(before.isReadonly) !== Boolean(after.isReadonly);
    const nameChanged = String(before.fullName || '') !== String(after.fullName || '');
    const passwordChanged = Boolean(before.password && after.password && before.password !== after.password);

    if (
      levelChanged ||
      readonlyChanged ||
      nameChanged ||
      passwordChanged ||
      permissionDiff.added.length ||
      permissionDiff.removed.length ||
      siteDiff.added.length ||
      siteDiff.removed.length
    ) {
      events.push({
        action: 'admin_updated',
        details: {
          targetEmail: email,
          targetName: after.fullName || '',
          oldValues: {
            level: before.level,
            permissions: beforePermissions,
            sites: getAdminAuditSites(before),
            readonly: before.isReadonly === true,
          },
          newValues: {
            level: after.level,
            permissions: afterPermissions,
            sites: getAdminAuditSites(after),
            readonly: after.isReadonly === true,
          },
          fromLevel: before.level,
          toLevel: after.level,
          permissionsAdded: permissionDiff.added,
          permissionsRemoved: permissionDiff.removed,
          sitesAdded: siteDiff.added,
          sitesRemoved: siteDiff.removed,
          readonlyChanged,
          fromReadonly: before.isReadonly === true,
          toReadonly: after.isReadonly === true,
          nameChanged,
          passwordChanged,
        },
      });
    }
  });

  beforeByEmail.forEach((before, email) => {
    if (afterByEmail.has(email)) return;
    events.push({
      action: 'admin_removed',
      details: {
        targetEmail: email,
        targetName: before.fullName || '',
        level: before.level,
        permissionsRemoved: getEnabledPermissionKeys(before.permissions),
        sitesRemoved: getAdminAuditSites(before),
      },
    });
  });

  return events;
}

async function logAdminAuditChanges(actorEmail, beforeAdmins, afterAdmins) {
  const events = buildAdminAuditEvents(beforeAdmins, afterAdmins);
  for (const event of events) {
    await logActivity(actorEmail, event.action, event.details);
  }
}

async function getState() {
  const state = await readJsonFile(stateFile, null);
  return normalizeRuntimeState(state);
}

async function getStateDocument() {
  const document = await readVersionedJsonFile(stateFile, null);
  const state = normalizeRuntimeState(document.data);
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

    if (responseState.accountNotifications && typeof responseState.accountNotifications === 'object') {
      const currentEmail = sanitizeString(session?.email || '', 160).toLowerCase();
      if (currentEmail && responseState.accountNotifications[currentEmail]) {
        responseState.accountNotifications = {
          [currentEmail]: responseState.accountNotifications[currentEmail],
        };
      } else {
        responseState.accountNotifications = {};
      }
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
    storeRoles: Array.isArray(session.storeRoles) ? session.storeRoles : [],
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
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
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
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
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
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
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

function requireAnyPermission(permissionKeys = []) {
  return (req, res, next) => {
    if (req.session?.isSuperAdmin || permissionKeys.some((key) => sessionHasPermission(req.session, key))) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  };
}

function canAccessStoreModule(session) {
  return sessionHasPermission(session, 'canAccessStore') || sessionHasPermission(session, 'canAccessWorkwear');
}

function canManageStoreOrders(session) {
  return session?.isSuperAdmin ||
    sessionHasPermission(session, 'canManageStore') ||
    sessionHasPermission(session, 'canManageWorkwear');
}

function canViewStoreTeamOrdersPermission(session) {
  return canManageStoreOrders(session) || sessionHasPermission(session, 'canViewStoreTeamOrders');
}

function getRequestedStoreSite(req) {
  const raw = req.query?.site || req.body?.site || req.params?.site || req.session?.currentSite || 'default';
  return sanitizeString(raw, 80) || 'default';
}

const STORE_ORDER_STATUSES = ['Pending', 'Approved', 'Delivered', 'Rejected', 'Cancelled'];
const STORE_ROLE_NORMALIZE_MAP = {
  worker: 'radnik',
  radnik: 'radnik',
  foreman: 'grupovodja',
  grupovodja: 'grupovodja',
  supervisor: 'poslovodja',
  poslovodja: 'poslovodja',
  project_manager: 'projektledare',
  projektledare: 'projektledare',
  office: 'kontor',
  kontor: 'kontor',
  store_manager: 'store_manager',
  admin: 'admin',
  superadmin: 'superadmin',
};

function createStoreValidationError(code, statusCode = 400, details = '') {
  const error = new Error(code);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function normalizeStoreRoleKeyServer(roleKey) {
  const key = sanitizeString(roleKey || '', 60).toLowerCase();
  return STORE_ROLE_NORMALIZE_MAP[key] || '';
}

function normalizeStoreRoleListServer(list) {
  const source = Array.isArray(list) ? list : [];
  const normalized = source
    .map((role) => normalizeStoreRoleKeyServer(role))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function getStoreRoleKeysForSession(session, adminRecord) {
  const directRoles = normalizeStoreRoleListServer(adminRecord?.storeRoles || session?.storeRoles || []);
  if (directRoles.length) return directRoles;
  const fallback = [];
  if (session?.isSuperAdmin) fallback.push('superadmin');
  if (canManageStoreOrders(session)) fallback.push('store_manager');
  if (sessionHasPermission(session, 'canOpenAdminPanel')) fallback.push('admin');
  if (canViewStoreTeamOrdersPermission(session)) fallback.push('grupovodja');
  fallback.push('radnik');
  return Array.from(new Set(fallback));
}

function sanitizeStoreOrderDraft(rawOrder, site) {
  const order = rawOrder && typeof rawOrder === 'object' ? rawOrder : {};
  const sourceItems = Array.isArray(order.items) ? order.items : [];
  return {
    site,
    urgent: order.urgent === true,
    workerComment: sanitizeString(order.workerComment || order.comment || '', 1200),
    passwordConfirmedAt: sanitizeString(order.passwordConfirmedAt || '', 80),
    items: sourceItems.map((entry) => {
      const item = entry && typeof entry === 'object' ? entry : {};
      return {
        productId: sanitizeString(item.productId || '', 120),
        variantId: sanitizeString(item.variantId || '', 120),
        size: sanitizeString(item.size || '', 80),
        quantity: Math.max(1, Math.min(999, Math.floor(Number(item.quantity) || 1))),
        comment: sanitizeString(item.comment || '', 800),
        useUpgrade: item.useUpgrade === true,
        clientUnitCost: Number(item.unitCost),
        clientLineCost: Number(item.lineCost),
        clientBudgetImpact: Number(item.budgetImpact),
      };
    }).filter((item) => item.productId),
    clientBudgetImpact: Number(order.budgetImpact),
  };
}

function storeProductSiteAllowed(product, site) {
  const availableSites = Array.isArray(product?.availableSites) && product.availableSites.length
    ? product.availableSites.map((entry) => sanitizeString(entry, 80)).filter(Boolean)
    : ['*'];
  return availableSites.includes('*') || availableSites.includes(site);
}

function storeProductRoleAllowed(product, workerEmail, roleKeys) {
  const visibleToUsers = Array.isArray(product?.visibleToUsers)
    ? product.visibleToUsers.map((entry) => sanitizeString(entry, 160).toLowerCase()).filter(Boolean)
    : [];
  const visibleToRoles = normalizeStoreRoleListServer(Array.isArray(product?.visibleToRoles) ? product.visibleToRoles : []);
  if (!visibleToUsers.length && !visibleToRoles.length) return true;
  if (visibleToUsers.includes(workerEmail)) return true;
  return roleKeys.some((role) => visibleToRoles.includes(role));
}

function getStoreActiveVariants(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants
    .map((variant, index) => {
      const id = sanitizeString(variant?.id || `var_${index + 1}`, 120);
      return {
        id,
        name: sanitizeString(variant?.name || '', 200),
        image: sanitizeString(variant?.image || variant?.imageUrl || '', 1000),
        imageUrl: sanitizeString(variant?.imageUrl || variant?.image || '', 1000),
        active: variant?.active !== false,
        priceOverride: Number(variant?.priceOverride),
        creditCostOverride: Number(variant?.creditCostOverride),
        supplierProductId: sanitizeString(variant?.supplierProductId || '', 240),
      };
    })
    .filter((variant) => variant.name && variant.active !== false);
}

function resolveStoreFreeRuleMode(product, settings) {
  const rawMode = sanitizeString(product?.freeRule?.mode || settings?.freeRules?.mode || 'none', 40).toLowerCase();
  if (['firstcategory', 'category'].includes(rawMode)) return 'category';
  if (['firstorder', 'order', 'order:first'].includes(rawMode)) return 'order';
  if (['firstitem', 'item', 'product', 'firstproduct', 'none'].includes(rawMode)) {
    return rawMode === 'none' ? 'none' : 'product';
  }
  return 'product';
}

function resolveStorePeriodDays(value, fallback = 180) {
  const direct = Math.floor(Number(value));
  if (Number.isFinite(direct) && direct > 0) return direct;
  return fallback;
}

function canTransitionStoreOrderStatus(currentStatus, nextStatus) {
  const map = {
    Pending: ['Approved', 'Rejected', 'Cancelled'],
    Approved: ['Delivered', 'Rejected', 'Cancelled'],
    Delivered: [],
    Rejected: [],
    Cancelled: [],
  };
  const current = sanitizeString(currentStatus || '', 40) || 'Pending';
  const next = sanitizeString(nextStatus || '', 40);
  if (!STORE_ORDER_STATUSES.includes(next)) return false;
  if (current === next) return true;
  return Array.isArray(map[current]) && map[current].includes(next);
}

function appendStoreCreditLedgerEntry(store, payload = {}) {
  store.creditLedger = Array.isArray(store.creditLedger) ? store.creditLedger : [];
  store.creditLedger.push({
    id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    workerId: sanitizeString(payload.workerId || '', 160).toLowerCase(),
    delta: Number(payload.delta) || 0,
    reserve: Number(payload.reserve) || 0,
    reason: sanitizeString(payload.reason || 'store_adjustment', 120),
    orderId: sanitizeString(payload.orderId || '', 80),
    date: new Date().toISOString(),
    changedBy: sanitizeString(payload.changedBy || 'system', 200),
  });
  if (store.creditLedger.length > 5000) {
    store.creditLedger = store.creditLedger.slice(-5000);
  }
}

function ensureStoreWorkerProfile(store, workerId, workerName = '') {
  const key = sanitizeString(workerId || '', 160).toLowerCase();
  if (!key) {
    throw createStoreValidationError('STORE_WORKER_REQUIRED', 400, 'Worker id is missing');
  }
  const settings = store.settings && typeof store.settings === 'object' ? store.settings : {};
  const amount = Math.max(0, Number(settings.creditRenewalAmount) || 2500);
  const renewalMonths = Math.max(1, Number(settings.creditRenewalPeriodMonths) || 6);
  store.workerProfiles = store.workerProfiles && typeof store.workerProfiles === 'object'
    ? store.workerProfiles
    : {};
  if (!store.workerProfiles[key] || typeof store.workerProfiles[key] !== 'object') {
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + renewalMonths);
    store.workerProfiles[key] = {
      workerId: key,
      workerName: sanitizeString(workerName || key, 200),
      creditBalance: amount,
      reservedCredit: 0,
      renewalDate: renewalDate.toISOString(),
      renewalPeriodMonths: renewalMonths,
      orderHistory: [],
      savedSizes: {},
      freeEligibility: {},
      adjustments: [],
    };
  }
  const profile = store.workerProfiles[key];
  profile.workerId = key;
  if (!profile.workerName) profile.workerName = sanitizeString(workerName || key, 200);
  profile.creditBalance = Math.max(0, Number(profile.creditBalance) || 0);
  profile.reservedCredit = Math.max(0, Number(profile.reservedCredit) || 0);
  profile.orderHistory = Array.isArray(profile.orderHistory) ? profile.orderHistory : [];
  profile.freeEligibility = profile.freeEligibility && typeof profile.freeEligibility === 'object'
    ? profile.freeEligibility
    : {};
  profile.adjustments = Array.isArray(profile.adjustments) ? profile.adjustments : [];
  return profile;
}

function generateStoreOrderId(existingIds = new Set()) {
  let candidate = '';
  let attempts = 0;
  while (!candidate || existingIds.has(candidate)) {
    attempts += 1;
    candidate = `SO-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    if (attempts > 20) {
      candidate = `SO-${Date.now()}-${attempts}`;
      break;
    }
  }
  return sanitizeString(candidate, 80);
}

function getStoreProductHistoricalQuantity(orders, workerId, productId, sinceTimestamp) {
  const sourceOrders = Array.isArray(orders) ? orders : [];
  return sourceOrders.reduce((sum, order) => {
    if (!order || String(order.workerId || '').toLowerCase() !== workerId) return sum;
    if (['Rejected', 'Cancelled'].includes(sanitizeString(order.status || '', 40))) return sum;
    const createdAtTs = new Date(order.createdAt || 0).getTime();
    if (sinceTimestamp > 0 && (!Number.isFinite(createdAtTs) || createdAtTs < sinceTimestamp)) return sum;
    const items = Array.isArray(order.items) ? order.items : [];
    return sum + items.reduce((itemSum, item) => {
      if (sanitizeString(item?.productId || '', 120) !== productId) return itemSum;
      return itemSum + Math.max(0, Number(item?.quantity) || 0);
    }, 0);
  }, 0);
}

function buildServerPricedStoreOrder({
  store,
  site,
  workerId,
  workerName,
  workerRoles,
  orderDraft,
  nowIso,
  actorEmail,
}) {
  const products = Array.isArray(store.products) ? store.products : [];
  const orders = Array.isArray(store.orders) ? store.orders : [];
  const settings = store.settings && typeof store.settings === 'object' ? store.settings : {};
  const profile = ensureStoreWorkerProfile(store, workerId, workerName);

  if (!orderDraft.items.length) {
    throw createStoreValidationError('INVALID_ORDER_PAYLOAD', 400, 'Order does not contain items');
  }

  const existingIds = new Set(orders.map((entry) => sanitizeString(entry?.id || '', 80)).filter(Boolean));
  const tamperSignals = [];
  const freeRulesEnabled = settings?.freeRulesEnabled !== false && settings?.freeRules?.enabled === true;
  const nowTs = Date.now();
  const currentBatchByProduct = {};
  const freeUsageDraft = {};
  let subtotal = 0;
  let budgetImpact = 0;
  let differenceTotal = 0;
  let freeAppliedCount = 0;
  let requiresApproval = false;

  const items = orderDraft.items.map((item) => {
    const product = products.find((entry) => sanitizeString(entry?.id || '', 120) === item.productId);
    if (!product) {
      throw createStoreValidationError('STORE_PRODUCT_NOT_FOUND', 404, item.productId);
    }
    if (product.active === false || product.archived === true || product.inactive === true) {
      throw createStoreValidationError('STORE_PRODUCT_INACTIVE', 400, item.productId);
    }
    if (!storeProductSiteAllowed(product, site)) {
      throw createStoreValidationError('STORE_PRODUCT_SITE_BLOCKED', 403, item.productId);
    }
    if (!storeProductRoleAllowed(product, workerId, workerRoles)) {
      throw createStoreValidationError('STORE_PRODUCT_ROLE_BLOCKED', 403, item.productId);
    }

    const sizes = Array.isArray(product.sizes) ? product.sizes.map((size) => sanitizeString(size, 80)).filter(Boolean) : [];
    if (sizes.length && !item.size) {
      throw createStoreValidationError('STORE_SIZE_REQUIRED', 400, item.productId);
    }
    if (sizes.length && item.size && !sizes.includes(item.size)) {
      throw createStoreValidationError('STORE_SIZE_INVALID', 400, item.size);
    }

    const activeVariants = getStoreActiveVariants(product);
    let selectedVariant = null;
    if (activeVariants.length > 0) {
      if (!item.variantId) {
        throw createStoreValidationError('STORE_VARIANT_REQUIRED', 400, item.productId);
      }
      selectedVariant = activeVariants.find((variant) => variant.id === item.variantId) || null;
      if (!selectedVariant) {
        throw createStoreValidationError('STORE_VARIANT_INVALID', 400, item.variantId);
      }
    } else if (item.variantId) {
      const optionalVariant = getStoreActiveVariants(product).find((variant) => variant.id === item.variantId);
      selectedVariant = optionalVariant || null;
    }

    const quantity = Math.max(1, Math.min(999, Math.floor(Number(item.quantity) || 1)));
    const productUsesBudget = product.usesBudget !== false;
    const approvalRequired = product.approvalRequired === true;
    if (approvalRequired) requiresApproval = true;

    const variantCredit = Number(selectedVariant?.creditCostOverride);
    const variantPrice = Number(selectedVariant?.priceOverride);
    let priceAtOrder = Number(product.price);
    if (!Number.isFinite(priceAtOrder) || priceAtOrder < 0) priceAtOrder = 0;
    let creditCostAtOrder = Number(product.creditCost);
    if (!Number.isFinite(creditCostAtOrder) || creditCostAtOrder <= 0) creditCostAtOrder = priceAtOrder;
    if (Number.isFinite(variantPrice) && variantPrice >= 0) priceAtOrder = variantPrice;
    if (Number.isFinite(variantCredit) && variantCredit > 0) creditCostAtOrder = variantCredit;

    const canUpgrade = product?.upgradeRule?.enabled === true || product?.enableUpgradeDifference === true;
    let upgradeApplied = false;
    let differenceAmount = 0;
    let unitCost = creditCostAtOrder;
    if (canUpgrade && item.useUpgrade === true) {
      upgradeApplied = true;
      differenceAmount = Math.max(0, Number(product?.upgradeRule?.differenceAmount ?? product?.differencePrice) || 0);
      unitCost = differenceAmount;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) unitCost = 0;

    const freeMode = resolveStoreFreeRuleMode(product, settings);
    const productFreeEnabled = product?.freeRule?.enabled === true || product?.freeEligible === true;
    const freePeriodDays = resolveStorePeriodDays(product?.freeRule?.periodDays || settings?.freeRules?.periodDays, 180);
    const freeKey = freeMode === 'category'
      ? `cat:${sanitizeString(product.category || 'general', 120)}`
      : freeMode === 'order'
        ? 'order:first'
        : `product:${sanitizeString(product.id || '', 120)}`;
    let freeApplied = false;
    if (freeRulesEnabled && productFreeEnabled && freeMode !== 'none') {
      const usedAtValue = freeUsageDraft[freeKey] || profile.freeEligibility?.[freeKey] || '';
      const usedAtTs = usedAtValue ? new Date(usedAtValue).getTime() : 0;
      const freePeriodMs = Math.max(1, freePeriodDays) * 24 * 60 * 60 * 1000;
      if (!usedAtTs || !Number.isFinite(usedAtTs) || (nowTs - usedAtTs) > freePeriodMs) {
        freeApplied = true;
        freeUsageDraft[freeKey] = nowIso;
      }
    }

    const lineCost = freeApplied ? 0 : (unitCost * quantity);
    const itemBudgetImpact = productUsesBudget ? lineCost : 0;

    const periodLimit = product?.periodLimit && typeof product.periodLimit === 'object'
      ? product.periodLimit
      : { enabled: false, quantity: 0, periodDays: 0 };
    if (periodLimit.enabled === true) {
      const periodQty = Math.max(1, Math.floor(Number(periodLimit.quantity) || 1));
      const periodDays = resolveStorePeriodDays(periodLimit.periodDays, 180);
      const sinceTs = nowTs - (periodDays * 24 * 60 * 60 * 1000);
      const historicalQty = getStoreProductHistoricalQuantity(orders, workerId, item.productId, sinceTs);
      const batchQty = Number(currentBatchByProduct[item.productId] || 0);
      const nextQty = historicalQty + batchQty + quantity;
      if (nextQty > periodQty) {
        throw createStoreValidationError('STORE_PERIOD_LIMIT_EXCEEDED', 400, `${item.productId}:${periodQty}`);
      }
    }

    currentBatchByProduct[item.productId] = Number(currentBatchByProduct[item.productId] || 0) + quantity;
    subtotal += lineCost;
    budgetImpact += itemBudgetImpact;
    if (freeApplied) freeAppliedCount += 1;
    if (upgradeApplied) differenceTotal += differenceAmount * quantity;

    if (Number.isFinite(item.clientUnitCost) && Math.abs(item.clientUnitCost - unitCost) > 0.01) {
      tamperSignals.push({ productId: item.productId, field: 'unitCost', client: item.clientUnitCost, server: unitCost });
    }
    if (Number.isFinite(item.clientLineCost) && Math.abs(item.clientLineCost - lineCost) > 0.01) {
      tamperSignals.push({ productId: item.productId, field: 'lineCost', client: item.clientLineCost, server: lineCost });
    }
    if (Number.isFinite(item.clientBudgetImpact) && Math.abs(item.clientBudgetImpact - itemBudgetImpact) > 0.01) {
      tamperSignals.push({ productId: item.productId, field: 'budgetImpact', client: item.clientBudgetImpact, server: itemBudgetImpact });
    }

    const differenceCost = Math.max(0, differenceAmount * quantity);
    return {
      productId: item.productId,
      productName: sanitizeString(product?.name || item.productId, 240),
      variantId: sanitizeString(selectedVariant?.id || '', 120),
      variantName: sanitizeString(selectedVariant?.name || '', 200),
      variantImage: sanitizeString(selectedVariant?.image || selectedVariant?.imageUrl || '', 1000),
      size: item.size,
      quantity,
      unitCost,
      lineCost,
      freeApplied,
      upgradeApplied,
      differenceAmount: Math.max(0, differenceAmount),
      differenceCost,
      useUpgrade: upgradeApplied,
      comment: item.comment,
      priceAtOrder,
      creditCostAtOrder,
      budgetImpact: itemBudgetImpact,
      ruleSnapshot: {
        usesBudget: productUsesBudget,
        approvalRequired,
        freeRule: sanitizeObject(product?.freeRule || {}),
        upgradeRule: sanitizeObject(product?.upgradeRule || {}),
        periodLimit: sanitizeObject(periodLimit),
      },
    };
  });

  if (Number.isFinite(orderDraft.clientBudgetImpact) && Math.abs(orderDraft.clientBudgetImpact - budgetImpact) > 0.01) {
    tamperSignals.push({ field: 'budgetImpact', client: orderDraft.clientBudgetImpact, server: budgetImpact });
  }

  const autoApproveOrders = settings?.autoApproveOrders === true;
  const nextStatus = !requiresApproval && autoApproveOrders ? 'Approved' : 'Pending';
  const reserveOnPending = settings.reserveOnPending !== false;
  const shouldReserveBudget = budgetImpact > 0 && (nextStatus === 'Approved' || reserveOnPending);
  const availableBudget = Math.max(0, Number(profile.creditBalance) || 0);
  if (shouldReserveBudget && budgetImpact > availableBudget + 0.00001) {
    throw createStoreValidationError('STORE_INSUFFICIENT_BUDGET', 400, String(budgetImpact));
  }

  let creditReserved = 0;
  if (shouldReserveBudget && budgetImpact > 0) {
    profile.creditBalance = Math.max(0, availableBudget - budgetImpact);
    profile.reservedCredit = Math.max(0, Number(profile.reservedCredit) || 0) + budgetImpact;
    creditReserved = budgetImpact;
    appendStoreCreditLedgerEntry(store, {
      workerId,
      delta: -budgetImpact,
      reserve: budgetImpact,
      reason: nextStatus === 'Approved' ? 'auto_approved_reserve' : 'pending_reserve',
      orderId: '',
      changedBy: actorEmail,
    });
  }

  Object.entries(freeUsageDraft).forEach(([key, value]) => {
    profile.freeEligibility[key] = value;
  });

  const orderId = generateStoreOrderId(existingIds);
  const siteName = sanitizeString(site, 120) || 'default';
  const statusHistory = [{ status: nextStatus, at: nowIso, by: actorEmail || workerId }];

  const order = {
    id: orderId,
    workerId,
    workerName: sanitizeString(workerName || workerId, 200),
    site,
    siteId: site,
    siteName,
    status: nextStatus,
    urgent: orderDraft.urgent === true,
    workerComment: orderDraft.workerComment,
    internalNote: '',
    externalNote: '',
    items,
    budgetImpact,
    totals: {
      items,
      subtotal,
      freeAppliedCount,
      differenceTotal,
    },
    statusHistory,
    createdAt: nowIso,
    updatedAt: nowIso,
    cancelledAt: '',
    cancelledBy: '',
    cancelReason: '',
    passwordConfirmedAt: sanitizeString(orderDraft.passwordConfirmedAt || nowIso, 80),
    creditReserved,
    budgetReleasedTotal: 0,
    serverPriced: true,
  };

  if (profile.orderHistory.length >= 5000) {
    profile.orderHistory = profile.orderHistory.slice(-4999);
  }
  profile.orderHistory.push(orderId);
  if (creditReserved > 0) {
    const latestLedger = store.creditLedger[store.creditLedger.length - 1];
    if (latestLedger && !latestLedger.orderId) latestLedger.orderId = orderId;
  }

  return {
    order,
    tamperSignals,
    budget: {
      workerId,
      creditBalance: Math.max(0, Number(profile.creditBalance) || 0),
      reservedCredit: Math.max(0, Number(profile.reservedCredit) || 0),
    },
    budgetReserved: creditReserved,
  };
}

function applyServerStoreStatusChange({ store, order, nextStatus, actor, reason, internalNote, externalNote }) {
  const current = order && typeof order === 'object' ? order : null;
  if (!current) {
    throw createStoreValidationError('STORE_ORDER_NOT_FOUND', 404);
  }
  const fromStatus = sanitizeString(current.status || 'Pending', 40) || 'Pending';
  const toStatus = sanitizeString(nextStatus || '', 40);
  if (!canTransitionStoreOrderStatus(fromStatus, toStatus)) {
    throw createStoreValidationError('INVALID_STATUS_UPDATE', 400, `${fromStatus}->${toStatus}`);
  }

  const nowIso = new Date().toISOString();
  current.internalNote = sanitizeString(internalNote || current.internalNote || '', 1200);
  current.externalNote = sanitizeString(externalNote || current.externalNote || '', 1200);
  current.updatedAt = nowIso;
  if (fromStatus === toStatus) return { order: current, budgetDelta: 0, reservedDelta: 0 };

  const profile = ensureStoreWorkerProfile(store, sanitizeString(current.workerId || '', 160).toLowerCase(), current.workerName || current.workerId);
  const reserveOnPending = store?.settings?.reserveOnPending !== false;
  const orderBudgetImpact = Math.max(0, Number(current.budgetImpact) || 0);
  let budgetDelta = 0;
  let reservedDelta = 0;

  if (toStatus === 'Approved' && fromStatus === 'Pending' && Number(current.creditReserved || 0) <= 0 && orderBudgetImpact > 0 && !reserveOnPending) {
    if (profile.creditBalance < orderBudgetImpact) {
      throw createStoreValidationError('STORE_INSUFFICIENT_BUDGET', 400, String(orderBudgetImpact));
    }
    profile.creditBalance = Math.max(0, Number(profile.creditBalance || 0) - orderBudgetImpact);
    profile.reservedCredit = Math.max(0, Number(profile.reservedCredit || 0) + orderBudgetImpact);
    current.creditReserved = orderBudgetImpact;
    budgetDelta -= orderBudgetImpact;
    reservedDelta += orderBudgetImpact;
    appendStoreCreditLedgerEntry(store, {
      workerId: current.workerId,
      delta: -orderBudgetImpact,
      reserve: orderBudgetImpact,
      reason: 'approved_reserve',
      orderId: current.id,
      changedBy: actor,
    });
  }

  if ((toStatus === 'Rejected' || toStatus === 'Cancelled') && Number(current.creditReserved || 0) > 0) {
    const release = Math.max(0, Number(current.creditReserved) || 0);
    profile.creditBalance = Math.max(0, Number(profile.creditBalance || 0) + release);
    profile.reservedCredit = Math.max(0, Number(profile.reservedCredit || 0) - release);
    current.creditReserved = 0;
    current.budgetReleasedTotal = Math.max(0, Number(current.budgetReleasedTotal || 0) + release);
    budgetDelta += release;
    reservedDelta -= release;
    appendStoreCreditLedgerEntry(store, {
      workerId: current.workerId,
      delta: release,
      reserve: -release,
      reason: toStatus === 'Rejected' ? 'order_rejected' : 'order_cancelled',
      orderId: current.id,
      changedBy: actor,
    });
  }

  if (toStatus === 'Delivered' && Number(current.creditReserved || 0) > 0) {
    const finalizeAmount = Math.max(0, Number(current.creditReserved) || 0);
    profile.reservedCredit = Math.max(0, Number(profile.reservedCredit || 0) - finalizeAmount);
    current.creditReserved = 0;
    reservedDelta -= finalizeAmount;
    appendStoreCreditLedgerEntry(store, {
      workerId: current.workerId,
      delta: 0,
      reserve: -finalizeAmount,
      reason: 'delivery_locked',
      orderId: current.id,
      changedBy: actor,
    });
  }

  current.status = toStatus;
  const history = Array.isArray(current.statusHistory) ? current.statusHistory.slice() : [];
  history.push({ status: toStatus, at: nowIso, by: sanitizeString(actor || 'system', 200) });
  current.statusHistory = history;
  if (toStatus === 'Rejected' || toStatus === 'Cancelled') {
    current.cancelReason = sanitizeString(reason || current.cancelReason || '', 1000);
    current.cancelledAt = nowIso;
    current.cancelledBy = sanitizeString(actor || current.cancelledBy || '', 200);
  }
  if (toStatus === 'Delivered') {
    current.deliveredAt = nowIso;
  }
  return { order: current, budgetDelta, reservedDelta };
}

function canExportStoreData(session) {
  return session?.isSuperAdmin ||
    canManageStoreOrders(session) ||
    sessionHasPermission(session, 'canExportStore');
}

const STORE_LINK_PREVIEW_MAX_BYTES = Number(process.env.STORE_LINK_PREVIEW_MAX_BYTES) || (1024 * 1024);
const STORE_LINK_PREVIEW_TIMEOUT_MS = Number(process.env.STORE_LINK_PREVIEW_TIMEOUT_MS) || 8000;
const STORE_LINK_PREVIEW_MAX_REDIRECTS = Number(process.env.STORE_LINK_PREVIEW_MAX_REDIRECTS) || 3;

const storeProductLinkPreviewLimiter = rateLimit({
  windowMs: Number(process.env.STORE_LINK_PREVIEW_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.STORE_LINK_PREVIEW_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'STORE_LINK_PREVIEW_RATE_LIMIT' },
});

function isPrivateStorePreviewIp(address) {
  const value = sanitizeString(address || '', 80).toLowerCase();
  if (!value) return true;
  if (net.isIP(value) === 4) {
    const parts = value.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
    const [a, b] = parts;
    return a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224;
  }
  if (net.isIP(value) === 6) {
    const mappedV4 = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedV4) return isPrivateStorePreviewIp(mappedV4[1]);
    return value === '::1' ||
      value === '::' ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      value.startsWith('fe80:');
  }
  return true;
}

async function assertStorePreviewUrlSafe(targetUrl) {
  let parsed;
  try {
    parsed = new URL(sanitizeString(targetUrl || '', 2000));
  } catch (_) {
    throw createStoreValidationError('STORE_LINK_INVALID_URL', 400);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createStoreValidationError('STORE_LINK_INVALID_PROTOCOL', 400);
  }
  const host = parsed.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw createStoreValidationError('STORE_LINK_BLOCKED_HOST', 400);
  }
  const directIp = net.isIP(host);
  if (directIp && isPrivateStorePreviewIp(host)) {
    throw createStoreValidationError('STORE_LINK_BLOCKED_HOST', 400);
  }
  let addresses = [];
  try {
    addresses = directIp ? [{ address: host }] : await dns.lookup(host, { all: true, verbatim: false });
  } catch (_) {
    throw createStoreValidationError('STORE_LINK_DNS_FAILED', 400);
  }
  if (!addresses.length || addresses.some((entry) => isPrivateStorePreviewIp(entry.address))) {
    throw createStoreValidationError('STORE_LINK_BLOCKED_HOST', 400);
  }
  parsed.hash = '';
  return parsed;
}

function decodeStorePreviewHtml(value) {
  return sanitizeString(value || '', 5000)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStorePreviewMeta(html, key) {
  const escaped = String(key || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagRegex = new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)=["']${escaped}["'][^>]*>`, 'i');
  const tag = html.match(tagRegex)?.[0] || '';
  if (!tag) return '';
  const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || '';
  return decodeStorePreviewHtml(content);
}

function extractStorePreviewTitle(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  return decodeStorePreviewHtml(title.replace(/<[^>]*>/g, ' '));
}

function collectStorePreviewJsonLd(node, products = []) {
  if (!node) return products;
  if (Array.isArray(node)) {
    node.forEach((entry) => collectStorePreviewJsonLd(entry, products));
    return products;
  }
  if (typeof node !== 'object') return products;
  const typeValue = node['@type'];
  const types = Array.isArray(typeValue) ? typeValue : [typeValue];
  if (types.some((entry) => String(entry || '').toLowerCase() === 'product')) {
    products.push(node);
  }
  if (node['@graph']) collectStorePreviewJsonLd(node['@graph'], products);
  return products;
}

function normalizeStorePreviewImage(value, baseUrl) {
  const source = Array.isArray(value) ? value : [value];
  return source
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return entry;
      if (typeof entry === 'object') return entry.url || entry.contentUrl || '';
      return '';
    })
    .map((entry) => {
      try {
        return new URL(sanitizeString(entry, 2000), baseUrl).toString();
      } catch (_) {
        return '';
      }
    })
    .filter(Boolean);
}

function extractStorePreviewMetaAll(html, key) {
  const escaped = String(key || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagRegex = new RegExp(`<meta\\b[^>]*(?:property|name|itemprop)=["']${escaped}["'][^>]*>`, 'ig');
  const values = [];
  let match;
  while ((match = tagRegex.exec(html))) {
    const content = match[0].match(/\bcontent=["']([^"']*)["']/i)?.[1] || '';
    const clean = decodeStorePreviewHtml(content);
    if (clean) values.push(clean);
  }
  return values;
}

function extractStorePreviewAttr(tag, attrName) {
  const escaped = String(attrName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return tag.match(new RegExp(`\\b${escaped}=["']([^"']+)["']`, 'i'))?.[1] || '';
}

function expandStorePreviewSrcSet(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function storePreviewImageLooksBad(url) {
  const lower = decodeURIComponent(String(url || '')).toLowerCase();
  return /(?:logo|favicon|sprite|icon|placeholder|no-?image|spinner|loading|avatar|payment|klarna|trustpilot|social|flag|badge|banner|newsletter|tracking|pixel|transparent|blank)/i.test(lower) ||
    /\.(?:svg|ico)(?:[?#].*)?$/i.test(lower);
}

function scoreStorePreviewImageCandidate(candidate) {
  const url = decodeURIComponent(String(candidate?.url || '')).toLowerCase();
  let score = Number(candidate?.weight || 0);
  if (candidate?.source === 'jsonld') score += 70;
  if (candidate?.source === 'html-data-zoom') score += 58;
  if (candidate?.source === 'html-srcset') score += 46;
  if (candidate?.source === 'html-img') score += 38;
  if (candidate?.source === 'meta-og') score += 24;
  if (candidate?.source === 'meta-twitter') score += 18;
  if (/\.(?:jpe?g|png|webp)(?:[?#].*)?$/i.test(url)) score += 8;
  if (/(?:product|produkt|artikel|item|sku|variant|gallery|zoom|large|main|packshot|media\/catalog|pim|images\/products|productimages)/i.test(url)) score += 35;
  if (/(?:thumb|thumbnail|small|mini)/i.test(url)) score -= 8;
  const dimMatch = url.match(/(?:^|[^\d])(\d{2,4})x(\d{2,4})(?:[^\d]|$)/);
  if (dimMatch) {
    const width = Number(dimMatch[1]);
    const height = Number(dimMatch[2]);
    if (width >= 500 && height >= 500) score += 22;
    else if (width >= 300 && height >= 300) score += 12;
    else if (width < 180 || height < 180) score -= 38;
  }
  const widthParam = url.match(/[?&](?:w|width)=([0-9]+)/)?.[1];
  const heightParam = url.match(/[?&](?:h|height)=([0-9]+)/)?.[1];
  if (widthParam || heightParam) {
    const width = Number(widthParam || 0);
    const height = Number(heightParam || 0);
    if (width >= 500 || height >= 500) score += 14;
    if ((width && width < 180) || (height && height < 180)) score -= 30;
  }
  if (storePreviewImageLooksBad(url)) score -= 120;
  return score;
}

function addStorePreviewImageCandidate(candidates, rawUrl, baseUrl, source, weight = 0) {
  const raw = sanitizeString(rawUrl || '', 2400);
  if (!raw || /^data:|^blob:|^javascript:/i.test(raw)) return;
  try {
    const resolved = new URL(raw, baseUrl).toString();
    const parsed = new URL(resolved);
    if (!['http:', 'https:'].includes(parsed.protocol)) return;
    candidates.push({
      url: resolved,
      source,
      weight,
      index: candidates.length,
    });
  } catch (_) {}
}

function extractStorePreviewHtmlImages(html, baseUrl) {
  const candidates = [];
  const imgRegex = /<img\b[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html))) {
    const tag = match[0];
    ['data-zoom-image', 'data-large', 'data-full', 'data-original', 'data-src', 'data-lazy-src', 'src'].forEach((attr) => {
      const value = extractStorePreviewAttr(tag, attr);
      if (value) addStorePreviewImageCandidate(candidates, value, baseUrl, attr.includes('zoom') || attr.includes('large') || attr.includes('full') ? 'html-data-zoom' : 'html-img');
    });
    ['srcset', 'data-srcset'].forEach((attr) => {
      expandStorePreviewSrcSet(extractStorePreviewAttr(tag, attr)).forEach((value) => {
        addStorePreviewImageCandidate(candidates, value, baseUrl, 'html-srcset');
      });
    });
  }
  const sourceRegex = /<source\b[^>]*>/gi;
  while ((match = sourceRegex.exec(html))) {
    expandStorePreviewSrcSet(extractStorePreviewAttr(match[0], 'srcset')).forEach((value) => {
      addStorePreviewImageCandidate(candidates, value, baseUrl, 'html-srcset');
    });
  }
  const urlRegex = /(?:https?:)?\/\/[^"'<>\s]+\.(?:jpe?g|png|webp)(?:\?[^"'<>\s]*)?/gi;
  while ((match = urlRegex.exec(html))) {
    addStorePreviewImageCandidate(candidates, match[0], baseUrl, 'html-img', -12);
  }
  return candidates;
}

function rankStorePreviewImageCandidates(candidates) {
  const byUrl = new Map();
  (Array.isArray(candidates) ? candidates : []).forEach((candidate) => {
    if (!candidate?.url) return;
    const score = scoreStorePreviewImageCandidate(candidate);
    if (score <= -50) return;
    const key = candidate.url;
    const existing = byUrl.get(key);
    if (!existing || score > existing.score) {
      byUrl.set(key, { ...candidate, score });
    }
  });
  return Array.from(byUrl.values())
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map((candidate) => candidate.url)
    .slice(0, 12);
}

function parseStorePreviewJsonLd(html) {
  const products = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    try {
      const parsed = JSON.parse(match[1].trim());
      collectStorePreviewJsonLd(parsed, products);
    } catch (_) {}
  }
  return products[0] || null;
}

function parseStoreProductLinkPreview(html, sourceUrl) {
  const jsonProduct = parseStorePreviewJsonLd(html);
  const offer = Array.isArray(jsonProduct?.offers) ? jsonProduct.offers[0] : jsonProduct?.offers;
  const brand = typeof jsonProduct?.brand === 'string'
    ? jsonProduct.brand
    : sanitizeString(jsonProduct?.brand?.name || '', 200);
  const imageCandidates = [];
  normalizeStorePreviewImage(jsonProduct?.image, sourceUrl).forEach((url) => {
    addStorePreviewImageCandidate(imageCandidates, url, sourceUrl, 'jsonld');
  });
  extractStorePreviewMetaAll(html, 'og:image').forEach((url) => {
    addStorePreviewImageCandidate(imageCandidates, url, sourceUrl, 'meta-og');
  });
  extractStorePreviewMetaAll(html, 'twitter:image').forEach((url) => {
    addStorePreviewImageCandidate(imageCandidates, url, sourceUrl, 'meta-twitter');
  });
  extractStorePreviewHtmlImages(html, sourceUrl).forEach((candidate) => imageCandidates.push(candidate));
  const uniqueImages = rankStorePreviewImageCandidates(imageCandidates);
  const rawPrice = offer?.price || extractStorePreviewMeta(html, 'product:price:amount') || '';
  const price = Number(String(rawPrice).replace(/[^0-9.,-]/g, '').replace(',', '.'));
  const parsed = new URL(sourceUrl);
  return {
    sourceUrl,
    host: parsed.hostname,
    name: sanitizeString(jsonProduct?.name || extractStorePreviewMeta(html, 'og:title') || extractStorePreviewMeta(html, 'twitter:title') || extractStorePreviewTitle(html), 240),
    description: sanitizeString(jsonProduct?.description || extractStorePreviewMeta(html, 'og:description') || extractStorePreviewMeta(html, 'description') || '', 1200),
    imageUrls: uniqueImages,
    price: Number.isFinite(price) && price >= 0 ? price : null,
    currency: sanitizeString(offer?.priceCurrency || extractStorePreviewMeta(html, 'product:price:currency') || '', 12).toUpperCase(),
    sku: sanitizeString(jsonProduct?.sku || jsonProduct?.mpn || '', 160),
    brand,
    confidence: jsonProduct ? 'product-jsonld' : 'metadata',
  };
}

async function readStorePreviewResponseText(response) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > STORE_LINK_PREVIEW_MAX_BYTES) {
    throw createStoreValidationError('STORE_LINK_TOO_LARGE', 400);
  }
  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    return text.slice(0, STORE_LINK_PREVIEW_MAX_BYTES);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > STORE_LINK_PREVIEW_MAX_BYTES) {
      try { await reader.cancel(); } catch (_) {}
      throw createStoreValidationError('STORE_LINK_TOO_LARGE', 400);
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

async function fetchStoreProductPreviewHtml(rawUrl, redirects = 0) {
  const safeUrl = await assertStorePreviewUrlSafe(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STORE_LINK_PREVIEW_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(safeUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': 'CMAX-SCM-StorePreview/1.0',
        accept: 'text/html,application/xhtml+xml',
      },
    });
  } finally {
    clearTimeout(timer);
  }
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= STORE_LINK_PREVIEW_MAX_REDIRECTS) {
      throw createStoreValidationError('STORE_LINK_TOO_MANY_REDIRECTS', 400);
    }
    const location = response.headers.get('location') || '';
    const nextUrl = new URL(location, safeUrl).toString();
    return fetchStoreProductPreviewHtml(nextUrl, redirects + 1);
  }
  if (!response.ok) {
    throw createStoreValidationError('STORE_LINK_FETCH_FAILED', 400, String(response.status));
  }
  const contentType = sanitizeString(response.headers.get('content-type') || '', 200).toLowerCase();
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw createStoreValidationError('STORE_LINK_NOT_HTML', 400);
  }
  const html = await readStorePreviewResponseText(response);
  return { html, finalUrl: safeUrl.toString() };
}

function buildStoreExportRows(orders, filters = {}) {
  const source = Array.isArray(orders) ? orders : [];
  const siteScope = sanitizeString(filters.siteScope || 'all', 20).toLowerCase();
  const site = sanitizeString(filters.site || '', 80);
  const statusScope = sanitizeString(filters.statusScope || 'all', 40).toLowerCase();
  const fromDate = sanitizeString(filters.fromDate || '', 20);
  const untilDate = sanitizeString(filters.untilDate || '', 20);
  const fromTs = /^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
  const untilTs = /^\d{4}-\d{2}-\d{2}$/.test(untilDate) ? new Date(`${untilDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

  return source
    .filter((order) => (siteScope === 'single' && site ? sanitizeString(order?.site || '', 80) === site : true))
    .filter((order) => {
      if (statusScope === 'pending-approved') {
        return ['Pending', 'Approved'].includes(sanitizeString(order?.status || '', 40));
      }
      if (statusScope === 'pending') return sanitizeString(order?.status || '', 40) === 'Pending';
      if (statusScope === 'approved') return sanitizeString(order?.status || '', 40) === 'Approved';
      return true;
    })
    .filter((order) => {
      const createdAtTs = new Date(order?.createdAt || 0).getTime();
      if (!Number.isFinite(createdAtTs)) return false;
      if (createdAtTs < fromTs) return false;
      if (createdAtTs > untilTs) return false;
      return true;
    })
    .flatMap((order) => {
      const items = Array.isArray(order?.items) ? order.items : [];
      return items.map((item) => ({
        orderId: sanitizeString(order?.id || '', 80),
        worker: sanitizeString(order?.workerName || order?.workerId || '', 200),
        workerId: sanitizeString(order?.workerId || '', 160),
        site: sanitizeString(order?.site || '', 80),
        date: sanitizeString(order?.createdAt || '', 80),
        status: sanitizeString(order?.status || '', 40),
        product: sanitizeString(item?.productName || item?.productId || '', 240),
        variant: sanitizeString(item?.variantName || '', 200),
        size: sanitizeString(item?.size || '', 80),
        quantity: Math.max(1, Number(item?.quantity) || 1),
        comment: sanitizeString(order?.workerComment || '', 1200),
        budgetImpact: Math.max(0, Number(item?.budgetImpact ?? item?.lineCost) || 0),
      }));
    });
}

function getUploadUrl(filePath) {
  const relative = path.relative(uploadsDir, filePath).split(path.sep).join('/');
  return `/uploads/${relative}`;
}

function createEmptySiteChatDocument() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sites: {},
  };
}

const SITE_CHAT_MAX_MESSAGE_LENGTH = Number(process.env.SITE_CHAT_MAX_MESSAGE_LENGTH) || 4000;
const SITE_CHAT_MAX_ATTACHMENTS = Number(process.env.SITE_CHAT_MAX_ATTACHMENTS) || 5;
const SITE_CHAT_EDIT_WINDOW_MS = Number(process.env.SITE_CHAT_EDIT_WINDOW_MS) || (15 * 60 * 1000);
const SITE_CHAT_DELETE_OWN_WINDOW_MS = Number(process.env.SITE_CHAT_DELETE_OWN_WINDOW_MS) || (30 * 60 * 1000);
const SITE_CHAT_MAX_MESSAGES_PER_SITE = Number(process.env.SITE_CHAT_MAX_MESSAGES_PER_SITE) || 5000;
const SITE_CHAT_ATTACHMENT_MAX_SIZE = Number(process.env.SITE_CHAT_ATTACHMENT_MAX_SIZE) || (10 * 1024 * 1024);
const SITE_CHAT_ALLOWED_REACTIONS = ['👍', '✅', '👀', '⚠️'];
const SITE_CHAT_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const siteChatMessageLimiter = rateLimit({
  windowMs: Number(process.env.SITE_CHAT_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.SITE_CHAT_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat messages. Try again shortly.' },
});
const siteChatUploadLimiter = rateLimit({
  windowMs: Number(process.env.SITE_CHAT_UPLOAD_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.SITE_CHAT_UPLOAD_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat uploads. Try again shortly.' },
});

function canAccessSiteChat(session) {
  return !session?.isReadonly && sessionHasPermission(session, 'canAccessSiteChat');
}

function canModerateSiteChat(session) {
  return Boolean(
    session?.isSuperAdmin ||
      getSessionLevel(session) >= 5 ||
      sessionHasPermission(session, 'canModerateSiteChat'),
  );
}

function normalizeSiteChatMessage(message, siteId = '') {
  const raw = message && typeof message === 'object' ? message : {};
  const id = sanitizeString(raw.id || '', 120);
  const createdAt = sanitizeString(raw.createdAt || raw.timestamp || new Date().toISOString(), 80);
  const authorEmail = sanitizeString(raw.authorEmail || raw.email || '', 160).toLowerCase();
  return {
    id,
    siteId: sanitizeString(raw.siteId || siteId || '', 80),
    authorEmail,
    authorName: sanitizeString(raw.authorName || authorEmail || 'Unknown', 180),
    authorFunctions: normalizeStoreRoleListServer(raw.authorFunctions || raw.storeRoles || []),
    text: sanitizeString(raw.text || '', SITE_CHAT_MAX_MESSAGE_LENGTH),
    attachments: sanitizeSiteChatAttachments(raw.attachments || []),
    replyToMessageId: sanitizeString(raw.replyToMessageId || '', 120),
    mentions: Array.isArray(raw.mentions)
      ? Array.from(new Set(raw.mentions.map((entry) => sanitizeString(entry, 160).toLowerCase()).filter(Boolean)))
      : [],
    reactions: normalizeSiteChatReactions(raw.reactions || {}),
    pinned: raw.pinned === true,
    pinnedAt: sanitizeString(raw.pinnedAt || '', 80),
    pinnedBy: sanitizeString(raw.pinnedBy || '', 160).toLowerCase(),
    editedAt: sanitizeString(raw.editedAt || '', 80),
    deletedAt: sanitizeString(raw.deletedAt || '', 80),
    deletedBy: sanitizeString(raw.deletedBy || '', 160).toLowerCase(),
    deleteReason: sanitizeString(raw.deleteReason || '', 240),
    createdAt,
    updatedAt: sanitizeString(raw.updatedAt || createdAt, 80),
  };
}

function normalizeSiteChatReactions(reactions) {
  const source = reactions && typeof reactions === 'object' && !Array.isArray(reactions) ? reactions : {};
  const next = {};
  SITE_CHAT_ALLOWED_REACTIONS.forEach((reaction) => {
    const users = Array.isArray(source[reaction]) ? source[reaction] : [];
    next[reaction] = Array.from(new Set(
      users.map((entry) => sanitizeString(entry, 160).toLowerCase()).filter(Boolean),
    ));
  });
  return next;
}

function sanitizeSiteChatAttachments(attachments) {
  const source = Array.isArray(attachments) ? attachments.slice(0, SITE_CHAT_MAX_ATTACHMENTS) : [];
  return source
    .map((entry) => {
      const raw = entry && typeof entry === 'object' ? entry : {};
      const mimeType = sanitizeString(raw.mimeType || raw.mimetype || '', 160).toLowerCase();
      const size = Math.max(0, Number(raw.size) || 0);
      const url = sanitizeString(raw.url || '', 600);
      if (!SITE_CHAT_ALLOWED_MIME_TYPES.has(mimeType)) return null;
      if (size > SITE_CHAT_ATTACHMENT_MAX_SIZE) return null;
      if (url && !url.startsWith('/uploads/')) return null;
      const kind = mimeType.startsWith('image/') ? 'image' : mimeType === 'application/pdf' ? 'pdf' : 'document';
      return {
        id: sanitizeString(raw.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 120),
        type: kind,
        fileName: sanitizeString(raw.fileName || raw.originalName || raw.name || 'attachment', 240),
        mimeType,
        size,
        url,
        uploadedAt: sanitizeString(raw.uploadedAt || new Date().toISOString(), 80),
      };
    })
    .filter(Boolean);
}

function normalizeSiteChatSite(siteEntry, siteId) {
  const raw = siteEntry && typeof siteEntry === 'object' ? siteEntry : {};
  const readState = raw.readState && typeof raw.readState === 'object' ? raw.readState : {};
  const auditLog = Array.isArray(raw.auditLog) ? raw.auditLog : [];
  const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map((message) => normalizeSiteChatMessage(message, siteId)).filter((message) => message.id)
    : [];
  messages.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  return {
    settings: {
      locked: settings.locked === true,
      readOnly: settings.readOnly === true,
      announcementMode: settings.announcementMode === true,
    },
    readState: Object.fromEntries(Object.entries(readState).map(([email, value]) => {
      const entry = value && typeof value === 'object' ? value : {};
      return [sanitizeString(email, 160).toLowerCase(), {
        lastReadAt: sanitizeString(entry.lastReadAt || '', 80),
        lastReadMessageId: sanitizeString(entry.lastReadMessageId || '', 120),
      }];
    }).filter(([email]) => Boolean(email))),
    auditLog: auditLog.slice(-500).map((entry) => ({
      id: sanitizeString(entry?.id || `chat_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, 120),
      at: sanitizeString(entry?.at || entry?.timestamp || new Date().toISOString(), 80),
      actor: sanitizeString(entry?.actor || '', 160).toLowerCase(),
      action: sanitizeString(entry?.action || 'unknown', 120),
      messageId: sanitizeString(entry?.messageId || '', 120),
      details: redactSensitiveObject(sanitizeObject(entry?.details || {})),
    })),
    messages: messages.slice(-SITE_CHAT_MAX_MESSAGES_PER_SITE),
  };
}

function normalizeSiteChatDocument(doc) {
  const raw = doc && typeof doc === 'object' ? doc : createEmptySiteChatDocument();
  const sitesSource = raw.sites && typeof raw.sites === 'object' ? raw.sites : {};
  const normalizedSites = {};
  Object.entries(sitesSource).forEach(([siteId, entry]) => {
    const safeSite = sanitizeString(siteId, 80);
    if (safeSite) normalizedSites[safeSite] = normalizeSiteChatSite(entry, safeSite);
  });
  return {
    version: 1,
    createdAt: sanitizeString(raw.createdAt || new Date().toISOString(), 80),
    updatedAt: sanitizeString(raw.updatedAt || new Date().toISOString(), 80),
    sites: normalizedSites,
  };
}

function ensureSiteChatSite(doc, siteId) {
  const safeSite = sanitizeString(siteId || 'default', 80);
  if (!doc.sites[safeSite]) {
    doc.sites[safeSite] = normalizeSiteChatSite({}, safeSite);
  }
  return doc.sites[safeSite];
}

function isSiteChatLockedForWrites(siteEntry, session) {
  if (canModerateSiteChat(session)) return false;
  const settings = siteEntry?.settings || {};
  return settings.locked === true || settings.readOnly === true || settings.announcementMode === true;
}

function isSiteChatMessageOwner(message, session) {
  const author = sanitizeString(message?.authorEmail || '', 160).toLowerCase();
  const current = sanitizeString(session?.email || '', 160).toLowerCase();
  return Boolean(author && current && author === current);
}

function canEditSiteChatMessage(message, session) {
  if (!isSiteChatMessageOwner(message, session)) return false;
  if (message?.deletedAt) return false;
  const created = new Date(message.createdAt || 0).getTime();
  return Number.isFinite(created) && Date.now() - created <= SITE_CHAT_EDIT_WINDOW_MS;
}

function canDeleteOwnSiteChatMessage(message, session) {
  if (!isSiteChatMessageOwner(message, session)) return false;
  if (message?.deletedAt) return false;
  const created = new Date(message.createdAt || 0).getTime();
  return Number.isFinite(created) && Date.now() - created <= SITE_CHAT_DELETE_OWN_WINDOW_MS;
}

function getAccessibleSiteListFromState(state, session) {
  const stateSites = Array.isArray(state?.sites) && state.sites.length ? state.sites : ['default'];
  return stateSites
    .map((site) => sanitizeString(site, 80))
    .filter(Boolean)
    .filter((site) => canAccessSite(session, site));
}

function getSiteChatUnreadForSite(siteEntry, session) {
  const email = sanitizeString(session?.email || '', 160).toLowerCase();
  const readEntry = siteEntry?.readState?.[email] || {};
  const lastRead = new Date(readEntry.lastReadAt || 0).getTime();
  const messages = Array.isArray(siteEntry?.messages) ? siteEntry.messages : [];
  return messages.filter((message) => {
    if (message.deletedAt) return false;
    if (sanitizeString(message.authorEmail || '', 160).toLowerCase() === email) return false;
    return new Date(message.createdAt || 0).getTime() > lastRead;
  }).length;
}

function getSiteChatLastMessage(siteEntry) {
  const messages = Array.isArray(siteEntry?.messages) ? siteEntry.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message?.deletedAt) return message;
  }
  return null;
}

function buildSiteChatListEntry(site, siteEntry, session) {
  const lastMessage = getSiteChatLastMessage(siteEntry);
  return {
    siteId: site,
    siteName: site,
    unreadCount: getSiteChatUnreadForSite(siteEntry, session),
    lastMessage: lastMessage ? {
      id: lastMessage.id,
      text: lastMessage.text || (lastMessage.attachments?.length ? 'Attachment' : ''),
      authorName: lastMessage.authorName,
      createdAt: lastMessage.createdAt,
    } : null,
    onlineCount: getOnlineCountForSite(site),
  };
}

function getOnlineCountForSite(site) {
  cleanupPresence();
  let count = 0;
  for (const entry of activePresence.values()) {
    if (entry?.currentSite === site) count += 1;
  }
  return count;
}

async function getSiteChatDocument() {
  return normalizeSiteChatDocument(await readJsonFile(siteChatFile, createEmptySiteChatDocument()));
}

async function mutateSiteChatDocument(mutator) {
  const envelope = await mutateVersionedJsonFile(siteChatFile, createEmptySiteChatDocument(), async (doc) => {
    const normalized = normalizeSiteChatDocument(doc);
    const next = await mutator(normalized);
    const output = normalizeSiteChatDocument(next || normalized);
    output.updatedAt = new Date().toISOString();
    return output;
  });
  return normalizeSiteChatDocument(envelope.data || envelope);
}

function paginateSiteChatMessages(messages, limitRaw, beforeRaw) {
  const limit = Math.max(1, Math.min(100, Number(limitRaw) || 50));
  const sorted = Array.isArray(messages) ? [...messages] : [];
  sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  let endIndex = sorted.length;
  const before = sanitizeString(beforeRaw || '', 120);
  if (before) {
    const byId = sorted.findIndex((message) => message.id === before);
    if (byId >= 0) {
      endIndex = byId;
    } else {
      const beforeTime = new Date(before).getTime();
      if (Number.isFinite(beforeTime)) {
        const byTime = sorted.findIndex((message) => new Date(message.createdAt || 0).getTime() >= beforeTime);
        if (byTime >= 0) endIndex = byTime;
      }
    }
  }
  const startIndex = Math.max(0, endIndex - limit);
  const page = sorted.slice(startIndex, endIndex);
  return {
    messages: page,
    hasMore: startIndex > 0,
    nextBefore: page[0]?.id || '',
  };
}

function buildSafeSiteChatMessage(message) {
  if (!message) return null;
  const isDeleted = Boolean(message.deletedAt);
  return {
    ...message,
    text: isDeleted ? '' : message.text,
    attachments: isDeleted ? [] : (message.attachments || []),
  };
}

function normalizeSiteChatDraft(body = {}) {
  const raw = body && typeof body === 'object' ? body : {};
  const text = sanitizeString(raw.text || raw.message || '', SITE_CHAT_MAX_MESSAGE_LENGTH);
  const attachments = sanitizeSiteChatAttachments(raw.attachments || []);
  if (!text && attachments.length === 0) {
    const error = new Error('CHAT_MESSAGE_EMPTY');
    error.statusCode = 400;
    throw error;
  }
  return {
    text,
    attachments,
    replyToMessageId: sanitizeString(raw.replyToMessageId || '', 120),
    clientId: sanitizeString(raw.clientId || '', 120),
  };
}

function adminHasSiteAccess(admin, site) {
  const normalized = normalizeAdminRecord(admin);
  if (normalized.active === false) return false;
  if (normalized.isSuperAdmin) return true;
  if (Array.isArray(normalized.allowedSites)) return normalized.allowedSites.includes(site);
  return true;
}

function getAdminFunctionBadges(admin) {
  const normalized = normalizeAdminRecord(admin);
  if (normalized.storeRoles.length) return normalized.storeRoles;
  if (normalized.isSuperAdmin) return ['superadmin'];
  if (sessionHasPermission({ permissions: normalized.permissions, isSuperAdmin: normalized.isSuperAdmin }, 'canOpenAdminPanel')) return ['admin'];
  return ['radnik'];
}

function extractSiteChatMentionEmails(text, site, admins) {
  const tokens = Array.from(String(text || '').matchAll(/@([^\s,.;:!?()[\]{}<>]+)/g))
    .map((match) => String(match[1] || '').trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return [];
  const tokenSet = new Set(tokens);
  const mentioned = [];
  admins.forEach((admin) => {
    const normalized = normalizeAdminRecord(admin);
    if (!normalized.email || !adminHasSiteAccess(normalized, site)) return;
    const local = normalized.email.split('@')[0].toLowerCase();
    const compactName = String(normalized.fullName || '').toLowerCase().replace(/\s+/g, '');
    const firstName = String(normalized.firstName || '').toLowerCase();
    const lastName = String(normalized.lastName || '').toLowerCase();
    if (
      tokenSet.has(normalized.email) ||
      tokenSet.has(local) ||
      (compactName && tokenSet.has(compactName)) ||
      (firstName && tokenSet.has(firstName)) ||
      (lastName && tokenSet.has(lastName))
    ) {
      mentioned.push(normalized.email);
    }
  });
  return Array.from(new Set(mentioned));
}

function buildSiteChatAccountNotification(message, site, kind = 'message') {
  const title = kind === 'mention'
    ? `${message.authorName} vas je spomenuo u chatu`
    : kind === 'reply'
      ? `${message.authorName} je odgovorio u chatu`
      : `Nova chat poruka: ${site}`;
  const preview = sanitizeString(message.text || (message.attachments?.length ? 'Attachment' : 'Nova poruka'), 140);
  return {
    id: `site_chat_${message.id}`,
    uniqueKey: `site-chat:${kind}:${site}:${message.id}`,
    type: 'site-chat',
    title,
    description: `${site}: ${preview}`,
    site,
    targetId: message.id,
    targetView: 'siteChat',
    createdAt: message.createdAt,
    readAt: null,
  };
}

function isUserActivelyViewingSiteChat(email, site) {
  const normalizedEmail = sanitizeString(email || '', 160).toLowerCase();
  cleanupPresence();
  for (const entry of activePresence.values()) {
    if (
      sanitizeString(entry?.email || '', 160).toLowerCase() === normalizedEmail &&
      entry?.currentSite === site &&
      entry?.currentView === 'siteChat'
    ) {
      return true;
    }
  }
  return false;
}

async function appendAccountNotificationForUsers(userEmails, entry) {
  const recipients = Array.from(new Set(
    (Array.isArray(userEmails) ? userEmails : [])
      .map((email) => sanitizeString(email, 160).toLowerCase())
      .filter(Boolean),
  ));
  if (!recipients.length) return;
  await mutateVersionedJsonFile(stateFile, {}, async (state) => {
    const nextState = normalizeRuntimeState(state);
    const accountNotifications = nextState.accountNotifications && typeof nextState.accountNotifications === 'object'
      ? { ...nextState.accountNotifications }
      : {};
    recipients.forEach((email) => {
      const bundle = accountNotifications[email] && typeof accountNotifications[email] === 'object'
        ? { ...accountNotifications[email] }
        : {};
      const list = Array.isArray(bundle.notifications) ? [...bundle.notifications] : [];
      if (entry.uniqueKey && list.some((item) => item?.uniqueKey === entry.uniqueKey)) return;
      list.unshift({ ...entry, id: `${entry.id || 'acct'}_${email}` });
      bundle.notifications = list.slice(0, 120);
      bundle.updatedAt = new Date().toISOString();
      accountNotifications[email] = bundle;
    });
    nextState.accountNotifications = accountNotifications;
    return nextState;
  });
}

async function notifySiteChatRecipients({ site, message, admins, replyTo }) {
  const sender = sanitizeString(message.authorEmail || '', 160).toLowerCase();
  const baseRecipients = admins
    .map((admin) => normalizeAdminRecord(admin))
    .filter((admin) => admin.email && admin.email !== sender)
    .filter((admin) => admin.active !== false)
    .filter((admin) => sessionHasPermission({ permissions: admin.permissions, isSuperAdmin: admin.isSuperAdmin }, 'canAccessSiteChat'))
    .filter((admin) => adminHasSiteAccess(admin, site));
  const mentioned = message.mentions || [];
  const replyRecipient = replyTo?.authorEmail && replyTo.authorEmail !== sender ? [replyTo.authorEmail] : [];
  const messageRecipients = baseRecipients
    .map((admin) => admin.email)
    .filter((email) => !isUserActivelyViewingSiteChat(email, site));
  await appendAccountNotificationForUsers(messageRecipients, buildSiteChatAccountNotification(message, site, 'message'));
  await appendAccountNotificationForUsers(mentioned.filter((email) => email !== sender), buildSiteChatAccountNotification(message, site, 'mention'));
  await appendAccountNotificationForUsers(replyRecipient, buildSiteChatAccountNotification(message, site, 'reply'));
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

function isPastDate(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ''))) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateValue}T00:00:00`);
  return date < today;
}

function isPastDateString(dateValue) {
  return isPastDate(dateValue);
}

function canUnlockPastDays(session) {
  return Boolean(session?.isSuperAdmin || Number(session?.level) >= 6 || session?.permissions?.canUnlockPastDays === true);
}

function getSessionDisplayName(session) {
  return sanitizeString(session?.fullName || session?.name || session?.email || '', 180);
}

function applyStateEditMetadata(state, session, module = 'state') {
  const updatedAt = new Date().toISOString();
  state.savedAt = updatedAt;
  state.savedBy = session?.email;
  state.savedByName = getSessionDisplayName(session);
  state.updatedAt = updatedAt;
  state.updatedBy = session?.email;
  state.updatedByName = getSessionDisplayName(session);
  state.module = module;
  return state;
}

function stableJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value === undefined ? null : value;
}

function stableChecksum(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function findFirstDiffPath(before, after, prefix = '') {
  if (stableJson(canonicalize(before)) === stableJson(canonicalize(after))) return '';
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
    return prefix || '<root>';
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    const maxLength = Math.max(Array.isArray(before) ? before.length : 0, Array.isArray(after) ? after.length : 0);
    for (let index = 0; index < maxLength; index += 1) {
      const childPath = findFirstDiffPath(before?.[index], after?.[index], `${prefix}[${index}]`);
      if (childPath) return childPath;
    }
    return prefix || '<root>';
  }
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  for (const key of keys) {
    const childPath = findFirstDiffPath(before[key], after[key], prefix ? `${prefix}.${key}` : key);
    if (childPath) return childPath;
  }
  return prefix || '<root>';
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
    hasPastTidplanChanges(previousState, nextState);
}

function createPastDayLockedError() {
  const error = new Error('PAST_DAY_LOCKED');
  error.statusCode = 403;
  return error;
}

function canWriteStateField(session, permissionKey) {
  return Boolean(session?.isSuperAdmin || sessionHasPermission(session, permissionKey));
}

const MODULE_STATE_TARGETS = new Set([
  'planner',
  'tidplan',
  'warehouse',
  'bins',
  'storeCatalog',
  'storeSettings',
  'adminUsers',
]);

const MODULE_STATE_ALLOWED_PAYLOAD_KEYS = {
  planner: ['planner'],
  tidplan: ['tidplan', 'tidplanZones'],
  warehouse: ['warehouse'],
  bins: ['bins'],
  storeCatalog: ['store'],
  storeSettings: ['store'],
  adminUsers: ['admins', 'guestPermissions', 'binPermissions', 'adminRemovalNotices'],
};

function normalizeModuleStateTarget(value) {
  const target = sanitizeString(value || '', 80);
  return MODULE_STATE_TARGETS.has(target) ? target : '';
}

function getModuleVersionContainer(state, target) {
  if (!state.moduleVersions || typeof state.moduleVersions !== 'object' || Array.isArray(state.moduleVersions)) {
    state.moduleVersions = {};
  }
  if (target === 'adminUsers') {
    state.moduleVersions.adminUsers = Math.max(1, Number(state.moduleVersions.adminUsers || 1));
    return state.moduleVersions;
  }
  if (!state.moduleVersions[target] || typeof state.moduleVersions[target] !== 'object' || Array.isArray(state.moduleVersions[target])) {
    state.moduleVersions[target] = {};
  }
  return state.moduleVersions[target];
}

function getModuleStateVersion(state, target, site) {
  if (!state || typeof state !== 'object') return 1;
  const versions = state.moduleVersions && typeof state.moduleVersions === 'object' ? state.moduleVersions : {};
  if (target === 'adminUsers') return Math.max(1, Number(versions.adminUsers || 1));
  const siteVersions = versions[target] && typeof versions[target] === 'object' ? versions[target] : {};
  return Math.max(1, Number(siteVersions[site] || 1));
}

function bumpModuleStateVersion(state, target, site) {
  const current = getModuleStateVersion(state, target, site);
  const next = current + 1;
  const container = getModuleVersionContainer(state, target);
  if (target === 'adminUsers') {
    container.adminUsers = next;
  } else {
    container[site] = next;
  }
  return next;
}

function createModuleConflictError(target, site, currentVersion, submittedVersion) {
  const error = new Error('MODULE_VERSION_CONFLICT');
  error.statusCode = 409;
  error.code = 'MODULE_VERSION_CONFLICT';
  error.target = target;
  error.site = site || null;
  error.currentVersion = Math.max(1, Number(currentVersion || 1));
  error.submittedVersion = Math.max(1, Number(submittedVersion || 1));
  return error;
}

function rejectUnexpectedModulePayloadKeys(target, payload) {
  const allowed = new Set(MODULE_STATE_ALLOWED_PAYLOAD_KEYS[target] || []);
  const keys = Object.keys(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {});
  return keys.filter((key) => !allowed.has(key));
}

function getEntityConflictError({ entityType, entityId, conflicts, serverEntity }) {
  const error = new Error('ENTITY_VERSION_CONFLICT');
  error.statusCode = 409;
  error.code = 'ENTITY_VERSION_CONFLICT';
  error.entityType = entityType;
  error.entityId = entityId;
  error.conflicts = conflicts;
  error.serverEntity = serverEntity;
  return error;
}

function normalizeVersionedEntity(row, fallbackId, actorEmail = '') {
  const source = row && typeof row === 'object' ? row : {};
  const now = new Date().toISOString();
  const fieldVersions = source.fieldVersions && typeof source.fieldVersions === 'object' && !Array.isArray(source.fieldVersions)
    ? { ...source.fieldVersions }
    : {};
  const version = Math.max(1, Number(source.rowVersion || source.activityVersion || source.version || 1));
  return {
    ...source,
    id: sanitizeString(source.id || fallbackId, 140) || fallbackId,
    updatedAt: sanitizeString(source.updatedAt || now, 80),
    updatedBy: sanitizeString(source.updatedBy || actorEmail || '', 160),
    rowVersion: Math.max(1, Number(source.rowVersion || version)),
    activityVersion: Math.max(1, Number(source.activityVersion || version)),
    fieldVersions,
  };
}

function normalizePlannerRowsForDate(rows, site, date, actorEmail = '') {
  return (Array.isArray(rows) ? rows : []).map((row, index) =>
    normalizeVersionedEntity(row, `planner_row_${String(date || 'date').replace(/[^a-zA-Z0-9]+/g, '_')}_${index + 1}`, actorEmail));
}

function normalizePlannerDocumentForEntityMerge(planner, site, actorEmail = '') {
  const source = planner && typeof planner === 'object' ? planner : {};
  const dailyData = source.dailyData && typeof source.dailyData === 'object' ? source.dailyData : {};
  const nextDaily = {};
  Object.entries(dailyData).forEach(([date, day]) => {
    const entry = day && typeof day === 'object' ? { ...day } : {};
    entry.planningRows = normalizePlannerRowsForDate(entry.planningRows, site, date, actorEmail);
    nextDaily[date] = entry;
  });
  return { ...source, dailyData: nextDaily };
}

function normalizeTidplanActivitiesForEntityMerge(tidplan, site, actorEmail = '') {
  return (Array.isArray(tidplan) ? tidplan : []).map((activity, index) =>
    normalizeVersionedEntity(activity, `tidplan_activity_${index + 1}`, actorEmail));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function unwrapStateEnvelope(rawState) {
  let state = rawState;
  for (let depth = 0; depth < 3; depth += 1) {
    if (
      isPlainObject(state) &&
      Object.prototype.hasOwnProperty.call(state, 'data') &&
      isPlainObject(state.data) &&
      (
        state.data.version === 2 ||
        Array.isArray(state.data.sites) ||
        isPlainObject(state.data.siteData) ||
        isPlainObject(state.data.data)
      )
    ) {
      state = state.data;
      continue;
    }
    break;
  }
  return state;
}

function buildDefaultRuntimeState() {
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    workers: [],
    lifts: [],
    moments: [],
    plans: [],
    karnas: [],
    dailyData: {},
    guestPermissions: { ...DEFAULT_GUEST_PERMISSIONS },
    accountNotifications: {},
    moduleVersions: {},
    siteData: {
      default: {},
    },
    sites: ['default'],
    currentSite: 'default',
  };
}

function normalizeRuntimeState(rawState) {
  const unwrapped = unwrapStateEnvelope(rawState);
  const source = isPlainObject(unwrapped) ? { ...unwrapped } : {};
  const next = {
    ...buildDefaultRuntimeState(),
    ...source,
  };

  next.version = 2;
  next.accountNotifications = isPlainObject(source.accountNotifications) ? source.accountNotifications : {};
  next.moduleVersions = isPlainObject(source.moduleVersions) ? source.moduleVersions : {};
  next.guestPermissions = isPlainObject(source.guestPermissions)
    ? source.guestPermissions
    : { ...DEFAULT_GUEST_PERMISSIONS };

  const sourceSiteData = isPlainObject(source.siteData) ? { ...source.siteData } : {};
  const derivedSites = Array.isArray(source.sites)
    ? source.sites.map((site) => sanitizeString(site, 80)).filter(Boolean)
    : [];
  Object.keys(sourceSiteData).forEach((site) => {
    const safeSite = sanitizeString(site, 80);
    if (safeSite && !derivedSites.includes(safeSite)) derivedSites.push(safeSite);
  });
  const currentSite = sanitizeString(source.currentSite || derivedSites[0] || 'default', 80) || 'default';
  if (!derivedSites.includes(currentSite)) derivedSites.unshift(currentSite);
  if (!derivedSites.length) derivedSites.push('default');

  const siteData = {};
  derivedSites.forEach((site) => {
    siteData[site] = isPlainObject(sourceSiteData[site]) ? { ...sourceSiteData[site] } : {};
  });

  const hasLegacyTopLevelData =
    isPlainObject(source.dailyData) ||
    ['workers', 'lifts', 'moments', 'plans', 'karnas', 'resourceHistory'].some((key) => Array.isArray(source[key])) ||
    Array.isArray(source.tidplan) ||
    Array.isArray(source.tidplanZones) ||
    isPlainObject(source.binsData) ||
    isPlainObject(source.bins) ||
    isPlainObject(source.warehouse) ||
    isPlainObject(source.warehouseData) ||
    isPlainObject(source.store) ||
    Array.isArray(source.reports) ||
    Array.isArray(source.notifications);

  if (hasLegacyTopLevelData) {
    const legacySite = currentSite || 'default';
    const entry = isPlainObject(siteData[legacySite]) ? { ...siteData[legacySite] } : {};
    if (!entry.planner) {
      entry.planner = {
        workers: Array.isArray(source.workers) ? source.workers : [],
        lifts: Array.isArray(source.lifts) ? source.lifts : [],
        moments: Array.isArray(source.moments) ? source.moments : [],
        plans: Array.isArray(source.plans) ? source.plans : [],
        karnas: Array.isArray(source.karnas) ? source.karnas : [],
        dailyData: isPlainObject(source.dailyData) ? source.dailyData : {},
        resourceHistory: Array.isArray(source.resourceHistory) ? source.resourceHistory : [],
      };
    }
    if (!entry.bins && (isPlainObject(source.bins) || isPlainObject(source.binsData))) {
      entry.bins = isPlainObject(source.bins) ? source.bins : source.binsData;
    }
    if (!entry.tidplan && Array.isArray(source.tidplan)) entry.tidplan = source.tidplan;
    if (!entry.tidplanZones && Array.isArray(source.tidplanZones)) entry.tidplanZones = source.tidplanZones;
    if (!entry.warehouse && (isPlainObject(source.warehouse) || isPlainObject(source.warehouseData))) {
      entry.warehouse = isPlainObject(source.warehouse) ? source.warehouse : source.warehouseData;
    }
    if (!entry.store && isPlainObject(source.store)) entry.store = source.store;
    if (!entry.reports && Array.isArray(source.reports)) entry.reports = source.reports;
    if (!entry.notifications && Array.isArray(source.notifications)) entry.notifications = source.notifications;
    siteData[legacySite] = entry;
  }

  next.sites = derivedSites;
  next.currentSite = derivedSites.includes(currentSite) ? currentSite : derivedSites[0];
  next.siteData = siteData;
  return next;
}

function sanitizeChangedFields(fields) {
  const source = fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {};
  const blocked = new Set(['id', 'rowVersion', 'activityVersion', 'version', 'updatedAt', 'updatedBy', 'fieldVersions']);
  const next = {};
  Object.entries(source).forEach(([key, value]) => {
    const cleanKey = sanitizeString(key, 80);
    if (!cleanKey || blocked.has(cleanKey)) return;
    next[cleanKey] = value;
  });
  return sanitizeObject(next);
}

function mergeEntityFields(entity, changedFields, baseFieldVersions, actorEmail, versionKey) {
  const now = new Date().toISOString();
  const next = { ...entity };
  const fieldVersions = entity.fieldVersions && typeof entity.fieldVersions === 'object' && !Array.isArray(entity.fieldVersions)
    ? { ...entity.fieldVersions }
    : {};
  const baseVersions = baseFieldVersions && typeof baseFieldVersions === 'object' && !Array.isArray(baseFieldVersions)
    ? baseFieldVersions
    : {};
  const conflicts = [];
  Object.entries(changedFields).forEach(([field, value]) => {
    const serverFieldVersion = Math.max(0, Number(fieldVersions[field] || 0));
    const submittedFieldVersion = Math.max(0, Number(baseVersions[field] || 0));
    if (serverFieldVersion > submittedFieldVersion) {
      conflicts.push({
        field,
        serverValue: entity[field],
        clientValue: value,
        serverFieldVersion,
        submittedFieldVersion,
      });
      return;
    }
    next[field] = value;
    fieldVersions[field] = serverFieldVersion + 1;
  });
  if (conflicts.length) return { conflicts, entity };
  const currentVersion = Math.max(1, Number(entity[versionKey] || entity.rowVersion || entity.activityVersion || 1));
  next[versionKey] = currentVersion + 1;
  if (versionKey === 'rowVersion') next.activityVersion = Math.max(1, Number(next.activityVersion || next[versionKey]));
  if (versionKey === 'activityVersion') next.rowVersion = Math.max(1, Number(next.rowVersion || next[versionKey]));
  next.updatedAt = now;
  next.updatedBy = actorEmail;
  next.fieldVersions = fieldVersions;
  return { conflicts: [], entity: next };
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

function mirrorPlannerListsToSiteEntry(entry) {
  const planner = entry?.planner && typeof entry.planner === 'object' ? entry.planner : {};
  ['workers', 'lifts', 'moments', 'plans', 'karnas'].forEach((field) => {
    entry[field] = Array.isArray(planner[field]) ? planner[field] : [];
  });
  return entry;
}

function normalizeSiteEntryForScopeChecksum(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const copy = { ...entry };
  return mirrorPlannerListsToSiteEntry(copy);
}

function sanitizeStoreCartRecord(cart) {
  const source = cart && typeof cart === 'object' ? cart : {};
  const itemsSource = Array.isArray(source.items) ? source.items : [];
  return {
    items: itemsSource.slice(0, 300).map((item) => {
      const row = item && typeof item === 'object' ? item : {};
      return {
        productId: sanitizeString(row.productId || '', 120),
        variantId: sanitizeString(row.variantId || '', 120),
        variantName: sanitizeString(row.variantName || '', 200),
        size: sanitizeString(row.size || '', 80),
        quantity: Math.max(1, Math.min(999, Math.floor(Number(row.quantity) || 1))),
        comment: sanitizeString(row.comment || '', 800),
        useUpgrade: row.useUpgrade === true,
      };
    }).filter((item) => item.productId),
    comment: sanitizeString(source.comment || '', 1200),
    urgent: source.urgent === true,
    updatedAt: sanitizeString(source.updatedAt || new Date().toISOString(), 80),
  };
}

function sanitizeStorePasswordResetRequest(request) {
  const source = request && typeof request === 'object' ? request : {};
  const status = sanitizeString(source.status || 'pending', 30).toLowerCase();
  return {
    id: sanitizeString(source.id || `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, 120),
    userEmail: sanitizeString(source.userEmail || '', 160).toLowerCase(),
    requestedBy: sanitizeString(source.requestedBy || '', 160).toLowerCase(),
    requestedAt: sanitizeString(source.requestedAt || new Date().toISOString(), 80),
    status: ['pending', 'approved', 'rejected'].includes(status) ? status : 'pending',
    approvedAt: sanitizeString(source.approvedAt || '', 80),
    approvedBy: sanitizeString(source.approvedBy || '', 160).toLowerCase(),
    rejectedAt: sanitizeString(source.rejectedAt || '', 80),
    rejectedBy: sanitizeString(source.rejectedBy || '', 160).toLowerCase(),
    generatedPassword: sanitizeString(source.generatedPassword || '', 180),
  };
}

function canManageStoreCatalogState(session) {
  return canManageStoreOrders(session);
}

function canManageStoreBudgetState(session) {
  return canManageStoreOrders(session) ||
    canWriteStateField(session, 'canManageStoreBudgets') ||
    canWriteStateField(session, 'canManageWorkwearCredits');
}

function canManageStoreRulesState(session) {
  return canManageStoreOrders(session) ||
    canWriteStateField(session, 'canManageStoreRules') ||
    canWriteStateField(session, 'canManageWorkwearSettings');
}

function mergeStoreStateForSession(previousStore, submittedStore, session, site) {
  const previous = previousStore && typeof previousStore === 'object' ? previousStore : {};
  const submitted = submittedStore && typeof submittedStore === 'object' ? submittedStore : {};
  const next = { ...previous };
  const actorEmail = sanitizeString(session?.email || '', 160).toLowerCase();
  const deniedFields = [];
  const appliedFields = [];
  const deniedChangedFields = [];
  const managerCanCatalog = canManageStoreCatalogState(session);
  const managerCanBudget = canManageStoreBudgetState(session);
  const managerCanRules = canManageStoreRulesState(session);
  const managerCanOrderOps = canManageStoreOrders(session);

  const trackDenied = (fieldName) => {
    deniedFields.push(fieldName);
    if (stableJson(canonicalize(previous?.[fieldName])) !== stableJson(canonicalize(submitted?.[fieldName]))) {
      deniedChangedFields.push(fieldName);
    }
  };

  if (Array.isArray(submitted.products)) {
    if (managerCanCatalog) {
      next.products = sanitizeObject(submitted.products);
      appliedFields.push('products');
    } else {
      trackDenied('products');
    }
  }

  if (submitted.settings && typeof submitted.settings === 'object') {
    if (managerCanRules) {
      next.settings = sanitizeObject(submitted.settings);
      appliedFields.push('settings');
    } else {
      trackDenied('settings');
    }
  }

  if (Array.isArray(submitted.orders)) {
    if (session?.isSuperAdmin) {
      next.orders = sanitizeObject(submitted.orders);
      appliedFields.push('orders:superadmin');
    } else {
      // Orders are server-authoritative and cannot be overwritten via /api/state.
      trackDenied('orders');
    }
  }

  if (submitted.carts && typeof submitted.carts === 'object') {
    if (managerCanOrderOps) {
      const carts = {};
      Object.entries(submitted.carts).forEach(([email, cart]) => {
        const key = sanitizeString(email, 160).toLowerCase();
        if (!key) return;
        carts[key] = sanitizeStoreCartRecord(cart);
      });
      next.carts = carts;
      appliedFields.push('carts');
    } else if (actorEmail && submitted.carts[actorEmail]) {
      const previousCarts = previous.carts && typeof previous.carts === 'object' ? { ...previous.carts } : {};
      previousCarts[actorEmail] = sanitizeStoreCartRecord(submitted.carts[actorEmail]);
      next.carts = previousCarts;
      appliedFields.push('carts:own');
    } else {
      trackDenied('carts');
    }
  }

  if (submitted.workerProfiles && typeof submitted.workerProfiles === 'object') {
    if (managerCanBudget) {
      next.workerProfiles = sanitizeObject(submitted.workerProfiles);
      appliedFields.push('workerProfiles');
    } else if (actorEmail && submitted.workerProfiles[actorEmail]) {
      const previousProfiles = previous.workerProfiles && typeof previous.workerProfiles === 'object'
        ? { ...previous.workerProfiles }
        : {};
      const existing = previousProfiles[actorEmail] && typeof previousProfiles[actorEmail] === 'object'
        ? { ...previousProfiles[actorEmail] }
        : {};
      const incoming = submitted.workerProfiles[actorEmail] && typeof submitted.workerProfiles[actorEmail] === 'object'
        ? submitted.workerProfiles[actorEmail]
        : {};
      existing.workerName = sanitizeString(incoming.workerName || existing.workerName || actorEmail, 200);
      existing.savedSizes = sanitizeObject(incoming.savedSizes && typeof incoming.savedSizes === 'object' ? incoming.savedSizes : {});
      previousProfiles[actorEmail] = existing;
      next.workerProfiles = previousProfiles;
      appliedFields.push('workerProfiles:own');
    } else {
      trackDenied('workerProfiles');
    }
  }

  if (Array.isArray(submitted.creditLedger)) {
    if (managerCanBudget) {
      next.creditLedger = sanitizeObject(submitted.creditLedger);
      appliedFields.push('creditLedger');
    } else {
      trackDenied('creditLedger');
    }
  }

  if (Array.isArray(submitted.passwordResetRequests)) {
    if (session?.isSuperAdmin) {
      next.passwordResetRequests = submitted.passwordResetRequests
        .slice(-2000)
        .map((entry) => sanitizeStorePasswordResetRequest(entry));
      appliedFields.push('passwordResetRequests');
    } else {
      const previousRequests = Array.isArray(previous.passwordResetRequests) ? previous.passwordResetRequests.slice() : [];
      const recentOwnPending = previousRequests.filter((entry) => {
        const email = sanitizeString(entry?.userEmail || '', 160).toLowerCase();
        const status = sanitizeString(entry?.status || '', 30).toLowerCase();
        const ts = new Date(entry?.requestedAt || 0).getTime();
        return email === actorEmail && status === 'pending' && Number.isFinite(ts) && (Date.now() - ts) < (15 * 60 * 1000);
      });
      if (recentOwnPending.length >= 5) {
        throw createStoreValidationError('PASSWORD_RESET_RATE_LIMIT', 429, actorEmail);
      }
      const previousById = new Set(previousRequests.map((entry) => sanitizeString(entry?.id || '', 120)).filter(Boolean));
      const additions = submitted.passwordResetRequests
        .map((entry) => sanitizeStorePasswordResetRequest(entry))
        .filter((entry) => entry.userEmail === actorEmail && entry.requestedBy === actorEmail && entry.status === 'pending')
        .filter((entry) => !previousById.has(entry.id))
        .slice(0, 5);
      if (additions.length > 0) {
        next.passwordResetRequests = [...previousRequests, ...additions].slice(-2000);
        appliedFields.push('passwordResetRequests:own');
      } else {
        trackDenied('passwordResetRequests');
      }
    }
  }

  if (Array.isArray(submitted.notificationEvents)) {
    if (managerCanOrderOps) {
      next.notificationEvents = sanitizeObject(submitted.notificationEvents);
      appliedFields.push('notificationEvents');
    } else {
      trackDenied('notificationEvents');
    }
  }

  if (Array.isArray(submitted.auditLog)) {
    if (managerCanOrderOps) {
      next.auditLog = sanitizeObject(submitted.auditLog);
      appliedFields.push('auditLog');
    } else {
      trackDenied('auditLog');
    }
  }

  if (Array.isArray(submitted.supplierConnections)) {
    if (managerCanCatalog) {
      next.supplierConnections = sanitizeObject(submitted.supplierConnections);
      appliedFields.push('supplierConnections');
    } else {
      trackDenied('supplierConnections');
    }
  }

  if (Array.isArray(submitted.supplierSyncLog)) {
    if (managerCanCatalog) {
      next.supplierSyncLog = sanitizeObject(submitted.supplierSyncLog);
      appliedFields.push('supplierSyncLog');
    } else {
      trackDenied('supplierSyncLog');
    }
  }

  if (submitted.meta && typeof submitted.meta === 'object') {
    const mergedMeta = next.meta && typeof next.meta === 'object' ? { ...next.meta } : {};
    mergedMeta.updatedAt = new Date().toISOString();
    mergedMeta.updatedBy = actorEmail || 'system';
    mergedMeta.site = sanitizeString(site || '', 80);
    next.meta = mergedMeta;
  }

  return { store: next, deniedFields, deniedChangedFields, appliedFields };
}

function mergeStateForSession(previousState, submittedState, session) {
  const previous = previousState && typeof previousState === 'object' ? previousState : {};
  const submitted = submittedState && typeof submittedState === 'object' ? submittedState : {};
  const merged = {
    ...previous,
    version: Number(submitted.version) || Number(previous.version) || 2,
  };

  if (canWriteStateField(session, 'canManageSiteAccess')) {
    if (Array.isArray(submitted.sites)) {
      // Ensure sites array is never completely empty if there were sites before
      const previousSites = Array.isArray(previous.sites) ? previous.sites : [];
      const nextSites = submitted.sites.filter(s => typeof s === 'string' && s.length > 0);
      const preservedSites = previousSites.filter((site) => !canAccessSite(session, site));
      const mergedSiteSet = new Set(preservedSites);
      nextSites.forEach((site) => mergedSiteSet.add(site));
      const scopedNextSites = Array.from(mergedSiteSet);
      if (previousSites.length > 0 && scopedNextSites.length === 0) {
        // Keep previous sites if trying to set empty array (protection against accidental wipe)
        merged.sites = previousSites;
      } else {
        merged.sites = scopedNextSites.length > 0 ? scopedNextSites : (previousSites.length > 0 ? previousSites : ['default']);
      }
    }
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

  const sessionEmail = sanitizeString(session?.email || '', 160).toLowerCase();
  const previousAccountNotifications = previous.accountNotifications && typeof previous.accountNotifications === 'object'
    ? previous.accountNotifications
    : {};
  const submittedAccountNotifications = submitted.accountNotifications && typeof submitted.accountNotifications === 'object'
    ? submitted.accountNotifications
    : {};
  const nextAccountNotifications = { ...previousAccountNotifications };
  if (sessionEmail && submittedAccountNotifications[sessionEmail]) {
    nextAccountNotifications[sessionEmail] = sanitizeObject(submittedAccountNotifications[sessionEmail]);
  }
  if (canWriteStateField(session, 'canManageAdmins')) {
    Object.entries(submittedAccountNotifications).forEach(([email, bundle]) => {
      const key = sanitizeString(email, 160).toLowerCase();
      if (!key) return;
      nextAccountNotifications[key] = sanitizeObject(bundle);
    });
  }
  merged.accountNotifications = nextAccountNotifications;

  const previousSiteData = previous.siteData && typeof previous.siteData === 'object' ? previous.siteData : {};
  const submittedSiteData = submitted.siteData && typeof submitted.siteData === 'object' ? submitted.siteData : {};
  const nextSiteData = { ...previousSiteData };
  const storeSecurityEvents = [];

  if (canWriteStateField(session, 'canManageSiteAccess') && Array.isArray(submitted.sites)) {
    const activeSiteIds = new Set(Array.isArray(merged.sites) ? merged.sites : []);
    Object.keys(nextSiteData).forEach((site) => {
      if (!activeSiteIds.has(site) && canAccessSite(session, site)) {
        delete nextSiteData[site];
      }
    });
  }

  Object.entries(submittedSiteData).forEach(([rawSite, submittedEntry]) => {
    const site = sanitizeString(rawSite, 80);
    if (!site || !canAccessSite(session, site)) return;
    if (Array.isArray(merged.sites) && !merged.sites.includes(site)) return;
    const previousEntry = previousSiteData[site] && typeof previousSiteData[site] === 'object' ? previousSiteData[site] : {};
    const entry = { ...previousEntry };
    const incoming = submittedEntry && typeof submittedEntry === 'object' ? submittedEntry : {};

    if (incoming.planner && typeof incoming.planner === 'object') {
      entry.planner = mergePlannerStateForSession(previousEntry.planner, incoming.planner, session);
    }
    mirrorPlannerListsToSiteEntry(entry);
    if (canWriteBinsState(session) && incoming.bins) entry.bins = incoming.bins;
    if (canWriteTidplanState(session)) {
      if (incoming.tidplan && canWriteStateField(session, 'canManageTidplan')) entry.tidplan = incoming.tidplan;
      if (incoming.tidplanZones && canWriteStateField(session, 'canManageTidplanZones')) entry.tidplanZones = incoming.tidplanZones;
    }
    if (canWriteStateField(session, 'canManageWarehouse') && incoming.warehouse) {
      entry.warehouse = incoming.warehouse;
    }
    if ((canWriteStateField(session, 'canAccessStore') || canWriteStateField(session, 'canAccessWorkwear')) && incoming.store) {
      const mergedStoreResult = mergeStoreStateForSession(previousEntry.store, incoming.store, session, site);
      entry.store = mergedStoreResult.store;
      if (mergedStoreResult.appliedFields.length > 0) {
        storeSecurityEvents.push({
          site,
          type: 'store_applied',
          fields: mergedStoreResult.appliedFields,
        });
      }
      if (mergedStoreResult.deniedChangedFields.length > 0) {
        storeSecurityEvents.push({
          site,
          type: 'store_denied',
          fields: mergedStoreResult.deniedChangedFields,
        });
      }
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
  if (storeSecurityEvents.length > 0) {
    merged.__storeSecurityEvents = storeSecurityEvents;
  }
  return merged;
}

async function logActivity(userEmail, action, details = {}) {
  try {
    const cleanEmail = sanitizeString(userEmail || 'unknown', 160).toLowerCase();
    let userName = '';
    if (cleanEmail && cleanEmail !== 'unknown') {
      const admins = await readAdmins().catch(() => []);
      const admin = admins.find((entry) => entry.email === cleanEmail);
      userName = admin?.fullName || '';
    }
    await mutateVersionedJsonFile(logsFile, [], async (logs) => {
      const nextLogs = Array.isArray(logs) ? [...logs] : [];
      nextLogs.push({
        timestamp: new Date().toISOString(),
        user: cleanEmail,
        userName: sanitizeString(userName || cleanEmail, 180),
        action: sanitizeString(action || 'unknown', 160),
        details: redactSensitiveObject(sanitizeObject(details)),
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
        details: redactSensitiveObject(sanitizeObject(details)),
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
    ...buildDefaultRuntimeState(),
    savedAt: new Date().toISOString(),
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
  await dataStorage.ensureJsonFile(siteChatFile, createEmptySiteChatDocument());

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

const storePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.STORE_PASSWORD_CONFIRM_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password confirmation requests' },
  skip: (req) => req.method !== 'POST',
});

/**
 * CORS FIX (RAILWAY + DEV SAFE)
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
    if (!req.body || typeof req.body !== 'object') {
      console.warn('[login] malformed request body');
      return res.status(400).json({
        error: 'LOGIN_BODY_INVALID',
        message: 'Login request must include email and password.',
      });
    }
    const email = sanitizeString(req.body?.email || '', 160).toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      console.warn('[login] missing email or password');
      return res.status(400).json({
        error: 'LOGIN_MISSING_FIELDS',
        message: 'Email and password are required.',
      });
    }
    if (!isValidEmail(email) || password.length > 200) {
      console.warn(`[login] invalid login payload for ${email || 'unknown'}`);
      return res.status(400).json({
        error: 'LOGIN_BODY_INVALID',
        message: 'Email or password format is invalid.',
      });
    }

    const admins = await readAdmins();
    const admin = admins.find((entry) => entry.email === email);
    if (!admin) {
      await logActivity(email, 'login', { success: false });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (admin.active === false) {
      await logActivity(email, 'login', { success: false, reason: 'inactive_account' });
      return res.status(403).json({ error: 'Account is inactive' });
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
      isReadonly: admin.isReadonly === true,
      permissions: normalizePermissions(admin.permissions),
      allowedSites: admin.allowedSites,
      level: admin.level,
      storeRoles: admin.storeRoles,
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

apiRouter.get('/site-chat/sites', async (req, res, next) => {
  try {
    if (!canAccessSiteChat(req.session)) return res.status(403).json({ error: 'Forbidden' });
    const state = await getState();
    const accessibleSites = getAccessibleSiteListFromState(state, req.session);
    const doc = await getSiteChatDocument();
    const sitesPayload = accessibleSites.map((site) => buildSiteChatListEntry(site, ensureSiteChatSite(doc, site), req.session));
    return res.json({
      sites: sitesPayload,
      canModerate: canModerateSiteChat(req.session),
      messageLimit: SITE_CHAT_MAX_MESSAGE_LENGTH,
      attachmentMaxBytes: SITE_CHAT_ATTACHMENT_MAX_SIZE,
    });
  } catch (error) {
    return next(error);
  }
});

apiRouter.get('/site-chat/unread', async (req, res, next) => {
  try {
    if (!canAccessSiteChat(req.session)) return res.status(403).json({ error: 'Forbidden' });
    const state = await getState();
    const accessibleSites = getAccessibleSiteListFromState(state, req.session);
    const doc = await getSiteChatDocument();
    const unread = {};
    accessibleSites.forEach((site) => {
      unread[site] = getSiteChatUnreadForSite(ensureSiteChatSite(doc, site), req.session);
    });
    return res.json({ unread, total: Object.values(unread).reduce((sum, count) => sum + (Number(count) || 0), 0) });
  } catch (error) {
    return next(error);
  }
});

apiRouter.get('/site-chat/:siteId/messages', async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) return res.status(403).json({ error: 'Forbidden' });
    const state = await getState();
    if (!getAccessibleSiteListFromState(state, req.session).includes(site)) return res.status(404).json({ error: 'Site chat not found' });
    const doc = await getSiteChatDocument();
    const siteEntry = ensureSiteChatSite(doc, site);
    const page = paginateSiteChatMessages(siteEntry.messages, req.query.limit, req.query.before);
    return res.json({
      site,
      messages: page.messages.map(buildSafeSiteChatMessage),
      hasMore: page.hasMore,
      nextBefore: page.nextBefore,
      unreadCount: getSiteChatUnreadForSite(siteEntry, req.session),
      settings: siteEntry.settings,
      canModerate: canModerateSiteChat(req.session),
    });
  } catch (error) {
    return next(error);
  }
});

apiRouter.post('/site-chat/:siteId/upload', siteChatUploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) {
      if (req.file?.path) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const mimeType = sanitizeString(req.file.mimetype || '', 160).toLowerCase();
    if (!SITE_CHAT_ALLOWED_MIME_TYPES.has(mimeType) || Number(req.file.size) > SITE_CHAT_ATTACHMENT_MAX_SIZE) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      await logActivity(req.session.email, 'site_chat_upload_rejected', {
        site,
        mimeType,
        size: req.file.size,
      });
      return res.status(400).json({ error: 'CHAT_UPLOAD_REJECTED' });
    }
    const kind = mimeType.startsWith('image/') ? 'image' : mimeType === 'application/pdf' ? 'pdf' : 'document';
    return res.json({
      attachment: {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: kind,
        fileName: sanitizeString(req.file.originalname || req.file.filename || 'attachment', 240),
        mimeType,
        size: req.file.size,
        url: getUploadUrl(req.file.path),
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return next(error);
  }
});

apiRouter.post('/site-chat/:siteId/messages', siteChatMessageLimiter, async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) return res.status(403).json({ error: 'Forbidden' });
    const state = await getState();
    if (!getAccessibleSiteListFromState(state, req.session).includes(site)) return res.status(404).json({ error: 'Site chat not found' });
    const admins = await readAdmins();
    const currentAdmin = admins.find((admin) => admin.email === sanitizeString(req.session.email || '', 160).toLowerCase());
    const draft = normalizeSiteChatDraft(req.body || {});
    let savedMessage = null;
    let replyTo = null;
    await mutateSiteChatDocument((doc) => {
      const siteEntry = ensureSiteChatSite(doc, site);
      if (isSiteChatLockedForWrites(siteEntry, req.session)) {
        const error = new Error('CHAT_LOCKED');
        error.statusCode = 403;
        throw error;
      }
      if (draft.replyToMessageId) {
        replyTo = siteEntry.messages.find((message) => message.id === draft.replyToMessageId && !message.deletedAt) || null;
        if (!replyTo) {
          const error = new Error('CHAT_REPLY_NOT_FOUND');
          error.statusCode = 400;
          throw error;
        }
      }
      const now = new Date().toISOString();
      const message = normalizeSiteChatMessage({
        id: `chat_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
        siteId: site,
        authorEmail: sanitizeString(req.session.email || '', 160).toLowerCase(),
        authorName: sanitizeString(req.session.fullName || currentAdmin?.fullName || req.session.email || 'Unknown', 180),
        authorFunctions: normalizeStoreRoleListServer(req.session.storeRoles || currentAdmin?.storeRoles || getAdminFunctionBadges(currentAdmin || {})),
        text: draft.text,
        attachments: draft.attachments,
        replyToMessageId: draft.replyToMessageId,
        mentions: extractSiteChatMentionEmails(draft.text, site, admins),
        createdAt: now,
        updatedAt: now,
      }, site);
      siteEntry.messages.push(message);
      siteEntry.messages = siteEntry.messages.slice(-SITE_CHAT_MAX_MESSAGES_PER_SITE);
      siteEntry.readState[message.authorEmail] = {
        lastReadAt: message.createdAt,
        lastReadMessageId: message.id,
      };
      savedMessage = message;
      return doc;
    });
    if (savedMessage) {
      await notifySiteChatRecipients({ site, message: savedMessage, admins, replyTo });
    }
    return res.status(201).json({ message: buildSafeSiteChatMessage(savedMessage) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return next(error);
  }
});

apiRouter.patch('/site-chat/:siteId/messages/:messageId', async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    const messageId = sanitizeString(req.params.messageId || '', 120);
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) return res.status(403).json({ error: 'Forbidden' });
    const text = sanitizeString(req.body?.text || '', SITE_CHAT_MAX_MESSAGE_LENGTH);
    if (!text) return res.status(400).json({ error: 'CHAT_MESSAGE_EMPTY' });
    const admins = await readAdmins();
    let savedMessage = null;
    await mutateSiteChatDocument((doc) => {
      const siteEntry = ensureSiteChatSite(doc, site);
      const message = siteEntry.messages.find((entry) => entry.id === messageId);
      if (!message) {
        const error = new Error('CHAT_MESSAGE_NOT_FOUND');
        error.statusCode = 404;
        throw error;
      }
      if (!canEditSiteChatMessage(message, req.session)) {
        const error = new Error('CHAT_EDIT_FORBIDDEN');
        error.statusCode = 403;
        throw error;
      }
      message.text = text;
      message.mentions = extractSiteChatMentionEmails(text, site, admins);
      message.editedAt = new Date().toISOString();
      message.updatedAt = message.editedAt;
      savedMessage = message;
      return doc;
    });
    return res.json({ message: buildSafeSiteChatMessage(savedMessage) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return next(error);
  }
});

apiRouter.delete('/site-chat/:siteId/messages/:messageId', async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    const messageId = sanitizeString(req.params.messageId || '', 120);
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) return res.status(403).json({ error: 'Forbidden' });
    let savedMessage = null;
    let moderation = false;
    await mutateSiteChatDocument((doc) => {
      const siteEntry = ensureSiteChatSite(doc, site);
      const message = siteEntry.messages.find((entry) => entry.id === messageId);
      if (!message) {
        const error = new Error('CHAT_MESSAGE_NOT_FOUND');
        error.statusCode = 404;
        throw error;
      }
      const canModerate = canModerateSiteChat(req.session);
      if (!canModerate && !canDeleteOwnSiteChatMessage(message, req.session)) {
        siteEntry.auditLog.push({
          id: `chat_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          at: new Date().toISOString(),
          actor: sanitizeString(req.session.email || '', 160).toLowerCase(),
          action: 'permission_denied_delete',
          messageId,
          details: { site },
        });
        const error = new Error('CHAT_DELETE_FORBIDDEN');
        error.statusCode = 403;
        throw error;
      }
      moderation = canModerate && !isSiteChatMessageOwner(message, req.session);
      message.deletedAt = message.deletedAt || new Date().toISOString();
      message.deletedBy = sanitizeString(req.session.email || '', 160).toLowerCase();
      message.deleteReason = moderation ? 'admin_delete' : 'owner_delete';
      message.updatedAt = message.deletedAt;
      savedMessage = message;
      if (moderation) {
        siteEntry.auditLog.push({
          id: `chat_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          at: new Date().toISOString(),
          actor: message.deletedBy,
          action: 'admin_delete_message',
          messageId,
          details: { site, author: message.authorEmail },
        });
      }
      return doc;
    });
    if (moderation) {
      await logActivity(req.session.email, 'site_chat_admin_delete', { site, messageId });
    }
    return res.json({ message: buildSafeSiteChatMessage(savedMessage) });
  } catch (error) {
    if (error.statusCode) {
      if (error.message === 'CHAT_DELETE_FORBIDDEN') {
        await logActivity(req.session?.email, 'site_chat_permission_denied_delete', {
          site: req.params.siteId,
          messageId: req.params.messageId,
        });
      }
      return res.status(error.statusCode).json({ error: error.message });
    }
    return next(error);
  }
});

apiRouter.post('/site-chat/:siteId/messages/:messageId/reactions', async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    const messageId = sanitizeString(req.params.messageId || '', 120);
    const reaction = sanitizeString(req.body?.reaction || '', 20);
    if (!SITE_CHAT_ALLOWED_REACTIONS.includes(reaction)) return res.status(400).json({ error: 'CHAT_REACTION_INVALID' });
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) return res.status(403).json({ error: 'Forbidden' });
    let savedMessage = null;
    await mutateSiteChatDocument((doc) => {
      const siteEntry = ensureSiteChatSite(doc, site);
      const message = siteEntry.messages.find((entry) => entry.id === messageId && !entry.deletedAt);
      if (!message) {
        const error = new Error('CHAT_MESSAGE_NOT_FOUND');
        error.statusCode = 404;
        throw error;
      }
      const user = sanitizeString(req.session.email || '', 160).toLowerCase();
      message.reactions = normalizeSiteChatReactions(message.reactions);
      const users = new Set(message.reactions[reaction] || []);
      if (users.has(user)) users.delete(user);
      else users.add(user);
      message.reactions[reaction] = Array.from(users);
      message.updatedAt = new Date().toISOString();
      savedMessage = message;
      return doc;
    });
    return res.json({ message: buildSafeSiteChatMessage(savedMessage) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return next(error);
  }
});

apiRouter.post('/site-chat/:siteId/messages/:messageId/pin', async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    const messageId = sanitizeString(req.params.messageId || '', 120);
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) return res.status(403).json({ error: 'Forbidden' });
    if (!canModerateSiteChat(req.session)) return res.status(403).json({ error: 'CHAT_MODERATION_FORBIDDEN' });
    let savedMessage = null;
    await mutateSiteChatDocument((doc) => {
      const siteEntry = ensureSiteChatSite(doc, site);
      const message = siteEntry.messages.find((entry) => entry.id === messageId && !entry.deletedAt);
      if (!message) {
        const error = new Error('CHAT_MESSAGE_NOT_FOUND');
        error.statusCode = 404;
        throw error;
      }
      message.pinned = true;
      message.pinnedAt = new Date().toISOString();
      message.pinnedBy = sanitizeString(req.session.email || '', 160).toLowerCase();
      message.updatedAt = message.pinnedAt;
      siteEntry.auditLog.push({
        id: `chat_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        at: message.pinnedAt,
        actor: message.pinnedBy,
        action: 'pin_message',
        messageId,
        details: { site },
      });
      savedMessage = message;
      return doc;
    });
    await logActivity(req.session.email, 'site_chat_pin', { site, messageId });
    return res.json({ message: buildSafeSiteChatMessage(savedMessage) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return next(error);
  }
});

apiRouter.delete('/site-chat/:siteId/messages/:messageId/pin', async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    const messageId = sanitizeString(req.params.messageId || '', 120);
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) return res.status(403).json({ error: 'Forbidden' });
    if (!canModerateSiteChat(req.session)) return res.status(403).json({ error: 'CHAT_MODERATION_FORBIDDEN' });
    let savedMessage = null;
    await mutateSiteChatDocument((doc) => {
      const siteEntry = ensureSiteChatSite(doc, site);
      const message = siteEntry.messages.find((entry) => entry.id === messageId);
      if (!message) {
        const error = new Error('CHAT_MESSAGE_NOT_FOUND');
        error.statusCode = 404;
        throw error;
      }
      message.pinned = false;
      message.pinnedAt = '';
      message.pinnedBy = '';
      message.updatedAt = new Date().toISOString();
      siteEntry.auditLog.push({
        id: `chat_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        at: message.updatedAt,
        actor: sanitizeString(req.session.email || '', 160).toLowerCase(),
        action: 'unpin_message',
        messageId,
        details: { site },
      });
      savedMessage = message;
      return doc;
    });
    await logActivity(req.session.email, 'site_chat_unpin', { site, messageId });
    return res.json({ message: buildSafeSiteChatMessage(savedMessage) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return next(error);
  }
});

apiRouter.post('/site-chat/:siteId/read', async (req, res, next) => {
  try {
    const site = sanitizeString(req.params.siteId || '', 80);
    if (!canAccessSiteChat(req.session) || !canAccessSite(req.session, site)) return res.status(403).json({ error: 'Forbidden' });
    const email = sanitizeString(req.session.email || '', 160).toLowerCase();
    const messageId = sanitizeString(req.body?.messageId || '', 120);
    let unreadCount = 0;
    await mutateSiteChatDocument((doc) => {
      const siteEntry = ensureSiteChatSite(doc, site);
      const message = messageId
        ? siteEntry.messages.find((entry) => entry.id === messageId)
        : siteEntry.messages[siteEntry.messages.length - 1];
      const readAt = message?.createdAt || new Date().toISOString();
      siteEntry.readState[email] = {
        lastReadAt: readAt,
        lastReadMessageId: message?.id || '',
      };
      unreadCount = getSiteChatUnreadForSite(siteEntry, req.session);
      return doc;
    });
    return res.json({ ok: true, unreadCount });
  } catch (error) {
    return next(error);
  }
});

apiRouter.post('/store/confirm-password', storePasswordLimiter, async (req, res, next) => {
  try {
    if (req.session?.isReadonly) {
      return res.status(403).json({ error: 'READONLY_FORBIDDEN' });
    }
    const password = String(req.body?.password || '');
    if (!password) {
      return res.status(400).json({ error: 'PASSWORD_REQUIRED' });
    }
    const email = String(req.session?.email || '').trim().toLowerCase();
    const admins = await readAdmins();
    const admin = admins.find((entry) => entry.email === email);
    if (!admin) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    const valid = await bcrypt.compare(password, String(admin.password || ''));
    if (!valid) {
      await logActivity(email, 'store_password_confirm', { success: false });
      return res.status(401).json({ error: 'INVALID_PASSWORD' });
    }
    await logActivity(email, 'store_password_confirm', { success: true });
    return res.json({ ok: true, confirmedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/store/product-link-preview', requireAnyPermission(['canManageStore', 'canManageWorkwear']), storeProductLinkPreviewLimiter, async (req, res, next) => {
  try {
    if (req.session?.isReadonly) {
      return res.status(403).json({ error: 'READONLY_FORBIDDEN' });
    }
    if (!canManageStoreOrders(req.session)) {
      return res.status(403).json({ error: 'STORE_MANAGER_REQUIRED' });
    }
    const site = getRequestedStoreSite(req);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }
    const url = sanitizeString(req.body?.url || '', 2000);
    if (!url) return res.status(400).json({ error: 'STORE_LINK_REQUIRED' });
    const { html, finalUrl } = await fetchStoreProductPreviewHtml(url);
    const preview = parseStoreProductLinkPreview(html, finalUrl);
    if (!preview.name && !preview.description && (!preview.imageUrls || !preview.imageUrls.length)) {
      throw createStoreValidationError('STORE_LINK_NO_PRODUCT_DATA', 400);
    }
    await logActivity(req.session.email, 'store_product_link_preview', {
      site,
      host: preview.host,
      hasName: Boolean(preview.name),
      hasImage: Array.isArray(preview.imageUrls) && preview.imageUrls.length > 0,
      hasPrice: Boolean(preview.price),
    });
    return res.json({ ok: true, site, preview });
  } catch (error) {
    if (typeof error?.statusCode === 'number') {
      await logActivity(req.session?.email, 'store_product_link_preview_failed', {
        site: req.body?.site || req.session?.currentSite || '',
        code: error.code || error.message,
      });
      return res.status(error.statusCode).json({ error: error.code || error.message || 'STORE_LINK_PREVIEW_FAILED' });
    }
    if (error?.name === 'AbortError') {
      return res.status(408).json({ error: 'STORE_LINK_TIMEOUT' });
    }
    next(error);
  }
});

apiRouter.get('/store/orders', requireAnyPermission(['canAccessStore', 'canAccessWorkwear']), async (req, res, next) => {
  try {
    const site = getRequestedStoreSite(req);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }
    const email = String(req.session?.email || '').trim().toLowerCase();
    const document = await getStateDocument();
    const state = document?.data && typeof document.data === 'object' ? document.data : {};
    const siteEntry = state?.siteData?.[site] && typeof state.siteData[site] === 'object' ? state.siteData[site] : {};
    const store = siteEntry?.store && typeof siteEntry.store === 'object' ? siteEntry.store : {};
    const sourceOrders = Array.isArray(store.orders) ? store.orders : [];
    const canManageAll = canManageStoreOrders(req.session);
    const canSeeTeam = canViewStoreTeamOrdersPermission(req.session);
    const visibleOrders = sourceOrders.filter((order) => {
      if (canManageAll) return true;
      if (canSeeTeam) return sanitizeString(order?.site || '', 80) === site;
      return sanitizeString(order?.workerId || '', 160).toLowerCase() === email;
    });
    return res.json({
      ok: true,
      site,
      orders: visibleOrders,
      count: visibleOrders.length,
      version: Number(document?.version) || 1,
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/store/orders', requireAnyPermission(['canAccessStore', 'canAccessWorkwear']), async (req, res, next) => {
  try {
    if (req.session?.isReadonly) {
      return res.status(403).json({ error: 'READONLY_FORBIDDEN' });
    }
    const site = getRequestedStoreSite(req);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }
    const sessionEmail = String(req.session?.email || '').trim().toLowerCase();
    const rawDraft = req.body?.order && typeof req.body.order === 'object' ? req.body.order : req.body;
    const draftPayload = sanitizeStoreOrderDraft(rawDraft, site);
    if (!sessionEmail || !draftPayload.items.length) {
      return res.status(400).json({ error: 'INVALID_ORDER_PAYLOAD' });
    }
    const admins = await readAdmins();
    const workerAdmin = admins.find((entry) => entry.email === sessionEmail && entry.active !== false);
    if (!workerAdmin && req.session?.role === 'admin') {
      return res.status(403).json({ error: 'USER_INACTIVE_OR_MISSING' });
    }
    const workerRoles = getStoreRoleKeysForSession(req.session, workerAdmin);
    const workerName = sanitizeString(workerAdmin?.fullName || req.session?.fullName || sessionEmail, 200);
    const nowIso = new Date().toISOString();

    let savedOrder = null;
    let budgetSnapshot = null;
    let tamperSignals = [];
    await mutateVersionedJsonFile(stateFile, {
      version: 2,
      savedAt: new Date().toISOString(),
      sites: ['default'],
      currentSite: 'default',
      siteData: {},
    }, async (state) => {
      const nextState = normalizeRuntimeState(state);
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const siteEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object'
        ? { ...nextState.siteData[site] }
        : {};
      const store = siteEntry.store && typeof siteEntry.store === 'object' ? { ...siteEntry.store } : {};
      store.orders = Array.isArray(store.orders) ? store.orders.slice() : [];
      store.products = Array.isArray(store.products) ? store.products.slice() : [];
      store.workerProfiles = store.workerProfiles && typeof store.workerProfiles === 'object'
        ? { ...store.workerProfiles }
        : {};
      store.creditLedger = Array.isArray(store.creditLedger) ? store.creditLedger.slice() : [];
      const calculated = buildServerPricedStoreOrder({
        store,
        site,
        workerId: sessionEmail,
        workerName,
        workerRoles,
        orderDraft: draftPayload,
        nowIso,
        actorEmail: sessionEmail,
      });
      store.orders.push(calculated.order);
      siteEntry.store = store;
      nextState.siteData[site] = siteEntry;
      savedOrder = calculated.order;
      budgetSnapshot = calculated.budget;
      tamperSignals = calculated.tamperSignals;
      return nextState;
    });

    await logActivity(sessionEmail, 'order_created_server_priced', {
      site,
      orderId: savedOrder?.id || '',
      workerId: savedOrder?.workerId || '',
      status: savedOrder?.status || '',
      itemsCount: Array.isArray(savedOrder?.items) ? savedOrder.items.length : 0,
      budgetImpact: Number(savedOrder?.budgetImpact || 0),
    });
    if (Number(savedOrder?.creditReserved || 0) > 0) {
      await logActivity(sessionEmail, 'budget_reserved', {
        site,
        orderId: savedOrder?.id || '',
        workerId: savedOrder?.workerId || '',
        amount: Number(savedOrder?.creditReserved || 0),
      });
    }
    if (tamperSignals.length > 0) {
      await logActivity(sessionEmail, 'rejected_invalid_client_price', {
        site,
        orderId: savedOrder?.id || '',
        tamperSignals,
      });
    }
    return res.status(201).json({ ok: true, site, order: savedOrder, budget: budgetSnapshot, serverPriced: true });
  } catch (error) {
    if (error?.code === 'STORE_INSUFFICIENT_BUDGET') {
      return res.status(400).json({ error: 'STORE_INSUFFICIENT_BUDGET', details: error?.details || '' });
    }
    if (error?.code === 'STORE_PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'STORE_PRODUCT_NOT_FOUND', details: error?.details || '' });
    }
    if (typeof error?.statusCode === 'number') {
      return res.status(error.statusCode).json({ error: error?.code || error?.message || 'STORE_ORDER_SAVE_FAILED', details: error?.details || '' });
    }
    next(error);
  }
});

apiRouter.patch('/store/orders/:orderId/status', requireAnyPermission(['canAccessStore', 'canAccessWorkwear', 'canManageStore', 'canManageWorkwear', 'canViewStoreTeamOrders']), async (req, res, next) => {
  try {
    if (req.session?.isReadonly) {
      return res.status(403).json({ error: 'READONLY_FORBIDDEN' });
    }
    const site = getRequestedStoreSite(req);
    if (!canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }
    const orderId = sanitizeString(req.params?.orderId || '', 80);
    const nextStatus = sanitizeString(req.body?.status || '', 40);
    if (!orderId || !STORE_ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: 'INVALID_STATUS_UPDATE' });
    }
    const actor = String(req.session?.email || '').trim().toLowerCase();
    const canManageAll = canManageStoreOrders(req.session);
    const canSeeTeam = canViewStoreTeamOrdersPermission(req.session);

    let updatedOrder = null;
    let updatedBudget = null;
    await mutateVersionedJsonFile(stateFile, {
      version: 2,
      savedAt: new Date().toISOString(),
      sites: ['default'],
      currentSite: 'default',
      siteData: {},
    }, async (state) => {
      const nextState = normalizeRuntimeState(state);
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const siteEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object'
        ? { ...nextState.siteData[site] }
        : {};
      const store = siteEntry.store && typeof siteEntry.store === 'object' ? { ...siteEntry.store } : {};
      const orders = Array.isArray(store.orders) ? [...store.orders] : [];
      const index = orders.findIndex((entry) => sanitizeString(entry?.id || '', 80) === orderId);
      if (index < 0) {
        const notFound = new Error('STORE_ORDER_NOT_FOUND');
        notFound.statusCode = 404;
        throw notFound;
      }
      const current = orders[index] && typeof orders[index] === 'object' ? { ...orders[index] } : null;
      if (!current) {
        const broken = new Error('STORE_ORDER_NOT_FOUND');
        broken.statusCode = 404;
        throw broken;
      }
      const isOwner = sanitizeString(current?.workerId || '', 160).toLowerCase() === actor;
      const ownerCancelAllowed = isOwner && nextStatus === 'Cancelled';
      if (!canManageAll && !canSeeTeam && !ownerCancelAllowed) {
        const forbidden = new Error('FORBIDDEN');
        forbidden.statusCode = 403;
        throw forbidden;
      }
      if (!canManageAll && !canSeeTeam && ownerCancelAllowed) {
        const fromStatus = sanitizeString(current.status || '', 40);
        if (!['Pending', 'Approved'].includes(fromStatus)) {
          const invalid = new Error('INVALID_STATUS_UPDATE');
          invalid.statusCode = 400;
          throw invalid;
        }
      }
      store.workerProfiles = store.workerProfiles && typeof store.workerProfiles === 'object'
        ? { ...store.workerProfiles }
        : {};
      store.creditLedger = Array.isArray(store.creditLedger) ? store.creditLedger.slice() : [];
      const transitionResult = applyServerStoreStatusChange({
        store,
        order: current,
        nextStatus,
        actor,
        reason: req.body?.reason || '',
        internalNote: req.body?.internalNote || '',
        externalNote: req.body?.externalNote || '',
      });
      orders[index] = transitionResult.order;
      const workerId = sanitizeString(transitionResult.order?.workerId || '', 160).toLowerCase();
      const profile = workerId ? ensureStoreWorkerProfile(store, workerId, transitionResult.order?.workerName || workerId) : null;
      updatedBudget = profile
        ? {
            workerId,
            creditBalance: Math.max(0, Number(profile.creditBalance || 0)),
            reservedCredit: Math.max(0, Number(profile.reservedCredit || 0)),
          }
        : null;
      store.orders = orders;
      siteEntry.store = store;
      nextState.siteData[site] = siteEntry;
      updatedOrder = transitionResult.order;
      return nextState;
    });

    await logActivity(actor, 'store_order_status_updated_server', {
      site,
      orderId,
      status: nextStatus,
    });
    return res.json({ ok: true, site, order: updatedOrder, budget: updatedBudget });
  } catch (error) {
    if (error?.code === 'STORE_INSUFFICIENT_BUDGET') {
      return res.status(400).json({ error: 'STORE_INSUFFICIENT_BUDGET', details: error?.details || '' });
    }
    if (error?.code === 'INVALID_STATUS_UPDATE') {
      return res.status(400).json({ error: 'INVALID_STATUS_UPDATE', details: error?.details || '' });
    }
    if (error?.code === 'FORBIDDEN') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    if (error?.message === 'STORE_ORDER_NOT_FOUND') {
      return res.status(404).json({ error: 'STORE_ORDER_NOT_FOUND' });
    }
    if (typeof error?.statusCode === 'number') {
      return res.status(error.statusCode).json({ error: error?.code || error?.message || 'STORE_ORDER_STATUS_UPDATE_FAILED', details: error?.details || '' });
    }
    next(error);
  }
});

apiRouter.get('/store/export/:format(csv|excel|pdf)', requireAnyPermission(['canAccessStore', 'canAccessWorkwear', 'canExportStore', 'canManageStore', 'canManageWorkwear', 'canViewStoreTeamOrders']), async (req, res, next) => {
  try {
    const format = sanitizeString(req.params?.format || 'csv', 20).toLowerCase();
    if (!['csv', 'excel', 'pdf'].includes(format)) {
      return res.status(400).json({ error: 'INVALID_EXPORT_FORMAT' });
    }
    if (!canExportStoreData(req.session)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    const site = getRequestedStoreSite(req);
    const siteScope = sanitizeString(req.query?.siteScope || 'all', 20).toLowerCase();
    const exportSite = sanitizeString(req.query?.site || site, 80);
    const statusScope = sanitizeString(req.query?.statusScope || 'all', 40).toLowerCase();
    const fromDate = sanitizeString(req.query?.fromDate || '', 20);
    const untilDate = sanitizeString(req.query?.untilDate || '', 20);
    if (siteScope === 'single' && exportSite && !canAccessSite(req.session, exportSite)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }
    if (fromDate && untilDate) {
      const fromTs = new Date(`${fromDate}T00:00:00`).getTime();
      const untilTs = new Date(`${untilDate}T23:59:59`).getTime();
      if (Number.isFinite(fromTs) && Number.isFinite(untilTs)) {
        const diffDays = Math.ceil((untilTs - fromTs) / (24 * 60 * 60 * 1000));
        if (diffDays > 400) {
          return res.status(400).json({ error: 'EXPORT_RANGE_TOO_LARGE' });
        }
      }
    }

    const document = await getStateDocument();
    const state = document?.data && typeof document.data === 'object' ? document.data : {};
    const canManageAll = canManageStoreOrders(req.session);
    const canSeeTeam = canViewStoreTeamOrdersPermission(req.session);
    if (!canManageAll && !canSeeTeam) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    const targetSites = siteScope === 'single' && exportSite ? [exportSite] : (
      Array.isArray(state.sites) ? state.sites.filter((siteId) => canAccessSite(req.session, siteId)) : []
    );
    const scopedSites = canManageAll
      ? targetSites
      : [site].filter((siteId) => canAccessSite(req.session, siteId));
    const allRows = scopedSites.flatMap((siteId) => {
      const siteEntry = state?.siteData?.[siteId] && typeof state.siteData[siteId] === 'object' ? state.siteData[siteId] : {};
      const store = siteEntry?.store && typeof siteEntry.store === 'object' ? siteEntry.store : {};
      return buildStoreExportRows(store.orders, {
        siteScope: 'single',
        site: siteId,
        statusScope,
        fromDate,
        untilDate,
      });
    });

    const generatedAt = new Date().toISOString();
    const exportLabel = `store-orders-${siteScope === 'single' ? exportSite : 'all-sites'}-${generatedAt.slice(0, 10)}`;
    if (format === 'csv') {
      const headers = ['Worker', 'WorkerId', 'Site', 'Date', 'Product', 'Variant', 'Size', 'Quantity', 'Status', 'Comment', 'Budget impact'];
      const escapeCsv = (value) => {
        const text = String(value ?? '');
        if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
        return text;
      };
      const lines = [
        headers.join(','),
        ...allRows.map((row) => ([
          row.worker,
          row.workerId,
          row.site,
          row.date,
          row.product,
          row.variant,
          row.size,
          row.quantity,
          row.status,
          row.comment,
          row.budgetImpact,
        ].map(escapeCsv).join(','))),
      ];
      const csv = lines.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${exportLabel}.csv"`);
      await logActivity(req.session.email, 'export_store_csv', {
        siteScope,
        site: exportSite || null,
        statusScope,
        fromDate: fromDate || null,
        untilDate: untilDate || null,
        rows: allRows.length,
      });
      return res.send(csv);
    }

    if (format === 'excel') {
      const data = allRows.map((row) => ({
        Worker: row.worker,
        WorkerId: row.workerId,
        Site: row.site,
        Date: row.date,
        Product: row.product,
        Variant: row.variant,
        Size: row.size,
        Quantity: row.quantity,
        Status: row.status,
        Comment: row.comment,
        BudgetImpact: row.budgetImpact,
      }));
      const buffer = await exportToExcel(data, ['Worker', 'WorkerId', 'Site', 'Date', 'Product', 'Variant', 'Size', 'Quantity', 'Status', 'Comment', 'BudgetImpact']);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${exportLabel}.xlsx"`);
      await logActivity(req.session.email, 'export_store_excel', {
        siteScope,
        site: exportSite || null,
        statusScope,
        fromDate: fromDate || null,
        untilDate: untilDate || null,
        rows: allRows.length,
      });
      return res.send(Buffer.from(buffer));
    }

    const lines = [
      'Store Orders Export',
      `Generated: ${generatedAt}`,
      `Site scope: ${siteScope === 'single' ? exportSite : 'all sites'}`,
      `Status scope: ${statusScope}`,
      `Rows: ${allRows.length}`,
      '',
      ...allRows.map((row) => `${row.date} | ${row.site} | ${row.worker} | ${row.product} ${row.variant ? `(${row.variant})` : ''} | ${row.size} | x${row.quantity} | ${row.status} | Budget ${row.budgetImpact}`),
    ];
    const buffer = await exportToPDF('Store Orders Export', lines.join('\n'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${exportLabel}.pdf"`);
    await logActivity(req.session.email, 'export_store_pdf', {
      siteScope,
      site: exportSite || null,
      statusScope,
      fromDate: fromDate || null,
      untilDate: untilDate || null,
      rows: allRows.length,
    });
    return res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/state', async (req, res, next) => {
  try {
    const document = await getStateDocument();
    res.json(await buildPublicStatePayload(document, req.session));
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/state/module', requireAdmin, async (req, res, next) => {
  const target = normalizeModuleStateTarget(req.body?.target);
  const site = sanitizeString(req.body?.siteId || req.body?.site || req.session.currentSite || 'default', 80) || 'default';
  try {
    if (!target) return res.status(400).json({ error: 'INVALID_MODULE_TARGET' });
    if (target !== 'adminUsers' && !canAccessSite(req.session, site)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot modify state' });
    }
    const payload = sanitizeObject(req.body?.payload || {});
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ error: 'INVALID_MODULE_PAYLOAD' });
    }
    const unexpectedKeys = rejectUnexpectedModulePayloadKeys(target, payload);
    if (unexpectedKeys.length) {
      await logActivity(req.session.email, 'module_state_payload_rejected', {
        target,
        site: target === 'adminUsers' ? null : site,
        unexpectedKeys,
      });
      return res.status(400).json({ error: 'MODULE_PAYLOAD_SCOPE_ERROR', target, unexpectedKeys });
    }
    const baseVersion = Number(req.body?.baseVersion || req.body?.moduleVersion || 1);
    if (!Number.isFinite(baseVersion) || baseVersion < 1) {
      return res.status(400).json({ error: 'INVALID_MODULE_BASE_VERSION' });
    }

    let nextModuleVersion = 1;
    let updatedAdmins = null;
    const savedDocument = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = normalizeRuntimeState(state);
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      nextState.moduleVersions = nextState.moduleVersions && typeof nextState.moduleVersions === 'object'
        ? { ...nextState.moduleVersions }
        : {};
      const currentModuleVersion = getModuleStateVersion(nextState, target, site);
      if (Number(baseVersion) !== Number(currentModuleVersion)) {
        throw createModuleConflictError(target, site, currentModuleVersion, baseVersion);
      }

      if (target === 'adminUsers') {
        const canManageAnyAdminUserPayload =
          canWriteStateField(req.session, 'canManageAdmins') ||
          canWriteStateField(req.session, 'canManageGuestAccess') ||
          canWriteStateField(req.session, 'canManageBinsPermissions');
        if (!canManageAnyAdminUserPayload) {
          const error = new Error('FORBIDDEN_MODULE_TARGET');
          error.statusCode = 403;
          throw error;
        }
        if (Array.isArray(payload.admins) && canWriteStateField(req.session, 'canManageAdmins')) {
          const previousAdmins = await readAdmins();
          updatedAdmins = await persistAdmins(payload.admins, req.session);
          await logAdminAuditChanges(req.session.email, previousAdmins, updatedAdmins);
          nextState.admins = updatedAdmins;
        } else if (Array.isArray(payload.admins)) {
          const error = new Error('FORBIDDEN_MODULE_TARGET');
          error.statusCode = 403;
          throw error;
        }
        if (payload.guestPermissions && canWriteStateField(req.session, 'canManageGuestAccess')) {
          nextState.guestPermissions = payload.guestPermissions;
        }
        if (payload.binPermissions && canWriteStateField(req.session, 'canManageBinsPermissions')) {
          nextState.binPermissions = payload.binPermissions;
        }
        if (payload.adminRemovalNotices && canWriteStateField(req.session, 'canManageAdmins')) {
          nextState.adminRemovalNotices = payload.adminRemovalNotices;
        }
      } else {
        const previousEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object'
          ? nextState.siteData[site]
          : {};
        const entry = { ...previousEntry };
        if (target === 'planner') {
          if (!payload.planner || typeof payload.planner !== 'object') {
            const error = new Error('INVALID_PLANNER_PAYLOAD');
            error.statusCode = 400;
            throw error;
          }
          entry.planner = normalizePlannerDocumentForEntityMerge(
            mergePlannerStateForSession(previousEntry.planner, payload.planner, req.session),
            site,
            req.session.email,
          );
          mirrorPlannerListsToSiteEntry(entry);
        } else if (target === 'tidplan') {
          if (!canWriteTidplanState(req.session)) {
            const error = new Error('FORBIDDEN_MODULE_TARGET');
            error.statusCode = 403;
            throw error;
          }
          if (Array.isArray(payload.tidplan) && canWriteStateField(req.session, 'canManageTidplan')) {
            entry.tidplan = normalizeTidplanActivitiesForEntityMerge(payload.tidplan, site, req.session.email);
          }
          if (Array.isArray(payload.tidplanZones) && canWriteStateField(req.session, 'canManageTidplanZones')) {
            entry.tidplanZones = payload.tidplanZones;
          }
        } else if (target === 'warehouse') {
          if (!canWriteStateField(req.session, 'canManageWarehouse')) {
            const error = new Error('FORBIDDEN_MODULE_TARGET');
            error.statusCode = 403;
            throw error;
          }
          if (!payload.warehouse || typeof payload.warehouse !== 'object') {
            const error = new Error('INVALID_WAREHOUSE_PAYLOAD');
            error.statusCode = 400;
            throw error;
          }
          entry.warehouse = payload.warehouse;
        } else if (target === 'bins') {
          if (!canWriteBinsState(req.session)) {
            const error = new Error('FORBIDDEN_MODULE_TARGET');
            error.statusCode = 403;
            throw error;
          }
          if (!payload.bins || typeof payload.bins !== 'object') {
            const error = new Error('INVALID_BINS_PAYLOAD');
            error.statusCode = 400;
            throw error;
          }
          entry.bins = payload.bins;
        } else if (target === 'storeCatalog' || target === 'storeSettings') {
          if (!payload.store || typeof payload.store !== 'object') {
            const error = new Error('INVALID_STORE_PAYLOAD');
            error.statusCode = 400;
            throw error;
          }
          const mergedStoreResult = mergeStoreStateForSession(previousEntry.store, payload.store, req.session, site);
          if (mergedStoreResult.deniedChangedFields.length > 0) {
            const error = new Error('FORBIDDEN_STORE_MUTATION');
            error.statusCode = 403;
            error.details = mergedStoreResult.deniedChangedFields;
            throw error;
          }
          entry.store = mergedStoreResult.store;
        }
        nextState.siteData[site] = entry;
      }

      nextModuleVersion = bumpModuleStateVersion(nextState, target, site);
      applyStateEditMetadata(nextState, req.session, target);
      return nextState;
    });

    await logActivity(req.session.email, 'module_state_saved', {
      target,
      site: target === 'adminUsers' ? null : site,
      moduleVersion: nextModuleVersion,
    });
    res.json({
      ok: true,
      target,
      site: target === 'adminUsers' ? null : site,
      moduleVersion: nextModuleVersion,
      version: savedDocument.version || 1,
      updatedAt: savedDocument.updatedAt || null,
      admins: updatedAdmins || undefined,
    });
  } catch (error) {
    if (error?.code === 'MODULE_VERSION_CONFLICT' || error?.message === 'MODULE_VERSION_CONFLICT') {
      await logActivity(req.session.email, 'module_version_conflict', {
        target,
        site: target === 'adminUsers' ? null : site,
        currentVersion: error.currentVersion,
        submittedVersion: error.submittedVersion,
      });
      return res.status(409).json({
        error: 'MODULE_VERSION_CONFLICT',
        target,
        site: target === 'adminUsers' ? null : site,
        moduleVersion: error.currentVersion,
        submittedVersion: error.submittedVersion,
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message, details: error.details || undefined });
    }
    next(error);
  }
});

apiRouter.patch('/planner/:siteId/:date/rows/:rowId', requireAdmin, async (req, res, next) => {
  const site = sanitizeString(req.params.siteId || req.session.currentSite || 'default', 80) || 'default';
  const date = sanitizeString(req.params.date || '', 40);
  const rowId = sanitizeString(req.params.rowId || '', 140);
  try {
    if (!date || !rowId) return res.status(400).json({ error: 'INVALID_PLANNER_ROW_TARGET' });
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    if (req.session.isReadonly || !canWriteStateField(req.session, 'canAccessPlanner')) {
      return res.status(403).json({ error: 'FORBIDDEN_PLANNER_ROW_SAVE' });
    }
    const changedFields = sanitizeChangedFields(req.body?.changedFields || req.body?.fields || {});
    if (!Object.keys(changedFields).length) return res.status(400).json({ error: 'NO_PLANNER_ROW_CHANGES' });
    const baseFieldVersions = req.body?.baseFieldVersions || {};
    let savedRow = null;
    const savedDocument = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = normalizeRuntimeState(state);
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const previousEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object' ? nextState.siteData[site] : {};
      const entry = { ...previousEntry };
      const planner = normalizePlannerDocumentForEntityMerge(entry.planner || {}, site, req.session.email);
      planner.dailyData = planner.dailyData && typeof planner.dailyData === 'object' ? { ...planner.dailyData } : {};
      const day = planner.dailyData[date] && typeof planner.dailyData[date] === 'object'
        ? { ...planner.dailyData[date] }
        : { planningRows: [], workerAttendance: {}, liftAvailability: {}, liftPlans: {} };
      const rows = normalizePlannerRowsForDate(day.planningRows, site, date, req.session.email);
      let rowIndex = rows.findIndex((row) => row.id === rowId);
      if (rowIndex < 0) {
        rows.push(normalizeVersionedEntity({ id: rowId }, rowId, req.session.email));
        rowIndex = rows.length - 1;
      }
      const merged = mergeEntityFields(rows[rowIndex], changedFields, baseFieldVersions, req.session.email, 'rowVersion');
      if (merged.conflicts.length) {
        throw getEntityConflictError({
          entityType: 'plannerRow',
          entityId: rowId,
          conflicts: merged.conflicts,
          serverEntity: rows[rowIndex],
        });
      }
      rows[rowIndex] = merged.entity;
      savedRow = merged.entity;
      day.planningRows = rows;
      planner.dailyData[date] = day;
      entry.planner = planner;
      mirrorPlannerListsToSiteEntry(entry);
      nextState.siteData[site] = entry;
      nextState.version = Number(nextState.version || 1) + 1;
      nextState.updatedAt = new Date().toISOString();
      return nextState;
    });
    await logActivity(req.session.email, 'planner_row_saved', { site, date, rowId, fields: Object.keys(changedFields) });
    res.json({ ok: true, version: savedDocument.version, row: savedRow });
  } catch (error) {
    if (error?.code === 'ENTITY_VERSION_CONFLICT') {
      await logActivity(req.session.email, 'planner_row_conflict', { site, date, rowId, conflicts: error.conflicts });
      return res.status(409).json({
        error: 'ENTITY_VERSION_CONFLICT',
        entityType: error.entityType,
        entityId: error.entityId,
        conflicts: error.conflicts,
        serverEntity: error.serverEntity,
      });
    }
    next(error);
  }
});

apiRouter.patch('/tidplan/:siteId/activities/:activityId', requireAdmin, async (req, res, next) => {
  const site = sanitizeString(req.params.siteId || req.session.currentSite || 'default', 80) || 'default';
  const activityId = sanitizeString(req.params.activityId || '', 140);
  try {
    if (!activityId) return res.status(400).json({ error: 'INVALID_TIDPLAN_ACTIVITY_TARGET' });
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    if (req.session.isReadonly || !canWriteTidplanState(req.session)) {
      return res.status(403).json({ error: 'FORBIDDEN_TIDPLAN_ACTIVITY_SAVE' });
    }
    const changedFields = sanitizeChangedFields(req.body?.changedFields || req.body?.fields || {});
    if (!Object.keys(changedFields).length) return res.status(400).json({ error: 'NO_TIDPLAN_ACTIVITY_CHANGES' });
    const baseFieldVersions = req.body?.baseFieldVersions || {};
    let savedActivity = null;
    const savedDocument = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = normalizeRuntimeState(state);
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const previousEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object' ? nextState.siteData[site] : {};
      const entry = { ...previousEntry };
      const activities = normalizeTidplanActivitiesForEntityMerge(entry.tidplan || [], site, req.session.email);
      let activityIndex = activities.findIndex((activity) => activity.id === activityId);
      if (activityIndex < 0) {
        activities.push(normalizeVersionedEntity({ id: activityId }, activityId, req.session.email));
        activityIndex = activities.length - 1;
      }
      const merged = mergeEntityFields(activities[activityIndex], changedFields, baseFieldVersions, req.session.email, 'activityVersion');
      if (merged.conflicts.length) {
        throw getEntityConflictError({
          entityType: 'tidplanActivity',
          entityId: activityId,
          conflicts: merged.conflicts,
          serverEntity: activities[activityIndex],
        });
      }
      activities[activityIndex] = merged.entity;
      savedActivity = merged.entity;
      entry.tidplan = activities;
      nextState.siteData[site] = entry;
      nextState.version = Number(nextState.version || 1) + 1;
      nextState.updatedAt = new Date().toISOString();
      return nextState;
    });
    await logActivity(req.session.email, 'tidplan_activity_saved', { site, activityId, fields: Object.keys(changedFields) });
    res.json({ ok: true, version: savedDocument.version, activity: savedActivity });
  } catch (error) {
    if (error?.code === 'ENTITY_VERSION_CONFLICT') {
      await logActivity(req.session.email, 'tidplan_activity_conflict', { site, activityId, conflicts: error.conflicts });
      return res.status(409).json({
        error: 'ENTITY_VERSION_CONFLICT',
        entityType: error.entityType,
        entityId: error.entityId,
        conflicts: error.conflicts,
        serverEntity: error.serverEntity,
      });
    }
    next(error);
  }
});

apiRouter.post('/state', requireAdmin, async (req, res, next) => {
  try {
    const state = sanitizeObject(req.body?.state);
    const moduleKey = sanitizeString(req.body?.module || req.body?.section || 'state', 80);
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
    const mergedState = mergeStateForSession(currentDocument.data, state, req.session);
    const storeSecurityEvents = Array.isArray(mergedState.__storeSecurityEvents) ? mergedState.__storeSecurityEvents.slice() : [];
    delete mergedState.__storeSecurityEvents;
    const deniedStoreMutations = storeSecurityEvents.filter((entry) => entry?.type === 'store_denied' && Array.isArray(entry?.fields) && entry.fields.length > 0);
    if (deniedStoreMutations.length > 0) {
      await logActivity(req.session.email, 'store_state_mutation_denied', {
        module: moduleKey,
        denied: deniedStoreMutations,
      });
      if (/store|workwear/i.test(moduleKey)) {
        return res.status(403).json({ error: 'FORBIDDEN_STORE_MUTATION', details: deniedStoreMutations });
      }
    }
    
    // ============ SITE DELETION SAFETY CHECK ============
    // Prevent partial state updates that wipe other sites' data
    const previousState = currentDocument.data || {};
    const previousSites = Array.isArray(previousState.sites) ? previousState.sites : [];
    const previousSiteData = previousState.siteData && typeof previousState.siteData === 'object' ? previousState.siteData : {};
    const nextSites = Array.isArray(mergedState.sites) ? mergedState.sites : [];
    const nextSiteData = mergedState.siteData && typeof mergedState.siteData === 'object' ? mergedState.siteData : {};
    
    // Validate sites array is not being emptied completely
    if (nextSites.length === 0 && previousSites.length > 0) {
      await logActivity(req.session.email, 'site_deletion_safety_blocked', {
        reason: 'All sites would be deleted',
        route: '/api/state',
      });
      return res.status(400).json({ error: 'SITE_DELETE_SCOPE_ERROR', details: 'Cannot delete all sites' });
    }
    
    // Detect sites being removed and validate scope
    const previousSiteIds = new Set(previousSites);
    const nextSiteIds = new Set(nextSites);
    const removedSites = previousSites.filter(site => !nextSiteIds.has(site));
    const addedSites = nextSites.filter(site => !previousSiteIds.has(site));
    
    // If sites were removed, verify only that site's data was removed (not other sites)
    if (removedSites.length > 0) {
      for (const removedSite of removedSites) {
        // Site should not exist in nextSiteData (was deleted)
        if (nextSiteData[removedSite]) {
          await logActivity(req.session.email, 'site_deletion_safety_blocked', {
            reason: 'Deleted site still has data',
            site: removedSite,
            route: '/api/state',
          });
          return res.status(400).json({ error: 'SITE_DELETE_SCOPE_ERROR', details: `Deleted site "${removedSite}" still contains data` });
        }
      }
      
      // Verify that remaining sites' data is preserved, ESPECIALLY warehouse data
      for (const previousSite of previousSites) {
        if (!removedSites.includes(previousSite)) {
          // This site should still exist in nextSiteData
          const previousEntry = normalizeSiteEntryForScopeChecksum(previousSiteData[previousSite]);
          const nextEntry = normalizeSiteEntryForScopeChecksum(nextSiteData[previousSite]);
          
          // If previous site had data, ensure next site still has at least the same structure
          if (previousEntry && typeof previousEntry === 'object' && Object.keys(previousEntry).length > 0) {
            if (!nextEntry || typeof nextEntry !== 'object') {
              await logActivity(req.session.email, 'site_deletion_safety_blocked', {
                reason: 'Remaining site data lost',
                site: previousSite,
                route: '/api/state',
              });
              return res.status(400).json({ error: 'SITE_DELETE_SCOPE_ERROR', details: `Remaining site "${previousSite}" data was lost` });
            }
            const previousChecksum = stableChecksum(previousEntry);
            const nextChecksum = stableChecksum(nextEntry);
            if (previousChecksum !== nextChecksum) {
              const changedPath = findFirstDiffPath(previousEntry, nextEntry);
              await logActivity(req.session.email, 'site_deletion_safety_blocked', {
                reason: 'Remaining site data changed during deletion',
                site: previousSite,
                changedPath,
                previousChecksum,
                nextChecksum,
                route: '/api/state',
              });
              return res.status(400).json({
                error: 'SITE_DELETE_SCOPE_ERROR',
                details: `Remaining site "${previousSite}" changed during deletion at ${changedPath}`,
                site: previousSite,
                changedPath,
              });
            }
            
            // CRITICAL: Verify warehouse data specifically (per gradilište)
            const prevWarehouse = previousEntry.warehouse && typeof previousEntry.warehouse === 'object' ? previousEntry.warehouse : null;
            const nextWarehouse = nextEntry.warehouse && typeof nextEntry.warehouse === 'object' ? nextEntry.warehouse : null;
            
            if (prevWarehouse && Object.keys(prevWarehouse).length > 0 && (!nextWarehouse || Object.keys(nextWarehouse).length === 0)) {
              await logActivity(req.session.email, 'site_deletion_safety_blocked', {
                reason: 'Warehouse data lost for remaining site',
                site: previousSite,
                route: '/api/state',
              });
              return res.status(400).json({ error: 'SITE_DELETE_SCOPE_ERROR', details: `Warehouse data lost for remaining site "${previousSite}" after deletion` });
            }
          }
        }
      }
    }
    
    if (!canUnlockPastDays(req.session) && hasLockedPastChanges(currentDocument.data, mergedState)) {
      await logActivity(req.session.email, 'locked_past_day_edit_attempt', {
        module: sanitizeString(req.body?.module || req.body?.section || 'state', 80),
        site: req.session.currentSite || null,
      });
      return res.status(403).json({ error: 'PAST_DAY_LOCKED' });
    }

    if (!mergedState.siteData || typeof mergedState.siteData !== 'object' || Object.keys(mergedState.siteData).length === 0) {
      return res.status(400).json({ error: 'Empty state payload rejected' });
    }

    if (canWriteStateField(req.session, 'canManageAdmins') && Array.isArray(mergedState.admins)) {
      const previousAdmins = await readAdmins();
      mergedState.admins = await persistAdmins(mergedState.admins, req.session);
      await logAdminAuditChanges(req.session.email, previousAdmins, mergedState.admins);
    }
    
    const updatedAt = new Date().toISOString();
    const savedDocument = await writeVersionedJsonFile(stateFile, {
      ...mergedState,
      savedAt: updatedAt,
      savedBy: req.session.email,
      savedByName: getSessionDisplayName(req.session),
      updatedAt,
      updatedBy: req.session.email,
      updatedByName: getSessionDisplayName(req.session),
      module: moduleKey,
    }, {
      lastKnownVersion: Number(currentDocument.version) || lastKnownVersion,
      fallbackValue: null,
    });
    if (storeSecurityEvents.some((entry) => entry?.type === 'store_applied')) {
      await logActivity(req.session.email, 'store_state_mutation_applied', {
        module: sanitizeString(req.body?.module || req.body?.section || 'state', 80),
        deniedIgnored: true,
        applied: storeSecurityEvents.filter((entry) => entry?.type === 'store_applied'),
      });
    }
    res.json({
      ok: true,
      version: savedDocument.version,
      updatedAt: savedDocument.updatedAt,
      updatedBy: req.session.email,
      updatedByName: getSessionDisplayName(req.session),
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (isVersionConflictError(error)) {
      await logActivity(req.session.email, 'version_conflict', {
        route: '/api/state',
        module: moduleKey,
      });
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
    if (targetEmail === req.session.email) {
      return res.status(403).json({ error: 'Admins cannot modify their own admin record' });
    }
    
    // Only super admins can manage read-only mode
    if (!req.session.isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admins can manage read-only mode' });
    }
    
    let updatedAdmin = null;
    let updatedAdmins = null;
    await mutateVersionedJsonFile(adminsFile, [], async (admins) => {
      const nextAdmins = Array.isArray(admins) ? admins.map((admin) => normalizeAdminRecord(admin)) : [];
      const adminIndex = nextAdmins.findIndex((admin) => admin.email === targetEmail);
      if (adminIndex < 0) {
        throw new Error('ADMIN_NOT_FOUND');
      }
      if (!canActorManageAdmin(req.session, nextAdmins[adminIndex])) {
        throw new Error('ADMIN_FORBIDDEN');
      }
      nextAdmins[adminIndex].isReadonly = !nextAdmins[adminIndex].isReadonly;
      updatedAdmin = nextAdmins[adminIndex];
      updatedAdmins = nextAdmins;
      return nextAdmins;
    });
    if (updatedAdmins) syncActiveSessionsWithAdmins(updatedAdmins);
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
    if (error?.message === 'ADMIN_FORBIDDEN') {
      return res.status(403).json({ error: 'Cannot modify same-level, higher-level, or root admin' });
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
    if (targetEmail === req.session.email) {
      return res.status(403).json({ error: 'Admins cannot modify their own admin record' });
    }
    
    // Only super admins can manage read-only access
    if (!req.session.isSuperAdmin) {
      return res.status(403).json({ error: 'Only super admins can manage read-only access' });
    }
    
    let updatedAdmin = null;
    let updatedAdmins = null;
    await mutateVersionedJsonFile(adminsFile, [], async (admins) => {
      const nextAdmins = Array.isArray(admins) ? admins.map((admin) => normalizeAdminRecord(admin)) : [];
      const adminIndex = nextAdmins.findIndex((admin) => admin.email === targetEmail);
      if (adminIndex < 0) {
        throw new Error('ADMIN_NOT_FOUND');
      }
      const admin = nextAdmins[adminIndex];
      if (!canActorManageAdmin(req.session, admin)) {
        throw new Error('ADMIN_FORBIDDEN');
      }
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
      updatedAdmins = nextAdmins;
      return nextAdmins;
    });
    if (updatedAdmins) syncActiveSessionsWithAdmins(updatedAdmins);
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
    if (error?.message === 'ADMIN_FORBIDDEN') {
      return res.status(403).json({ error: 'Cannot modify same-level, higher-level, or root admin' });
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

function mergeReportsById(existingReports, submittedReports) {
  const existing = Array.isArray(existingReports) ? existingReports : [];
  const submitted = Array.isArray(submittedReports) ? submittedReports : [];
  const submittedById = new Map();
  submitted.forEach((report) => {
    const id = String(report?.id || '');
    if (id) submittedById.set(id, report);
  });

  const merged = existing.map((report) => {
    const id = String(report?.id || '');
    return id && submittedById.has(id) ? submittedById.get(id) : report;
  });
  const existingIds = new Set(existing.map((report) => String(report?.id || '')));
  submitted.forEach((report) => {
    const id = String(report?.id || '');
    if (id && !existingIds.has(id)) merged.push(report);
  });
  return merged;
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
  const savedDocument = await mutateVersionedJsonFile(getReportsFilePath(site), [], (existingReports, documentInfo) => {
    const hasFreshProcessVersion =
      canProcessReports &&
      Number.isFinite(lastKnownVersion) &&
      lastKnownVersion >= 1 &&
      Number(documentInfo?.version) === lastKnownVersion;
    if (hasFreshProcessVersion) return reports;
    if (canProcessReports) return mergeReportsById(existingReports, reports);
    return mergeCreatedReports(existingReports, reports);
  });
  await logActivity(req.session.email, 'save_reports', { count: reports.length, site });
  res.json({ ok: true, version: savedDocument.version, updatedAt: savedDocument.updatedAt });
  } catch (error) {
    if (isVersionConflictError(error)) {
      const site = sanitizeString(req.body?.site || 'default', 80);
      await logActivity(req.session.email, 'version_conflict', { route: '/api/reports', site });
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

function isDeleteOnlyNotificationsChange(existingNotifications, submittedNotifications) {
  const existingById = new Map();
  (Array.isArray(existingNotifications) ? existingNotifications : []).forEach((notification) => {
    const id = String(notification?.id || '');
    if (id) existingById.set(id, notification);
  });
  return (Array.isArray(submittedNotifications) ? submittedNotifications : []).every((notification) => {
    const id = String(notification?.id || '');
    return id && existingById.has(id) && stableJson(existingById.get(id)) === stableJson(notification);
  });
}

apiRouter.post('/notifications', requireAnyPermission(['canManageNotifications', 'canDeleteNotifications']), async (req, res, next) => {
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
        !sessionHasPermission(req.session, 'canManageNotifications') &&
        !isDeleteOnlyNotificationsChange(existingNotifications, notifications)
      ) {
        const error = new Error('Missing canManageNotifications permission');
        error.statusCode = 403;
        throw error;
      }
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
      await logActivity(req.session.email, 'version_conflict', { route: '/api/notifications', site });
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
    canDelete: sessionHasPermission(session, 'canDeleteSurveys'),
    canPin: sessionHasPermission(session, 'canEditSurveys'),
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
      const nextState = normalizeRuntimeState(state);
      nextState.siteData = nextState.siteData && typeof nextState.siteData === 'object' ? { ...nextState.siteData } : {};
      const currentEntry = nextState.siteData[site] && typeof nextState.siteData[site] === 'object' ? nextState.siteData[site] : {};
      const surveys = getSurveyListFromState(nextState, site).slice();
      surveys.push(survey);
      nextState.siteData[site] = { ...currentEntry, surveys };
      nextState.savedAt = now;
      nextState.savedBy = req.session.email;
      nextState.savedByName = getSessionDisplayName(req.session);
      nextState.updatedAt = now;
      nextState.updatedBy = req.session.email;
      nextState.updatedByName = getSessionDisplayName(req.session);
      nextState.module = 'surveys';
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
      const nextState = normalizeRuntimeState(state);
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
      applyStateEditMetadata(nextState, req.session, 'surveys');
      return nextState;
    });
    await logActivity(req.session.email, 'survey_voted', { site, surveyId, answerId });
    res.json({ ok: true, survey: redactSurveyForSession(updatedSurvey, req.session, site), version: saved.version || 1 });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

// DELETE /surveys/:surveyId
apiRouter.delete('/surveys/:surveyId', requirePermission('canDeleteSurveys'), async (req, res, next) => {
  try {
    if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot delete surveys' });
    const site = sanitizeString(req.body?.site || req.query.site || req.session.currentSite || 'default', 80);
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    const surveyId = sanitizeString(req.params.surveyId, 120);
    const saved = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = normalizeRuntimeState(state);
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
      applyStateEditMetadata(nextState, req.session, 'surveys');
      return nextState;
    });
    await logActivity(req.session.email, 'survey_deleted', { site, surveyId });
    res.json({ ok: true, version: saved.version || 1 });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

// PATCH /surveys/:surveyId/pin - Pin/unpin a survey
apiRouter.patch('/surveys/:surveyId/pin', requirePermission('canEditSurveys'), async (req, res, next) => {
  try {
    if (req.session.isReadonly) return res.status(403).json({ error: 'Read-only users cannot pin surveys' });
    const site = sanitizeString(req.query.site || req.session.currentSite || 'default', 80);
    if (!canAccessSite(req.session, site)) return res.status(403).json({ error: 'Access denied to this site' });
    const surveyId = sanitizeString(req.params.surveyId, 120);
    const pinned = req.body?.pinned === true || req.body?.pinned === 'true';
    let updatedSurvey = null;
    const saved = await mutateVersionedJsonFile(stateFile, null, async (state) => {
      const nextState = normalizeRuntimeState(state);
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
      applyStateEditMetadata(nextState, req.session, 'surveys');
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
    const nextState = normalizeRuntimeState(state);
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
      await logActivity(session?.email, 'locked_past_day_edit_attempt', {
        module,
        site,
        source: 'import',
      });
      throw createPastDayLockedError();
    }
    const updatedAt = new Date().toISOString();
    nextState.savedAt = updatedAt;
    nextState.savedBy = session?.email;
    nextState.savedByName = getSessionDisplayName(session);
    nextState.updatedAt = updatedAt;
    nextState.updatedBy = session?.email;
    nextState.updatedByName = getSessionDisplayName(session);
    nextState.module = module;
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

apiRouter.post('/backup/restore/dry-run', requirePermission('canRestoreBackups'), backupLimiter, async (req, res, next) => {
  try {
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot dry-run restore' });
    }
    const backupId = sanitizeString(req.body?.id || req.body?.filename || '', 255);
    if (!backupId) return res.status(400).json({ error: 'Missing backup id' });
    const snapshot = await readBackupSnapshotById(backupId);
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ error: 'BACKUP_STRUCTURE_INVALID' });
    }
    const currentSnapshot = await buildCurrentBackupEquivalentSnapshot();
    const currentSummary = buildBackupModuleSummary(currentSnapshot);
    const previewSummary = buildBackupModuleSummary(snapshot);
    const diff = buildSummaryDiff(currentSummary, previewSummary);
    const restoreToken = createRestoreApprovalToken({
      backupId,
      userEmail: req.session.email,
      diff,
      previewSummary,
    });
    await logActivity(req.session.email, 'backup_restore_dry_run', {
      backup: backupId,
      diffChecksum: stableChecksum(diff),
      previewChecksum: stableChecksum(previewSummary),
      changedModules: diff.filter((entry) => entry.delta !== 0).map((entry) => entry.module),
    });
    return res.json({
      ok: true,
      backup: backupId,
      dryRun: true,
      restoreToken,
      tokenExpiresInMs: RESTORE_APPROVAL_TTL_MS,
      summary: {
        current: currentSummary,
        restore: previewSummary,
        diff,
      },
    });
  } catch (error) {
    if (error?.message === 'BACKUP_NOT_FOUND') return res.status(404).json({ error: 'Backup not found' });
    if (error?.message === 'INVALID_BACKUP_ID' || error?.message === 'BACKUP_STRUCTURE_INVALID') {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
    next(error);
  }
});

apiRouter.post('/backup/restore', requirePermission('canRestoreBackups'), backupLimiter, async (req, res, next) => {
  try {
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot restore backups' });
    }
    const backupId = sanitizeString(req.body?.id || req.body?.filename || '', 255);
    if (!backupId) return res.status(400).json({ error: 'Missing backup id' });
    const confirmationText = sanitizeString(req.body?.confirmationText || req.body?.confirmText || '', 40).toUpperCase();
    const restoreToken = sanitizeString(req.body?.restoreToken || '', 120);
    if (confirmationText !== 'RESTORE') {
      return res.status(400).json({ error: 'RESTORE_CONFIRMATION_REQUIRED' });
    }
    if (!restoreToken) {
      return res.status(400).json({ error: 'RESTORE_APPROVAL_REQUIRED' });
    }
    const previewSnapshot = await readBackupSnapshotById(backupId);
    const currentSnapshot = await buildCurrentBackupEquivalentSnapshot();
    const currentSummary = buildBackupModuleSummary(currentSnapshot);
    const previewSummary = buildBackupModuleSummary(previewSnapshot);
    const diff = buildSummaryDiff(currentSummary, previewSummary);
    validateRestoreApprovalToken({
      token: restoreToken,
      backupId,
      userEmail: req.session.email,
      diff,
      previewSummary,
    });
    const restoredResult = await restoreBackupSnapshot(backupId, req.session.email);
    const integrity = restoredResult?.integrity || { ok: false, mismatches: [] };
    res.json({
      ok: true,
      restored: true,
      backup: backupId,
      restoredAt: new Date().toISOString(),
      storageType: restoredResult?.snapshot?.storageType || STORAGE_TYPE,
      integrity,
    });
    await logActivity(req.session.email, 'backup_restore_confirmed', {
      backup: backupId,
      integrityOk: integrity.ok === true,
      mismatchCount: Array.isArray(integrity.mismatches) ? integrity.mismatches.length : 0,
    });
  } catch (error) {
    if (error?.message === 'BACKUP_NOT_FOUND') return res.status(404).json({ error: 'Backup not found' });
    if (error?.message === 'INVALID_BACKUP_ID' || error?.message === 'BACKUP_STRUCTURE_INVALID') {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
    if ([
      'RESTORE_APPROVAL_REQUIRED',
      'RESTORE_APPROVAL_INVALID',
      'RESTORE_APPROVAL_EXPIRED',
      'RESTORE_APPROVAL_STALE',
    ].includes(error?.message)) {
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

app.get(['/', '/login', '/home', '/planner', '/tidplan', '/bins', '/kante', '/warehouse', '/store', '/workwear', '/chat', '/reports', '/notifications', '/surveys', '/settings'], (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.use((error, req, res, next) => {
  logServerError(error, req?.path || 'middleware');
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large' || Number(error?.status) === 413) {
    return res.status(413).json({
      error: 'PAYLOAD_TOO_LARGE',
      limit: API_BODY_LIMIT,
    });
  }
  if (error instanceof SyntaxError && error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'INVALID_JSON' });
  }
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

