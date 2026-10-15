'use strict';

// Opciones del filtro de contenido compartidas por configuracion (validadores)
// y moderacion (motor). El frontend tiene su espejo en
// interfaz/src/vistas/principal/moderacion-contenido/chat-guard-options.js.
const CHAT_GUARD_LEVELS = ['soft', 'balanced', 'strict', 'custom'];
const SPANISH_LOCALES = ['es', 'es_419', 'es_ar', 'es_cl', 'es_co', 'es_ec', 'es_mx', 'es_pe', 'es_ve'];
// Lista que el motor 0.1.0 trae activa por defecto. Sirve para la migracion de
// chatGuardLangsAuto: una cuenta que guardo exactamente esta lista no la eligio a mano.
const LEGACY_DEFAULT_LANGS = ['es', 'es_419', 'en', 'es_ar', 'es_cl', 'es_co', 'es_ec', 'es_mx', 'es_pe', 'es_ve'];
const CHAT_GUARD_LOCALES = [...LEGACY_DEFAULT_LANGS, 'pt', 'pt_br', 'fr', 'de', 'it', 'ja', 'ko', 'ru', 'zh'];
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
  CHAT_GUARD_LEVELS, CHAT_GUARD_LOCALES, SPANISH_LOCALES, LEGACY_DEFAULT_LANGS, CHAT_GUARD_CUSTOM_KEYS, ALLOWED_WORD_MAX_LEN,
  isChatGuardLangs, isChatGuardCustom,
};
