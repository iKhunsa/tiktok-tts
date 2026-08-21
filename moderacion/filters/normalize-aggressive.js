'use strict';

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
