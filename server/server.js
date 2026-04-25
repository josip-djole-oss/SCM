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
const { VersionConflictError, createStorage } = require('./storage');

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const API_BODY_LIMIT = process.env.API_BODY_LIMIT || '5mb';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 15000;
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 8 * 60 * 60 * 1000;
const PRESENCE_TTL_MS = 60000;
const AUTO_BACKUP_INTERVAL_MS = Number(process.env.AUTO_BACKUP_INTERVAL_MS) || 24 * 60 * 60 * 1000;
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
  canViewWarehouse: false,
  canManageWarehouse: false,
  canManageWarehouseStock: false,
  canManageWarehouseIssue: false,
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
  canViewWarehouse: false,
  canManageWarehouse: false,
  canManageWarehouseStock: false,
  canManageWarehouseIssue: false,
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

async function persistAdmins(adminsInput) {
  const existingAdmins = await readAdmins();
  const existingByEmail = new Map(existingAdmins.map((admin) => [admin.email, admin]));
  const nextAdmins = [];

  for (const candidate of Array.isArray(adminsInput) ? adminsInput : []) {
    const normalized = normalizeAdminRecord(candidate);
    if (!normalized.email || !isValidEmail(normalized.email)) continue;
    const existing = existingByEmail.get(normalized.email);
    if (normalized.password) {
      normalized.password = isPasswordHash(normalized.password)
        ? normalized.password
        : await bcrypt.hash(normalized.password, BCRYPT_ROUNDS);
    } else if (existing?.password) {
      normalized.password = existing.password;
    }
    nextAdmins.push(normalized);
  }

  await writeVersionedJsonFile(adminsFile, nextAdmins, { fallbackValue: [] });
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

async function buildPublicStatePayload(document) {
  const responseState = document?.data && typeof document.data === 'object'
    ? { ...document.data }
    : null;

  if (responseState) {
    if (Array.isArray(responseState.admins)) {
      responseState.admins = responseState.admins.map((admin) => redactAdminRecord(admin));
    } else if (responseState.version === 2) {
      const admins = await readAdmins();
      responseState.admins = admins.map((admin) => redactAdminRecord(admin));
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
  if (!site) site = 'default';
  // Super admins can access all sites
  if (session.isSuperAdmin) return true;
  // If no allowedSites specified, user has access to all sites
  if (!Array.isArray(session.allowedSites)) return true;
  // Check if site is in allowed list
  return session.allowedSites.includes(site);
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.session) return res.status(401).json({ error: 'Authentication required' });
    if (req.session.isSuperAdmin) return next();
    if (req.session.permissions && req.session.permissions[permissionKey] === true) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
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
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
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

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  const storageStatus = getStorageStatusPayload();
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    storageType: STORAGE_TYPE,
    storageReady: storageStatus.ready,
    storage: storageStatus,
  });
});

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return requireStorageReady(req, res, next);
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

const apiRouter = express.Router();
apiRouter.use(requireAuth);
apiRouter.use(requireCsrf);

apiRouter.get('/state', async (req, res, next) => {
  try {
    const document = await getStateDocument();
    res.json(await buildPublicStatePayload(document));
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

    if (!state.siteData || typeof state.siteData !== 'object' || Object.keys(state.siteData).length === 0) {
      return res.status(400).json({ error: 'Empty state payload rejected' });
    }
    
    const savedDocument = await writeVersionedJsonFile(stateFile, {
      ...state,
      savedAt: new Date().toISOString(),
      savedBy: req.session.email,
    }, {
      lastKnownVersion,
      fallbackValue: null,
    });
    if (state && Array.isArray(state.admins)) {
      await persistAdmins(state.admins);
    }
    res.json({
      ok: true,
      version: savedDocument.version,
      updatedAt: savedDocument.updatedAt,
    });
  } catch (error) {
    if (isVersionConflictError(error)) {
      return sendVersionConflict(res, async () => buildPublicStatePayload(await getStateDocument()));
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

apiRouter.get('/admin/backup', requireAdmin, backupLimiter, async (req, res, next) => {
  try {
    const backup = await createBackupSnapshot(`manual-${req.session.email || 'admin'}`);
    if (!backup) {
      return res.status(500).json({ error: 'Failed to create backup' });
    }
    await logActivity(req.session.email, 'manual_backup', {
      file: backup.filename,
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
      currentSite: entry.currentSite,
      currentView: entry.currentView,
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
    currentSite: sanitizeString(body.currentSite || 'default', 80),
    currentView: sanitizeString(body.currentView || 'planner', 80),
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

apiRouter.get('/reports', requireAuth, async (req, res, next) => {
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
  if (!Number.isFinite(lastKnownVersion) || lastKnownVersion < 1) {
    return res.status(400).json({ error: 'Missing lastKnownVersion' });
  }
  const savedDocument = await writeVersionedJsonFile(getReportsFilePath(site), reports, {
    lastKnownVersion,
    fallbackValue: [],
  });
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
  if (!Number.isFinite(lastKnownVersion) || lastKnownVersion < 1) {
    return res.status(400).json({ error: 'Missing lastKnownVersion' });
  }
  const savedDocument = await writeVersionedJsonFile(getNotificationsFilePath(site), notifications, {
    lastKnownVersion,
    fallbackValue: [],
  });
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

app.use('/api', apiRouter);

app.get('/', (req, res) => {
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
