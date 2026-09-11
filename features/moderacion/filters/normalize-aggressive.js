'use strict';

const LEET_MAP = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

const collapseRepeats = (s) => s.replace(/(.)\1+/gu, '$1');

const LEET_REGEX = /[013457@$]/g;

const leetify = (text) => String(text || '').replace(LEET_REGEX, (c) => LEET_MAP[c]);

function normalizeAggressive(text) {
  return collapseRepeats(
    leetify(String(text || '').toLowerCase()).replace(/[^\p{L}\p{N}]/gu, '')
  );
}

module.exports = { normalizeAggressive, collapseRepeats, leetify };
