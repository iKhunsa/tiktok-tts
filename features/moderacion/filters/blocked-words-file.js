'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../../core/paths');
const { accountDataPath } = require('../../../core/account-data-path');
const { atomicWriteFileSync } = require('../../../core/atomic-write');

const DEFAULT_FILE = path.join(RESOURCE_BASE, 'blocked-words.md');
function blockedWordsFile() { return accountDataPath('blocked-words.md'); }

function loadBlockedWordsFromFile(words, logger) {
  try {
    const file = blockedWordsFile();
    if (!fs.existsSync(file) && fs.existsSync(DEFAULT_FILE)) fs.copyFileSync(DEFAULT_FILE, file);
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const word = /^[-*]\s+(.+)$/.exec(line.trim());
      if (word) words.add(word[1].toLowerCase().trim());
    }
  } catch (error) {
    logger.log('error', 'moderacion', 'moderacion/filters/blocked-words-file.js#loadBlockedWordsFromFile', 'moderacion.palabras.carga_fallida', 'No se pudo cargar blocked-words.md', { error: error.message });
  }
}

function saveBlockedWordsToFile(words, logger) {
  try {
    const lines = ['# Palabras Prohibidas — TikLiveTTS', '', ...[...words].sort().map((word) => `- ${word}`), ''];
    atomicWriteFileSync(blockedWordsFile(), lines.join('\n'));
  } catch (error) {
    logger.log('error', 'moderacion', 'moderacion/filters/blocked-words-file.js#saveBlockedWordsToFile', 'moderacion.palabras.guardado_fallido', 'No se pudo guardar blocked-words.md', { error: error.message });
  }
}

module.exports = { loadBlockedWordsFromFile, saveBlockedWordsToFile, blockedWordsFile };
