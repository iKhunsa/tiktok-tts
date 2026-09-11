'use strict';

const { collapseRepeats } = require('./normalize-aggressive');

const foldAccents = (s) => s.normalize('NFD').replace(/\p{M}/gu, '');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function createBlockedMatchersState() {
  return { blockedWords: new Set(), cache: null };
}

function invalidateBlockedMatchers(state) {
  state.cache = null;
}

/**
 * Matchers con limite de palabra Unicode-aware. re1 = palabras con acentos
 * plegados; re2 = ademas con repeticiones colapsadas (elongaciones tipo
 * "putaaa"). Boundary "no-letra": digitos pegados no salvan la palabra.
 */
function getBlockedMatchers(state) {
  if (state.cache) return state.cache;
  if (!state.blockedWords.size) {
    state.cache = { re1: null, re2: null };
    return state.cache;
  }
  const boundary = (alts) => new RegExp(`(?<=^|[^\\p{L}])(?:${alts.join('|')})(?=$|[^\\p{L}])`, 'u');
  const plain = new Set();
  const collapsed = new Set();
  for (const word of state.blockedWords) {
    const folded = foldAccents(word);
    plain.add(escapeRegex(folded));
    collapsed.add(escapeRegex(collapseRepeats(folded)));
  }
  state.cache = { re1: boundary([...plain]), re2: boundary([...collapsed]) };
  return state.cache;
}

module.exports = { createBlockedMatchersState, invalidateBlockedMatchers, getBlockedMatchers, foldAccents, escapeRegex };
