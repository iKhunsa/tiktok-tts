'use strict';

const { TikTokLiveClient } = require('@tiklivetts/tiktok-live-client');
const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { cleanTiktokUsername } = require('./clean-username');
const { cleanupAfterLastTikTokChannel } = require('./cleanup-after-last-channel');
const { armWatchdog, clearWatchdog, WATCHDOG_TIMEOUT_MS } = require('../stale-watchdog');
const { assertNoConexionEnCurso } = require('../connecting-lock');

const CONNECT_TIMEOUT_MS = 30000;

/**
 * @tiklivetts/tiktok-live-client SIEMPRE emite instancias de Error reales
 * (nunca el objeto plano {info, exception} que usaba tiktok-live-connector),
 * pero se mantiene esta funcion por compatibilidad con el resto del modulo
 * y por si algun dia vuelve a hacer falta el branch de objeto plano.
 */
function readTikTokError(err) {
  if (err instanceof Error) {
    return { message: err.message || String(err) || 'error desconocido', stack: err.stack };
  }
  const message = (err && (err.exception?.message || err.message || err.info))
    || (typeof err === 'string' ? err : '')
    || 'error desconocido';
  const stack = (err && err.exception && err.exception.stack) || (err && err.stack);
  return { message: String(message), stack };
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
  if (existing && existing.conn) {
    // Teardown completo del conn superseded (mismo patron que el give-up branch
    // y el cleanup de `prev` en connectTiktokChannel): sin disconnect() la
    // BrowserWindow invisible del conn viejo queda viva para siempre.
    existing.conn.removeAllListeners();
    try { existing.conn.disconnect(); } catch (_) { /* best-effort */ }
  }

  const conn = new TikTokLiveClient(cleanUsername);
  state.tiktokChannels.set(cleanUsername, {
    conn,
    attempts: existing ? existing.attempts : 0,
    connectedOnce: existing ? Boolean(existing.connectedOnce) : false,
    timer: null,
  });

  const staleKey = `tiktok:${cleanUsername}`;

  conn.on('chat', (data) => {
    // Re-armar el watchdog en toda actividad de chat (incluso mensajes vacios
    // que no se emiten): prueba que la ventana/WS interno sigue vivo.
    armWatchdog(state, staleKey, WATCHDOG_TIMEOUT_MS, onStale);
    if (!data.comment || !data.comment.trim()) return;
    bus.emit('canal:mensaje-crudo', { platform: 'tiktok', channel: cleanUsername, raw: data });
  });

  conn.on('gift', (data) => {
    // A diferencia de tiktok-live-connector, groupCount es el conteo
    // ACUMULADO del combo (no un delta) y no hay un booleano repeatEnd
    // aislado (ver README de @tiklivetts/tiktok-live-client) — se emite
    // cada actualizacion del combo tal cual llega, sin filtrar el golpe
    // intermedio. repeatCount se mapea desde groupCount para no tocar los
    // consumidores existentes (features/overlay/index.js).
    bus.emit('canal:gift', {
      platform: 'tiktok', channel: cleanUsername,
      raw: { ...data, repeatCount: data.groupCount },
    });
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
  // no encolar otra. Lo llaman 'disconnected' y el stale-watchdog (onStale).
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
      clearWatchdog(state, staleKey);
      state.tiktokChannels.delete(cleanUsername);
      // Teardown del connector (mismo patron que el cleanup de `prev` en
      // connectTiktokChannel): sin esto la ventana invisible queda viva
      // hasta salir del proceso.
      entry.conn.removeAllListeners();
      try { entry.conn.disconnect(); } catch (_) { /* best-effort */ }
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
  //
  // Con @tiklivetts/tiktok-live-client este watchdog cumple ademas el rol de
  // detectar un WS interno de TikTok muerto DENTRO de la ventana invisible
  // sin que la ventana misma se haya cerrado — 'disconnected' solo dispara
  // cuando la ventana se destruye, no cuando el WS de la pagina cae solo.
  //
  // Limitacion aceptada: si la reconexion CONECTA pero el chat nunca vuelve
  // (esquema cambiado, o sala legitimamente muda por horas), esto reconecta
  // cada 5 min indefinidamente. No se corta a proposito — cortar por
  // "N stale seguidos" falsea el abandono de un stream tranquilo real (musica,
  // pocos viewers) porque solo 'chat' cuenta como liveness, no gifts/likes/joins.
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
  state.tiktokChannels.get(cleanUsername).armStaleWatchdog =
    () => armWatchdog(state, staleKey, WATCHDOG_TIMEOUT_MS, onStale);

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

    // Post-conexion NO se reconecta desde aca a proposito — un error de frame
    // individual no garantiza que el socket este muerto. La muerte silenciosa
    // (WS interno caido pero la ventana viva) la cubre el stale-watchdog
    // (5 min sin 'chat').
  });

  return conn;
}

async function connectTiktokChannel(deps, channel) {
  const { state, bus, logger } = deps;
  const cleanUsername = cleanTiktokUsername(channel);
  if (!cleanUsername) throw new Error('Se requiere canal TikTok');

  assertNoConexionEnCurso(state.connectingTiktok, cleanUsername);

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

  let entry;
  try {
    setupTikTokConnection(deps, cleanUsername);
    entry = state.tiktokChannels.get(cleanUsername);
    const connState = await entry.conn.connect();

    // Mientras el connect() de arriba estaba pendiente, pudo dispararse
    // 'disconnected' sobre este mismo conn y una reconexion concurrente ya
    // reemplazo la entrada del Map con un conn nuevo. Esta llamada quedo
    // obsoleta: no pisar el estado vigente ni emitir 'conectado' sobre una
    // conexion muerta.
    if (state.tiktokChannels.get(cleanUsername) !== entry) return cleanUsername;

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
    // Idem: si ya fue reemplazada por una reconexion concurrente, la entrada
    // nueva y valida es de otra llamada — no borrarla, y no hay error real
    // que reportar (ya hay una conexion viva para este canal).
    if (entry && state.tiktokChannels.get(cleanUsername) !== entry) return cleanUsername;

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

module.exports = { connectTiktokChannel, setupTikTokConnection, readTikTokError };
