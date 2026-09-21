const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { atomicWriteJson, isWithin } = require('../storage/atomic-file');

const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.csv': 'text/csv', '.rtf': 'application/rtf',
  '.doc': 'application/msword', '.xls': 'application/vnd.ms-excel', '.ppt': 'application/vnd.ms-powerpoint',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.odt': 'application/vnd.oasis.opendocument.text', '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
};
const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

function uploadError(code, statusCode = 400) {
  return Object.assign(new Error(code), { code, statusCode });
}

function normalizeOriginalName(name) {
  return String(name || 'file').replace(/[\\/]/g, '_').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 240) || 'file';
}

function verifyFileContent(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const expectedType = TYPES[extension];
  if (!expectedType) throw uploadError('UPLOAD_TYPE_NOT_ALLOWED', 415);
  const descriptor = fs.openSync(file.path, 'r+');
  const header = Buffer.alloc(512);
  let length;
  try {
    length = fs.readSync(descriptor, header, 0, header.length, 0);
    if (!length) throw uploadError('UPLOAD_EMPTY');
    const starts = (hex) => header.subarray(0, hex.length / 2).equals(Buffer.from(hex, 'hex'));
    let valid = true;
    if (extension === '.png') valid = starts('89504e470d0a1a0a');
    else if (['.jpg', '.jpeg'].includes(extension)) valid = starts('ffd8ff');
    else if (extension === '.gif') valid = /^GIF8[79]a/.test(header.toString('ascii', 0, 6));
    else if (extension === '.webp') valid = header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
    else if (extension === '.pdf') valid = header.toString('ascii', 0, 5) === '%PDF-';
    else if (['.docx', '.xlsx', '.pptx', '.odt', '.ods'].includes(extension)) valid = starts('504b0304');
    else if (['.doc', '.xls', '.ppt'].includes(extension)) valid = starts('d0cf11e0a1b11e1');
    else if (extension === '.rtf') valid = header.toString('ascii', 0, 5) === '{\\rtf';
    else valid = !header.subarray(0, length).includes(0);
    if (!valid) throw uploadError('UPLOAD_CONTENT_MISMATCH', 415);
    const stats = fs.fstatSync(descriptor);
    if (!stats.isFile() || stats.size !== file.size) throw uploadError('UPLOAD_INCOMPLETE', 500);
    fs.fsyncSync(descriptor);
  } finally { fs.closeSync(descriptor); }
  return expectedType;
}

function resolveUploadContext(req) {
  const pathname = req.path || '';
  const routeModule = pathname.startsWith('/site-chat/') ? 'chat' : /^\/(planner|tidplan|warehouse|surveys)(?:\/|$)/.exec(pathname)?.[1];
  return {
    site: String(req.params?.siteId || req.query?.site || req.body?.site || req.session?.currentSite || 'default').trim(),
    module: routeModule || String(req.query?.module || req.body?.module || '').trim(),
    temporary: /\/import(?:\/|$)/.test(pathname),
  };
}

function createUploadService({ uploadsDir, authorize, authorizeLegacy, maxBytes = 10 * 1024 * 1024 }) {
  const root = path.resolve(uploadsDir);
  const metadataRoot = path.join(root, '.metadata');
  const metadataPath = (relative) => path.join(metadataRoot, `${crypto.createHash('sha256').update(relative).digest('hex')}.json`);
  const urlFor = (filePath) => `/uploads/${path.relative(root, filePath).split(path.sep).map(encodeURIComponent).join('/')}`;
  const relativeFor = (filePath) => path.relative(root, filePath).split(path.sep).join('/');

  function cleanup(file) {
    if (!file?.path || !isWithin(root, file.path)) return;
    for (const target of [file.path, metadataPath(relativeFor(file.path))]) {
      try { fs.unlinkSync(target); } catch (error) { if (error.code !== 'ENOENT') console.error(JSON.stringify({ event: 'upload_cleanup_failed', code: error.code })); }
    }
  }

  const parser = multer({
    storage: multer.diskStorage({
      destination(req, file, callback) {
        try {
          const directory = path.join(root, new Date().toISOString().slice(0, 10));
          fs.mkdirSync(directory, { recursive: true });
          callback(null, directory);
        } catch (error) { callback(error); }
      },
      filename(req, file, callback) {
        callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
      },
    }),
    defParamCharset: 'utf8',
    limits: { fileSize: maxBytes, files: 1, fields: 64, fieldSize: 1024 * 1024, parts: 65 },
    fileFilter(req, file, callback) {
      file.originalname = normalizeOriginalName(file.originalname);
      const extension = path.extname(file.originalname).toLowerCase();
      if (!TYPES[extension]) return callback(uploadError('UPLOAD_TYPE_NOT_ALLOWED', 415));
      callback(null, true);
    },
  });

  const upload = {
    single(field) {
      const parse = parser.single(field);
      return (req, res, next) => {
        if (req.session?.isReadonly) return next(uploadError('READ_ONLY', 403));
        parse(req, res, async (error) => {
          if (error) { cleanup(req.file); return next(error); }
          if (req.aborted || res.destroyed || res.writableEnded) { cleanup(req.file); return; }
          try {
            // Multipart site fields become available only after parsing has completed.
            const context = resolveUploadContext(req);
            if (!context.module) throw uploadError('UPLOAD_MODULE_REQUIRED');
            await authorize(req, context);
            if (!req.file) return next();
            const file = req.file;
            file.mimetype = verifyFileContent(file);
            const relative = relativeFor(file.path);
            const metadata = {
              version: 1, relative, site: context.site, module: context.module,
              owner: req.session.email, originalName: file.originalname,
              mimetype: file.mimetype, size: file.size, uploadedAt: new Date().toISOString(),
              temporary: context.temporary,
            };
            atomicWriteJson(metadataPath(relative), metadata);
            // Reopen after close/flush and metadata persistence before reporting upload completion.
            await fs.promises.access(file.path, fs.constants.R_OK);
            file.uploadMetadata = metadata;
            res.once('finish', () => {
              if (context.temporary || (res.statusCode >= 400 && res.statusCode < 500)) cleanup(file);
            });
            next();
          } catch (failure) { cleanup(req.file); next(failure); }
        });
      };
    },
  };

  async function resolveDownload(req, relative) {
    if (!relative || relative.includes('\\') || relative.split('/').some((part) => !part || part.startsWith('.'))) throw uploadError('INVALID_FILE_PATH');
    const filePath = path.resolve(root, relative);
    if (!isWithin(root, filePath)) throw uploadError('INVALID_FILE_PATH');
    let actual;
    try { actual = await fs.promises.realpath(filePath); } catch (error) { if (error.code === 'ENOENT') throw uploadError('FILE_NOT_FOUND', 404); throw error; }
    const actualRoot = await fs.promises.realpath(root);
    if (!isWithin(actualRoot, actual)) throw uploadError('INVALID_FILE_PATH');
    const stats = await fs.promises.stat(actual);
    if (!stats.isFile()) throw uploadError('FILE_NOT_FOUND', 404);
    let metadata;
    try { metadata = JSON.parse(await fs.promises.readFile(metadataPath(relative), 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (!authorizeLegacy || !(await authorizeLegacy(req, `/uploads/${relative}`))) throw uploadError('FILE_NOT_FOUND', 404);
      metadata = { originalName: path.basename(relative), mimetype: TYPES[path.extname(relative).toLowerCase()] || 'application/octet-stream' };
    }
    if (metadata.site) {
      if (metadata.temporary || metadata.relative !== relative) throw uploadError('FILE_NOT_FOUND', 404);
      await authorize(req, metadata, true);
    }
    return { filePath: actual, metadata };
  }

  async function download(req, res, next) {
    try {
      const { filePath, metadata } = await resolveDownload(req, req.params[0]);
      res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" });
      res.type(metadata.mimetype);
      if (!INLINE_TYPES.has(metadata.mimetype)) res.attachment(metadata.originalName);
      return res.sendFile(filePath, { cacheControl: false }, (error) => { if (error) next(error); });
    } catch (error) { next(error); }
  }

  async function list(req, res, next) {
    try {
      const files = [];
      if (fs.existsSync(metadataRoot)) {
        for (const filename of await fs.promises.readdir(metadataRoot)) {
          if (!filename.endsWith('.json')) continue;
          const metadata = JSON.parse(await fs.promises.readFile(path.join(metadataRoot, filename), 'utf8'));
          if (metadata.temporary || (req.query.site && metadata.site !== req.query.site) || (req.query.module && metadata.module !== req.query.module)) continue;
          try {
            const resolved = await resolveDownload(req, metadata.relative);
            files.push({ filename: path.basename(metadata.relative), originalName: metadata.originalName, url: urlFor(resolved.filePath), path: urlFor(resolved.filePath), size: metadata.size, uploadDate: metadata.uploadedAt });
          } catch (error) { if (![403, 404].includes(error.statusCode)) throw error; }
        }
      }
      res.json({ files });
    } catch (error) { next(error); }
  }

  return { upload, download, list, cleanup, resolveDownload, urlFor };
}

module.exports = { createUploadService, verifyFileContent, resolveUploadContext, normalizeOriginalName };
