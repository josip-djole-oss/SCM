const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The temporary file must live on the same filesystem as its destination.
// Readers see either complete revision; failed writes never truncate live data.
function atomicWriteJson(filePath, value) {
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) throw new TypeError('A JSON document cannot be undefined.');
  const parent = path.dirname(filePath);
  fs.mkdirSync(parent, { recursive: true });
  const temporary = path.join(parent, `.${path.basename(filePath)}.${crypto.randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, serialized, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, filePath);
    // Persist the directory entry on platforms supporting directory fsync.
    if (process.platform !== 'win32') {
      const directory = fs.openSync(parent, 'r');
      try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

function isWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

module.exports = { atomicWriteJson, isWithin };
