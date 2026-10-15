'use strict';

const WebSocket = require('ws');
const { cleanKickSlug } = require('./clean-slug');
const { fetchKickChatroom } = require('./fetch-chatroom');
const { parseKickChatMessage } = require('./handle-event');
const { fetchKickRealtimeSession, fetchKickGuestToken } = require('./fetch-realtime-session');
const {
  CONNECT_ID, SUBSCRIBE_ID, REFRESH_ID, CHAT_MESSAGE_EVENT, PONG_FRAME, connectFrame, subscribeFrame, refreshFrame, parseFrames,
} = require('./centrifugo');
const { armKickWatchdog, clearKickWatchdog, WATCHDOG_TIMEOUT_MS } = require('./stale-watchdog');
const { assertNoConexionEnCurso } = require('../connecting-lock');
const { reconnectDelayMs } = require('../reconnect-delay');

// Conexion directa al chat de Kick desde Node: resuelve el chatroom.id via la
// API publica de kick.com, pide un token de invitado y se suscribe por
// Centrifugo al canal `chatrooms.<id>.v2` (sin login). NO necesita Electron
// ni ventana oculta — funciona igual en `node server.js` que empaquetado.

const SUBSCRIBE_TIMEOUT_MS = 20000; // evita que la Promise quede colgada si Kick nunca confirma la suscripcion.
const REFRESH_MARGIN_S = 120; // renueva el token 2 min antes de que caduque.

function clearKickReconnect(map, slug) {
  const timer = map.get(slug);
  if (timer) clearTimeout(timer);
  map.delete(slug);
}

function teardownEntry(entry) {
  if (!entry) return;
  entry.intentional = true;
  if (entry.refreshTimer) clearTimeout(entry.refreshTimer);
  try {
    entry.ws.removeAllListeners();
    entry.ws.close();
  } catch (_) { /* best-effort */ }
}

function scheduleReconnect(deps, slug, attempt, reason) {
  const { state, bus, logger } = deps;
  if (!state.kickReconnectDesired.has(slug)) return;
  const delay = reconnectDelayMs(attempt);
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
      scheduleReconnect(deps, slug, attempt + 1, reason);
    });
  }, delay);
  state.kickReconnectTimers.set(slug, timer);
}

async function connectKick(deps, channelOrSlug, attempt = 0) {
  const { state } = deps;
  const slug = cleanKickSlug(channelOrSlug);
  if (!slug) throw new Error('Kick: ingresa el nombre del canal');

  assertNoConexionEnCurso(state.connectingKick, slug);

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

  const { chatroomId, channelId } = await fetchKickChatroom(slug);
  const { url, clientId, token } = await fetchKickRealtimeSession(channelId);

  const ws = new WebSocket(url, { headers: { Origin: 'https://kick.com' } });
  const entry = { ws, chatroomId, intentional: false, refreshTimer: null, attempt };

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

  // Si la renovacion falla, Kick cierra el socket al caducar el token y el
  // 'close' de abajo reconecta con una sesion nueva — no hace falta mas.
  function scheduleRefresh(reply) {
    if (!reply || !reply.expires || !reply.ttl) return;
    if (entry.refreshTimer) clearTimeout(entry.refreshTimer);
    entry.refreshTimer = setTimeout(() => {
      fetchKickGuestToken(clientId)
        .then((nuevo) => { if (!entry.intentional) ws.send(refreshFrame(nuevo)); })
        .catch((e) => logger.log(
          'warn', 'canales', 'canales/kick/connect-kick.js#scheduleRefresh', 'canales.kick.token_no_renovado',
          `Kick ${slug}: no se pudo renovar el token (${e.message})`, { slug, error: e.message }
        ));
    }, Math.max(reply.ttl - REFRESH_MARGIN_S, 30) * 1000);
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

    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimeout(subscribeTimeout);
      teardownEntry(entry);
      reject(error);
    }

    function onSubscribed() {
      if (settled) return;
      settled = true;
      clearTimeout(subscribeTimeout);
      if (attempt > 0 && !state.kickReconnectDesired.has(slug)) {
        teardownEntry(entry);
        resolve();
        return;
      }
      state.kickChannels.set(slug, entry);
      state.kickReconnectDesired.add(slug);
      entry.attempt = 0;
      logger.log(
        'info', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.conectado',
        `Kick ${slug} conectado`, { slug }
      );
      bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'conectado' });
      resolve();
    }

    ws.on('open', () => ws.send(connectFrame(token)));

    ws.on('message', (buf) => {
      // Cualquier frame (respuestas, ping `{}` cada ~25s, chat) prueba que el
      // socket sigue vivo. Re-armar solo con CHAT_MESSAGE_EVENT daria un falso
      // positivo cada 5 min en canales tranquilos.
      armKickWatchdog(deps, slug, onStale);

      for (const msg of parseFrames(buf)) {
        if (!Object.keys(msg).length) {
          try { ws.send(PONG_FRAME); } catch (_) { /* best-effort */ }
          continue;
        }
        if (msg.error && (msg.id === CONNECT_ID || msg.id === SUBSCRIBE_ID)) {
          fail(new Error(`Kick: el chat rechazo la conexion (${msg.error.code} ${msg.error.message || ''})`.trim()));
          return;
        }
        if (msg.id === CONNECT_ID && msg.connect) {
          scheduleRefresh(msg.connect);
          ws.send(subscribeFrame(chatroomId));
          continue;
        }
        if (msg.id === REFRESH_ID && msg.refresh) {
          scheduleRefresh(msg.refresh);
          continue;
        }
        if (msg.id === SUBSCRIBE_ID && msg.subscribe) {
          onSubscribed();
          continue;
        }
        const pub = msg.push && msg.push.pub && msg.push.pub.data;
        if (pub && pub.event === CHAT_MESSAGE_EVENT) {
          const raw = parseKickChatMessage(pub.data);
          if (raw) bus.emit('canal:mensaje-crudo', { platform: 'kick', channel: slug, raw });
        }
      }
    });

    ws.on('error', (err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.log(
        'warn', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.socket_error',
        `Error de socket de Kick ${slug}: ${error.message}`, { slug, error: error.message }
      );
      fail(error);
    });

    ws.on('close', () => {
      if (entry.refreshTimer) clearTimeout(entry.refreshTimer);
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
  state.kickReconnectDesired.delete(slug);
  clearKickReconnect(state.kickReconnectTimers, slug);
  clearKickWatchdog(state.kickWatchdogTimers, slug);
  const entry = state.kickChannels.get(slug);
  if (entry) teardownEntry(entry);
  state.kickChannels.delete(slug);
}

module.exports = { connectKick, disconnectKick };
