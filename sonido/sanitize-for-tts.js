'use strict';

// Duplicado intencional de chat/sanitize-for-tts.js (funcion pura, sin
// estado) — /api/tts re-sanitiza defensivamente el texto que recibe,
// sin importar /chat directo.
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
