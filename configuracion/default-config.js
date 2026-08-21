'use strict';

// TODO(fase-03): GOOGLE_TTS_LANGS y DICT_FILTER_LANGS son propiedad de
// /idioma. Se duplican aca temporalmente (idem backend-viejo/server.js:584/589)
// porque /idioma todavia no existe (se construye en la Fase 3) — cuando
// aterrice, validators.js debe leerlas de su contrato publicado en vez de
// esta copia local.
const GOOGLE_TTS_LANGS = new Set(['es-MX', 'en', 'en-GB', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ja', 'zh-CN', 'ru', 'ko']);
const DICT_FILTER_LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it'];

const DEFAULT_CONFIG = {
  LIKE_DEBOUNCE_MS: 1500,
  TTS_MAX_CHARS: 500,
  rateLimitEnabled: false,
  TTS_RATE_LIMIT_MAX: 10,
  TTS_RATE_WINDOW_MS: 5000,
  MAX_QUEUE_MSG: 15,
  musicEnabled: true,
  musicUserCooldownMs: 60000,
  musicMaxQueue: 10,
  musicBannedUsers: [],
  musicVolume: 0.5,
  streamerPlaylist: [],
  playlistShuffle: false,
  playlistEnabled: false,
  langFilterEnabled: false,
  dictFilterEnabled: false,
  allowedExtraLangs: [],
  ttsVoiceLang: 'es-MX',
  a11yReduceMotion: false,
  a11yUiFontScale: 1,
  a11yHighContrast: false,
  ttsSlowSpeech: false,
  // true = el TTS lee a todo el mundo (comportamiento historico).
  // false = solo lee a seguidores y a la whitelist manual.
  ttsReadNonFollowers: true,
  adminIdentities: {
    tiktok: ['ikhunsa_tiklivetts', 'soykurorai'],
    twitch: ['soykurorai'],
    youtube: ['br0k3ny'],
  },
};

module.exports = { DEFAULT_CONFIG, GOOGLE_TTS_LANGS, DICT_FILTER_LANGS };
