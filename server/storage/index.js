const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function normalizeSiteKey(site) {
  return String(site || 'default').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'default';
}

function createFileMap(dataDir) {
  return {
    errorLog: path.join(dataDir, 'server-errors.log'),
    state: path.join(dataDir, 'state.json'),
    admins: path.join(dataDir, 'admins.json'),
    logs: path.join(dataDir, 'logs.json'),
    warehouse: path.join(dataDir, 'warehouse.json'),
    warehouseLogs: path.join(dataDir, 'warehouse-logs.json'),
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
    async init() {
      return fail();
    },
    async ensureBaseStructure() {
      ensureDir(dataDir);
      ensureDir(uploadsDir);
      ensureDir(backupsDir);
    },
    async ensureJsonFile() {
      return fail();
    },
    async readJson() {
      return fail();
    },
    async writeJson() {
      return fail();
    },
    async getAll() {
      return fail();
    },
    async save() {
      return fail();
    },
    async update() {
      return fail();
    },
    async delete() {
      return fail();
    },
    async exportAll() {
      return fail();
    },
    async saveBackupSnapshot() {
      return fail();
    },
    async getLastBackupTime() {
      return fail();
    },
    async listBackups() {
      return fail();
    },
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

  async function exportAll() {
    const reports = {};
    const notifications = {};

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
      state: await readJson(files.state, null),
      reports,
      notifications,
      logs: await readJson(files.logs, []),
      warehouse: await readJson(files.warehouse, null),
      warehouseLogs: await readJson(files.warehouseLogs, []),
    };
  }

  async function readJson(filePath, fallbackValue) {
    if (!fs.existsSync(filePath)) return fallbackValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  async function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
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
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      }
    },
    async readJson(filePath, fallbackValue) {
      return readJson(filePath, fallbackValue);
    },
    async writeJson(filePath, value) {
      await writeJson(filePath, value);
    },
    async getAll(filePath, fallbackValue) {
      return readJson(filePath, fallbackValue);
    },
    async save(filePath, value) {
      await writeJson(filePath, value);
      return value;
    },
    async update(filePath, value) {
      await writeJson(filePath, value);
      return value;
    },
    async delete(filePath, fallbackValue = []) {
      await writeJson(filePath, fallbackValue);
      return fallbackValue;
    },
    async exportAll() {
      return exportAll();
    },
    async saveBackupSnapshot(snapshot, metadata = {}) {
      ensureDir(backupsDir);
      const safeLabel = String(metadata.label || 'manual').replace(/[^a-zA-Z0-9_-]/g, '_') || 'manual';
      const createdAt = new Date().toISOString();
      const filename = `${safeLabel}-${Date.now()}.json`;
      const filePath = path.join(backupsDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
      return {
        id: filename,
        filename,
        filePath,
        createdAt,
        storage: 'filesystem',
      };
    },
    async getLastBackupTime() {
      const latest = listBackupFiles()[0];
      return latest ? latest.timestamp : 0;
    },
    async listBackups(limit = 10) {
      return listBackupFiles().slice(0, Math.max(0, Number(limit) || 0));
    },
    getReportsFilePath(site) {
      return path.join(dataDir, `reports_${normalizeSiteKey(site)}.json`);
    },
    getNotificationsFilePath(site) {
      return path.join(dataDir, `notifications_${normalizeSiteKey(site)}.json`);
    },
  };
}

function createPostgresStorage(options = {}) {
  const { Pool } = require('pg');

  const dataDir = options.dataDir;
  const uploadsDir = options.uploadsDir;
  const backupsDir = options.backupsDir || path.join(dataDir, 'backups');
  const files = createFileMap(dataDir);

  if (!options.databaseUrl) {
    throw new Error('DATABASE_URL is required when STORAGE_TYPE=postgres.');
  }

  const useSsl = String(process.env.PGSSL || process.env.PGSSLMODE || '')
    .toLowerCase()
    .includes('require');

  const pool = new Pool({
    connectionString: options.databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PGPOOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 10000,
  });

  function resolveTarget(filePath) {
    const normalized = path.normalize(filePath);
    if (normalized === path.normalize(files.admins)) return { table: 'admins' };
    if (normalized === path.normalize(files.state)) return { table: 'state', key: 'default' };
    if (normalized === path.normalize(files.logs)) return { table: 'logs', category: 'logs' };
    if (normalized === path.normalize(files.warehouse)) return { table: 'warehouse', key: 'default' };
    if (normalized === path.normalize(files.warehouseLogs)) return { table: 'logs', category: 'warehouse_logs' };

    const reportsPrefix = path.join(dataDir, 'reports_');
    const notificationsPrefix = path.join(dataDir, 'notifications_');
    const baseName = path.basename(normalized, '.json');

    if (normalized.startsWith(path.normalize(reportsPrefix)) || baseName.startsWith('reports_')) {
      return { table: 'reports', site: baseName.slice('reports_'.length) || 'default' };
    }
    if (normalized.startsWith(path.normalize(notificationsPrefix)) || baseName.startsWith('notifications_')) {
      return { table: 'notifications', site: baseName.slice('notifications_'.length) || 'default' };
    }

    throw new Error(`Unsupported postgres storage target for path: ${filePath}`);
  }

  async function query(text, params = []) {
    return pool.query(text, params);
  }

  async function exportAll() {
    const [adminsResult, stateResult, reportsResult, notificationsResult, logsResult, warehouseResult] =
      await Promise.all([
        query('SELECT data FROM admins ORDER BY email ASC'),
        query('SELECT data FROM state WHERE key = $1', ['default']),
        query('SELECT site, data FROM reports ORDER BY site ASC'),
        query('SELECT site, data FROM notifications ORDER BY site ASC'),
        query('SELECT category, data FROM logs ORDER BY category ASC'),
        query('SELECT data FROM warehouse WHERE key = $1', ['default']),
      ]);

    const reports = {};
    const notifications = {};
    const logGroups = {};

    for (const row of reportsResult.rows) {
      reports[row.site] = row.data;
    }
    for (const row of notificationsResult.rows) {
      notifications[row.site] = row.data;
    }
    for (const row of logsResult.rows) {
      logGroups[row.category] = row.data;
    }

    return {
      storageType: 'postgres',
      exportedAt: new Date().toISOString(),
      admins: adminsResult.rows.map((row) => row.data),
      state: stateResult.rowCount > 0 ? stateResult.rows[0].data : null,
      reports,
      notifications,
      logs: logGroups.logs || [],
      warehouse: warehouseResult.rowCount > 0 ? warehouseResult.rows[0].data : null,
      warehouseLogs: logGroups.warehouse_logs || [],
    };
  }

  async function upsertSingleton(table, keyColumn, keyValue, value) {
    await query(
      `INSERT INTO ${table} (${keyColumn}, data) VALUES ($1, $2::jsonb)
       ON CONFLICT (${keyColumn}) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [keyValue, JSON.stringify(value)],
    );
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
      const target = resolveTarget(filePath);
      if (target.table === 'admins') {
        const existing = await query('SELECT 1 FROM admins LIMIT 1');
        if (existing.rowCount === 0 && Array.isArray(defaultValue) && defaultValue.length > 0) {
          await this.writeJson(filePath, defaultValue);
        }
        return;
      }
      if (target.table === 'state') {
        const existing = await query('SELECT 1 FROM state WHERE key = $1', [target.key]);
        if (existing.rowCount === 0) {
          await upsertSingleton('state', 'key', target.key, defaultValue);
        }
        return;
      }
      if (target.table === 'warehouse') {
        const existing = await query('SELECT 1 FROM warehouse WHERE key = $1', [target.key]);
        if (existing.rowCount === 0) {
          await upsertSingleton('warehouse', 'key', target.key, defaultValue);
        }
        return;
      }
      if (target.table === 'reports') {
        const existing = await query('SELECT 1 FROM reports WHERE site = $1', [target.site]);
        if (existing.rowCount === 0) {
          await upsertSingleton('reports', 'site', target.site, defaultValue);
        }
        return;
      }
      if (target.table === 'notifications') {
        const existing = await query('SELECT 1 FROM notifications WHERE site = $1', [target.site]);
        if (existing.rowCount === 0) {
          await upsertSingleton('notifications', 'site', target.site, defaultValue);
        }
        return;
      }
      if (target.table === 'logs') {
        const existing = await query('SELECT 1 FROM logs WHERE category = $1', [target.category]);
        if (existing.rowCount === 0) {
          await upsertSingleton('logs', 'category', target.category, defaultValue);
        }
      }
    },
    async readJson(filePath, fallbackValue) {
      const target = resolveTarget(filePath);
      if (target.table === 'admins') {
        const result = await query('SELECT data FROM admins ORDER BY email ASC');
        return result.rowCount > 0 ? result.rows.map((row) => row.data) : fallbackValue;
      }
      if (target.table === 'state') {
        const result = await query('SELECT data FROM state WHERE key = $1', [target.key]);
        return result.rowCount > 0 ? result.rows[0].data : fallbackValue;
      }
      if (target.table === 'warehouse') {
        const result = await query('SELECT data FROM warehouse WHERE key = $1', [target.key]);
        return result.rowCount > 0 ? result.rows[0].data : fallbackValue;
      }
      if (target.table === 'reports') {
        const result = await query('SELECT data FROM reports WHERE site = $1', [target.site]);
        return result.rowCount > 0 ? result.rows[0].data : fallbackValue;
      }
      if (target.table === 'notifications') {
        const result = await query('SELECT data FROM notifications WHERE site = $1', [target.site]);
        return result.rowCount > 0 ? result.rows[0].data : fallbackValue;
      }
      if (target.table === 'logs') {
        const result = await query('SELECT data FROM logs WHERE category = $1', [target.category]);
        return result.rowCount > 0 ? result.rows[0].data : fallbackValue;
      }
      return fallbackValue;
    },
    async writeJson(filePath, value) {
      const target = resolveTarget(filePath);
      if (target.table === 'admins') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
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
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
        return;
      }
      if (target.table === 'state') {
        await upsertSingleton('state', 'key', target.key, value);
        return;
      }
      if (target.table === 'warehouse') {
        await upsertSingleton('warehouse', 'key', target.key, value);
        return;
      }
      if (target.table === 'reports') {
        await upsertSingleton('reports', 'site', target.site, value);
        return;
      }
      if (target.table === 'notifications') {
        await upsertSingleton('notifications', 'site', target.site, value);
        return;
      }
      if (target.table === 'logs') {
        await upsertSingleton('logs', 'category', target.category, value);
      }
    },
    async getAll(filePath, fallbackValue) {
      return this.readJson(filePath, fallbackValue);
    },
    async save(filePath, value) {
      await this.writeJson(filePath, value);
      return value;
    },
    async update(filePath, value) {
      await this.writeJson(filePath, value);
      return value;
    },
    async delete(filePath, fallbackValue = []) {
      await this.writeJson(filePath, fallbackValue);
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
      return path.join(dataDir, `reports_${normalizeSiteKey(site)}.json`);
    },
    getNotificationsFilePath(site) {
      return path.join(dataDir, `notifications_${normalizeSiteKey(site)}.json`);
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
  createStorage,
};
