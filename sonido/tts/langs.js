'use strict';

// Re-exporta desde el contrato de datos de /idioma — nunca
// require('../../idioma/...') directo (mismo patron que idioma-filtrar.js).
const { GOOGLE_TTS_LANGS, DICT_FILTER_LANGS, VOICE_TO_DICT_LANG } = require('../../core/contracts/idioma-datos');

module.exports = { GOOGLE_TTS_LANGS, DICT_FILTER_LANGS, VOICE_TO_DICT_LANG };
