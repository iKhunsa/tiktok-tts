'use strict';

const fs = require('fs');
const path = require('path');
const { UPLOADS_DIR } = require('./upload-bg');

function deleteBg(logger) {
  return (req, res) => {
    const { filename } = req.body || {};
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Se requiere filename' });
    }
    const safeName = path.basename(filename);
    const filePath = path.resolve(UPLOADS_DIR, safeName);
    if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.log(
          'info', 'overlay', 'overlay/routes/delete-bg.js#deleteBg', 'overlay.fondo.borrado',
          `Fondo de overlay borrado: ${safeName}`, { filename: safeName }
        );
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Archivo no encontrado' });
      }
    } catch (err) {
      logger.log(
        'error', 'overlay', 'overlay/routes/delete-bg.js#deleteBg', 'overlay.fondo.borrado_fallido',
        `No se pudo borrar el fondo ${safeName}: ${err.message}`, { filename: safeName, error: err.message, stack: err.stack }
      );
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { deleteBg };
