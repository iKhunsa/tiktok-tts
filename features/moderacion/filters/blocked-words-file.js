'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../../core/paths');
const { accountDataPath } = require('../../../core/account-data-path');
const { atomicWriteFileSync } = require('../../../core/atomic-write');
const { invalidateBlockedMatchers } = require('./blocked-matchers');

const DEFAULT_BLOCKED_WORDS_FILE = path.join(RESOURCE_BASE, 'blocked-words.md');
function blockedWordsFile() { return accountDataPath('blocked-words.md'); }

function loadBlockedWordsFromFile(state, logger) {
  try {
    const file = blockedWordsFile();
    if (!fs.existsSync(file) && fs.existsSync(DEFAULT_BLOCKED_WORDS_FILE)) {
      fs.copyFileSync(DEFAULT_BLOCKED_WORDS_FILE, file);
    }
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const word = trimmed.slice(2).toLowerCase().trim();
        if (word) state.blockedWords.add(word);
      }
    }
    invalidateBlockedMatchers(state);
    logger.log(
      'info', 'moderacion', 'moderacion/filters/blocked-words-file.js#loadBlockedWordsFromFile', 'moderacion.palabras.cargado',
      `blocked-words.md cargado con ${state.blockedWords.size} palabra(s)`, { count: state.blockedWords.size }
    );
  } catch (error) {
    logger.log(
      'error', 'moderacion', 'moderacion/filters/blocked-words-file.js#loadBlockedWordsFromFile', 'moderacion.palabras.carga_fallida',
      `No se pudo cargar blocked-words.md: ${error.message}`, { path: blockedWordsFile(), error: error.message, stack: error.stack }
    );
  }
}

function saveBlockedWordsToFile(state, logger) {
  try {
    const sorted = [...state.blockedWords].sort((a, b) => a.localeCompare(b));
    const lines = [
      '# Palabras Prohibidas — TikLiveTTS',
      '',
      'Edita este archivo directamente o usa la web en `/advanced.html`.',
      'Las palabras se comparan en minusculas, sin importar acentos.',
      '',
    ];
    for (const word of sorted) lines.push(`- ${word}`);
    lines.push('');
    atomicWriteFileSync(blockedWordsFile(), lines.join('\n'));
    logger.log(
      'info', 'moderacion', 'moderacion/filters/blocked-words-file.js#saveBlockedWordsToFile', 'moderacion.palabras.guardado',
      `blocked-words.md guardado con ${sorted.length} palabra(s)`, { count: sorted.length }
    );
  } catch (error) {
    logger.log(
      'error', 'moderacion', 'moderacion/filters/blocked-words-file.js#saveBlockedWordsToFile', 'moderacion.palabras.guardado_fallido',
      `No se pudo guardar blocked-words.md: ${error.message}`, { path: blockedWordsFile(), error: error.message, stack: error.stack }
    );
  }
}

module.exports = { loadBlockedWordsFromFile, saveBlockedWordsToFile, blockedWordsFile };
