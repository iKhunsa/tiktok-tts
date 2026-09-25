'use strict';

const { TikTokLiveClient } = require('@tiklivetts/tiktok-live-client');
const { cleanTiktokUsername } = require('./clean-username');
const { armWatchdog, clearWatchdog, WATCHDOG_TIMEOUT_MS } = require('../stale-watchdog');
const { assertNoConexionEnCurso } = require('../connecting-lock');
const { nextRetryDelayMs, nextWaitingLiveDelayMs, RECOVERY_VISIBLE_THRESHOLD_MS } = require('./tiktok-supervisor-schedule');

const CONNECT_TIMEOUT_MS = 30000;

// El cliente emite 'gift' en cada tick del combo (groupCount acumulado, sin
// senal de "combo cerrado"). Sin debounce, el overlay dispara una alerta por
// tick en vez de una sola al final del combo — se debounce por combo
// (giftId+uniqueId) y se publica solo el ultimo estado visto.
const GIFT_COMBO_DEBOUNCE_MS = 1500;

// Segunda senal de salud: la propia pagina de TikTok pollea check_alive cada
// ~6s y el paquete emite 'checkAlive' en cada `alive:true`. Si el watchdog de
// silencio general (WATCHDOG_TIMEOUT_MS) vence pero hubo un checkAlive en
// esta ventana, el live esta sano sin actividad: no se reconecta y se vuelve
// a mirar cada CHECK_ALIVE_FRESH_MS. 60s = ~10 polls, tolera varios perdidos.
const CHECK_ALIVE_FRESH_MS = 60 * 1000;

function watchdogKey(username) {
  return `tiktok:${username}`;
}

/**
 * Puente minimo hacia la UI (interfaz/src/nucleo/ws/cliente-ws.js#'tiktok-connection-status')
 * — SOLO las 4 transiciones que el usuario debe ver, nunca por cada intento
 * tecnico. Mensajes ya traducidos por el frontend via i18n (conn.tiktok*).
 */
function broadcastTiktokStatus(bus, channel, status, extra = {}) {
  bus.emit('ws:broadcast', { type: 'tiktok-connection-status', channel, status, ...extra });
}

/**
 * Limpia SOLO los recursos de la conexion en si (combos de regalo, listeners,
 * ventana/cliente) — nunca `entry.timer`/`entry.visibilityTimer`, que son del
 * SUPERVISOR y deben sobrevivir a un intento individual (una racha de
 * recuperacion son VARIOS intentos con conn distinto; el timer de
 * "mostrar restaurando" tiene que seguir corriendo entre ellos). Uso interno
 * de setupTikTokConnection al reemplazar el conn para el proximo intento.
 */
function teardownConnResources(entry) {
  if (entry.giftComboTimers) {
    for (const timer of entry.giftComboTimers.values()) clearTimeout(timer);
    entry.giftComboTimers.clear();
  }
  entry.conn.removeAllListeners();
  try { entry.conn.disconnect(); } catch (_) { /* best-effort */ }
}

/** Teardown COMPLETO (conexion + timers del supervisor) — el que usan Desconectar/quitar canal/shutdown, nunca los intentos internos. */
function teardownConn(entry) {
  if (entry.timer) { clearTimeout(entry.timer); entry.timer = null; }
  if (entry.visibilityTimer) { clearTimeout(entry.visibilityTimer); entry.visibilityTimer = null; }
  teardownConnResources(entry);
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
  if (err instanceof Error) return { message: err.message || String(err) || 'error desconocido', stack: err.stack, code: err.code };
  const message = (err && (err.exception?.message || err.message || err.info))
    || (typeof err === 'string' ? err : '')
    || 'error desconocido';
  const stack = (err && err.exception && err.exception.stack) || (err && err.stack);
  return { message: String(message), stack, code: undefined };
}

/**
 * Clasifica el resultado de un intento tecnico para el supervisor. `live` y
 * `not_live` son los unicos casos "resueltos" del paquete (ver
 * classify-room-enter.js del paquete); todo lo demas (LIVE_STATUS_UNKNOWN,
 * SigningError/timeout, o cualquier excepcion no tipada) es `unknown` —
 * nunca se muestra como "offline confirmado" ni se descarta la intencion.
 */
function classifyAttemptOutcome(err) {
  const { message, stack, code } = readTikTokError(err);
  if (code === 'NOT_LIVE') return { kind: 'not_live', code, message, stack };
  return { kind: 'unknown', code, reason: err && err.reason, tiktokStatusCode: err && err.tiktokStatusCode, message, stack };
}

/** Log estructurado unico para toda transicion del supervisor — nunca cookies/tokens/firmas/bodies. */
function logTransition(deps, entry, level, event, message, extra = {}) {
  deps.logger.log(
    level, 'canales', 'canales/tiktok/connect-tiktok-channel.js#supervisor', event, message,
    {
      channel: entry.username,
      supervisorId: entry.supervisorId,
      cycleId: entry.cycleId,
      attemptId: entry.attemptId,
      techStateAnterior: entry.techState,
      consecutiveFailures: entry.consecutiveFailures,
      consecutiveWaits: entry.consecutiveWaits,
      ...extra,
    }
  );
}

/**
 * Crea la conexion TikTok y engancha los handlers de evento. Cada handler SOLO
 * publica al bus el dato crudo de la plataforma — este dominio no conoce
 * Chat/Overlay/Moderacion, ellos deciden que hacer con canal:mensaje-crudo /
 * canal:gift / canal:like / canal:follow / canal:evento-especial.
 *
 * Reemplaza SIEMPRE el `conn` de la entrada (nunca deja mas de un cliente/
 * ventana/WebSocket activo por canal) preservando los campos de supervisor
 * (cycleId, techState, contadores) cuando ya existia una entrada — solo
 * `connectTiktokChannel` (clic de "Conectar") borra la entrada entera y
 * arranca un ciclo nuevo de cero.
 */
function setupTikTokConnection(deps, cleanUsername) {
  const { state, bus, logger } = deps;
  const existing = state.tiktokChannels.get(cleanUsername);
  if (existing && existing.conn) teardownConnResources(existing);

  const conn = new TikTokLiveClient(cleanUsername);
  const entry = {
    conn,
    username: cleanUsername,
    supervisorId: existing ? existing.supervisorId : `tiktok:${cleanUsername}:${Date.now().toString(36)}`,
    cycleId: existing ? existing.cycleId : 1,
    attemptId: existing ? existing.attemptId : 0,
    consecutiveFailures: existing ? existing.consecutiveFailures : 0,
    consecutiveWaits: existing ? existing.consecutiveWaits : 0,
    connectedOnce: existing ? Boolean(existing.connectedOnce) : false,
    techState: existing ? existing.techState : 'connecting',
    recoveringSince: existing ? existing.recoveringSince : null,
    recoveryVisible: existing ? existing.recoveryVisible : false,
    // `timer` SIEMPRE arranca null: si `existing.timer` seguia vivo aca es
    // porque ESTE intento es el que acaba de dispararlo (ya fue consumido) —
    // nunca es un timer futuro pendiente. `visibilityTimer` en cambio se
    // preserva: sigue corriendo durante TODA la racha de recuperacion, no
    // solo un intento (ver teardownConnResources arriba).
    timer: null,
    visibilityTimer: existing ? existing.visibilityTimer : null,
    giftComboTimers: new Map(), // `${giftId}:${uniqueId}` -> Timeout
  };
  state.tiktokChannels.set(cleanUsername, entry);

  const staleKey = watchdogKey(cleanUsername);

  // Cualquier evento tecnico (chat, regalo, like, join, follow, share, o el
  // push periodico de viewerCount) cuenta como "conexion viva" — un live sin
  // comentarios NO debe verse como caido. `armStaleWatchdog` es el unico lugar
  // que decide que cuenta como salud tecnica (checkAlive es aparte, ver
  // CHECK_ALIVE_FRESH_MS y onStaleConnection).
  entry.lastCheckAliveAt = null;
  entry.quietSince = null;
  const armStaleWatchdog = () => {
    if (entry.quietSince !== null) {
      logger.log(
        'info', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.actividad_reanudada',
        `TikTok ${cleanUsername} volvio a tener actividad tras un periodo sano sin eventos`,
        { channel: cleanUsername, quietMs: Date.now() - entry.quietSince }
      );
      entry.quietSince = null;
    }
    armWatchdog(state, staleKey, WATCHDOG_TIMEOUT_MS, () => onStaleConnection(deps, cleanUsername, conn));
  };
  entry.armStaleWatchdog = armStaleWatchdog;

  // Evita que una conexion vieja (reemplazada por un reintento mas nuevo)
  // siga procesando eventos — nunca deberia pasar (removeAllListeners corre
  // antes de disconnect en teardownConn), pero es la ultima linea de defensa
  // si algo quedo en vuelo.
  function isStaleConn() {
    const current = state.tiktokChannels.get(cleanUsername);
    return !current || current.conn !== conn;
  }
  function logIgnoredIfStale(evento) {
    if (!isStaleConn()) return false;
    logger.log(
      'debug', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.evento_descartado',
      `Evento '${evento}' de una conexion vieja de TikTok ${cleanUsername} ignorado`, { channel: cleanUsername, evento }
    );
    return true;
  }

  conn.on('chat', (data) => {
    if (logIgnoredIfStale('chat')) return;
    armStaleWatchdog();
    if (!data.comment || !data.comment.trim()) return;
    bus.emit('canal:mensaje-crudo', { platform: 'tiktok', channel: cleanUsername, raw: data });
  });

  conn.on('gift', (data) => {
    if (logIgnoredIfStale('gift')) return;
    armStaleWatchdog();
    const current = state.tiktokChannels.get(cleanUsername);
    const comboKey = `${data.giftId}:${data.uniqueId || ''}`;
    const pending = current.giftComboTimers.get(comboKey);
    if (pending) clearTimeout(pending);
    current.giftComboTimers.set(comboKey, setTimeout(() => {
      current.giftComboTimers.delete(comboKey);
      bus.emit('canal:gift', { platform: 'tiktok', channel: cleanUsername, raw: data });
    }, GIFT_COMBO_DEBOUNCE_MS));
  });

  conn.on('like', (data) => {
    if (logIgnoredIfStale('like')) return;
    armStaleWatchdog();
    bus.emit('canal:like', {
      platform: 'tiktok', channel: cleanUsername,
      userId: data.uniqueId || null, nick: data.nickname || null, likeCount: Number(data.likeCount) || 1,
    });
  });

  conn.on('member', (data) => {
    if (logIgnoredIfStale('member')) return;
    armStaleWatchdog();
    bus.emit('canal:evento-especial', {
      platform: 'tiktok', channel: cleanUsername, kind: 'join',
      userId: data.uniqueId || null, nick: data.nickname || null,
    });
  });

  conn.on('follow', (data) => {
    if (logIgnoredIfStale('follow')) return;
    armStaleWatchdog();
    bus.emit('canal:follow', {
      platform: 'tiktok', channel: cleanUsername,
      userId: data.uniqueId || null, nick: data.nickname || null,
    });
  });

  conn.on('share', (data) => {
    if (logIgnoredIfStale('share')) return;
    armStaleWatchdog();
    bus.emit('canal:evento-especial', {
      platform: 'tiktok', channel: cleanUsername, kind: 'share',
      userId: data.uniqueId || null, nick: data.nickname || null,
    });
  });

  // TikTok empuja viewerCount periodicamente aunque el chat este en silencio
  // total — es la senal tecnica mas confiable de "el WS sigue vivo" que
  // expone el paquete sin depender de que alguien escriba o regale algo.
  conn.on('roomUserSeq', () => {
    if (logIgnoredIfStale('roomUserSeq')) return;
    armStaleWatchdog();
  });

  // TikTok confirmo (check_alive, ~cada 6s) que el directo sigue. NO rearma
  // el watchdog general: solo lo consulta onStaleConnection al vencer.
  conn.on('checkAlive', () => {
    if (logIgnoredIfStale('checkAlive')) return;
    if (entry.lastCheckAliveAt === null) {
      logger.log(
        'info', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.check_alive_confirmado',
        `TikTok ${cleanUsername}: check_alive confirma directo activo (senal de salud secundaria)`, { channel: cleanUsername }
      );
    }
    entry.lastCheckAliveAt = Date.now();
  });

  conn.on('disconnected', () => {
    if (logIgnoredIfStale('disconnected')) return;
    clearWatchdog(state, staleKey);
    triggerRecovery(deps, cleanUsername, 'ventana_cerrada');
  });

  // 'error' es un cajon de sastre (incluye un frame WS no decodificable con el
  // socket/ventana intactos, sin 'close') — se loguea siempre, pero NO dispara
  // recuperacion por si solo ni se muestra al usuario: 'disconnected' (ventana
  // destruida) y el stale-watchdog (muerte silenciosa) cubren la caida real.
  conn.on('error', (err) => {
    if (logIgnoredIfStale('error')) return;
    const { message, stack, code } = readTikTokError(err);
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.error',
      `Error de conexion TikTok ${cleanUsername}: ${message}`, { channel: cleanUsername, error: message, code, stack }
    );
  });

  // Fin real del directo. tiktok-live-client lo detecta escuchando el polling
  // check_alive que la propia pagina de TikTok hace — no validado contra una
  // captura real de un directo terminando, asi que puede no disparar nunca en
  // la practica (fail-safe: en ese caso se ve como un 'disconnected' mas).
  conn.on('streamEnd', () => {
    if (logIgnoredIfStale('streamEnd')) return;
    clearWatchdog(state, staleKey);
    logger.log(
      'info', 'canales', 'canales/tiktok/connect-tiktok-channel.js#setupTikTokConnection', 'canales.tiktok.directo_terminado',
      `El directo de TikTok ${cleanUsername} termino`, { channel: cleanUsername }
    );
    triggerRecovery(deps, cleanUsername, 'stream_end');
  });

  return conn;
}

/**
 * Vence el watchdog de silencio general (WATCHDOG_TIMEOUT_MS sin ninguna
 * senal, ver armStaleWatchdog arriba). Modelo de dos senales: solo recupera
 * si TAMPOCO hubo un checkAlive en los ultimos CHECK_ALIVE_FRESH_MS. Si lo
 * hubo, el live esta sano sin actividad y se re-chequea cada
 * CHECK_ALIVE_FRESH_MS hasta que vuelva la actividad (rearma el general) o
 * check_alive deje de confirmar (recupera).
 */
function onStaleConnection(deps, cleanUsername, conn) {
  const { state, logger } = deps;
  const current = state.tiktokChannels.get(cleanUsername);
  if (!current || current.conn !== conn) return;
  const source = 'canales/tiktok/connect-tiktok-channel.js#onStaleConnection';
  const now = Date.now();
  const checkAliveAgeMs = current.lastCheckAliveAt !== null ? now - current.lastCheckAliveAt : null;

  if (checkAliveAgeMs !== null && checkAliveAgeMs < CHECK_ALIVE_FRESH_MS) {
    if (current.quietSince === null) {
      current.quietSince = now - WATCHDOG_TIMEOUT_MS;
      logger.log(
        'info', 'canales', source, 'canales.tiktok.sano_sin_actividad',
        `TikTok ${cleanUsername} sin eventos en ${WATCHDOG_TIMEOUT_MS}ms pero check_alive sigue confirmando el directo; no se reconecta`,
        { channel: cleanUsername, timeoutMs: WATCHDOG_TIMEOUT_MS, checkAliveAgeMs, healthSignal: 'check_alive' }
      );
    }
    armWatchdog(state, watchdogKey(cleanUsername), CHECK_ALIVE_FRESH_MS, () => onStaleConnection(deps, cleanUsername, conn));
    return;
  }

  // healthSignal distingue "check_alive nunca llego en esta conexion" (mismo
  // caso que antes de existir la senal) de "confirmaba y dejo de hacerlo".
  const healthSignal = checkAliveAgeMs === null ? 'ninguna_en_ventana' : 'check_alive_dejo_de_confirmar';
  logger.log(
    'warn', 'canales', source, 'canales.tiktok.sin_eventos',
    `TikTok ${cleanUsername} sin ninguna senal tecnica (${healthSignal}); recuperando`,
    {
      channel: cleanUsername, timeoutMs: WATCHDOG_TIMEOUT_MS, healthSignal, checkAliveAgeMs,
      quietMs: current.quietSince !== null ? now - current.quietSince : null,
    }
  );
  triggerRecovery(deps, cleanUsername, 'watchdog_sin_senal_tecnica');
}

/** Punto unico de entrada a una recuperacion (watchdog, disconnected o streamEnd) — solo actua si el canal estaba realmente conectado. */
function triggerRecovery(deps, cleanUsername, causa) {
  const { state } = deps;
  const entry = state.tiktokChannels.get(cleanUsername);
  if (!entry || entry.techState !== 'connected') return; // ya hay una recuperacion en curso o el canal no existe mas
  logTransition(deps, entry, 'warn', 'canales.tiktok.conexion_perdida',
    `TikTok ${cleanUsername} perdio la conexion (${causa}), recuperando`, { causa });
  entry.techState = 'recovering';
  entry.recoveringSince = Date.now();
  entry.recoveryVisible = false;
  runAttempt(deps, cleanUsername);
}

/**
 * Ejecuta UN intento tecnico (crea cliente + ventana, espera resultado) y
 * aplica la transicion correspondiente: conectado, esperando-proximo-live, o
 * recuperando/conectando de nuevo. Es el UNICO lugar que agenda el proximo
 * intento — llamado tanto para el primer clic de "Conectar" como para cada
 * reintento automatico y cada recuperacion (reemplaza al viejo
 * reconnect-tiktok.js: ya no hay dos caminos de codigo separados).
 *
 * Nunca lanza: el resultado se devuelve para que el llamador (solo
 * connectTiktokChannel, en el primer intento) decida que responder por HTTP.
 */
async function runAttempt(deps, cleanUsername) {
  const { state, logger } = deps;
  let entry = state.tiktokChannels.get(cleanUsername);
  if (!entry) return { kind: 'discarded' }; // la intencion ya no existe (Desconectar corrio primero)

  entry.attemptId += 1;
  const attemptId = entry.attemptId;
  const startedAt = Date.now();

  const conn = setupTikTokConnection(deps, cleanUsername);
  entry = state.tiktokChannels.get(cleanUsername);

  let outcome;
  try {
    const connState = await conn.connect();
    outcome = { kind: 'live', roomInfo: connState && connState.roomInfo };
  } catch (err) {
    outcome = classifyAttemptOutcome(err);
  }

  // Mientras esperabamos, pudo dispararse otra recuperacion/Desconectar que ya
  // reemplazo o borro esta entrada — este resultado quedo obsoleto.
  const current = state.tiktokChannels.get(cleanUsername);
  if (!current || current.conn !== conn) {
    logger.log(
      'debug', 'canales', 'canales/tiktok/connect-tiktok-channel.js#runAttempt', 'canales.tiktok.intento_descartado',
      `Resultado del intento ${attemptId} de TikTok ${cleanUsername} descartado (conexion reemplazada)`,
      { channel: cleanUsername, attemptId }
    );
    return { kind: 'discarded' };
  }

  const durationMs = Date.now() - startedAt;

  if (outcome.kind === 'live') {
    onAttemptSucceeded(deps, current, outcome, durationMs);
  } else if (outcome.kind === 'not_live') {
    onConfirmedNotLive(deps, current, outcome, durationMs);
  } else {
    onAttemptFailed(deps, current, outcome, durationMs);
  }

  return outcome;
}

function scheduleNextAttempt(deps, entry, delayMs) {
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => runAttempt(deps, entry.username), delayMs);
}

function onAttemptSucceeded(deps, entry, outcome, durationMs) {
  const { bus } = deps;
  const wasVisiblyRecovering = entry.techState === 'recovering' && entry.recoveryVisible;
  if (entry.visibilityTimer) { clearTimeout(entry.visibilityTimer); entry.visibilityTimer = null; }

  logTransition(deps, entry, 'info', 'canales.tiktok.conectado',
    `TikTok ${entry.username} conectado`, {
      techStateNuevo: 'connected', causa: 'room_enter_status_2', durationMs,
      recuperacionesConsecutivas: entry.consecutiveFailures, recuperado: wasVisiblyRecovering,
    });

  entry.techState = 'connected';
  entry.connectedOnce = true;
  entry.consecutiveFailures = 0;
  entry.consecutiveWaits = 0;
  entry.recoveringSince = null;
  entry.recoveryVisible = false;
  entry.armStaleWatchdog();

  bus.emit('canal:estado', {
    platform: 'tiktok', channel: entry.username, state: 'conectado',
    roomInfo: outcome.roomInfo || null, recovered: wasVisiblyRecovering,
  });
  // Solo se lo mostramos al usuario si la interrupcion habia sido visible —
  // una recuperacion corta (bajo el umbral) nunca genero un "Restaurando...",
  // asi que tampoco genera un "restablecida" que confundiria (nada se vio caer).
  if (wasVisiblyRecovering) broadcastTiktokStatus(bus, entry.username, 'connected', { recovered: true });
}

function onConfirmedNotLive(deps, entry, outcome, durationMs) {
  const { bus } = deps;
  if (entry.visibilityTimer) { clearTimeout(entry.visibilityTimer); entry.visibilityTimer = null; }

  const wasAlreadyWaiting = entry.techState === 'waiting_live';
  logTransition(deps, entry, 'info', 'canales.tiktok.esperando_proximo_live',
    `TikTok ${entry.username}: offline confirmado, esperando proximo live`, {
      techStateNuevo: 'waiting_live', causa: 'not_live_confirmado', durationMs,
      tiktokErrorCode: outcome.code,
    });

  entry.techState = 'waiting_live';
  entry.recoveringSince = null;
  entry.recoveryVisible = false;
  const delay = nextWaitingLiveDelayMs(entry.consecutiveWaits);
  entry.consecutiveWaits += 1;
  scheduleNextAttempt(deps, entry, delay);

  if (!wasAlreadyWaiting) {
    bus.emit('canal:estado', { platform: 'tiktok', channel: entry.username, state: 'esperando-proximo-live' });
    broadcastTiktokStatus(bus, entry.username, 'waiting-live');
  }
}

function onAttemptFailed(deps, entry, outcome, durationMs) {
  const { bus } = deps;
  entry.consecutiveWaits = 0;
  entry.consecutiveFailures += 1;

  logTransition(deps, entry, entry.connectedOnce ? 'warn' : 'info', 'canales.tiktok.intento_fallido',
    `TikTok ${entry.username}: intento sin datos validos (${outcome.reason || outcome.code || 'desconocido'})`, {
      techStateNuevo: entry.connectedOnce ? 'recovering' : 'connecting', causa: outcome.reason || outcome.code,
      durationMs, tiktokErrorCode: outcome.code, tiktokStatusCode: outcome.tiktokStatusCode,
      motivoPaquete: outcome.reason,
    });

  const delay = nextRetryDelayMs(entry.consecutiveFailures);

  if (entry.connectedOnce) {
    // Ya habia una conexion sana: es una RECUPERACION, sujeta al umbral de
    // parpadeo (RECOVERY_VISIBLE_THRESHOLD_MS) antes de mostrarsela al usuario.
    entry.techState = 'recovering';
    if (!entry.visibilityTimer) {
      entry.visibilityTimer = setTimeout(() => {
        const current = deps.state.tiktokChannels.get(entry.username);
        if (!current || current.techState !== 'recovering' || current.recoveryVisible) return;
        current.recoveryVisible = true;
        current.visibilityTimer = null;
        bus.emit('canal:estado', { platform: 'tiktok', channel: entry.username, state: 'restaurando' });
        broadcastTiktokStatus(bus, entry.username, 'restoring');
      }, RECOVERY_VISIBLE_THRESHOLD_MS);
    }
  } else {
    // Todavia no conecto nunca en este ciclo: sigue siendo "Conectando..." a
    // los ojos del usuario, sin importar cuantos intentos silenciosos lleve.
    entry.techState = 'connecting';
  }

  scheduleNextAttempt(deps, entry, delay);
}

async function connectTiktokChannel(deps, channel) {
  const { state, bus, logger } = deps;
  const cleanUsername = cleanTiktokUsername(channel);
  if (!cleanUsername) throw new Error('Se requiere canal TikTok');

  assertNoConexionEnCurso(state.connectingTiktok, cleanUsername);

  const staleKey = watchdogKey(cleanUsername);
  clearWatchdog(state, staleKey);

  // "Conectar" siempre arranca un ciclo nuevo y limpio: descarta cualquier
  // supervisor previo de este canal (timers, conn, contadores) — es la unica
  // via que resetea cycleId. Los reintentos automaticos NUNCA pasan por aca.
  const prev = state.tiktokChannels.get(cleanUsername);
  const cycleId = prev ? prev.cycleId + 1 : 1;
  if (prev) {
    teardownConn(prev);
    state.tiktokChannels.delete(cleanUsername);
  }

  logger.log(
    'info', 'canales', 'canales/tiktok/connect-tiktok-channel.js#connectTiktokChannel', 'canales.tiktok.conectando',
    `Conectando a TikTok ${cleanUsername}`, { channel: cleanUsername, cycleId }
  );
  bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'conectando' });
  broadcastTiktokStatus(bus, cleanUsername, 'connecting');

  // Salvaguarda anti-cuelgue: si el primer intento no resuelve en 30s, abortar
  // (teardown completo) para no dejar el lock de connectingTiktok tomado para
  // siempre. Solo protege esta llamada HTTP — los reintentos posteriores del
  // supervisor no tienen a nadie esperando una respuesta HTTP.
  const connectingTimeout = setTimeout(() => {
    if (!state.connectingTiktok.has(cleanUsername)) return;
    logger.log(
      'warn', 'canales', 'canales/tiktok/connect-tiktok-channel.js#connectTiktokChannel', 'canales.tiktok.timeout_conexion',
      `Timeout (30s) en el primer intento a TikTok ${cleanUsername}; el supervisor sigue reintentando en segundo plano`,
      { channel: cleanUsername }
    );
    state.connectingTiktok.delete(cleanUsername);
  }, CONNECT_TIMEOUT_MS);

  try {
    // Pre-crea la entrada con cycleId ya incrementado, antes de que runAttempt
    // llame a setupTikTokConnection (que preserva cycleId de `existing`).
    state.tiktokChannels.set(cleanUsername, {
      conn: null, username: cleanUsername, supervisorId: `tiktok:${cleanUsername}:${Date.now().toString(36)}`,
      cycleId, attemptId: 0, consecutiveFailures: 0, consecutiveWaits: 0, connectedOnce: false,
      techState: 'connecting', recoveringSince: null, recoveryVisible: false, timer: null, visibilityTimer: null,
      giftComboTimers: new Map(),
    });

    const outcome = await runAttempt(deps, cleanUsername);
    if (outcome.kind === 'live' || outcome.kind === 'discarded') return cleanUsername;

    // El primer intento no logro datos validos: el supervisor YA programo el
    // proximo intento (dentro de runAttempt) y la intencion sigue guardada —
    // esto solo decide la respuesta HTTP inmediata de este clic.
    const err = new Error(outcome.message || 'No se pudo comprobar el estado del canal');
    err.code = outcome.code;
    err.reason = outcome.reason;
    err.tiktokStatusCode = outcome.tiktokStatusCode;
    throw err;
  } finally {
    clearTimeout(connectingTimeout);
    state.connectingTiktok.delete(cleanUsername);
  }
}

module.exports = { connectTiktokChannel, setupTikTokConnection, readTikTokError, teardownConn, runAttempt };
