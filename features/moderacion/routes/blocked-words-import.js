'use strict';

const { parseWords, saveBlockedWordsToFile } = require('../filters/blocked-words-file');

function blockedWordsImport(deps) {
  return (req, res) => {
    const { content } = req.body || {};
    if (typeof content !== 'string') return res.status(400).json({ error: 'Se requiere content', errorKey: 'errors.contentRequired' });

    deps.blockedWords.clear();
    parseWords(content).forEach((word) => deps.blockedWords.add(word));
    if (!saveBlockedWordsToFile(deps.blockedWords, deps.logger)) return res.status(500).json({ error: 'No se pudo guardar la lista', errorKey: 'errors.chatGuardUnavailable' });
    if (deps.configure) deps.configure();
    res.json({ words: [...deps.blockedWords] });
  };
}

module.exports = { blockedWordsImport };
