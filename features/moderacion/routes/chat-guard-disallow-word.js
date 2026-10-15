'use strict';

const { saveAllowedWordsToFile } = require('../filters/allowed-words-file');
const { normalizeWord } = require('../filters/normalize-word');

function disallowWord({ allowedWords, reconfigure, logger }) {
  return (req, res) => {
    allowedWords.delete(normalizeWord((req.body || {}).word));
    reconfigure();
    saveAllowedWordsToFile(allowedWords, logger);
    res.json({ allowedWords: [...allowedWords].sort() });
  };
}

module.exports = { disallowWord };
