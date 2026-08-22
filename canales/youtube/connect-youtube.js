'use strict';

const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { parseYoutubeTarget } = require('./parse-target');
const { stopYoutubeChat } = require('./stop-chat');
const { WATCHDOG_TIMEOUT_MS, clearWatchdogTimer, armWatchdog } = require('./chat-watchdog');

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

const SEEN_IDS_CAP = 500;

async function connectYoutube(deps, channelOrId, attempt = 0) {
  const { state, bus, logger } = deps;
  const { LiveChat } = require('youtube-chat');
  const target = parseYoutubeTarget(channelOrId);
  if (!target) throw new Error('YouTube: ingresa @handle, URL del live/video o Channel ID UC...');

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
  // disparar para siempre y la libreria nunca emite 'error'. Si no llega
  // ningun mensaje real en WATCHDOG_TIMEOUT_MS, forzamos reconexion.
  function onStale() {
    logger.log(
      'warn', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.chat_estancado',
      `YouTube ${target.key} sin mensajes de chat en ${WATCHDOG_TIMEOUT_MS}ms; posible token de continuacion caducado, forzando reconexion`,
      { channel: target.key, timeoutMs: WATCHDOG_TIMEOUT_MS }
    );
    forceReconnect(deps, target, liveChat, attempt, 'stale');
  }

  liveChat.on('chat', (item) => {
    armWatchdog(deps, target, onStale);

    // Dedup por ID de mensaje de YouTube — evita replays en reconexion. Es
    // una garantia de la fiabilidad del stream crudo, no logica de negocio.
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
  armWatchdog(deps, target, onStale);

  logger.log(
    'info', 'canales', 'canales/youtube/connect-youtube.js#connectYoutube', 'canales.youtube.conectado',
    `YouTube ${target.key} conectado`, { channel: target.key }
  );
  bus.emit('canal:estado', { platform: 'youtube', channel: target.key, state: 'conectado' });

  return target.key;
}

module.exports = { connectYoutube, clearReconnectTimer, clearWatchdogTimer };
