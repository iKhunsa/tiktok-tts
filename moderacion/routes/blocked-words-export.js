'use strict';

const fs = require('fs');
const { BLOCKED_WORDS_FILE } = require('../filters/blocked-words-file');

function blockedWordsExport(logger) {
  return (_req, res) => {
    try {
      if (!fs.existsSync(BLOCKED_WORDS_FILE)) return res.type('text/plain').send('');
      const content = fs.readFileSync(BLOCKED_WORDS_FILE, 'utf-8');
      res.type('text/plain').send(content);
    } catch (error) {
      logger.log(
        'error', 'moderacion', 'moderacion/routes/blocked-words-export.js#blockedWordsExport', 'moderacion.palabras.export_fallido',
        `No se pudo exportar blocked-words.md: ${error.message}`, { path: BLOCKED_WORDS_FILE, error: error.message, stack: error.stack }
      );
      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = { blockedWordsExport };
