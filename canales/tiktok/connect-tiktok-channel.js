'use strict';

const { WebcastPushConnection } = require('tiktok-live-connector');
const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { cleanTiktokUsername } = require('./clean-username');
const { cleanupAfterLastTikTokChannel } = require('./cleanup-after-last-channel');

const CONNECT_TIMEOUT_MS = 30000;

/**
 * Crea la conexion TikTok y engancha los handlers de evento. Cada handler
 * SOLO publica al bus con el dato crudo de la plataforma — /canales no
 * conoce Chat/Overlay/Moderacion, esos dominios deciden que hacer con
 * canal:mensaje-crudo / canal:gift / canal:like / canal:follow.
 */
function setupTikTokConnection(deps, cleanUsername) {
  const { state, bus, logger } = deps;
  const existing = state.tiktokChannels.get(cleanUsername);
  if (existing && existing.conn) existing.conn.removeAllListeners();

  const conn = new WebcastPushConnection(cleanUsername, {
    processInitialData: false,
    enableExtendedGiftInfo: false,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000,
  });
  state.tiktokChannels.set(cleanUsername, { conn, attempts: existing ? existing.attempts : 0, timer: null });

  conn.on('chat', (data) => {
    if (!data.comment || !data.comment.trim()) return;
    bus.emit('canal:mensaje-crudo', { platform: 'tiktok', channel: cleanUsername, raw: data });
  });

  conn.on('gift', (data) => {
    // giftType 1 = combo en curso; solo interesa el ultimo golpe (repeatEnd).
    if (data.giftType === 1 && !data.repeatEnd) return;
    bus.emit('canal:gift', { platform: 'tiktok', channel: cleanUsername, raw: data });
  });

  conn.on('like', (data) => {
    bus.emit('canal:like', {
      platform: 'tiktok', channel: cleanUsername,
      userId: data.uniqueId || null, nick: data.nickname || null, likeCount: data.likeCount || 1,
    });
  });

  conn.on('member', (data) => {
    bus.emit('canal:evento-especial', {
      platform: 'tiktok', channel: cleanUsername, kind: 'join',
      userId: data.uniqueId || null, nick: data.nickname || null,
    });
  });

  conn.on('follow', (data) => {
    bus.emit('canal:follow', {
      platform: 'tiktok', channel: cleanUsername,
      userId: data.uniqueId || null, nick: data.nickname || null,
    });
  });

  conn.on('share', (data) => {
    bus.emit('canal:evento-especial', {
      platform: 'tiktok', channel: cleanUsername, kind: 'share',
      userId: data.uniqueId || null, nick: data.nickname || null,
    });
  });

  conn.on('disconnected', () => {
    const entry = state.tiktokChannels.get(cleanUsername);
    if (!entry) return;
    bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'desconectado' });

    if (entry.attempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, entry.attempts), 30000);
      entry.attempts++;
      logger.log(
        'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.reconectando',
        `Reconectando TikTok ${cleanUsername}, intento ${entry.attempts}`,
        { channel: cleanUsername, intento: entry.attempts, delayMs: delay }
      );
      bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'reconectando', attempt: entry.attempts, delayMs: delay });
      entry.timer = setTimeout(() => {
        require('./reconnect-tiktok').reconnectTiktok(deps, cleanUsername);
      }, delay);
    } else {
      state.tiktokChannels.delete(cleanUsername);
      logger.log(
        'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.reconexion_fallida',
        `Reconexion de TikTok ${cleanUsername} agotada tras ${entry.attempts} intento(s)`,
        { channel: cleanUsername, attempts: entry.attempts }
      );
      cleanupAfterLastTikTokChannel(deps);
    }
  });

  conn.on('error', (err) => {
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.error',
      `Error de conexion TikTok ${cleanUsername}: ${err.message}`, { channel: cleanUsername, error: err.message, stack: err.stack }
    );
    bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'error', error: err.message });
  });

  return conn;
}

async function connectTiktokChannel(deps, channel) {
  const { state, bus, logger } = deps;
  const cleanUsername = cleanTiktokUsername(channel);
  if (!cleanUsername) throw new Error('Se requiere canal TikTok');

  if (state.connectingTiktok.has(cleanUsername)) {
    const err = new Error('Conexión ya en progreso para este canal');
    err.statusCode = 409;
    throw err;
  }
  state.connectingTiktok.add(cleanUsername);

  // Salvaguarda anti-cuelgue: si connect() no resuelve en 30s, abortar la
  // conexion (disconnect + removeAllListeners + borrar entrada).
  const connectingTimeout = setTimeout(() => {
    if (!state.connectingTiktok.has(cleanUsername)) return;
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#connectTiktokChannel', 'canales.tiktok.timeout_conexion',
      `Timeout (30s) conectando TikTok ${cleanUsername}, abortando conexion colgada`, { channel: cleanUsername }
    );
    const stale = state.tiktokChannels.get(cleanUsername);
    if (stale) {
      if (stale.timer) clearTimeout(stale.timer);
      stale.conn.removeAllListeners();
      try { stale.conn.disconnect(); } catch (_) { /* best-effort */ }
      state.tiktokChannels.delete(cleanUsername);
    }
    state.connectingTiktok.delete(cleanUsername);
  }, CONNECT_TIMEOUT_MS);

  const prev = state.tiktokChannels.get(cleanUsername);
  if (prev) {
    if (prev.timer) clearTimeout(prev.timer);
    prev.conn.removeAllListeners();
    try { prev.conn.disconnect(); } catch (_) { /* best-effort */ }
    state.tiktokChannels.delete(cleanUsername);
  }

  logger.log(
    'info', 'canales', 'canales/tiktok/connect-tiktok-channel.js#connectTiktokChannel', 'canales.tiktok.conectando',
    `Conectando a TikTok ${cleanUsername}`, { channel: cleanUsername }
  );
  bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'conectando' });

  try {
    setupTikTokConnection(deps, cleanUsername);
    const entry = state.tiktokChannels.get(cleanUsername);
    const connState = await entry.conn.connect();
    entry.attempts = 0;

    logger.log(
      'info', 'canales', 'canales/tiktok/connect-tiktok-channel.js#connectTiktokChannel', 'canales.tiktok.conectado',
      `TikTok ${cleanUsername} conectado`, { channel: cleanUsername }
    );
    bus.emit('canal:estado', {
      platform: 'tiktok', channel: cleanUsername, state: 'conectado',
      roomInfo: (connState && connState.roomInfo) || null,
    });

    return cleanUsername;
  } catch (err) {
    state.tiktokChannels.delete(cleanUsername);
    logger.log(
      'error', 'canales', 'canales/tiktok/connect-tiktok-channel.js#connectTiktokChannel', 'canales.tiktok.conexion_fallida',
      `Fallo al conectar TikTok ${cleanUsername}: ${err.message}`, { channel: cleanUsername, error: err.message, stack: err.stack }
    );
    throw err;
  } finally {
    clearTimeout(connectingTimeout);
    state.connectingTiktok.delete(cleanUsername);
  }
}

module.exports = { connectTiktokChannel, setupTikTokConnection };
