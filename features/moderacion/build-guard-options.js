'use strict';

const idiomaFiltrar = require('../../core/contracts/idioma-filtrar');

// Tope real de Google Translate TTS; features/configuracion acota TTS_MAX_CHARS a lo mismo.
const GOOGLE_TTS_MAX_CHARS = 200;

const BASE_RULES = {
  maxDisplayLength: 300,
  floodWindowMs: 45000,
  floodMinLength: 4,
  duplicateWindowMs: 6 * 60 * 60 * 1000,
};

function buildGuardOptions({ bus, blockedWords }) {
  const config = configSnapshot(bus);
  return {
    rules: {
      ...BASE_RULES,
      maxSpeechLength: config.TTS_MAX_CHARS || GOOGLE_TTS_MAX_CHARS,
      nonFollowersSpeak: !!config.ttsReadNonFollowers,
      gibberishMode: config.gibberishMode || 'enforce',
    },
    knownWord: (word) => idiomaFiltrar.isKnownWord(word),
    adminHandles: adminHandles(config.adminIdentities),
    blockedWords: [...blockedWords],
    languageCheck: (text) => checkLanguage(bus, text),
  };
}

function checkLanguage(bus, text) {
  const config = configSnapshot(bus);
  return idiomaFiltrar.filtrar(text, config.ttsVoiceLang, languageOptions(config));
}

function configSnapshot(bus) {
  let config = {};
  bus.emit('config:get', (current) => { config = current || {}; });
  return config;
}

function adminHandles(identities = {}) {
  return Object.entries(identities).flatMap(([platform, handles]) => (handles || []).map((handle) => ({ platform, handle })));
}

function languageOptions(config) {
  return {
    langFilterEnabled: !!config.langFilterEnabled,
    dictFilterEnabled: !!config.dictFilterEnabled,
    allowedExtraLangs: config.allowedExtraLangs || [],
  };
}

module.exports = { buildGuardOptions };
