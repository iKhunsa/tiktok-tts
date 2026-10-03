'use strict';

function normalizeWord(word) {
  return (typeof word === 'string' ? word : '').trim().toLowerCase();
}

module.exports = { normalizeWord };
