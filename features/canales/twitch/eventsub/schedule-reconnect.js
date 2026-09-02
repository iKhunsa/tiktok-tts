'use strict';

const { MAX_RECONNECT_ATTEMPTS } = require('../../state/channel-maps');
const { broadcastOauthStatus } = require('../oauth/status');

function scheduleTwitchEsReconnect(deps) {
  const { state, logger } = deps;
  if (state.eventsub.stopped || state.eventsub.reconnectTimer || !state.authTokens.twitch) return;

  if (state.eventsub.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.log(
      'warn', 'canales', 'canales/twitch/eventsub/schedule-reconnect.js#scheduleTwitchEsReconnect', 'canales.twitch_eventsub.reconexion_agotada',
      `Reconexion de EventSub agotada tras ${state.eventsub.reconnectAttempts} intento(s)`, { attempts: state.eventsub.reconnectAttempts }
    );
    state.eventsub.followActive = false;
    broadcastOauthStatus(deps);
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, state.eventsub.reconnectAttempts), 30000);
  state.eventsub.reconnectAttempts++;
  state.eventsub.reconnectTimer = setTimeout(() => {
    state.eventsub.reconnectTimer = null;
    try {
      require('./connect-socket').connectTwitchEventSubSocket(deps, 'wss://eventsub.wss.twitch.tv/ws');
    } catch (error) {
      logger.log(
        'warn', 'canales', 'canales/twitch/eventsub/schedule-reconnect.js#scheduleTwitchEsReconnect', 'canales.twitch_eventsub.reconexion_fallida',
        `Falló al reintentar conectar EventSub: ${error.message}`, { error: error.message, stack: error.stack }
      );
    }
  }, delay);
}

module.exports = { scheduleTwitchEsReconnect };
