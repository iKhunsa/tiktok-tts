'use strict';

const fs = require('fs');
const { blockedWordsFile } = require('../filters/blocked-words-file');

function blockedWordsExport(logger) {
  return (_req, res) => {
    try {
      const file = blockedWordsFile();
      if (!fs.existsSync(file)) return res.type('text/plain').send('');
      const content = fs.readFileSync(file, 'utf-8');
      res.type('text/plain').send(content);
    } catch (error) {
      logger.log(
        'error', 'moderacion', 'moderacion/routes/blocked-words-export.js#blockedWordsExport', 'moderacion.palabras.export_fallido',
        `No se pudo exportar blocked-words.md: ${error.message}`, { path: blockedWordsFile(), error: error.message, stack: error.stack }
      );
      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = { blockedWordsExport };
