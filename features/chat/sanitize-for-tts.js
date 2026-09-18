'use strict';

// Limpieza comun (links, @menciones, letras repetidas, espacios). El texto que
// se MUESTRA en el chat usa solo esto: conserva emojis unicode. El que lee el
// TTS ademas descarta todo lo que no sea letra/numero/espacio/puntuacion.
function sanitizeForChat(text) {
  return text
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/@\w+/g, '')
    .replace(/(.){4,}/g, '$1$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeForTTS(text) {
  return sanitizeForChat(text.replace(/[^\p{L}\p{N}\p{Z}\p{P}]/gu, ' '));
}

module.exports = { sanitizeForTTS, sanitizeForChat };
