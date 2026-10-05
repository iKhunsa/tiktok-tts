'use strict';

const fs = require('fs');
const { blockedWordsFile } = require('../filters/blocked-words-file');

function blockedWordsExport(logger) {
  return (_req, res) => {
    try {
      const file = blockedWordsFile();
      if (!fs.existsSync(file)) return res.type('application/json').send('[]');
      return res.type('application/json').send(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      logger.log('error', 'moderacion', 'moderacion/routes/blocked-words-export.js#blockedWordsExport', 'moderacion.palabras.export_fallido', 'No se pudo exportar blocked-words.json', { error: error.message });
      return res.status(500).json({ error: error.message, errorKey: 'errors.chatGuardUnavailable' });
    }
  };
}

module.exports = { blockedWordsExport };
