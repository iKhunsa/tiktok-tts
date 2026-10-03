'use strict';

const { getConfigSnapshot } = require('../../../core/config-snapshot');
const { CHAT_GUARD_LEVELS, CHAT_GUARD_LOCALES } = require('../../../core/chat-guard-options');

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

// Con todos los idiomas activos se omite `languages`: el motor ya los activa todos.
function buildLanguages(langs) {
  const known = Array.isArray(langs) ? langs.filter((locale) => CHAT_GUARD_LOCALES.includes(locale)) : [];
  if (known.length === 0 || known.length === CHAT_GUARD_LOCALES.length) return {};
  return { languages: known };
}

function buildEngineConfig(config) {
  const level = CHAT_GUARD_LEVELS.includes(config.chatGuardLevel) ? config.chatGuardLevel : DEFAULT_LEVEL;
  return {
    preset: level,
    ...buildLanguages(config.chatGuardLangs),
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

module.exports = { buildRustConfig, DEFAULT_MODE };
