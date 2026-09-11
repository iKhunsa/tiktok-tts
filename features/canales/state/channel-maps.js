'use strict';

const MAX_RECONNECT_ATTEMPTS = 5;

/** Unico estado mutable de /canales: conexiones activas por plataforma + OBS + OAuth. */
function createChannelState() {
  return {
    tiktokChannels: new Map(), // cleanUsername -> { conn, attempts, timer }
    connectingTiktok: new Set(),
    connectingTwitch: new Set(),
    connectingYoutube: new Set(),
    connectingKick: new Set(),
    twitchChannels: new Map(), // channel -> tmi.Client
    twitchReconnectTimers: new Map(),
    youtubeChannels: new Map(), // channelOrId -> LiveChat
    youtubeReconnectTimers: new Map(),
    youtubeWatchdogTimers: new Map(), // channelKey -> Timeout (watchdog de chat 'silencioso')
    // channelKey -> Set<item.id>. Defensa en profundidad ademas del gate central
    // de dedup (features/chat/emit-chat-message.js, ventana 10min): youtube-chat
    // SIEMPRE re-scrapea la pagina del live al reconectar y extrae el
    // "continuation" con un regex de primera coincidencia que no garantiza
    // arrancar "desde ahora" — un hueco real (red, suspension) mas largo que la
    // ventana de 10 min puede reentregar backlog que el gate central ya evacuo.
    // Sin ventana de tiempo (solo cap de conteo, como kickSeenIds) para no
    // depender de cuanto dure el hueco. Se crea una vez por canal y NO se
    // recrea en reconexiones (mismo patron que kickSeenIds).
    youtubeSeenIds: new Map(),
    kickChannels: new Map(), // slug -> { ws, chatroomId, intentional, pingTimer, attempt }
    kickSeenIds: new Map(), // slug -> Set<msgId>
    kickWatchdogTimers: new Map(), // slug -> Timeout (watchdog de chat 'silencioso')
    kickReconnectTimers: new Map(), // slug -> Timeout (backoff de reconexion del WS)
    channelWatchdogTimers: new Map(), // 'tiktok:<user>' / 'twitch:<chan>' -> Timeout (stale-watchdog.js)
    authTokens: { twitch: null },
    obs: {
      ws: null,
      lastParams: null, // { port, password } de la ultima conexion exitosa
      reconnectTimer: null,
      reconnectAttempts: 0,
      intentionalClose: false,
      connecting: false,
    },
    eventsub: {
      ws: null,
      keepaliveTimer: null,
      reconnectTimer: null,
      reconnectAttempts: 0,
      stopped: true,
      followActive: false,
      seenMsgIds: new Set(),
    },
    pendingOAuth: { twitch: null },
  };
}

module.exports = { createChannelState, MAX_RECONNECT_ATTEMPTS };
