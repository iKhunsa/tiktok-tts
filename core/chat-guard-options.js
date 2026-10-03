'use strict';

// Opciones del filtro de contenido compartidas por configuracion (validadores)
// y moderacion (motor). El frontend tiene su espejo en
// interfaz/src/vistas/principal/moderacion-contenido/chat-guard-options.js.
const CHAT_GUARD_LEVELS = ['soft', 'balanced', 'strict', 'custom'];
const CHAT_GUARD_LOCALES = ['es', 'es_419', 'en', 'es_ar', 'es_cl', 'es_co', 'es_ec', 'es_mx', 'es_pe', 'es_ve'];
const CHAT_GUARD_CUSTOM_KEYS = ['tricks', 'similar'];
const ALLOWED_WORD_MAX_LEN = 40;

function isChatGuardLangs(value) {
  return Array.isArray(value) && value.length > 0
    && new Set(value).size === value.length
    && value.every((locale) => CHAT_GUARD_LOCALES.includes(locale));
}

function isChatGuardCustom(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === CHAT_GUARD_CUSTOM_KEYS.length
    && CHAT_GUARD_CUSTOM_KEYS.every((key) => typeof value[key] === 'boolean');
}

module.exports = {
  CHAT_GUARD_LEVELS, CHAT_GUARD_LOCALES, CHAT_GUARD_CUSTOM_KEYS, ALLOWED_WORD_MAX_LEN,
  isChatGuardLangs, isChatGuardCustom,
};
