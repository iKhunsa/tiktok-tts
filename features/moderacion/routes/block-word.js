'use strict';

const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');

function blockWord(deps) {
  return (req, res) => {
    const { word } = req.body || {};
    const w = (typeof word === 'string' ? word : '').trim().toLowerCase();
    // Trim ANTES del guard: "   " pasaba la verificacion de truthiness y metia
    // "" al Set -> getBlockedMatchers armaba una regex con alternativa vacia que
    // bloqueaba el chat entero en silencio.
    if (!w) return res.status(400).json({ error: 'Palabra requerida', errorKey: 'errors.textRequired' });
    deps.blockedWords.add(w);
    if (deps.configure) deps.configure();
    saveBlockedWordsToFile(deps.blockedWords, deps.logger);
    res.json({ words: [...deps.blockedWords] });
  };
}

module.exports = { blockWord };
