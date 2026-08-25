'use strict';

/**
 * Contrato de datos puros de /idioma (constantes, no comportamiento —
 * por eso no necesita injeccion en tiempo de registro como idioma-filtrar.js,
 * estos modulos son Set/objeto estatico sin dependencias de configuracion).
 * Cualquier otro dominio que necesite estas constantes pasa por aca en vez
 * de hacer require('../../idioma/...') directo.
 */
const { GOOGLE_TTS_LANGS } = require('../../idioma/google-tts-langs');
const { DICT_FILTER_LANGS } = require('../../idioma/dict-filter-langs');
const { VOICE_TO_DICT_LANG } = require('../../idioma/voice-to-dict-lang');

module.exports = { GOOGLE_TTS_LANGS, DICT_FILTER_LANGS, VOICE_TO_DICT_LANG };
