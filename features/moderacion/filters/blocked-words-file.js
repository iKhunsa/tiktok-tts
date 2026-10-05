'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../../core/paths');
const { accountDataPath } = require('../../../core/account-data-path');
const { atomicWriteFileSync } = require('../../../core/atomic-write');
const { normalizeWord } = require('./normalize-word');

const DEFAULT_FILE = path.join(RESOURCE_BASE, 'blocked-words.md');
function blockedWordsFile() { return accountDataPath('blocked-words.json'); }
function legacyBlockedWordsFile() { return accountDataPath('blocked-words.md'); }

function wordsFromText(content) {
  return String(content).split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, ''))
    .filter((line) => line && !line.startsWith('#'))
    .map(normalizeWord)
    .filter(Boolean);
}

function parseWords(content) {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.map(normalizeWord).filter(Boolean);
  } catch (error) {
    if (/^\s*[\[{]/.test(content)) throw error;
  }
  return wordsFromText(content);
}

function saveBlockedWordsToFile(words, logger, file = blockedWordsFile()) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    atomicWriteFileSync(file, JSON.stringify([...words].sort(), null, 2));
    return true;
  } catch (error) {
    logger.log('error', 'moderacion', 'moderacion/filters/blocked-words-file.js#saveBlockedWordsToFile', 'moderacion.palabras.guardado_fallido', 'No se pudo guardar blocked-words.json', { error: error.message });
    return false;
  }
}

function loadBlockedWordsFromFile(words, logger, files = {}) {
  const file = files.file || blockedWordsFile();
  const legacyFile = files.legacyFile || legacyBlockedWordsFile();
  const defaultFile = files.defaultFile || DEFAULT_FILE;
  try {
    if (fs.existsSync(file)) {
      for (const word of parseWords(fs.readFileSync(file, 'utf8'))) words.add(word);
      return;
    }
    const source = fs.existsSync(legacyFile) ? legacyFile : (fs.existsSync(defaultFile) ? defaultFile : null);
    if (!source) return;
    for (const word of wordsFromText(fs.readFileSync(source, 'utf8'))) words.add(word);
    saveBlockedWordsToFile(words, logger, file);
  } catch (error) {
    if (fs.existsSync(file)) {
      try { fs.renameSync(file, `${file}.corrupt-${Date.now()}`); } catch (_) { /* best effort */ }
    }
    logger.log('error', 'moderacion', 'moderacion/filters/blocked-words-file.js#loadBlockedWordsFromFile', 'moderacion.palabras.carga_fallida', 'No se pudo cargar blocked-words.json', { error: error.message });
  }
}

module.exports = { loadBlockedWordsFromFile, saveBlockedWordsToFile, blockedWordsFile, legacyBlockedWordsFile, parseWords, wordsFromText };
