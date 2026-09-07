'use strict';

function cleanTwitchChannel(value = '') {
  return String(value)
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
    .replace(/^[@#]+/, '')
    .split(/[/?#]/)[0]
    .trim()
    .toLowerCase();
}

module.exports = { cleanTwitchChannel };
