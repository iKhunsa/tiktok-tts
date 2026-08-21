'use strict';

// Re-exporta desde /idioma (Fase 3) — no se duplica la constante. Es un
// import de dato puro (un Set/objeto constante), no del comportamiento
// interno del dominio.
const { GOOGLE_TTS_LANGS } = require('../../idioma/google-tts-langs');
const { DICT_FILTER_LANGS } = require('../../idioma/dict-filter-langs');
const { VOICE_TO_DICT_LANG } = require('../../idioma/voice-to-dict-lang');

module.exports = { GOOGLE_TTS_LANGS, DICT_FILTER_LANGS, VOICE_TO_DICT_LANG };
