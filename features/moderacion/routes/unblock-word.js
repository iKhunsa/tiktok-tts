'use strict';

const { invalidateBlockedMatchers } = require('../filters/blocked-matchers');
const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');

function unblockWord(deps) {
  return (req, res) => {
    const { word } = req.body || {};
    if (word) deps.blockedMatchersState.blockedWords.delete(String(word).toLowerCase().trim());
    invalidateBlockedMatchers(deps.blockedMatchersState);
    saveBlockedWordsToFile(deps.blockedMatchersState, deps.logger);
    res.json({ words: [...deps.blockedMatchersState.blockedWords] });
  };
}

module.exports = { unblockWord };
