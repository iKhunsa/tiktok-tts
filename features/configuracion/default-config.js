'use strict';

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
  // Servidor MCP (agentes). Endpoint solo-localhost; las tools destructivas
  // van detras de su propio toggle + prompt del host del agente.
  mcpEnabled: true,
  mcpDestructiveToolsEnabled: false,
  // Tools MCP de desarrollo (dev_*): inyectar chat/eventos, ver logs crudos,
  // status completo, bus emit. Solo para debug — default off.
  mcpDevToolsEnabled: false,
  // Sistema de suscripciones freemium (features/auth/). Default false = la app
  // se comporta como siempre (sin login, todo desbloqueado). Con true, las
  // features Pro quedan detras del plan y aparece la UI de cuenta.
  // Interruptor de panico: apagar revierte al estado conocido sin re-deploy.
  subscriptionsEnabled: false,
  adminIdentities: {
    tiktok: ['ikhunsa_tiklivetts', 'soykurorai'],
    twitch: ['soykurorai'],
    youtube: ['br0k3ny'],
    kick: ['speedmucho'],
  },
};

module.exports = { DEFAULT_CONFIG };
