'use strict';

const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');
const { normalizeWord } = require('../filters/normalize-word');

// Importar solo acepta una lista JSON de textos; cualquier otra cosa se rechaza entera.
function parseImportList(content) {
  try {
    const parsed = JSON.parse(content.replace(/^\uFEFF/, ''));
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) return null;
    return parsed.map(normalizeWord).filter(Boolean);
  } catch {
    return null;
  }
}

function blockedWordsImport(deps) {
  return (req, res) => {
    const { content, replace = false } = req.body || {};
    if (typeof content !== 'string') return res.status(400).json({ error: 'Se requiere content', errorKey: 'errors.contentRequired' });
    if (Buffer.byteLength(content, 'utf8') > 1024 * 1024) return res.status(413).json({ error: 'Archivo demasiado grande', errorKey: 'errors.chatGuardImportTooLarge' });

    const imported = parseImportList(content);
    if (!imported) return res.status(400).json({ error: 'Formato no valido: debe ser una lista JSON de palabras', errorKey: 'errors.chatGuardImportInvalid' });
    if (imported.length > 5000) return res.status(400).json({ error: 'Demasiadas palabras', errorKey: 'errors.chatGuardImportTooMany' });
    if (replace) deps.blockedWords.clear();
    imported.forEach((word) => deps.blockedWords.add(word));
    if (!saveBlockedWordsToFile(deps.blockedWords, deps.logger)) return res.status(500).json({ error: 'No se pudo guardar la lista', errorKey: 'errors.chatGuardUnavailable' });
    if (deps.configure) deps.configure();
    res.json({ words: [...deps.blockedWords] });
  };
}

module.exports = { blockedWordsImport, parseImportList };
