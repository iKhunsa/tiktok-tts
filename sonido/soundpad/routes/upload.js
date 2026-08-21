'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { loadSounds } = require('../load-sounds');
const { saveSounds } = require('../save-sounds');
const { syncSoundPadsToMobileState } = require('../sync-to-mobile-state');

function createUploadMiddleware(soundsDir) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, soundsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp3';
      cb(null, crypto.randomBytes(8).toString('hex') + ext);
    },
  });
  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedExt = ['.mp3', '.wav', '.ogg', '.webm', '.m4a'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExt.includes(ext)) cb(null, true);
      else cb(new Error('Solo se permiten archivos MP3, WAV, OGG, WEBM o M4A'));
    },
  });
}

function upload(deps) {
  const uploadMiddleware = createUploadMiddleware(deps.soundsDir);
  return (req, res) => {
    uploadMiddleware.single('audio')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Error al subir audio' });
      if (!req.file) return res.status(400).json({ error: 'No se recibió archivo de audio' });

      const sounds = loadSounds(deps.soundsConfigPath);
      if (sounds.length >= 24) {
        fs.unlink(req.file.path, (err2) => {
          if (err2) {
            deps.logger.log(
              'warn', 'sonido', 'sonido/soundpad/routes/upload.js#upload', 'sonido.soundpad.borrado_archivo_fallido',
              `No se pudo borrar el archivo tras rechazo por limite: ${err2.message}`, { path: req.file.path, error: err2.message }
            );
          }
        });
        return res.status(400).json({ error: 'Máximo 24 sonidos permitidos' });
      }

      const id = crypto.randomBytes(8).toString('hex');
      const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname));
      const entry = {
        id,
        filename: req.file.filename,
        name: baseName.slice(0, 40),
        shortcut: null,
        color: '#3ecf8e',
        createdAt: Date.now(),
      };
      sounds.push(entry);
      saveSounds(deps.soundsConfigPath, sounds);
      syncSoundPadsToMobileState(deps);
      res.json(entry);
    });
  };
}

module.exports = { upload, createUploadMiddleware };
