'use strict';

const { GOOGLE_TTS_LANGS, DICT_FILTER_LANGS } = require('./default-config');

// Migracion 1:1 de CONFIG_VALIDATORS (backend-viejo/server.js:639-666). No se
// agregan ni quitan claves en esta fase.
const CONFIG_VALIDATORS = {
  LIKE_DEBOUNCE_MS: (v) => Number.isInteger(v) && v >= 250 && v <= 10000,
  TTS_MAX_CHARS: (v) => Number.isInteger(v) && v >= 20 && v <= 1000,
  rateLimitEnabled: (v) => typeof v === 'boolean',
  TTS_RATE_LIMIT_MAX: (v) => Number.isInteger(v) && v >= 1 && v <= 120,
  TTS_RATE_WINDOW_MS: (v) => Number.isInteger(v) && v >= 1000 && v <= 60000,
  MAX_QUEUE_MSG: (v) => Number.isInteger(v) && v >= 1 && v <= 100,
  musicEnabled: (v) => typeof v === 'boolean',
  musicUserCooldownMs: (v) => Number.isInteger(v) && v >= 0 && v <= 3600000,
  musicMaxQueue: (v) => Number.isInteger(v) && v >= 1 && v <= 50,
  musicBannedUsers: (v) => Array.isArray(v),
  musicVolume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  streamerPlaylist: (v) => Array.isArray(v),
  playlistShuffle: (v) => typeof v === 'boolean',
  playlistEnabled: (v) => typeof v === 'boolean',
  langFilterEnabled: (v) => typeof v === 'boolean',
  dictFilterEnabled: (v) => typeof v === 'boolean',
  allowedExtraLangs: (v) => Array.isArray(v) && v.length <= DICT_FILTER_LANGS.length
    && v.every((x) => DICT_FILTER_LANGS.includes(x)),
  ttsVoiceLang: (v) => GOOGLE_TTS_LANGS.has(v),
  a11yReduceMotion: (v) => typeof v === 'boolean',
  a11yUiFontScale: (v) => [1, 1.15, 1.3, 1.5].includes(v),
  a11yHighContrast: (v) => typeof v === 'boolean',
  ttsSlowSpeech: (v) => typeof v === 'boolean',
  ttsReadNonFollowers: (v) => typeof v === 'boolean',
  mcpEnabled: (v) => typeof v === 'boolean',
  mcpDestructiveToolsEnabled: (v) => typeof v === 'boolean',
  adminIdentities: (v) => v && typeof v === 'object'
    && ['tiktok', 'twitch', 'youtube', 'kick'].every((p) => Array.isArray(v[p]) && v[p].every((x) => typeof x === 'string')),
};

module.exports = { CONFIG_VALIDATORS };
