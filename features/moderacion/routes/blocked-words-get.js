'use strict';

function blockedWordsGet(blockedWords) {
  return (_req, res) => res.json({ words: [...blockedWords] });
}

module.exports = { blockedWordsGet };
