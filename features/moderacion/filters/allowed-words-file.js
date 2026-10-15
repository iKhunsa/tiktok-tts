'use strict';

const fs = require('fs');
const { accountDataPath } = require('../../../core/account-data-path');
const { atomicWriteFileSync } = require('../../../core/atomic-write');

function allowedWordsFile() { return accountDataPath('chat-guard-allowed-words.json'); }

function loadAllowedWordsFromFile(words, logger) {
  try {
    const file = allowedWordsFile();
    if (!fs.existsSync(file)) return;
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(list)) list.filter((word) => typeof word === 'string' && word).forEach((word) => words.add(word));
  } catch (error) {
    logger.log('error', 'moderacion', 'moderacion/filters/allowed-words-file.js#loadAllowedWordsFromFile', 'moderacion.palabras_permitidas.carga_fallida', 'No se pudo cargar la lista de palabras permitidas', { error: error.message });
  }
}

function saveAllowedWordsToFile(words, logger) {
  try {
    atomicWriteFileSync(allowedWordsFile(), JSON.stringify([...words].sort(), null, 2));
  } catch (error) {
    logger.log('error', 'moderacion', 'moderacion/filters/allowed-words-file.js#saveAllowedWordsToFile', 'moderacion.palabras_permitidas.guardado_fallido', 'No se pudo guardar la lista de palabras permitidas', { error: error.message });
  }
}

module.exports = { loadAllowedWordsFromFile, saveAllowedWordsToFile, allowedWordsFile };
