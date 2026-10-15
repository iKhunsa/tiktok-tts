'use strict';

const { saveBlockedWordsToFile } = require('../filters/blocked-words-file');
const { normalizeWord } = require('../filters/normalize-word');

function blockWord(deps) {
  return (req, res) => {
    const { word } = req.body || {};
    const w = normalizeWord(word);
    // Trim ANTES del guard: "   " pasaba la verificacion de truthiness y metia
    // "" al Set -> getBlockedMatchers armaba una regex con alternativa vacia que
    // bloqueaba el chat entero en silencio.
    if (!w) return res.status(400).json({ error: 'Palabra requerida', errorKey: 'errors.textRequired' });
    deps.blockedWords.add(w);
    if (!saveBlockedWordsToFile(deps.blockedWords, deps.logger)) return res.status(500).json({ error: 'No se pudo guardar la lista', errorKey: 'errors.chatGuardUnavailable' });
    if (deps.configure) deps.configure();
    res.json({ words: [...deps.blockedWords] });
  };
}

module.exports = { blockWord };
