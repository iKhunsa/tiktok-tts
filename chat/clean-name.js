'use strict';

function cleanName(str = '') {
  return str
    .replace(/^@/, '')
    .replace(/[_.\-]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { cleanName };
