'use strict';

const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { parseYoutubeTarget } = require('./parse-target');
const { stopYoutubeChat } = require('./stop-chat');
const { WATCHDOG_TIMEOUT_MS, clearWatchdogTimer, armWatchdog, nextConfirmBackoffMs } = require('./chat-watchdog');
const { assertNoConexionEnCurso } = require('../connecting-lock');

// `fetchLivePage` es la MISMA llamada que `LiveChat#start()` hace por dentro
// para obtener apiKey/clientVersion/continuation (ver node_modules/youtube-chat
// /dist/live-chat.js) — re-pedirla sin tocar la conexion existente confirma,
// barato, si el directo sigue en pie y YouTube todavia sirve una pagina de
// chat valida. No esta re-exportada por 'youtube-chat' (solo LiveChat lo esta,
// ver dist/index.js), asi que hace falta el require profundo al archivo
// interno del paquete — fragil ante un cambio de version, pero es la unica
// senal de vida que no depende de campos privados (WeakMap) de LiveChat.
async function confirmYoutubeStillLive(target) {
  const { fetchLivePage } = require('youtube-chat/dist/requests');
  try {
    await fetchLivePage(target.opts);
    return { alive: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { alive: false, reason: error.message };
  }
}

function clearReconnectTimer(map, channel) {
  const timer = map.get(channel);
  if (timer) clearTimeout(timer);
  map.delete(channel);
}

function scheduleReconnect(deps, target, attempt, reason) {
  const { state, bus, logger } = deps;
  if (attempt >= MAX_RECONNECT_ATTEMPTS) return;
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  logger.log(
    'warn', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.reconectando',
    `Reconectando YouTube ${target.key}, intento ${attempt + 1} (motivo: ${reason})`,
    { channel: target.key, intento: attempt + 1, delayMs: delay, motivo: reason }
  );
  bus.emit('canal:estado', { platform: 'youtube', channel: target.key, state: 'reconectando', attempt: attempt + 1, delayMs: delay });
  const timer = setTimeout(() => {
    state.youtubeReconnectTimers.delete(target.key);
    connectYoutube(deps, target.key, attempt + 1).catch((e) => {
      logger.log(
        'error', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.reconexion_fallida',
        `Fallo reconexion de YouTube ${target.key}: ${e.message}`, { channel: target.key, error: e.message, stack: e.stack }
      );
    });
  }, delay);
  state.youtubeReconnectTimers.set(target.key, timer);
}

const SEEN_IDS_CAP = 500;

function forceReconnect(deps, target, liveChat, attempt, reason) {
  const { state, bus } = deps;
  const wasActive = state.youtubeChannels.get(target.key) === liveChat;
  if (wasActive) {
    clearWatchdogTimer(state.youtubeWatchdogTimers, target.key);
    stopYoutubeChat(liveChat, reason);
    bus.emit('canal:estado', { platform: 'youtube', channel: target.key, state: 'desconectado' });
    state.youtubeChannels.delete(target.key);
  }
  if (wasActive) scheduleReconnect(deps, target, attempt, reason);
}

async function connectYoutube(deps, channelOrId, attempt = 0) {
  const { state } = deps;
  const target = parseYoutubeTarget(channelOrId);
  if (!target) throw new Error('YouTube: ingresa @handle, URL del live/video o Channel ID UC...');

  assertNoConexionEnCurso(state.connectingYoutube, target.key);

  try {
    return await connectYoutubeLocked(deps, target, attempt);
  } finally {
    state.connectingYoutube.delete(target.key);
  }
}

async function connectYoutubeLocked(deps, target, attempt) {
  const { state, bus, logger } = deps;
  const { LiveChat } = require('youtube-chat');

  clearReconnectTimer(state.youtubeReconnectTimers, target.key);
  clearWatchdogTimer(state.youtubeWatchdogTimers, target.key);

  if (state.youtubeChannels.has(target.key)) {
    stopYoutubeChat(state.youtubeChannels.get(target.key), 'reconnect');
    state.youtubeChannels.delete(target.key);
  }

  const liveChat = new LiveChat(target.opts);
  if (!state.youtubeSeenIds.has(target.key)) state.youtubeSeenIds.set(target.key, new Set());

  // Watchdog: YouTube puede seguir devolviendo 200 OK con actions:[] para
  // clientes anonimos cuando el token de continuacion caduca — 'chat' deja de
  // disparar para siempre y la libreria nunca emite 'error'. Pero un LIVE sano
  // con chat lento tambien deja de emitir 'chat' por mucho tiempo, asi que el
  // silencio solo es SOSPECHA, no confirmacion: al vencer el timeout, onStale
  // primero confirma con una prueba activa barata (confirmYoutubeStillLive)
  // antes de tocar la conexion. Solo se reconecta si la confirmacion tambien
  // falla; si el stream sigue sano, se re-arma el watchdog (con backoff
  // acotado) y se loguea como info, no como warning.
  let lastActivityAt = Date.now();
  let confirmBackoffMs = WATCHDOG_TIMEOUT_MS;
  let watchdogGeneration = 0;

  function scheduleWatchdog(timeoutMs) {
    watchdogGeneration += 1;
    armWatchdog(deps, target, onStale, timeoutMs);
  }

  async function onStale() {
    if (state.youtubeChannels.get(target.key) !== liveChat) return; // ya no es la conexion activa
    const generation = watchdogGeneration;
    const msSinceLastMessage = Date.now() - lastActivityAt;
    const { alive, reason } = await confirmYoutubeStillLive(target);
    // Mientras confirmabamos pudo llegar un 'chat' real (ya re-armo el
    // watchdog) o la conexion pudo cerrarse por otra via (p.ej. 'error') —
    // en cualquier caso esta invocacion de onStale ya quedo obsoleta.
    if (generation !== watchdogGeneration) return;
    if (state.youtubeChannels.get(target.key) !== liveChat) return;

    if (alive) {
      confirmBackoffMs = nextConfirmBackoffMs(confirmBackoffMs);
      logger.log(
        'info', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.chat_silencio_confirmado_sano',
        `YouTube ${target.key} sin mensajes de chat en ${msSinceLastMessage}ms pero la conexion sigue sana (pagina live confirmada); no se reconecta`,
        { channel: target.key, msSinceLastMessage, confirmado: true, motivo: 'silencio_sano' }
      );
      scheduleWatchdog(confirmBackoffMs);
      return;
    }

    logger.log(
      'warn', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.chat_estancado',
      `YouTube ${target.key} sin mensajes de chat en ${msSinceLastMessage}ms y la confirmacion fallo (${reason}); forzando reconexion`,
      { channel: target.key, msSinceLastMessage, confirmado: false, motivo: reason }
    );
    forceReconnect(deps, target, liveChat, attempt, 'stale-confirmado');
  }

  liveChat.on('chat', (item) => {
    lastActivityAt = Date.now();
    confirmBackoffMs = WATCHDOG_TIMEOUT_MS;
    scheduleWatchdog(WATCHDOG_TIMEOUT_MS);
    // Dedup por ID de mensaje de YouTube — sin ventana de tiempo, sobrevive
    // huecos mas largos que los 10min del gate central (ver comentario en
    // channel-maps.js#youtubeSeenIds). Doble capa a proposito: esto atrapa
    // huecos largos, el gate central atrapa lo que esto no cubra (cap de 500).
    const msgId = item.id;
    if (msgId) {
      const seen = state.youtubeSeenIds.get(target.key);
      if (seen.has(msgId)) return;
      seen.add(msgId);
      if (seen.size > SEEN_IDS_CAP) seen.delete(seen.values().next().value);
    }
    bus.emit('canal:mensaje-crudo', { platform: 'youtube', channel: target.key, raw: item });
  });

  liveChat.on('error', (err) => {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.log(
      'warn', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.error',
      `Error de chat de YouTube ${target.key}: ${error.message}`, { channel: target.key, error: error.message, stack: error.stack }
    );
    forceReconnect(deps, target, liveChat, attempt, 'error');
  });

  logger.log(
    'info', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.conectando',
    `Conectando a YouTube ${target.key}`, { channel: target.key }
  );
  bus.emit('canal:estado', { platform: 'youtube', channel: target.key, state: 'conectando' });

  const ok = await liveChat.start();
  if (!ok) throw new Error('No se pudo iniciar el chat de YouTube (¿el canal está en vivo?)');
  state.youtubeChannels.set(target.key, liveChat);
  lastActivityAt = Date.now();
  scheduleWatchdog(WATCHDOG_TIMEOUT_MS);

  logger.log(
    'info', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.conectado',
    `YouTube ${target.key} conectado`, { channel: target.key }
  );
  bus.emit('canal:estado', { platform: 'youtube', channel: target.key, state: 'conectado' });

  return target.key;
}

module.exports = { connectYoutube, clearReconnectTimer, clearWatchdogTimer };
