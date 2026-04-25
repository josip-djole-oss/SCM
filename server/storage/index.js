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

function createJsonStorage(options = {}) {
  const dataDir = options.dataDir;
  const uploadsDir = options.uploadsDir;
  const backupsDir = options.backupsDir || path.join(dataDir, 'backups');
  const files = createFileMap(dataDir);

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
      if (!fs.existsSync(filePath)) return fallbackValue;
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    },
    async writeJson(filePath, value) {
      fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
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
    return createPostgresStorage(options);
  }
  throw new Error(`Unsupported STORAGE_TYPE "${storageType}".`);
}

module.exports = {
  createStorage,
};
