'use strict';

function cleanKickSlug(value = '') {
  return String(value)
    .replace(/^https?:\/\/(www\.)?kick\.com\//i, '')
    .replace(/^[@#]+/, '')
    .split(/[/?#]/)[0]
    .trim()
    .toLowerCase();
}

module.exports = { cleanKickSlug };
