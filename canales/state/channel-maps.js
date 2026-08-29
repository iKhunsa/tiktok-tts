'use strict';

const MAX_RECONNECT_ATTEMPTS = 5;

/** Unico estado mutable de /canales: conexiones activas por plataforma + OBS + OAuth. */
function createChannelState() {
  return {
    tiktokChannels: new Map(), // cleanUsername -> { conn, attempts, timer }
    connectingTiktok: new Set(),
    twitchChannels: new Map(), // channel -> tmi.Client
    twitchReconnectTimers: new Map(),
    youtubeChannels: new Map(), // channelOrId -> LiveChat
    youtubeReconnectTimers: new Map(),
    youtubeWatchdogTimers: new Map(), // channelKey -> Timeout (watchdog de chat 'silencioso')
    youtubeSeenIds: new Map(), // channelKey -> Set<msgId>
    kickChannels: new Map(), // slug -> { ws, chatroomId, intentional, pingTimer, attempt }
    kickSeenIds: new Map(), // slug -> Set<msgId>
    kickWatchdogTimers: new Map(), // slug -> Timeout (watchdog de chat 'silencioso')
    kickReconnectTimers: new Map(), // slug -> Timeout (backoff de reconexion del WS)
    authTokens: { twitch: null },
    obs: {
      ws: null,
      lastParams: null, // { port, password } de la ultima conexion exitosa
      reconnectTimer: null,
      reconnectAttempts: 0,
      intentionalClose: false,
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
