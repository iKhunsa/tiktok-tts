'use strict';

const { saveAllowedWordsToFile } = require('../filters/allowed-words-file');
const { normalizeWord } = require('../filters/normalize-word');
const { rejectAllowedWord } = require('../filters/validate-allowed-word');

function allowWord({ allowedWords, blockedWords, reconfigure, logger }) {
  return (req, res) => {
    const word = normalizeWord((req.body || {}).word);
    const rejection = rejectAllowedWord(word, blockedWords);
    if (rejection) return res.status(rejection.status).json({ error: rejection.error, errorKey: rejection.errorKey });
    allowedWords.add(word);
    reconfigure();
    saveAllowedWordsToFile(allowedWords, logger);
    res.json({ allowedWords: [...allowedWords].sort() });
  };
}

module.exports = { allowWord };
