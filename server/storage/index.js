const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { atomicWriteJson, isWithin } = require('./atomic-file');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function normalizeSiteKey(site) {
  const value = String(site || 'default').trim() || 'default';
  return /^[a-zA-Z0-9_-]+$/.test(value) ? value : `site~${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function legacySiteKey(site) {
  return String(site || 'default').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'default';
}

function createSitePaths(dataDir) {
  const targets = new Map();
  return {
    targets,
    get(kind, site) {
      const originalSite = String(site || 'default').trim() || 'default';
      const current = path.join(dataDir, `${kind}_${normalizeSiteKey(originalSite)}.json`);
      targets.set(path.normalize(current), {
        originalSite, legacySite: legacySiteKey(originalSite),
        legacyPath: path.join(dataDir, `${kind}_${legacySiteKey(originalSite)}.json`),
      });
      return current;
    },
  };
}

function assertUnambiguousLegacySite(target, state) {
  const sites = Array.isArray(state?.sites) ? state.sites : [];
  const collisions = sites.map(String).filter((site) => legacySiteKey(site) === target.legacySite && site.trim() !== target.originalSite);
  if (collisions.length) {
    const error = new Error('Legacy project documents have ambiguous file keys; preserve the originals and explicitly assign their project before migration.');
    error.code = 'AMBIGUOUS_LEGACY_SITE_KEY';
    throw error;
  }
}

function exportSiteDocuments(documents, state) {
  const result = {};
  const sites = Array.isArray(state?.sites) ? state.sites.map(String) : [];
  for (const [key, value] of Object.entries(documents)) {
    const exact = sites.find((site) => normalizeSiteKey(site) === key);
    const legacy = sites.filter((site) => legacySiteKey(site) === key);
    const original = exact || (legacy.length === 1 ? legacy[0] : key);
    // A newer document under the collision-safe key wins over its preserved legacy copy.
    if (!exact && original !== key && Object.hasOwn(documents, normalizeSiteKey(original))) continue;
    result[original] = value;
  }
  return result;
}

function createFileMap(dataDir) {
  return {
    errorLog: path.join(dataDir, 'server-errors.log'),
    state: path.join(dataDir, 'state.json'),
    admins: path.join(dataDir, 'admins.json'),
    logs: path.join(dataDir, 'logs.json'),
    warehouse: path.join(dataDir, 'warehouse.json'),
    warehouseLogs: path.join(dataDir, 'warehouse-logs.json'),
    toolroom: path.join(dataDir, 'toolroom.json'),
    siteChat: path.join(dataDir, 'site-chat.json'),
  };
}

class VersionConflictError extends Error {
  constructor(latest) {
    super('Document version conflict');
    this.name = 'VersionConflictError';
    this.code = 'VERSION_CONFLICT';
    this.latest = latest;
  }
}

function isDocumentEnvelope(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof value.version === 'number' &&
      Object.prototype.hasOwnProperty.call(value, 'data'),
  );
}

function createEnvelope(data, version = 1, updatedAt = new Date().toISOString()) {
  return {
    version: Math.max(1, Number(version) || 1),
    updatedAt,
    data,
  };
}

function normalizeDocument(rawValue, fallbackValue) {
  if (isDocumentEnvelope(rawValue)) {
    return {
      exists: true,
      version: Math.max(1, Number(rawValue.version) || 1),
      updatedAt: rawValue.updatedAt || null,
      data: rawValue.data,
    };
  }
  if (rawValue === undefined) {
    return {
      exists: false,
      version: 1,
      updatedAt: null,
      data: fallbackValue,
    };
  }
  return {
    exists: true,
    version: 1,
    updatedAt: null,
    data: rawValue,
  };
}

function createUnavailableStorage(options = {}, error) {
  const dataDir = options.dataDir;
  const uploadsDir = options.uploadsDir;
  const backupsDir = options.backupsDir || path.join(dataDir, 'backups');
  const files = createFileMap(dataDir);
  const failure = error instanceof Error ? error : new Error(String(error || 'Storage unavailable'));

  async function fail() {
    throw failure;
  }

  return {
    storageType: String(options.storageType || 'json').trim().toLowerCase(),
    dataDir,
    uploadsDir,
    backupsDir,
    files,
    available: false,
    retryable: false,
    startupError: failure,
    async init() { return fail(); },
    async ensureBaseStructure() {
      ensureDir(dataDir);
      ensureDir(uploadsDir);
      ensureDir(backupsDir);
    },
    async ensureJsonFile() { return fail(); },
    async readJson() { return fail(); },
    async writeJson() { return fail(); },
    async readDocument() { return fail(); },
    async writeDocument() { return fail(); },
    async mutateDocument() { return fail(); },
    async getAll() { return fail(); },
    async save() { return fail(); },
    async update() { return fail(); },
    async delete() { return fail(); },
    async exportAll() { return fail(); },
    async saveBackupSnapshot() { return fail(); },
    async readBackupSnapshot() { return fail(); },
    async getLastBackupTime() { return fail(); },
    async listBackups() { return fail(); },
    getReportsFilePath(site) {
      return path.join(dataDir, `reports_${normalizeSiteKey(site)}.json`);
    },
    getNotificationsFilePath(site) {
      return path.join(dataDir, `notifications_${normalizeSiteKey(site)}.json`);
    },
  };
}

function createJsonStorage(options = {}) {
  const dataDir = options.dataDir;
  const uploadsDir = options.uploadsDir;
  const backupsDir = options.backupsDir || path.join(dataDir, 'backups');
  const files = createFileMap(dataDir);
  const documentLocks = new Map();
  const sitePaths = createSitePaths(dataDir);

  function listBackupFiles() {
    if (!fs.existsSync(backupsDir)) return [];
    return fs.readdirSync(backupsDir)
      .filter((entry) => path.extname(entry).toLowerCase() === '.json')
      .map((entry) => {
        const filePath = path.join(backupsDir, entry);
        const stats = fs.statSync(filePath);
        return {
          id: entry,
          filename: entry,
          filePath,
          createdAt: stats.mtime.toISOString(),
          timestamp: stats.mtimeMs,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async function withDocumentLock(filePath, operation) {
    const lockKey = path.normalize(filePath);
    const previous = documentLocks.get(lockKey) || Promise.resolve();
    const next = previous.catch(() => {}).then(operation);
    const tail = next.then(() => undefined, () => undefined).finally(() => {
      if (documentLocks.get(lockKey) === tail) {
        documentLocks.delete(lockKey);
      }
    });
    documentLocks.set(lockKey, tail);
    return next;
  }

  async function readRawFile(filePath) {
    const target = sitePaths.targets.get(path.normalize(filePath));
    const actual = fs.existsSync(filePath) ? filePath : target?.legacyPath;
    if (!actual || !fs.existsSync(actual)) return undefined;
    if (target && path.normalize(actual) === path.normalize(target.legacyPath)) {
      const rawState = fs.existsSync(files.state) ? JSON.parse(fs.readFileSync(files.state, 'utf8')) : null;
      assertUnambiguousLegacySite(target, normalizeDocument(rawState, null).data);
    }
    return JSON.parse(fs.readFileSync(actual, 'utf8'));
  }

  async function readDocument(filePath, fallbackValue) {
    return normalizeDocument(await readRawFile(filePath), fallbackValue);
  }

  async function writeDocument(filePath, value, options = {}) {
    return withDocumentLock(filePath, async () => {
      const current = await readDocument(filePath, options.fallbackValue);
      const expectedVersion = options.lastKnownVersion;
      if (
        expectedVersion !== undefined &&
        expectedVersion !== null &&
        Number(expectedVersion) !== Number(current.version)
      ) {
        throw new VersionConflictError({
          version: current.version,
          updatedAt: current.updatedAt,
          data: current.data,
        });
      }

      const nextVersion = current.exists ? current.version + 1 : 1;
      const envelope = createEnvelope(value, nextVersion);
      atomicWriteJson(filePath, envelope);
      return envelope;
    });
  }

  async function mutateDocument(filePath, fallbackValue, mutator) {
    return withDocumentLock(filePath, async () => {
      const current = await readDocument(filePath, fallbackValue);
      const nextData = await mutator(current.data, {
        version: current.version,
        updatedAt: current.updatedAt,
        exists: current.exists,
      });
      if (nextData === undefined) {
        throw new Error(`Mutator for ${filePath} returned undefined.`);
      }
      // Version 1 represents the readable fallback for an absent document.
      // The first real mutation must advance to 2 so a stale base version can be detected.
      const nextVersion = current.version + 1;
      const envelope = createEnvelope(nextData, nextVersion);
      atomicWriteJson(filePath, envelope);
      return envelope;
    });
  }

  async function readJson(filePath, fallbackValue) {
    const document = await readDocument(filePath, fallbackValue);
    return document.data;
  }

  async function exportAll() {
    const reports = {};
    const notifications = {};
    const state = await readJson(files.state, null);

    if (fs.existsSync(dataDir)) {
      for (const entry of fs.readdirSync(dataDir)) {
        const fullPath = path.join(dataDir, entry);
        if (!fs.statSync(fullPath).isFile() || path.extname(entry) !== '.json') continue;
        if (entry.startsWith('reports_')) {
          reports[path.basename(entry, '.json').slice('reports_'.length) || 'default'] =
            await readJson(fullPath, []);
        } else if (entry.startsWith('notifications_')) {
          notifications[path.basename(entry, '.json').slice('notifications_'.length) || 'default'] =
            await readJson(fullPath, []);
        }
      }
    }

    return {
      storageType: 'json',
      exportedAt: new Date().toISOString(),
      admins: await readJson(files.admins, []),
      state,
      reports: exportSiteDocuments(reports, state),
      notifications: exportSiteDocuments(notifications, state),
      logs: await readJson(files.logs, []),
      warehouse: await readJson(files.warehouse, null),
      warehouseLogs: await readJson(files.warehouseLogs, []),
      toolroom: await readJson(files.toolroom, null),
      siteChat: await readJson(files.siteChat, null),
    };
  }

  return {
    storageType: 'json',
    dataDir,
    uploadsDir,
    backupsDir,
    files,
    async init() {
      ensureDir(dataDir);
      ensureDir(uploadsDir);
      ensureDir(backupsDir);
    },
    async ensureBaseStructure() {
      ensureDir(dataDir);
      ensureDir(uploadsDir);
      ensureDir(backupsDir);
    },
    async ensureJsonFile(filePath, defaultValue) {
      return withDocumentLock(filePath, async () => {
        if (!fs.existsSync(filePath)) atomicWriteJson(filePath, createEnvelope(defaultValue, 1));
      });
    },
    async readJson(filePath, fallbackValue) {
      return readJson(filePath, fallbackValue);
    },
    async writeJson(filePath, value) {
      await writeDocument(filePath, value, { fallbackValue: value });
    },
    async readDocument(filePath, fallbackValue) {
      return readDocument(filePath, fallbackValue);
    },
    async writeDocument(filePath, value, options = {}) {
      return writeDocument(filePath, value, options);
    },
    async mutateDocument(filePath, fallbackValue, mutator) {
      return mutateDocument(filePath, fallbackValue, mutator);
    },
    async getAll(filePath, fallbackValue) {
      return readJson(filePath, fallbackValue);
    },
    async save(filePath, value) {
      await writeDocument(filePath, value, { fallbackValue: value });
      return value;
    },
    async update(filePath, value) {
      await writeDocument(filePath, value, { fallbackValue: value });
      return value;
    },
    async delete(filePath, fallbackValue = []) {
      await writeDocument(filePath, fallbackValue, { fallbackValue });
      return fallbackValue;
    },
    async exportAll() {
      return exportAll();
    },
    async saveBackupSnapshot(snapshot, metadata = {}) {
      ensureDir(backupsDir);
      const safeLabel = String(metadata.label || 'manual').replace(/[^a-zA-Z0-9_-]/g, '_') || 'manual';
      const createdAt = new Date().toISOString();
      const filename = `${safeLabel}-${Date.now()}-${crypto.randomUUID()}.json`;
      const filePath = path.join(backupsDir, filename);
      atomicWriteJson(filePath, snapshot);
      return {
        id: filename,
        filename,
        filePath,
        createdAt,
        storage: 'filesystem',
      };
    },
    async readBackupSnapshot(identifier) {
      const safeIdentifier = path.basename(String(identifier || ''));
      if (!safeIdentifier || safeIdentifier !== String(identifier || '') || !safeIdentifier.endsWith('.json')) {
        throw new Error('INVALID_BACKUP_ID');
      }
      const backupRoot = path.resolve(backupsDir);
      const filePath = path.resolve(backupsDir, safeIdentifier);
      if (!isWithin(backupRoot, filePath) || !fs.existsSync(filePath)) {
        throw new Error('BACKUP_NOT_FOUND');
      }
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    },
    async getLastBackupTime() {
      const latest = listBackupFiles()[0];
      return latest ? latest.timestamp : 0;
    },
    async listBackups(limit = 10) {
      return listBackupFiles().slice(0, Math.max(0, Number(limit) || 0));
    },
    getReportsFilePath(site) {
      return sitePaths.get('reports', site);
    },
    getNotificationsFilePath(site) {
      return sitePaths.get('notifications', site);
    },
  };
}

function createPostgresStorage(options = {}) {
  const { Pool } = require('pg');

  const dataDir = options.dataDir;
  const uploadsDir = options.uploadsDir;
  const backupsDir = options.backupsDir || path.join(dataDir, 'backups');
  const files = createFileMap(dataDir);
  const sitePaths = createSitePaths(dataDir);

  if (!options.databaseUrl) {
    throw new Error('DATABASE_URL is required when STORAGE_TYPE=postgres.');
  }

  const sslMode = String(process.env.PGSSL || process.env.PGSSLMODE || '').toLowerCase();
  const useSsl = ['true', 'require', 'verify-ca', 'verify-full'].includes(sslMode);

  const pool = new Pool({
    connectionString: options.databaseUrl,
    ...(sslMode ? { ssl: useSsl ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } : false } : {}),
    max: Number(process.env.PGPOOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 10000,
  });
  pool.on('error', (error) => {
    // Idle-client errors otherwise become uncaught exceptions. Avoid logging credentials/SQL.
    console.error(JSON.stringify({ event: 'postgres_idle_connection_error', code: error.code || 'CONNECTION_ERROR' }));
  });

  function resolveTarget(filePath) {
    const normalized = path.normalize(filePath);
    if (normalized === path.normalize(files.admins)) return { table: 'admins' };
    if (normalized === path.normalize(files.state)) return { table: 'state', key: 'default' };
    if (normalized === path.normalize(files.logs)) return { table: 'logs', category: 'logs' };
    if (normalized === path.normalize(files.warehouse)) return { table: 'warehouse', key: 'default' };
    if (normalized === path.normalize(files.warehouseLogs)) return { table: 'logs', category: 'warehouse_logs' };
    if (normalized === path.normalize(files.toolroom)) return { table: 'toolroom', key: 'default' };
    if (normalized === path.normalize(files.siteChat)) return { table: 'site_chat', key: 'default' };

    const baseName = path.basename(normalized, '.json');
    if (baseName.startsWith('reports_')) {
      return { table: 'reports', site: baseName.slice('reports_'.length) || 'default', ...sitePaths.targets.get(normalized) };
    }
    if (baseName.startsWith('notifications_')) {
      return { table: 'notifications', site: baseName.slice('notifications_'.length) || 'default', ...sitePaths.targets.get(normalized) };
    }

    throw new Error(`Unsupported postgres storage target for path: ${filePath}`);
  }

  function getDocumentKey(target) {
    if (target.table === 'admins') return 'admins';
    if (target.table === 'state') return `state:${target.key}`;
    if (target.table === 'warehouse') return `warehouse:${target.key}`;
    if (target.table === 'toolroom') return `toolroom:${target.key}`;
    if (target.table === 'site_chat') return `site_chat:${target.key}`;
    if (target.table === 'reports') return `reports:${target.site}`;
    if (target.table === 'notifications') return `notifications:${target.site}`;
    if (target.table === 'logs') return `logs:${target.category}`;
    throw new Error(`Unsupported target table: ${target.table}`);
  }

  async function query(text, params = []) {
    return pool.query(text, params);
  }

  async function getVersionRow(client, documentKey, lock = false) {
    await client.query(
      `INSERT INTO document_versions (document_key, version)
       VALUES ($1, 1)
       ON CONFLICT (document_key) DO NOTHING`,
      [documentKey],
    );
    const suffix = lock ? ' FOR UPDATE' : '';
    const result = await client.query(
      `SELECT version, updated_at FROM document_versions WHERE document_key = $1${suffix}`,
      [documentKey],
    );
    return result.rows[0] || { version: 1, updated_at: null };
  }

  async function readTargetData(client, target, fallbackValue) {
    if (target.table === 'reports' || target.table === 'notifications') {
      let result = await client.query(`SELECT data FROM ${target.table} WHERE site = $1`, [target.site]);
      if (target.legacySite && (!result.rowCount || target.site === target.legacySite)) {
        const legacy = target.site === target.legacySite ? result : await client.query(`SELECT data FROM ${target.table} WHERE site = $1`, [target.legacySite]);
        if (legacy.rowCount) {
          const stateResult = await client.query('SELECT data FROM state WHERE key = $1', ['default']);
          assertUnambiguousLegacySite(target, stateResult.rows[0]?.data);
          result = legacy;
        }
      }
      return { exists: result.rowCount > 0, data: result.rowCount > 0 ? result.rows[0].data : fallbackValue };
    }
    if (target.table === 'admins') {
      const result = await client.query('SELECT data FROM admins ORDER BY email ASC');
      return {
        exists: result.rowCount > 0,
        data: result.rowCount > 0 ? result.rows.map((row) => row.data) : fallbackValue,
      };
    }
    if (target.table === 'state') {
      const result = await client.query('SELECT data FROM state WHERE key = $1', [target.key]);
      return {
        exists: result.rowCount > 0,
        data: result.rowCount > 0 ? result.rows[0].data : fallbackValue,
      };
    }
    if (target.table === 'warehouse') {
      const result = await client.query('SELECT data FROM warehouse WHERE key = $1', [target.key]);
      return {
        exists: result.rowCount > 0,
        data: result.rowCount > 0 ? result.rows[0].data : fallbackValue,
      };
    }
    if (target.table === 'toolroom') {
      const result = await client.query('SELECT data FROM toolroom WHERE key = $1', [target.key]);
      return {
        exists: result.rowCount > 0,
        data: result.rowCount > 0 ? result.rows[0].data : fallbackValue,
      };
    }
    if (target.table === 'site_chat') {
      const result = await client.query('SELECT data FROM site_chat WHERE key = $1', [target.key]);
      return {
        exists: result.rowCount > 0,
        data: result.rowCount > 0 ? result.rows[0].data : fallbackValue,
      };
    }
    if (target.table === 'reports') {
      const result = await client.query('SELECT data FROM reports WHERE site = $1', [target.site]);
      return {
        exists: result.rowCount > 0,
        data: result.rowCount > 0 ? result.rows[0].data : fallbackValue,
      };
    }
    if (target.table === 'notifications') {
      const result = await client.query('SELECT data FROM notifications WHERE site = $1', [target.site]);
      return {
        exists: result.rowCount > 0,
        data: result.rowCount > 0 ? result.rows[0].data : fallbackValue,
      };
    }
    if (target.table === 'logs') {
      const result = await client.query('SELECT data FROM logs WHERE category = $1', [target.category]);
      return {
        exists: result.rowCount > 0,
        data: result.rowCount > 0 ? result.rows[0].data : fallbackValue,
      };
    }
    return { exists: false, data: fallbackValue };
  }

  async function writeTargetData(client, target, value) {
    if (target.table === 'admins') {
      await client.query('DELETE FROM admins');
      for (const entry of Array.isArray(value) ? value : []) {
        const email = String(entry?.email || '').trim().toLowerCase();
        if (!email) continue;
        await client.query(
          `INSERT INTO admins (email, data, updated_at)
           VALUES ($1, $2::jsonb, NOW())`,
          [email, JSON.stringify(entry)],
        );
      }
      return;
    }

    if (target.table === 'state') {
      await client.query(
        `INSERT INTO state (key, data) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [target.key, JSON.stringify(value)],
      );
      return;
    }

    if (target.table === 'warehouse') {
      await client.query(
        `INSERT INTO warehouse (key, data) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [target.key, JSON.stringify(value)],
      );
      return;
    }

    if (target.table === 'toolroom') {
      await client.query(
        `INSERT INTO toolroom (key, data) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [target.key, JSON.stringify(value)],
      );
      return;
    }

    if (target.table === 'site_chat') {
      await client.query(
        `INSERT INTO site_chat (key, data) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [target.key, JSON.stringify(value)],
      );
      return;
    }

    if (target.table === 'reports') {
      await client.query(
        `INSERT INTO reports (site, data) VALUES ($1, $2::jsonb)
         ON CONFLICT (site) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [target.site, JSON.stringify(value)],
      );
      return;
    }

    if (target.table === 'notifications') {
      await client.query(
        `INSERT INTO notifications (site, data) VALUES ($1, $2::jsonb)
         ON CONFLICT (site) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [target.site, JSON.stringify(value)],
      );
      return;
    }

    if (target.table === 'logs') {
      await client.query(
        `INSERT INTO logs (category, data) VALUES ($1, $2::jsonb)
         ON CONFLICT (category) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [target.category, JSON.stringify(value)],
      );
    }
  }

  async function readDocument(filePath, fallbackValue) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const target = resolveTarget(filePath);
      const documentKey = getDocumentKey(target);
      const dataSnapshot = await readTargetData(client, target, fallbackValue);
      const versions = await client.query('SELECT version, updated_at FROM document_versions WHERE document_key = $1', [documentKey]);
      const versionRow = versions.rows[0] || { version: 1, updated_at: null };
      await client.query('COMMIT');
      return {
        exists: dataSnapshot.exists,
        version: Math.max(1, Number(versionRow.version) || 1),
        updatedAt: versionRow.updated_at instanceof Date
          ? versionRow.updated_at.toISOString()
          : versionRow.updated_at || null,
        data: dataSnapshot.data,
      };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) { /* Keep the original database error. */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async function writeDocument(filePath, value, options = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const target = resolveTarget(filePath);
      const documentKey = getDocumentKey(target);
      const versionRow = await getVersionRow(client, documentKey, true);
      const current = await readTargetData(client, target, options.fallbackValue);
      if (options.onlyIfMissing && current.exists) {
        await client.query('COMMIT');
        return { version: Number(versionRow.version) || 1, updatedAt: versionRow.updated_at, data: current.data };
      }

      if (
        options.lastKnownVersion !== undefined &&
        options.lastKnownVersion !== null &&
        Number(options.lastKnownVersion) !== Number(versionRow.version)
      ) {
        throw new VersionConflictError({
          version: Number(versionRow.version) || 1,
          updatedAt: versionRow.updated_at instanceof Date
            ? versionRow.updated_at.toISOString()
            : versionRow.updated_at || null,
          data: current.data,
        });
      }

      await writeTargetData(client, target, value);
      const nextVersion = current.exists ? Number(versionRow.version) + 1 : Number(versionRow.version);
      const versionResult = await client.query(
        `UPDATE document_versions
         SET version = $2, updated_at = NOW()
         WHERE document_key = $1
         RETURNING version, updated_at`,
        [documentKey, nextVersion],
      );
      await client.query('COMMIT');
      const row = versionResult.rows[0];
      return {
        version: Number(row.version) || nextVersion,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
        data: value,
      };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) { /* Keep the original database error. */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async function mutateDocument(filePath, fallbackValue, mutator) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const target = resolveTarget(filePath);
      const documentKey = getDocumentKey(target);
      const versionRow = await getVersionRow(client, documentKey, true);
      const current = await readTargetData(client, target, fallbackValue);
      const nextData = await mutator(current.data, {
        version: Number(versionRow.version) || 1,
        updatedAt: versionRow.updated_at instanceof Date
          ? versionRow.updated_at.toISOString()
          : versionRow.updated_at || null,
        exists: current.exists,
      });
      if (nextData === undefined) {
        throw new Error(`Mutator for ${filePath} returned undefined.`);
      }

      await writeTargetData(client, target, nextData);
      // The version row starts at 1 even before a scoped document exists.
      // A first mutation is therefore version 2, preserving optimistic concurrency semantics.
      const nextVersion = Number(versionRow.version) + 1;
      const versionResult = await client.query(
        `UPDATE document_versions
         SET version = $2, updated_at = NOW()
         WHERE document_key = $1
         RETURNING version, updated_at`,
        [documentKey, nextVersion],
      );
      await client.query('COMMIT');
      const row = versionResult.rows[0];
      return {
        version: Number(row.version) || nextVersion,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
        data: nextData,
      };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) { /* Keep the original database error. */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async function readJson(filePath, fallbackValue) {
    const document = await readDocument(filePath, fallbackValue);
    return document.data;
  }

  async function exportAll() {
    const [adminsDoc, stateDoc, reportsResult, notificationsResult, logsResult, warehouseDoc, toolroomDoc, siteChatDoc] =
      await Promise.all([
        readDocument(files.admins, []),
        readDocument(files.state, null),
        query('SELECT site, data FROM reports ORDER BY site ASC'),
        query('SELECT site, data FROM notifications ORDER BY site ASC'),
        query('SELECT category, data FROM logs ORDER BY category ASC'),
        readDocument(files.warehouse, null),
        readDocument(files.toolroom, null),
        readDocument(files.siteChat, null),
      ]);

    const reports = {};
    const notifications = {};
    const logGroups = {};

    for (const row of reportsResult.rows) reports[row.site] = row.data;
    for (const row of notificationsResult.rows) notifications[row.site] = row.data;
    for (const row of logsResult.rows) logGroups[row.category] = row.data;

    return {
      storageType: 'postgres',
      exportedAt: new Date().toISOString(),
      admins: adminsDoc.data,
      state: stateDoc.data,
      reports: exportSiteDocuments(reports, stateDoc.data),
      notifications: exportSiteDocuments(notifications, stateDoc.data),
      logs: logGroups.logs || [],
      warehouse: warehouseDoc.data,
      warehouseLogs: logGroups.warehouse_logs || [],
      toolroom: toolroomDoc.data,
      siteChat: siteChatDoc.data,
    };
  }

  return {
    storageType: 'postgres',
    dataDir,
    uploadsDir,
    backupsDir,
    files,
    pool,
    async init() {
      ensureDir(uploadsDir);
      ensureDir(backupsDir);
      await query(`
        CREATE TABLE IF NOT EXISTS admins (
          email TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS state (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS reports (
          site TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          site TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS logs (
          category TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS warehouse (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS toolroom (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS site_chat (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS document_versions (
          document_key TEXT PRIMARY KEY,
          version BIGINT NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS backups (
          id BIGSERIAL PRIMARY KEY,
          label TEXT NOT NULL,
          filename TEXT,
          data_json JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    },
    async ensureBaseStructure() {
      ensureDir(uploadsDir);
      ensureDir(backupsDir);
    },
    async ensureJsonFile(filePath, defaultValue) {
      await writeDocument(filePath, defaultValue, { fallbackValue: defaultValue, onlyIfMissing: true });
    },
    async readJson(filePath, fallbackValue) {
      return readJson(filePath, fallbackValue);
    },
    async writeJson(filePath, value) {
      await writeDocument(filePath, value, { fallbackValue: value });
    },
    async readDocument(filePath, fallbackValue) {
      return readDocument(filePath, fallbackValue);
    },
    async writeDocument(filePath, value, options = {}) {
      return writeDocument(filePath, value, options);
    },
    async mutateDocument(filePath, fallbackValue, mutator) {
      return mutateDocument(filePath, fallbackValue, mutator);
    },
    async getAll(filePath, fallbackValue) {
      return readJson(filePath, fallbackValue);
    },
    async save(filePath, value) {
      await writeDocument(filePath, value, { fallbackValue: value });
      return value;
    },
    async update(filePath, value) {
      await writeDocument(filePath, value, { fallbackValue: value });
      return value;
    },
    async delete(filePath, fallbackValue = []) {
      await writeDocument(filePath, fallbackValue, { fallbackValue });
      return fallbackValue;
    },
    async exportAll() {
      return exportAll();
    },
    async saveBackupSnapshot(snapshot, metadata = {}) {
      const safeLabel = String(metadata.label || 'manual').replace(/[^a-zA-Z0-9_-]/g, '_') || 'manual';
      const filename = `${safeLabel}-${Date.now()}.json`;
      const result = await query(
        `INSERT INTO backups (label, filename, data_json)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id, filename, created_at`,
        [safeLabel, filename, JSON.stringify(snapshot)],
      );
      const row = result.rows[0];
      return {
        id: row.id,
        filename: row.filename,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        storage: 'postgres',
      };
    },
    async readBackupSnapshot(identifier) {
      const rawIdentifier = String(identifier || '').trim();
      if (!rawIdentifier) throw new Error('INVALID_BACKUP_ID');
      const result = /^\d+$/.test(rawIdentifier)
        ? await query('SELECT data_json FROM backups WHERE id = $1', [Number(rawIdentifier)])
        : await query('SELECT data_json FROM backups WHERE filename = $1', [rawIdentifier]);
      if (result.rowCount === 0) throw new Error('BACKUP_NOT_FOUND');
      return result.rows[0].data_json;
    },
    async getLastBackupTime() {
      const result = await query('SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1');
      if (result.rowCount === 0) return 0;
      return new Date(result.rows[0].created_at).getTime();
    },
    async listBackups(limit = 10) {
      const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
      const result = await query(
        `SELECT id, label, filename, created_at
         FROM backups
         ORDER BY created_at DESC
         LIMIT $1`,
        [safeLimit],
      );
      return result.rows.map((row) => ({
        id: row.id,
        label: row.label,
        filename: row.filename,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        storage: 'postgres',
      }));
    },
    getReportsFilePath(site) {
      return sitePaths.get('reports', site);
    },
    getNotificationsFilePath(site) {
      return sitePaths.get('notifications', site);
    },
  };
}

function createStorage(options = {}) {
  const storageType = String(options.storageType || 'json').trim().toLowerCase();
  if (storageType === 'json') {
    return createJsonStorage(options);
  }
  if (storageType === 'postgres') {
    if (!options.databaseUrl) {
      return createUnavailableStorage(
        options,
        new Error('DATABASE_URL is required when STORAGE_TYPE=postgres.'),
      );
    }
    try {
      return createPostgresStorage(options);
    } catch (error) {
      return createUnavailableStorage(options, error);
    }
  }
  throw new Error(`Unsupported STORAGE_TYPE "${storageType}".`);
}

module.exports = {
  VersionConflictError,
  createStorage,
};
