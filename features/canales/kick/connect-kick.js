'use strict';

const WebSocket = require('ws');
const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { cleanKickSlug } = require('./clean-slug');
const { fetchKickChatroom } = require('./fetch-chatroom');
const { parseKickChatMessage } = require('./handle-event');
const { PUSHER_URL, CHAT_MESSAGE_EVENT, subscribeFrame, PING_FRAME } = require('./pusher');
const { armKickWatchdog, clearKickWatchdog, WATCHDOG_TIMEOUT_MS } = require('./stale-watchdog');

// Conexion directa al chat de Kick desde Node: resuelve el chatroom.id via la
// API publica de kick.com y se suscribe al canal Pusher `chatrooms.<id>.v2`
// (sin auth, es publico). NO necesita Electron ni ventana oculta — funciona
// igual en `node server.js` que empaquetado.

const SEEN_IDS_CAP = 500;
const PING_INTERVAL_MS = 100 * 1000; // Pusher corta a los 120s sin actividad.
const SUBSCRIBE_TIMEOUT_MS = 20000; // evita que la Promise quede colgada si Pusher nunca confirma la suscripcion.

function clearKickReconnect(map, slug) {
  const timer = map.get(slug);
  if (timer) clearTimeout(timer);
  map.delete(slug);
}

function teardownEntry(entry) {
  if (!entry) return;
  entry.intentional = true;
  if (entry.pingTimer) clearInterval(entry.pingTimer);
  try {
    entry.ws.removeAllListeners();
    entry.ws.close();
  } catch (_) { /* best-effort */ }
}

function scheduleReconnect(deps, slug, attempt, reason) {
  const { state, bus, logger } = deps;
  if (attempt >= MAX_RECONNECT_ATTEMPTS) {
    logger.log(
      'warn', 'canales', 'canales/kick/connect-kick.js#scheduleReconnect', 'canales.kick.reconexion_agotada',
      `Kick ${slug}: se agotaron los ${MAX_RECONNECT_ATTEMPTS} intentos de reconexion (motivo: ${reason})`,
      { slug, motivo: reason }
    );
    bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'desconectado' });
    return;
  }
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  logger.log(
    'warn', 'canales', 'canales/kick/connect-kick.js#scheduleReconnect', 'canales.kick.reconectando',
    `Reconectando Kick ${slug}, intento ${attempt + 1} (motivo: ${reason})`,
    { slug, intento: attempt + 1, delayMs: delay, motivo: reason }
  );
  bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'reconectando', attempt: attempt + 1, delayMs: delay });
  const timer = setTimeout(() => {
    state.kickReconnectTimers.delete(slug);
    connectKick(deps, slug, attempt + 1).catch((e) => {
      logger.log(
        'error', 'canales', 'canales/kick/connect-kick.js#scheduleReconnect', 'canales.kick.reconexion_fallida',
        `Fallo la reconexion de Kick ${slug}: ${e.message}`, { slug, error: e.message, stack: e.stack }
      );
    });
  }, delay);
  state.kickReconnectTimers.set(slug, timer);
}

async function connectKick(deps, channelOrSlug, attempt = 0) {
  const { state } = deps;
  const slug = cleanKickSlug(channelOrSlug);
  if (!slug) throw new Error('Kick: ingresa el nombre del canal');

  if (state.connectingKick.has(slug)) {
    const err = new Error('Conexión ya en progreso para este canal');
    err.statusCode = 409;
    throw err;
  }
  state.connectingKick.add(slug);

  try {
    return await connectKickLocked(deps, slug, attempt);
  } finally {
    state.connectingKick.delete(slug);
  }
}

async function connectKickLocked(deps, slug, attempt) {
  const { state, bus, logger } = deps;

  clearKickReconnect(state.kickReconnectTimers, slug);
  clearKickWatchdog(state.kickWatchdogTimers, slug);

  const previo = state.kickChannels.get(slug);
  if (previo) teardownEntry(previo);

  if (attempt === 0) {
    logger.log(
      'info', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.conectando',
      `Conectando a Kick ${slug}`, { slug }
    );
    bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'conectando' });
  }

  const { chatroomId } = await fetchKickChatroom(slug);

  const ws = new WebSocket(PUSHER_URL);
  const entry = { ws, chatroomId, intentional: false, pingTimer: null, attempt };
  if (!state.kickSeenIds.has(slug)) state.kickSeenIds.set(slug, new Set());

  function onStale() {
    logger.log(
      'warn', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.sin_eventos',
      `Kick ${slug} sin mensajes en ${WATCHDOG_TIMEOUT_MS}ms; forzando reconexion`, { slug, timeoutMs: WATCHDOG_TIMEOUT_MS }
    );
    if (state.kickChannels.get(slug) !== entry) return;
    teardownEntry(entry);
    state.kickChannels.delete(slug);
    scheduleReconnect(deps, slug, 0, 'stale');
  }

  await new Promise((resolve, reject) => {
    let settled = false;

    const subscribeTimeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      logger.log(
        'warn', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.suscripcion_timeout',
        `Kick ${slug}: sin confirmacion de suscripcion tras ${SUBSCRIBE_TIMEOUT_MS}ms`, { slug, timeoutMs: SUBSCRIBE_TIMEOUT_MS }
      );
      teardownEntry(entry);
      reject(new Error('Timeout esperando confirmacion de suscripcion de Kick'));
    }, SUBSCRIBE_TIMEOUT_MS);

    ws.on('open', () => {
      ws.send(subscribeFrame(chatroomId));
      entry.pingTimer = setInterval(() => {
        try { ws.send(PING_FRAME); } catch (_) { /* best-effort */ }
      }, PING_INTERVAL_MS);
    });

    ws.on('message', (buf) => {
      let msg;
      try { msg = JSON.parse(buf.toString()); } catch (_) { return; }

      // Cualquier frame de Pusher (subscription_succeeded, pusher:pong del ping
      // cada 100s, chat) prueba que el socket sigue vivo. Kick tiene poco chat
      // en canales tranquilos pero el ping mantiene el WS abierto — re-armar
      // solo con CHAT_MESSAGE_EVENT daba un falso positivo cada 5 min.
      armKickWatchdog(deps, slug, onStale);

      if (msg.event === 'pusher_internal:subscription_succeeded') {
        if (settled) return;
        settled = true;
        clearTimeout(subscribeTimeout);
        state.kickChannels.set(slug, entry);
        logger.log(
          'info', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.conectado',
          `Kick ${slug} conectado`, { slug }
        );
        bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'conectado' });
        resolve();
        return;
      }

      if (msg.event === CHAT_MESSAGE_EVENT) {
        const raw = parseKickChatMessage(msg.data);
        if (!raw) return;
        const seen = state.kickSeenIds.get(slug);
        if (seen.has(raw.id)) return;
        seen.add(raw.id);
        if (seen.size > SEEN_IDS_CAP) seen.delete(seen.values().next().value);
        bus.emit('canal:mensaje-crudo', { platform: 'kick', channel: slug, raw });
      }
    });

    ws.on('error', (err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.log(
        'warn', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.socket_error',
        `Error de socket de Kick ${slug}: ${error.message}`, { slug, error: error.message }
      );
      if (!settled) { settled = true; clearTimeout(subscribeTimeout); reject(error); }
    });

    ws.on('close', () => {
      if (entry.pingTimer) clearInterval(entry.pingTimer);
      if (entry.intentional) return;
      if (!settled) { settled = true; clearTimeout(subscribeTimeout); reject(new Error('Kick: el socket se cerro antes de suscribirse')); return; }
      if (state.kickChannels.get(slug) !== entry) return;
      state.kickChannels.delete(slug);
      clearKickWatchdog(state.kickWatchdogTimers, slug);
      scheduleReconnect(deps, slug, entry.attempt, 'socket-cerrado');
    });
  });

  return slug;
}

function disconnectKick(deps, channelOrSlug) {
  const { state } = deps;
  const slug = cleanKickSlug(channelOrSlug);
  clearKickReconnect(state.kickReconnectTimers, slug);
  clearKickWatchdog(state.kickWatchdogTimers, slug);
  const entry = state.kickChannels.get(slug);
  if (entry) teardownEntry(entry);
  state.kickChannels.delete(slug);
  state.kickSeenIds.delete(slug);
}

module.exports = { connectKick, disconnectKick };
