'use strict';

function blockedWordsGet(blockedMatchersState) {
  return (_req, res) => res.json({ words: [...blockedMatchersState.blockedWords] });
}

module.exports = { blockedWordsGet };
