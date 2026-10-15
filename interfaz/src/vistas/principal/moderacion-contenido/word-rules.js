import { MAX_WORD_LENGTH } from './chat-guard-options.js';

const OTHER_LIST = { blocked: 'allowed', allowed: 'blocked' };
const LIST_LABEL_KEY = { blocked: 'chatGuard.words.listBlocked', allowed: 'chatGuard.words.listAllowed' };

// Solo refleja la normalizacion del backend para avisar antes de enviar.
export function normalizeWord(word) {
  return String(word ?? '').trim().toLowerCase();
}

// null = se puede agregar; si no, { key, otherListKey? } con la clave i18n del aviso.
export function findWordProblem({ word, list, words }) {
  if (!word) return { key: 'chatGuard.words.empty' };
  if (word.length > MAX_WORD_LENGTH) return { key: 'chatGuard.words.tooLong' };
  // El motor solo exceptua palabras sueltas, no frases.
  if (list === 'allowed' && /\s/.test(word)) return { key: 'errors.chatGuardAllowedSingleWord' };
  if (words[list].includes(word)) return { key: 'chatGuard.words.duplicate' };
  const other = OTHER_LIST[list];
  if (words[other].includes(word)) return { key: 'chatGuard.words.conflict', otherListKey: LIST_LABEL_KEY[other] };
  return null;
}
