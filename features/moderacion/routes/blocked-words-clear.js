'use strict';

const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');

function blockedWordsClear(deps) {
  return (_req, res) => {
    deps.blockedWords.clear();
    if (!saveBlockedWordsToFile(deps.blockedWords, deps.logger)) return res.status(500).json({ error: 'No se pudo guardar la lista', errorKey: 'errors.chatGuardUnavailable' });
    deps.configure();
    return res.json({ words: [] });
  };
}

module.exports = { blockedWordsClear };
