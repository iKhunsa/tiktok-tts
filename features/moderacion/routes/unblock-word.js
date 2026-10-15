'use strict';

const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');

function unblockWord(deps) {
  return (req, res) => {
    const { word } = req.body || {};
    if (word) deps.blockedWords.delete(String(word).toLowerCase().trim());
    if (!saveBlockedWordsToFile(deps.blockedWords, deps.logger)) return res.status(500).json({ error: 'No se pudo guardar la lista', errorKey: 'errors.chatGuardUnavailable' });
    if (deps.configure) deps.configure();
    res.json({ words: [...deps.blockedWords] });
  };
}

module.exports = { unblockWord };
