'use strict';

const { TikTokLiveClient } = require('@tiklivetts/tiktok-live-client');
const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { cleanTiktokUsername } = require('./clean-username');
const { cleanupAfterLastTikTokChannel } = require('./cleanup-after-last-channel');
const { armWatchdog, clearWatchdog, WATCHDOG_TIMEOUT_MS } = require('../stale-watchdog');
const { assertNoConexionEnCurso } = require('../connecting-lock');

const CONNECT_TIMEOUT_MS = 30000;

// El cliente emite 'gift' en cada tick del combo (groupCount acumulado, sin
// senal de "combo cerrado"). Sin debounce, el overlay dispara una alerta por
// tick en vez de una sola al final del combo — se debounce por combo
// (giftId+uniqueId) y se publica solo el ultimo estado visto.
const GIFT_COMBO_DEBOUNCE_MS = 1500;

function watchdogKey(username) {
  return `tiktok:${username}`;
}

/** Limpia timers de combo pendientes, listeners y desconecta — mismo teardown en cada punto de salida. */
function teardownConn(entry) {
  if (entry.giftComboTimers) {
    for (const timer of entry.giftComboTimers.values()) clearTimeout(timer);
    entry.giftComboTimers.clear();
  }
  entry.conn.removeAllListeners();
  try { entry.conn.disconnect(); } catch (_) { /* best-effort */ }
}

/**
 * @tiklivetts/tiktok-live-client (0.1.3) siempre emite un Error real, pero se
 * mantiene el branch defensivo para el shape viejo de tiktok-live-connector
 * (`{ info, exception }`) por las dudas de que algo upstream vuelva a pasarlo.
 * Nunca debe devolver undefined/vacio: si `message` queda vacio,
 * `esErrorConexionEsperado` (glitchtip.js) no puede matchear "isn't online" y
 * un canal offline se reporta como issue + dispara la alerta de "sesion
 * problematica" (GlitchTip #58).
 */
function readTikTokError(err) {
  if (err instanceof Error) return { message: err.message || String(err) || 'error desconocido', stack: err.stack };
  const message = (err && (err.exception?.message || err.message || err.info))
    || (typeof err === 'string' ? err : '')
    || 'error desconocido';
  const stack = (err && err.exception && err.exception.stack) || (err && err.stack);
  return { message: String(message), stack };
}

/**
 * Crea la conexion TikTok y engancha los handlers de evento. Cada handler SOLO
 * publica al bus el dato crudo de la plataforma — este dominio no conoce
 * Chat/Overlay/Moderacion, ellos deciden que hacer con canal:mensaje-crudo /
 * canal:gift / canal:like / canal:follow / canal:evento-especial.
 */
function setupTikTokConnection(deps, cleanUsername) {
  const { state, bus, logger } = deps;
  const existing = state.tiktokChannels.get(cleanUsername);
  if (existing && existing.conn) teardownConn(existing);

  const conn = new TikTokLiveClient(cleanUsername);
  const entry = {
    conn,
    attempts: existing ? existing.attempts : 0,
    connectedOnce: existing ? Boolean(existing.connectedOnce) : false,
    timer: null,
    giftComboTimers: new Map(), // `${giftId}:${uniqueId}` -> Timeout
  };
  state.tiktokChannels.set(cleanUsername, entry);

  const staleKey = watchdogKey(cleanUsername);

  // Solo 'chat' cuenta como liveness (no gifts/likes/joins) para no falsear
  // abandono de un stream real pero silencioso.
  const armStaleWatchdog = () => armWatchdog(state, staleKey, WATCHDOG_TIMEOUT_MS, onStale);
  entry.armStaleWatchdog = armStaleWatchdog;

  conn.on('chat', (data) => {
    armStaleWatchdog();
    if (!data.comment || !data.comment.trim()) return;
    bus.emit('canal:mensaje-crudo', { platform: 'tiktok', channel: cleanUsername, raw: data });
  });

  conn.on('gift', (data) => {
    const current = state.tiktokChannels.get(cleanUsername);
    if (!current || current.conn !== conn) return;
    const comboKey = `${data.giftId}:${data.uniqueId || ''}`;
    const pending = current.giftComboTimers.get(comboKey);
    if (pending) clearTimeout(pending);
    current.giftComboTimers.set(comboKey, setTimeout(() => {
      current.giftComboTimers.delete(comboKey);
      bus.emit('canal:gift', { platform: 'tiktok', channel: cleanUsername, raw: data });
    }, GIFT_COMBO_DEBOUNCE_MS));
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

  // Agenda una reconexion por backoff exponencial, o hace teardown si se
  // agotaron los intentos. Guard anti-loop: si ya hay un timer armado (o una
  // reconexion en vuelo, que deja el timer viejo hasta exito), no reprogramar.
  const scheduleReconnectOrGiveUp = () => {
    const current = state.tiktokChannels.get(cleanUsername);
    if (!current || current.timer) return;
    if (current.attempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * 2 ** current.attempts, 30000);
      current.attempts++;
      logger.log(
        'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.reconectando',
        `Reconectando TikTok ${cleanUsername}, intento ${current.attempts}`,
        { channel: cleanUsername, intento: current.attempts, delayMs: delay }
      );
      bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'reconectando', attempt: current.attempts, delayMs: delay });
      current.timer = setTimeout(() => {
        require('./reconnect-tiktok').reconnectTiktok(deps, cleanUsername);
      }, delay);
    } else {
      clearWatchdog(state, staleKey);
      state.tiktokChannels.delete(cleanUsername);
      teardownConn(current);
      logger.log(
        'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.reconexion_fallida',
        `Reconexion de TikTok ${cleanUsername} agotada tras ${current.attempts} intento(s)`,
        { channel: cleanUsername, attempts: current.attempts }
      );
      cleanupAfterLastTikTokChannel(deps);
    }
  };

  // Socket mudo: 5 min sin ningun 'chat' fuerza reconexion (attempts resetea a
  // 0). Cubre tanto una ventana que dejo de recibir trafico como un WS interno
  // de TikTok muerto dentro de la ventana invisible sin que esta se cierre
  // ('disconnected' solo dispara cuando la ventana se destruye).
  function onStale() {
    const current = state.tiktokChannels.get(cleanUsername);
    if (!current || current.conn !== conn) return;
    clearWatchdog(state, staleKey);
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.sin_eventos',
      `TikTok ${cleanUsername} sin 'chat' en ${WATCHDOG_TIMEOUT_MS}ms; forzando reconexion`,
      { channel: cleanUsername, timeoutMs: WATCHDOG_TIMEOUT_MS }
    );
    current.attempts = 0;
    scheduleReconnectOrGiveUp();
  }

  conn.on('disconnected', () => {
    clearWatchdog(state, staleKey);
    const current = state.tiktokChannels.get(cleanUsername);
    if (!current) return;
    bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'desconectado' });
    scheduleReconnectOrGiveUp();
  });

  conn.on('error', (err) => {
    const { message, stack } = readTikTokError(err);
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.error',
      `Error de conexion TikTok ${cleanUsername}: ${message}`, { channel: cleanUsername, error: message, stack }
    );

    const current = state.tiktokChannels.get(cleanUsername);
    bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'error', error: message });
    if (!current) return;

    if (!current.connectedOnce) {
      // Nunca llego a conectar y solo emite errores: no dejarlo colgado en
      // state.tiktokChannels (el panel lo veria "en vivo" para siempre).
      if (current.timer) clearTimeout(current.timer);
      clearWatchdog(state, staleKey);
      state.tiktokChannels.delete(cleanUsername);
      cleanupAfterLastTikTokChannel(deps);
      return;
    }

    // Post-conexion no se reconecta desde aca a proposito: 'error' es un cajon
    // de sastre (incluye un frame WS no decodificable con el socket/ventana
    // intactos, sin 'close'). La recuperacion real la cubren 'disconnected'
    // (ventana destruida) y el stale-watchdog (muerte silenciosa).
  });

  // Fin real del directo. tiktok-live-client lo detecta escuchando el polling
  // check_alive que la propia pagina de TikTok hace — no validado contra una
  // captura real de un directo terminando, asi que puede no disparar nunca en
  // la practica (fail-safe: en ese caso se ve como un 'disconnected' mas).
  conn.on('streamEnd', () => {
    clearWatchdog(state, staleKey);
    const current = state.tiktokChannels.get(cleanUsername);
    if (current && current.timer) clearTimeout(current.timer);
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

  assertNoConexionEnCurso(state.connectingTiktok, cleanUsername);

  const staleKey = watchdogKey(cleanUsername);

  // Salvaguarda anti-cuelgue: si connect() no resuelve en 30s, abortar la
  // conexion (disconnect + removeAllListeners + borrar entrada) para no dejar
  // el lock de connectingTiktok tomado para siempre.
  const connectingTimeout = setTimeout(() => {
    if (!state.connectingTiktok.has(cleanUsername)) return;
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#connectTiktokChannel', 'canales.tiktok.timeout_conexion',
      `Timeout (30s) conectando TikTok ${cleanUsername}, abortando conexion colgada`, { channel: cleanUsername }
    );
    clearWatchdog(state, staleKey);
    const stale = state.tiktokChannels.get(cleanUsername);
    if (stale) {
      if (stale.timer) clearTimeout(stale.timer);
      teardownConn(stale);
      state.tiktokChannels.delete(cleanUsername);
    }
    state.connectingTiktok.delete(cleanUsername);
  }, CONNECT_TIMEOUT_MS);

  clearWatchdog(state, staleKey);
  const prev = state.tiktokChannels.get(cleanUsername);
  if (prev) {
    if (prev.timer) clearTimeout(prev.timer);
    teardownConn(prev);
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
    // reemplazo la entrada del Map con un conn nuevo — esta llamada quedo
    // obsoleta, no pisar el estado vigente.
    if (state.tiktokChannels.get(cleanUsername) !== entry) return cleanUsername;

    entry.attempts = 0;
    entry.connectedOnce = true;
    entry.armStaleWatchdog();

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

module.exports = { connectTiktokChannel, setupTikTokConnection, readTikTokError, teardownConn };
