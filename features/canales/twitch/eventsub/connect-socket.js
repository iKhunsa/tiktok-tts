'use strict';

const WebSocket = require('ws');
const { createTwitchFollowSubscription } = require('./create-follow-subscription');
const { broadcastOauthStatus } = require('../oauth/status');

function connectTwitchEventSubSocket(deps, url, previousWs = null) {
  const { state, bus, logger } = deps;
  if (state.eventsub.stopped) return;

  let ws;
  try {
    ws = new WebSocket(url);
  } catch (error) {
    logger.log(
      'warn', 'canales', 'canales/twitch/eventsub/connect-socket.js#connectTwitchEventSubSocket', 'canales.twitch_eventsub.socket_no_abierto',
      `No se pudo abrir el WS de EventSub: ${error.message}`, { error: error.message }
    );
    require('./schedule-reconnect').scheduleTwitchEsReconnect(deps);
    return;
  }

  let keepaliveSec = 10;
  const armKeepaliveWatchdog = (timeoutSec) => {
    if (state.eventsub.keepaliveTimer) clearTimeout(state.eventsub.keepaliveTimer);
    state.eventsub.keepaliveTimer = setTimeout(() => {
      logger.log(
        'warn', 'canales', 'canales/twitch/eventsub/connect-socket.js#connectTwitchEventSubSocket', 'canales.twitch_eventsub.keepalive_perdido',
        'Keepalive de EventSub perdido, reconectando', { ultimoKeepaliveMs: timeoutSec * 1000 }
      );
      try { ws.terminate(); } catch (_) { /* best-effort */ }
    }, (timeoutSec + 10) * 1000);
  };

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (_) {
      logger.log(
        'debug', 'canales', 'canales/twitch/eventsub/connect-socket.js#connectTwitchEventSubSocket', 'canales.twitch_eventsub.mensaje_no_parseable',
        'Mensaje de EventSub no parseable', { rawPreview: raw.toString().slice(0, 200) }
      );
      return;
    }

    const msgType = msg.metadata && msg.metadata.message_type;
    const msgId = msg.metadata && msg.metadata.message_id;
    if (msgId) {
      if (state.eventsub.seenMsgIds.has(msgId)) return;
      state.eventsub.seenMsgIds.add(msgId);
      if (state.eventsub.seenMsgIds.size > 200) state.eventsub.seenMsgIds.delete(state.eventsub.seenMsgIds.values().next().value);
    }
    armKeepaliveWatchdog(keepaliveSec);

    if (msgType === 'session_welcome') {
      keepaliveSec = (msg.payload && msg.payload.session && msg.payload.session.keepalive_timeout_seconds) || 10;
      armKeepaliveWatchdog(keepaliveSec);
      // Reconexion graceful: cerrar el socket viejo recien al recibir el welcome nuevo.
      if (previousWs) { try { previousWs.removeAllListeners(); previousWs.close(); } catch (_) { /* best-effort */ } }
      state.eventsub.ws = ws;
      // Solo suscribir en sesiones nuevas: al usar reconnect_url las
      // suscripciones existentes se conservan.
      if (!previousWs) {
        try {
          await createTwitchFollowSubscription(deps, msg.payload.session.id);
        } catch (error) {
          logger.log(
            'warn', 'canales', 'canales/twitch/eventsub/connect-socket.js#connectTwitchEventSubSocket', 'canales.twitch_eventsub.suscripcion_fallida',
            `No se pudo suscribir a follows: ${error.message}`, { error: error.message }
          );
          state.eventsub.followActive = false;
          broadcastOauthStatus(deps);
          try { ws.close(); } catch (_) { /* best-effort */ }
        }
      }
    } else if (msgType === 'notification') {
      const evType = msg.payload && msg.payload.subscription && msg.payload.subscription.type;
      const ev = msg.payload && msg.payload.event;
      if (evType === 'channel.follow' && ev) {
        bus.emit('canal:follow', { platform: 'twitch', channel: null, userId: ev.user_id || null, nick: ev.user_name || ev.user_login || null });
        logger.log(
          'info', 'canales', 'canales/twitch/eventsub/connect-socket.js#connectTwitchEventSubSocket', 'canales.twitch_eventsub.follow_recibido',
          `Follow recibido: ${ev.user_name || ev.user_login}`, { nick: ev.user_name || ev.user_login }
        );
      }
    } else if (msgType === 'session_reconnect') {
      const reconnectUrl = msg.payload && msg.payload.session && msg.payload.session.reconnect_url;
      logger.log(
        'info', 'canales', 'canales/twitch/eventsub/connect-socket.js#connectTwitchEventSubSocket', 'canales.twitch_eventsub.reconexion_solicitada',
        'session_reconnect recibido de Twitch', {}
      );
      if (reconnectUrl) connectTwitchEventSubSocket(deps, reconnectUrl, ws);
    } else if (msgType === 'revocation') {
      const reason = (msg.payload && msg.payload.subscription && msg.payload.subscription.status) || 'revoked';
      logger.log(
        'warn', 'canales', 'canales/twitch/eventsub/connect-socket.js#connectTwitchEventSubSocket', 'canales.twitch_eventsub.suscripcion_revocada',
        `Suscripcion de EventSub revocada: ${reason}`, { reason }
      );
      state.eventsub.followActive = false;
      broadcastOauthStatus(deps);
      require('./stop').stopTwitchEventSub(deps, `revocation:${reason}`);
    }
  });

  ws.on('close', () => {
    if (state.eventsub.ws === ws) {
      state.eventsub.ws = null;
      if (state.eventsub.keepaliveTimer) { clearTimeout(state.eventsub.keepaliveTimer); state.eventsub.keepaliveTimer = null; }
      const wasActive = state.eventsub.followActive;
      state.eventsub.followActive = false;
      if (!state.eventsub.stopped) {
        if (wasActive) broadcastOauthStatus(deps);
        require('./schedule-reconnect').scheduleTwitchEsReconnect(deps);
      }
    }
  });

  ws.on('error', (error) => {
    logger.log(
      'warn', 'canales', 'canales/twitch/eventsub/connect-socket.js#connectTwitchEventSubSocket', 'canales.twitch_eventsub.socket_error',
      `Error del WS de EventSub: ${error.message}`, { error: error.message }
    );
    try { ws.close(); } catch (_) { /* best-effort */ }
  });
}

module.exports = { connectTwitchEventSubSocket };
