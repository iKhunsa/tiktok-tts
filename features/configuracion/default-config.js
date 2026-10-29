'use strict';

const { CHAT_GUARD_LOCALES } = require('../../core/chat-guard-options');

const DEFAULT_CONFIG = {
  LIKE_DEBOUNCE_MS: 1500,
  TTS_MAX_CHARS: 200,
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
  // Plantillas propias de avisos ({usuario}, {regalo}, ...) por evento; vacio = texto estandar.
  announceTemplates: {},
  // Gate por donacion (features/moderacion/gift-gate.js): si esta activado para
  // una plataforma, el TTS solo lee a quien ya regalo/paga al menos el minimo
  // configurado en ALGUN momento de la sesion actual (whitelist y admin siempre
  // se leen). Por plataforma porque cada una usa una moneda distinta y el
  // usuario puede no tener todas conectadas.
  ttsGiftGateTiktokEnabled: false,
  ttsGiftGateTiktokMinCoins: 1,
  ttsGiftGateTwitchEnabled: false,
  ttsGiftGateTwitchMinBits: 100,
  ttsGiftGateKickEnabled: false,
  ttsGiftGateKickMinKicks: 10,
  // Rust Chat Guard (features/moderacion/rust-guard/): segunda capa de moderacion
  // de contenido, por cuenta. shadow = solo registra discrepancias; enforce = aplica.
  rustGuardEnabled: true,
  rustGuardMode: 'shadow',
  // Nivel (SOFT/BALANCED/STRICT/CUSTOM del motor), idiomas del filtro (todos por defecto)
  // y detectores del nivel 'custom'. Ver core/chat-guard-options.js.
  chatGuardLevel: 'balanced',
  chatGuardLangs: [...CHAT_GUARD_LOCALES],
  // true: los idiomas del filtro siguen a la voz del TTS (core/chat-guard-voice-languages.js)
  // y chatGuardLangs solo se usa con el modo manual.
  chatGuardLangsAuto: true,
  chatGuardCustom: { tricks: true, similar: false },
  // Texto sin sentido (@tiklivetts/chat-guard): off | shadow (solo avisa) | enforce (no se lee).
  // Nunca silencia al usuario: eso lo decide el streamer.
  gibberishMode: 'enforce',
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
  // X de la ventana: false = cierra la app, true = la esconde en la bandeja.
  closeToTray: false,
  // Llave técnica de apagado (true = cero envíos). Por defecto se envía la lista saneada,
  // sin nombres ni chat. Renombrada desde blockedWordsTelemetryEnabled para que el `false`
  // que guardó el antiguo interruptor opt-in no deje cuentas apagadas sin querer.
  blockedWordsTelemetryDisabled: false,
  adminIdentities: {
    tiktok: ['tiklivetts'],
    twitch: ['soykurorai'],
    youtube: ['TikLiveTTS'],
    kick: ['speedmucho'],
  },
};

module.exports = { DEFAULT_CONFIG };
