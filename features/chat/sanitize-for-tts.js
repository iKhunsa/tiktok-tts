'use strict';

function sanitizeForTTS(text) {
  return text
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/@\w+/g, '')
    .replace(/(.)\1{4,}/g, '$1$1$1')
    .replace(/[^\p{L}\p{N}\p{Z}\p{P}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { sanitizeForTTS };
