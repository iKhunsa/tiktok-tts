'use strict';

// Idiomas del filtro de contenido segun la voz del TTS (modo automatico).
// Siempre se suma el ingles: es el idioma mas mezclado en cualquier chat.
const { SPANISH_LOCALES } = require('./chat-guard-options');

const LOCALES_BY_VOICE = {
  es: SPANISH_LOCALES,
  'es-MX': SPANISH_LOCALES,
  'es-AR': SPANISH_LOCALES,
  en: [],
  'en-GB': [],
  pt: ['pt', 'pt_br'],
  'pt-PT': ['pt', 'pt_br'],
  fr: ['fr'],
  de: ['de'],
  it: ['it'],
  ja: ['ja'],
  'zh-CN': ['zh'],
  ru: ['ru'],
  ko: ['ko'],
};

// Una voz desconocida cae en espanol: es el publico principal de la app.
function localesForVoice(voice) {
  const own = LOCALES_BY_VOICE[voice] || SPANISH_LOCALES;
  return [...new Set([...own, 'en'])];
}

module.exports = { localesForVoice, LOCALES_BY_VOICE };
