const path = require('path');
const { isWithin } = require('./atomic-file');

function resolveStoragePaths(appRoot, env = process.env) {
  const volume = env.RAILWAY_VOLUME_MOUNT_PATH || '';
  const resolve = (value, fallback) => value ? path.resolve(appRoot, value) : fallback;
  const dataDir = resolve(env.DATA_PATH, volume ? path.join(volume, 'data') : path.join(appRoot, 'server', 'data'));
  const uploadsDir = resolve(env.UPLOAD_PATH, volume ? path.join(volume, 'uploads') : path.join(appRoot, 'uploads'));
  const backupsDir = resolve(env.BACKUP_PATH, path.join(dataDir, 'backups'));
  // Railway exposes the mount path only when a volume is attached at runtime.
  // Refuse to promise durable uploads on the ephemeral application filesystem.
  if (env.RAILWAY_ENVIRONMENT_ID || env.RAILWAY_PROJECT_ID) {
    if (!volume) throw new Error('Railway requires a persistent volume for uploads. Attach a volume before starting SCM.');
    if (!isWithin(volume, uploadsDir)) throw new Error('UPLOAD_PATH must be inside RAILWAY_VOLUME_MOUNT_PATH.');
    if (String(env.STORAGE_TYPE || 'json').toLowerCase() === 'json' && (!isWithin(volume, dataDir) || !isWithin(volume, backupsDir))) {
      throw new Error('JSON DATA_PATH and BACKUP_PATH must be inside RAILWAY_VOLUME_MOUNT_PATH.');
    }
  }
  return { dataDir, uploadsDir, backupsDir };
}

module.exports = { resolveStoragePaths };
