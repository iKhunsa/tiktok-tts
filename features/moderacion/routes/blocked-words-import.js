'use strict';

const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');

function blockedWordsImport(deps) {
  return (req, res) => {
    const { content } = req.body || {};
    if (typeof content !== 'string') return res.status(400).json({ error: 'Se requiere content', errorKey: 'errors.contentRequired' });

    deps.blockedMatchersState.blockedWords.clear();
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const word = trimmed.slice(2).toLowerCase().trim();
        if (word) deps.blockedMatchersState.blockedWords.add(word);
      }
    }
    if (deps.configure) deps.configure();
    saveBlockedWordsToFile(deps.blockedMatchersState, deps.logger);
    res.json({ words: [...deps.blockedMatchersState.blockedWords] });
  };
}

module.exports = { blockedWordsImport };
