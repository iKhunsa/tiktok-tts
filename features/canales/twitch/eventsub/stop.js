'use strict';

function clearTwitchEsTimers(state) {
  if (state.eventsub.keepaliveTimer) { clearTimeout(state.eventsub.keepaliveTimer); state.eventsub.keepaliveTimer = null; }
  if (state.eventsub.reconnectTimer) { clearTimeout(state.eventsub.reconnectTimer); state.eventsub.reconnectTimer = null; }
}

function stopTwitchEventSub(deps, reason = 'stop') {
  const { state, logger } = deps;
  state.eventsub.stopped = true;
  clearTwitchEsTimers(state);
  state.eventsub.followActive = false;
  if (state.eventsub.ws) {
    try { state.eventsub.ws.removeAllListeners(); state.eventsub.ws.close(); } catch (_) { /* best-effort */ }
    state.eventsub.ws = null;
  }
  logger.log(
    'info', 'canales', 'canales/twitch/eventsub/stop.js#stopTwitchEventSub', 'canales.twitch_eventsub.detenido',
    `EventSub de Twitch detenido: ${reason}`, { reason }
  );
}

module.exports = { clearTwitchEsTimers, stopTwitchEventSub };
