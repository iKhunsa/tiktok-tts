'use strict';

const { ALLOWED_WORD_MAX_LEN } = require('../../../core/chat-guard-options');

// Devuelve null si la palabra se puede permitir; si no, { status, error, errorKey }.
// Compartido por la ruta HTTP y la tool MCP para que rechacen lo mismo.
function rejectAllowedWord(word, blockedWords) {
  if (!word || word.length > ALLOWED_WORD_MAX_LEN) {
    return { status: 400, error: 'Palabra invalida', errorKey: 'errors.chatGuardInvalidWord' };
  }
  // El motor solo exceptua palabras sueltas, no frases.
  if (/\s/.test(word)) {
    return { status: 400, error: 'Solo palabras sueltas', errorKey: 'errors.chatGuardAllowedSingleWord' };
  }
  if (blockedWords.has(word)) {
    return { status: 409, error: 'La palabra esta en la lista de bloqueadas', errorKey: 'errors.chatGuardWordConflict' };
  }
  return null;
}

module.exports = { rejectAllowedWord };
