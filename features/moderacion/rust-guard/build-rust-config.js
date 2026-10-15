'use strict';

const { getConfigSnapshot } = require('../../../core/config-snapshot');
const { CHAT_GUARD_LEVELS, CHAT_GUARD_LOCALES } = require('../../../core/chat-guard-options');
const { localesForVoice } = require('../../../core/chat-guard-voice-languages');

const MODES = ['shadow', 'enforce'];
const DEFAULT_MODE = 'shadow';
const DEFAULT_LEVEL = 'balanced';
const TRICKS_OPTIONS = { splitOnPunctuation: true, collapseRepeats: true, leetspeak: true };
const SIMILAR_THRESHOLD = 0.95; // mismo umbral que el preset STRICT del motor

function buildCustomOptions(custom = {}) {
  return {
    ...(custom.tricks ? TRICKS_OPTIONS : {}),
    ...(custom.similar ? { fuzzyThreshold: SIMILAR_THRESHOLD } : {}),
  };
}

// Idiomas pedidos al motor. create-rust-guard.js los recorta a los que el motor
// instalado soporta antes de aplicarlos.
function requestedLanguages(config) {
  if (config.chatGuardLangsAuto !== false) return localesForVoice(config.ttsVoiceLang);
  const known = Array.isArray(config.chatGuardLangs) ? config.chatGuardLangs.filter((locale) => CHAT_GUARD_LOCALES.includes(locale)) : [];
  return known.length ? known : [...CHAT_GUARD_LOCALES];
}

function buildEngineConfig(config) {
  const level = CHAT_GUARD_LEVELS.includes(config.chatGuardLevel) ? config.chatGuardLevel : DEFAULT_LEVEL;
  return {
    preset: level,
    languages: requestedLanguages(config),
    ...(level === 'custom' ? { custom: buildCustomOptions(config.chatGuardCustom) } : {}),
  };
}

function buildRustConfig({ bus, blockedWords, allowedWords = [] }) {
  const config = getConfigSnapshot(bus);
  return {
    enabled: config.rustGuardEnabled === true,
    mode: MODES.includes(config.rustGuardMode) ? config.rustGuardMode : DEFAULT_MODE,
    engineConfig: buildEngineConfig(config),
    blockedWords: [...blockedWords],
    allowedWords: [...allowedWords],
  };
}

module.exports = { buildRustConfig, requestedLanguages, DEFAULT_MODE };
