'use strict';

function cleanTiktokUsername(value = '') {
  return String(value).replace('@', '').trim();
}

module.exports = { cleanTiktokUsername };
