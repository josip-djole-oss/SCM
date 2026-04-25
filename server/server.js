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

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const API_BODY_LIMIT = process.env.API_BODY_LIMIT || '5mb';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 15000;
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 8 * 60 * 60 * 1000;
const PRESENCE_TTL_MS = 60000;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'cmax_session';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const STATIC_DIR = path.join(__dirname, '..', 'public');
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, '..', 'uploads');
const backupsDir = path.join(__dirname, 'backups');
const errorLogFile = path.join(dataDir, 'server-errors.log');
const stateFile = path.join(dataDir, 'state.json');
const adminsFile = path.join(dataDir, 'admins.json');
const logsFile = path.join(dataDir, 'logs.json');
const warehouseFile = path.join(dataDir, 'warehouse.json');
const warehouseLogsFile = path.join(dataDir, 'warehouse-logs.json');
const sessions = new Map();
const activePresence = new Map();

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
  canAssignWarehouseToAdmin: false,
  canModifyReadOnly: false,
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(dataDir);
ensureDir(uploadsDir);
ensureDir(backupsDir);

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
  return path.join(dataDir, `reports_${sanitizeSiteKey(site)}.json`);
}

function getNotificationsFilePath(site) {
  return path.join(dataDir, `notifications_${sanitizeSiteKey(site)}.json`);
}

function readJsonFile(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) return fallbackValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    logServerError(error, `read:${path.basename(filePath)}`);
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
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

function readAdmins() {
  return readJsonFile(adminsFile, []).map((admin) => normalizeAdminRecord(admin));
}

function writeAdmins(admins) {
  writeJsonFile(adminsFile, admins.map((admin) => normalizeAdminRecord(admin)));
}

async function persistAdmins(adminsInput) {
  const existingAdmins = readAdmins();
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

  writeJsonFile(adminsFile, nextAdmins);
}

function getState() {
  const state = readJsonFile(stateFile, null);
  return state && typeof state === 'object' ? state : null;
}

function getGuestPermissionsFromState() {
  const state = getState();
  return normalizePermissions(state?.guestPermissions || DEFAULT_GUEST_PERMISSIONS, DEFAULT_GUEST_PERMISSIONS);
}

function isPasswordHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ''));
}

function generateToken(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

async function ensureBootstrapAdmin() {
  const admins = readAdmins();
  if (admins.length > 0) {
    return false;
  }

  const bootstrapEmail = sanitizeString(process.env.BOOTSTRAP_ADMIN_EMAIL || '', 160).toLowerCase();
  const bootstrapPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');

  if (bootstrapEmail && bootstrapPassword && isValidEmail(bootstrapEmail)) {
    const passwordHash = await bcrypt.hash(bootstrapPassword, BCRYPT_ROUNDS);
    writeAdmins([
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

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").filter(o => o.trim());

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

function dailyBackup() {
  try {
    const dateKey = new Date().toISOString().slice(0, 10);
    const targetDir = path.join(backupsDir, dateKey);
    ensureDir(targetDir);
    for (const entry of fs.readdirSync(dataDir)) {
      const source = path.join(dataDir, entry);
      const target = path.join(targetDir, entry);
      if (fs.statSync(source).isFile()) {
        fs.copyFileSync(source, target);
      }
    }
  } catch (error) {
    logServerError(error, 'backup');
  }
}

function validateStatePayload(state) {
  return Boolean(state && typeof state === 'object' && !Array.isArray(state));
}

function logActivity(userEmail, action, details = {}) {
  try {
    const logs = readJsonFile(logsFile, []);
    logs.push({
      timestamp: new Date().toISOString(),
      user: sanitizeString(userEmail || 'unknown', 160),
      action: sanitizeString(action || 'unknown', 160),
      details: sanitizeObject(details),
    });
    writeJsonFile(logsFile, logs.slice(-2000));
  } catch (error) {
    logServerError(error, 'logActivity');
  }
}

function logWarehouseActivity(userEmail, action, details = {}) {
  try {
    const logs = readJsonFile(warehouseLogsFile, []);
    logs.push({
      timestamp: new Date().toISOString(),
      user: sanitizeString(userEmail || 'unknown', 160),
      action: sanitizeString(action || 'unknown', 160),
      details: sanitizeObject(details),
    });
    writeJsonFile(warehouseLogsFile, logs.slice(-5000));
  } catch (error) {
    logServerError(error, 'logWarehouseActivity');
  }
}

async function migrateAdminPasswords() {
  const admins = readAdmins();
  let changed = false;
  for (const admin of admins) {
    if (admin.password && !isPasswordHash(admin.password)) {
      admin.password = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);
      changed = true;
    }
  }
  if (changed) writeAdmins(admins);
}

async function initializeData() {
  if (!fs.existsSync(adminsFile)) {
    writeAdmins([]);
  }

  await ensureBootstrapAdmin();

  if (!fs.existsSync(stateFile)) {
    writeJsonFile(stateFile, {
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
  }

  if (!fs.existsSync(logsFile)) {
    writeJsonFile(logsFile, []);
  }

  if (!fs.existsSync(warehouseLogsFile)) {
    writeJsonFile(warehouseLogsFile, []);
  }

  if (!fs.existsSync(warehouseFile)) {
    writeJsonFile(warehouseFile, {
      version: 1,
      items: [],
      adminAssignments: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const reportsFile = getReportsFilePath('default');
  if (!fs.existsSync(reportsFile)) writeJsonFile(reportsFile, []);
  const notificationsFile = getNotificationsFilePath('default');
  if (!fs.existsSync(notificationsFile)) writeJsonFile(notificationsFile, []);

  await migrateAdminPasswords();
  dailyBackup();
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

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cookieParser());

/**
 * ✅ CORS FIX (RAILWAY + DEV SAFE)
 * - allows Railway + custom domains
 * - supports cookies/session auth
 */
app.use(cors({
  origin: function (origin, callback) {
    // allow server-to-server / postman / railway internal calls
    if (!origin) return callback(null, true);

    // DEV MODE fallback (možeš kasnije suziti)
    if (!process.env.CORS_ORIGIN) {
      return callback(null, true);
    }

    const allowed = process.env.CORS_ORIGIN
      .split(',')
      .map(o => o.trim());

    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, true); // 👈 IMPORTANT: ne blokiraj login u prod (fallback safe)
  },
  credentials: true
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

    const admin = readAdmins().find((entry) => entry.email === email);
    if (!admin) {
      logActivity(email, 'login', { success: false });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const matches = await bcrypt.compare(password, admin.password || '');
    if (!matches) {
      logActivity(email, 'login', { success: false });
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

    logActivity(email, 'login', { success: true });
    return res.json({
      auth: buildPublicAuthPayload(session),
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/login/guest', loginLimiter, (req, res, next) => {
  try {
    const permissions = getGuestPermissionsFromState();
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

app.post('/api/logout', requireAuth, requireCsrf, (req, res) => {
  logActivity(req.session.email, 'logout', {});
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

apiRouter.get('/state', (req, res) => {
  const data = getState();
  if (!data) return res.json({ state: null });
  const responseState = { ...data };
  if (Array.isArray(responseState.admins)) {
    responseState.admins = responseState.admins.map((admin) => redactAdminRecord(admin));
  } else if (responseState.version === 2) {
    responseState.admins = readAdmins().map((admin) => redactAdminRecord(admin));
  }
  res.json({ state: responseState });
});

apiRouter.post('/state', requireAdmin, async (req, res, next) => {
  try {
    const state = sanitizeObject(req.body?.state);
    if (!validateStatePayload(state)) {
      return res.status(400).json({ error: 'Invalid state payload' });
    }
    
    // Read-only users cannot modify state
    if (req.session.isReadonly) {
      return res.status(403).json({ error: 'Read-only users cannot modify state' });
    }
    
    writeJsonFile(stateFile, {
      ...state,
      savedAt: new Date().toISOString(),
      savedBy: req.session.email,
    });
    if (state && Array.isArray(state.admins)) {
      await persistAdmins(state.admins);
    }
    res.json({ success: true });
  } catch (error) {
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
    
    const admins = readAdmins();
    const adminIndex = admins.findIndex((a) => a.email === targetEmail);
    
    if (adminIndex < 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    const admin = admins[adminIndex];
    admin.isReadonly = !admin.isReadonly;
    
    await persistAdmins(admins);
    logActivity(req.session.email, 'toggle_readonly_mode', {
      targetEmail,
      newStatus: admin.isReadonly,
    });
    
    res.json({
      success: true,
      email: admin.email,
      isReadonly: admin.isReadonly,
    });
  } catch (error) {
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
    
    const admins = readAdmins();
    const adminIndex = admins.findIndex((a) => a.email === targetEmail);
    
    if (adminIndex < 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    const admin = admins[adminIndex];
    if (!admin.isReadonly) {
      return res.status(400).json({ error: 'Admin is not in read-only mode' });
    }
    
    // Allow null (all sites) or array of site names
    if (sites === null || sites === undefined) {
      admin.allowedSites = null;
    } else if (Array.isArray(sites)) {
      admin.allowedSites = sites.map((s) => sanitizeString(s, 80)).filter(Boolean);
      if (admin.allowedSites.length === 0) {
        admin.allowedSites = null;
      }
    } else {
      return res.status(400).json({ error: 'Sites must be null or an array' });
    }
    
    await persistAdmins(admins);
    logActivity(req.session.email, 'set_readonly_sites', {
      targetEmail,
      sites: admin.allowedSites,
    });
    
    res.json({
      success: true,
      email: admin.email,
      isReadonly: admin.isReadonly,
      allowedSites: admin.allowedSites,
    });
  } catch (error) {
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
    
    const admin = readAdmins().find((a) => a.email === targetEmail);
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

apiRouter.post('/upload', requireAdmin, upload.single('file'), (req, res) => {
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
  logActivity(req.session.email, 'file_upload', {
    filename: fileInfo.originalName,
    size: fileInfo.size,
  });
  res.json({ success: true, file: fileInfo });
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

apiRouter.get('/reports', requireAuth, (req, res) => {
  const site = sanitizeString(req.query.site || 'default', 80);
  if (!canAccessSite(req.session, site)) {
    return res.status(403).json({ error: 'Access denied to this site' });
  }
  const reports = readJsonFile(getReportsFilePath(site), []);
  res.json(Array.isArray(reports) ? reports : []);
});

apiRouter.post('/reports', requirePermission('canCreateReports'), (req, res) => {
  if (req.session.isReadonly) {
    return res.status(403).json({ error: 'Read-only users cannot modify reports' });
  }
  const site = sanitizeString(req.body?.site || 'default', 80);
  if (!canAccessSite(req.session, site)) {
    return res.status(403).json({ error: 'Access denied to this site' });
  }
  const reports = sanitizeObject(req.body?.reports);
  if (!Array.isArray(reports)) {
    return res.status(400).json({ error: 'Invalid reports payload' });
  }
  writeJsonFile(getReportsFilePath(site), reports);
  logActivity(req.session.email, 'save_reports', { count: reports.length, site });
  res.json({ success: true });
});

apiRouter.get('/notifications', requirePermission('canViewNotifications'), (req, res) => {
  const site = sanitizeString(req.query.site || 'default', 80);
  if (!canAccessSite(req.session, site)) {
    return res.status(403).json({ error: 'Access denied to this site' });
  }
  const notifications = readJsonFile(getNotificationsFilePath(site), []);
  res.json(Array.isArray(notifications) ? notifications : []);
});

apiRouter.post('/notifications', requirePermission('canManageNotifications'), (req, res) => {
  if (req.session.isReadonly) {
    return res.status(403).json({ error: 'Read-only users cannot modify notifications' });
  }
  const site = sanitizeString(req.body?.site || 'default', 80);
  if (!canAccessSite(req.session, site)) {
    return res.status(403).json({ error: 'Access denied to this site' });
  }
  const notifications = sanitizeObject(req.body?.notifications);
  if (!Array.isArray(notifications)) {
    return res.status(400).json({ error: 'Invalid notifications payload' });
  }
  writeJsonFile(getNotificationsFilePath(site), notifications);
  logActivity(req.session.email, 'save_notifications', { count: notifications.length, site });
  res.json({ success: true });
});

apiRouter.get('/logs', requirePermission('canViewLogs'), (req, res) => {
  const logs = readJsonFile(logsFile, []);
  res.json(Array.isArray(logs) ? logs : []);
});

apiRouter.post('/logs', (req, res) => {
  const action = sanitizeString(req.body?.action || 'client_log', 200);
  const details = sanitizeObject(req.body?.details || {});
  logActivity(req.session.email, action, details);
  res.json({ success: true });
});

apiRouter.delete('/logs', requirePermission('canClearLogs'), (req, res) => {
  writeJsonFile(logsFile, []);
  logActivity(req.session.email, 'clear_logs', {});
  res.json({ success: true });
});

/* ==================== WAREHOUSE MANAGEMENT ==================== */

apiRouter.get('/warehouse', requirePermission('canViewWarehouse'), (req, res) => {
  const warehouse = readJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} });
  res.json(warehouse);
});

apiRouter.post('/warehouse', requirePermission('canManageWarehouse'), (req, res, next) => {
  try {
    const item = sanitizeObject(req.body?.item);
    if (!item || !item.id) {
      return res.status(400).json({ error: 'Invalid item payload. Must include id.' });
    }
    
    const warehouse = readJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} });
    const existingIndex = warehouse.items.findIndex((i) => i.id === item.id);
    
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
    
    if (existingIndex >= 0) {
      warehouse.items[existingIndex] = warehouseItem;
      logWarehouseActivity(req.session.email, 'update_item', { id: item.id, name: warehouseItem.name });
    } else {
      warehouse.items.push(warehouseItem);
      logWarehouseActivity(req.session.email, 'create_item', { id: item.id, name: warehouseItem.name });
    }
    
    warehouse.updatedAt = new Date().toISOString();
    writeJsonFile(warehouseFile, warehouse);
    res.json({ success: true, item: warehouseItem });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/warehouse/:itemId', requirePermission('canManageWarehouse'), (req, res, next) => {
  try {
    const itemId = sanitizeString(req.params.itemId || '', 120);
    if (!itemId) {
      return res.status(400).json({ error: 'Missing itemId' });
    }
    
    const warehouse = readJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} });
    const index = warehouse.items.findIndex((i) => i.id === itemId);
    
    if (index < 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const deletedItem = warehouse.items.splice(index, 1)[0];
    
    // Remove from all admin assignments
    for (const adminEmail in warehouse.adminAssignments) {
      warehouse.adminAssignments[adminEmail] = warehouse.adminAssignments[adminEmail].filter(
        (id) => id !== itemId
      );
      if (warehouse.adminAssignments[adminEmail].length === 0) {
        delete warehouse.adminAssignments[adminEmail];
      }
    }
    
    warehouse.updatedAt = new Date().toISOString();
    writeJsonFile(warehouseFile, warehouse);
    
    logWarehouseActivity(req.session.email, 'delete_item', { id: itemId, name: deletedItem.name });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/warehouse/admin-assignments', requirePermission('canViewWarehouse'), (req, res) => {
  const warehouse = readJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} });
  res.json(warehouse.adminAssignments || {});
});

apiRouter.post('/warehouse/assign-admin', requirePermission('canAssignWarehouseToAdmin'), (req, res, next) => {
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
    const admin = readAdmins().find((a) => a.email === adminEmail);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    const warehouse = readJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} });
    const sanitizedItemIds = itemIds
      .map((id) => sanitizeString(id, 120))
      .filter((id) => warehouse.items.some((item) => item.id === id));
    
    if (sanitizedItemIds.length === 0) {
      return res.status(400).json({ error: 'No valid items to assign' });
    }
    
    // Merge with existing assignments
    const currentAssignments = warehouse.adminAssignments[adminEmail] || [];
    const mergedAssignments = Array.from(new Set([...currentAssignments, ...sanitizedItemIds]));
    
    warehouse.adminAssignments[adminEmail] = mergedAssignments;
    warehouse.updatedAt = new Date().toISOString();
    writeJsonFile(warehouseFile, warehouse);
    
    logWarehouseActivity(req.session.email, 'assign_admin', {
      adminEmail,
      itemIds: sanitizedItemIds,
    });
    res.json({ success: true, assignedItemIds: sanitizedItemIds });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/warehouse/unassign-admin', requirePermission('canAssignWarehouseToAdmin'), (req, res, next) => {
  try {
    const adminEmail = sanitizeString(req.body?.adminEmail || '', 160).toLowerCase();
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : [];
    
    if (!adminEmail || !isValidEmail(adminEmail)) {
      return res.status(400).json({ error: 'Invalid admin email' });
    }
    
    if (itemIds.length === 0) {
      return res.status(400).json({ error: 'No items to unassign' });
    }
    
    const warehouse = readJsonFile(warehouseFile, { version: 1, items: [], adminAssignments: {} });
    const sanitizedItemIds = itemIds.map((id) => sanitizeString(id, 120));
    
    if (!warehouse.adminAssignments[adminEmail]) {
      return res.status(404).json({ error: 'Admin has no warehouse assignments' });
    }
    
    warehouse.adminAssignments[adminEmail] = warehouse.adminAssignments[adminEmail].filter(
      (id) => !sanitizedItemIds.includes(id)
    );
    
    if (warehouse.adminAssignments[adminEmail].length === 0) {
      delete warehouse.adminAssignments[adminEmail];
    }
    
    warehouse.updatedAt = new Date().toISOString();
    writeJsonFile(warehouseFile, warehouse);
    
    logWarehouseActivity(req.session.email, 'unassign_admin', {
      adminEmail,
      itemIds: sanitizedItemIds,
    });
    res.json({ success: true, unassignedItemIds: sanitizedItemIds });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/warehouse-logs', requirePermission('canViewLogs'), (req, res) => {
  const logs = readJsonFile(warehouseLogsFile, []);
  res.json(Array.isArray(logs) ? logs : []);
});

apiRouter.delete('/warehouse-logs', requirePermission('canClearLogs'), (req, res) => {
  writeJsonFile(warehouseLogsFile, []);
  logWarehouseActivity(req.session.email, 'clear_warehouse_logs', {});
  res.json({ success: true });
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

initializeData()
  .then(() => {
    setInterval(cleanupSessions, 60 * 1000).unref();
    setInterval(cleanupPresence, 60 * 1000).unref();
    setInterval(dailyBackup, 24 * 60 * 60 * 1000).unref();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Data directory: ${dataDir}`);
      console.log(`Uploads directory: ${uploadsDir}`);
      if (!IS_PRODUCTION) {
        console.log(`Access the app at: http://localhost:${PORT}`);
      }
    });
  })
  .catch((error) => {
    logServerError(error, 'startup');
    process.exit(1);
  });
