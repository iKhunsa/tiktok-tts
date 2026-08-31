'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { DATA_BASE } = require('../../../core/paths');

const UPLOADS_DIR = path.join(DATA_BASE, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const name = `bg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    const allowedExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes PNG, JPG, WebP o GIF'));
  },
});

function uploadBg(logger) {
  return (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        const tooBig = err.code === 'LIMIT_FILE_SIZE';
        const message = tooBig ? 'La imagen no puede superar 8 MB' : err.message || 'Error al subir imagen';
        return res.status(400).json({ error: message, errorKey: tooBig ? 'errors.imageTooLarge' : 'errors.imageUploadFailed' });
      }
      if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen', errorKey: 'errors.noImageFile' });
      const url = `/uploads/${req.file.filename}`;
      logger.log(
        'info', 'overlay', 'overlay/routes/upload-bg.js#uploadBg', 'overlay.fondo.subido',
        `Fondo de overlay subido: ${url}`, { url, size: req.file.size }
      );
      res.json({ url });
    });
  };
}

module.exports = { uploadBg, UPLOADS_DIR };
