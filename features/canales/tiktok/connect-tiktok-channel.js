'use strict';

const { TikTokLiveClient } = require('@tiklivetts/tiktok-live-client');
const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { cleanTiktokUsername } = require('./clean-username');
const { cleanupAfterLastTikTokChannel } = require('./cleanup-after-last-channel');
const { armWatchdog, clearWatchdog, WATCHDOG_TIMEOUT_MS } = require('../stale-watchdog');
const { assertNoConexionEnCurso } = require('../connecting-lock');

const CONNECT_TIMEOUT_MS = 30000;

// El nuevo cliente no expone una senal limpia de "combo de regalo terminado"
// (ver README de tiktok-live-client#hallazgos): emite 'gift' en cada
// actualizacion del combo con el groupCount acumulado mas alto visto hasta
// el momento. Se debounce por combo (giftId+uniqueId) para publicar un solo
// canal:gift con el ultimo estado, en vez de una alerta de overlay por tap.
const GIFT_COMBO_DEBOUNCE_MS = 1500;

/** Limpia listeners, timers de combo pendientes y desconecta - mismo teardown en cada punto de salida. */
function teardownConn(entry) {
  if (entry.giftComboTimers) {
    for (const timer of entry.giftComboTimers.values()) clearTimeout(timer);
    entry.giftComboTimers.clear();
  }
  entry.conn.removeAllListeners();
  try { entry.conn.disconnect(); } catch (_) { /* best-effort */ }
}

/**
 * @tiklivetts/tiktok-live-client SIEMPRE emite un Error real (a diferencia de
 * tiktok-live-connector, que pasaba un objeto plano `{ info, exception }` —
 * client.js#handleError). Se mantiene el branch defensivo para ese shape
 * viejo por las dudas de que algo upstream vuelva a pasar un objeto plano.
 * Nunca devolver undefined — si `message` queda vacio, `esErrorConexionEsperado`
 * (glitchtip.js) no puede matchear "isn't online" y un canal offline se
 * reporta como issue + dispara la alerta de "sesion problematica" (GlitchTip #58).
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
    // y el cleanup de `prev` en connectTiktokChannel): sin disconnect() su
    // WS / ventana invisible quedan colgados cuando onStale fuerza la reconexion.
    teardownConn(existing);
  }

  const conn = new TikTokLiveClient(cleanUsername);
  state.tiktokChannels.set(cleanUsername, {
    conn,
    attempts: existing ? existing.attempts : 0,
    connectedOnce: existing ? Boolean(existing.connectedOnce) : false,
    timer: null,
    giftComboTimers: new Map(), // `${giftId}:${uniqueId}` -> Timeout, ver handler 'gift'
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
    const entry = state.tiktokChannels.get(cleanUsername);
    if (!entry || entry.conn !== conn) return;
    const comboKey = `${data.giftId}:${data.uniqueId || ''}`;
    const pending = entry.giftComboTimers.get(comboKey);
    if (pending) clearTimeout(pending);
    entry.giftComboTimers.set(comboKey, setTimeout(() => {
      entry.giftComboTimers.delete(comboKey);
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
      // connectTiktokChannel): si un connect() a medio camino dejo el WS +
      // la ventana invisible vivos, sin esto quedan colgados hasta salir del proceso.
      teardownConn(entry);
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

    // Post-conexion NO se reconecta desde aca a proposito. El evento 'error' de
    // tiktok-live-client es un cajon de sastre: un frame WS no decodificable
    // (live-window.js#connect) se emite con el socket/ventana intactos, sin
    // 'close'. Un fallo real de nivel-conexion (ventana destruida) SIEMPRE lo
    // sigue un 'close' -> evento 'disconnected', que si agenda la reconexion.
    // La muerte silenciosa (ventana viva pero sin trafico) la cubre el
    // stale-watchdog (5 min sin 'chat'). Disparar reconexion aca solo genera
    // churn por cada blip de decode. Se mantiene el log + el emit de 'canal:estado'.
  });

  // Fin real del directo (el streamer corto, o un moderador de la plataforma).
  // tiktok-live-client >=0.1.1 lo detecta escuchando el polling de
  // check_alive que la propia pagina de TikTok ya hace (ver su README) — no
  // esta validado contra una captura real de un directo terminando, asi que
  // esto puede no disparar nunca en la practica (fail-safe: en ese caso el
  // fin de directo se sigue viendo como un 'disconnected' mas, mismo
  // comportamiento que antes de tiktok-live-client 0.1.1).
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
      teardownConn(stale);
      state.tiktokChannels.delete(cleanUsername);
    }
    state.connectingTiktok.delete(cleanUsername);
  }, CONNECT_TIMEOUT_MS);

  clearWatchdog(state, `tiktok:${cleanUsername}`);
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

module.exports = { connectTiktokChannel, setupTikTokConnection, readTikTokError, teardownConn };
