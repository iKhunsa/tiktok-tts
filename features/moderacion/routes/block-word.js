'use strict';

const { invalidateBlockedMatchers } = require('../filters/blocked-matchers');
const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');

function blockWord(deps) {
  return (req, res) => {
    const { word } = req.body || {};
    if (word && typeof word === 'string') deps.blockedMatchersState.blockedWords.add(word.toLowerCase().trim());
    invalidateBlockedMatchers(deps.blockedMatchersState);
    saveBlockedWordsToFile(deps.blockedMatchersState, deps.logger);
    res.json({ words: [...deps.blockedMatchersState.blockedWords] });
  };
}

module.exports = { blockWord };
