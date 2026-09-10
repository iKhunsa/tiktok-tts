'use strict';

const { WebcastPushConnection } = require('tiktok-live-connector');
const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { cleanTiktokUsername } = require('./clean-username');
const { cleanupAfterLastTikTokChannel } = require('./cleanup-after-last-channel');
const { armWatchdog, clearWatchdog, WATCHDOG_TIMEOUT_MS } = require('../stale-watchdog');

const CONNECT_TIMEOUT_MS = 30000;

/**
 * tiktok-live-connector NO pasa un Error al evento 'error': pasa un objeto
 * plano `{ info, exception }` (client.js#handleError). El texto real vive en
 * `exception.message`, la categoria en `info`. Nunca devolver undefined.
 */
function readTikTokError(err) {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  const message = (err && (err.exception?.message || err.info)) || String(err);
  const stack = err && err.exception && err.exception.stack;
  return { message, stack };
}

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
  state.tiktokChannels.set(cleanUsername, {
    conn,
    attempts: existing ? existing.attempts : 0,
    connectedOnce: existing ? Boolean(existing.connectedOnce) : false,
    timer: null,
  });

  const staleKey = `tiktok:${cleanUsername}`;

  conn.on('chat', (data) => {
    // Re-armar el watchdog en toda actividad de chat (incluso mensajes vacios
    // que no se emiten): prueba que el socket sigue vivo.
    armWatchdog(state, staleKey, WATCHDOG_TIMEOUT_MS, onStale);
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

  // Agenda una reconexion por el path de backoff, o hace teardown si se
  // agotaron los intentos. Guard anti-loop: si ya hay un timer de reconexion
  // armado (o una reconexion en vuelo, que deja el timer viejo hasta exito),
  // no encolar otra. Lo comparten 'disconnected' y 'error' post-conexion.
  const scheduleReconnectOrGiveUp = (entry) => {
    if (entry.timer) return;
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
  };

  // Socket mudo: 5 min sin ningun 'chat'. Un chat sano re-arma el watchdog en
  // cada mensaje, asi que esto solo dispara contra una conexion muerta. Fuerza
  // la reconexion por el mismo path de backoff (attempts reseteado a 0), con
  // guard de identidad para no pisar un entry ya reemplazado ni duplicar si ya
  // hay una reconexion en vuelo (scheduleReconnectOrGiveUp respeta entry.timer).
  const onStale = () => {
    const entry = state.tiktokChannels.get(cleanUsername);
    if (!entry || entry.conn !== conn) return;
    clearWatchdog(state, staleKey);
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.sin_eventos',
      `TikTok ${cleanUsername} sin 'chat' en ${WATCHDOG_TIMEOUT_MS}ms; forzando reconexion`,
      { channel: cleanUsername, timeoutMs: WATCHDOG_TIMEOUT_MS }
    );
    entry.attempts = 0;
    scheduleReconnectOrGiveUp(entry);
  };
  // Lo llama connectTiktokChannel / reconnectTiktok tras conectar: si el chat
  // esta callado desde el arranque, igual queremos vigilar el socket.
  const entryRef = state.tiktokChannels.get(cleanUsername);
  if (entryRef) entryRef.armStaleWatchdog = () => armWatchdog(state, staleKey, WATCHDOG_TIMEOUT_MS, onStale);

  conn.on('disconnected', () => {
    clearWatchdog(state, staleKey);
    const entry = state.tiktokChannels.get(cleanUsername);
    if (!entry) return;
    bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'desconectado' });
    scheduleReconnectOrGiveUp(entry);
  });

  conn.on('error', (err) => {
    const { message, stack } = readTikTokError(err);
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.error',
      `Error de conexion TikTok ${cleanUsername}: ${message}`, { channel: cleanUsername, error: message, stack }
    );

    const entry = state.tiktokChannels.get(cleanUsername);
    bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'error', error: message });
    if (!entry) return;

    if (!entry.connectedOnce) {
      // Nunca llego a conectar y solo emite errores: no dejarlo colgado en
      // state.tiktokChannels (el panel lo veria "en vivo" para siempre).
      // Mismo teardown que la rama de reintentos agotados. Sin reintento.
      if (entry.timer) clearTimeout(entry.timer);
      clearWatchdog(state, staleKey);
      state.tiktokChannels.delete(cleanUsername);
      cleanupAfterLastTikTokChannel(deps);
      return;
    }

    // Post-conexion: un 'error' de socket puede llegar en vez de 'close'.
    // Agendar reconexion por el path de backoff (el guard interno evita
    // duplicar si ya hay una en curso, p.ej. por el watchdog de la tarea 02).
    scheduleReconnectOrGiveUp(entry);
  });

  // Fin real del directo (el streamer corto, o un moderador de la plataforma).
  // La lib emite 'streamEnd' y acto seguido llama a disconnect(); si no se
  // maneja aqui, ese disconnect se trata como caida transitoria y el app
  // reintenta 5 veces (~31s) reportandose "en vivo" con una sala ya muerta.
  conn.on('streamEnd', () => {
    clearWatchdog(state, staleKey);
    const entry = state.tiktokChannels.get(cleanUsername);
    if (entry && entry.timer) clearTimeout(entry.timer);
    state.tiktokChannels.delete(cleanUsername);
    logger.log(
      'info', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.directo_terminado',
      `El directo de TikTok ${cleanUsername} termino`, { channel: cleanUsername }
    );
    bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'desconectado' });
    cleanupAfterLastTikTokChannel(deps);
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
    clearWatchdog(state, `tiktok:${cleanUsername}`);
    const stale = state.tiktokChannels.get(cleanUsername);
    if (stale) {
      if (stale.timer) clearTimeout(stale.timer);
      stale.conn.removeAllListeners();
      try { stale.conn.disconnect(); } catch (_) { /* best-effort */ }
      state.tiktokChannels.delete(cleanUsername);
    }
    state.connectingTiktok.delete(cleanUsername);
  }, CONNECT_TIMEOUT_MS);

  clearWatchdog(state, `tiktok:${cleanUsername}`);
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
    entry.connectedOnce = true;
    if (entry.armStaleWatchdog) entry.armStaleWatchdog();

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
