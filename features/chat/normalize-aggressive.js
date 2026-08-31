'use strict';

// Duplicado intencional de moderacion/filters/normalize-aggressive.js (ver
// fase-07-chat.md): es una funcion pura de una linea, sin estado — se decidio
// duplicarla en vez de crear un contrato cruzado /chat <-> /moderacion solo
// para esta utilidad trivial. Documentado aca y en moderacion/index.js.
const LEET_MAP = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

const collapseRepeats = (s) => s.replace(/(.)\1+/gu, '$1');

function normalizeAggressive(text) {
  return collapseRepeats(
    String(text || '')
      .toLowerCase()
      .replace(/[01345@$]/g, (c) => LEET_MAP[c])
      .replace(/[^\p{L}\p{N}]/gu, '')
  );
}

module.exports = { normalizeAggressive, collapseRepeats };
