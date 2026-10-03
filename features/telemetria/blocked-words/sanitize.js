'use strict';

const crypto = require('crypto');

const MAX_WORDS = 500;
const MAX_CHARS = 40;
const MAX_TOKENS = 3;

// Misma regla que el servidor (telemetria-tts/api/src/connectors/blocked-words.js):
// el cliente no envia nada que el servidor fuera a descartar, y tampoco confia en
// que el servidor sanee por el.
function sanitizeWord(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.length > MAX_CHARS || raw.includes('@')) return null;
  if (/(?:https?:\/\/|www\.)/i.test(raw) || /\S+@\S+\.\S+/.test(raw) || /\d{6,}/.test(raw)) return null;

  const word = raw.toLowerCase()
    .replace(/ñ/g, '\uE000')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uE000/g, 'ñ')
    .replace(/\s+/g, ' ')
    .trim();
  return word && word.length <= MAX_CHARS && word.split(' ').length <= MAX_TOKENS ? word : null;
}

// Lista unica, ordenada (hash estable) y acotada.
function sanitizeWords(values) {
  const clean = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const word = sanitizeWord(value);
    if (word) clean.add(word);
  }
  return [...clean].sort().slice(0, MAX_WORDS);
}

function listHash(words) {
  return crypto.createHash('sha256').update(words.join('\n')).digest('hex');
}

module.exports = { sanitizeWord, sanitizeWords, listHash, MAX_WORDS };
