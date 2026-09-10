'use strict';

const { invalidateBlockedMatchers } = require('../filters/blocked-matchers');
const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');

function blockWord(deps) {
  return (req, res) => {
    const { word } = req.body || {};
    const w = (typeof word === 'string' ? word : '').trim().toLowerCase();
    // Trim ANTES del guard: "   " pasaba la verificacion de truthiness y metia
    // "" al Set -> getBlockedMatchers armaba una regex con alternativa vacia que
    // bloqueaba el chat entero en silencio.
    if (!w) return res.status(400).json({ error: 'Palabra requerida', errorKey: 'errors.textRequired' });
    deps.blockedMatchersState.blockedWords.add(w);
    invalidateBlockedMatchers(deps.blockedMatchersState);
    saveBlockedWordsToFile(deps.blockedMatchersState, deps.logger);
    res.json({ words: [...deps.blockedMatchersState.blockedWords] });
  };
}

module.exports = { blockWord };
