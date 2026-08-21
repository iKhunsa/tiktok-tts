'use strict';

const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');

function clearObsReconnect(deps) {
  const { state } = deps;
  if (state.obs.reconnectTimer) { clearTimeout(state.obs.reconnectTimer); state.obs.reconnectTimer = null; }
  state.obs.reconnectAttempts = 0;
}

function scheduleObsReconnect(deps) {
  const { state, bus, logger } = deps;
  if (!state.obs.lastParams || state.obs.reconnectTimer) return;

  if (state.obs.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.log(
      'warn', 'canales', 'canales/obs/schedule-reconnect.js#scheduleObsReconnect', 'canales.obs.reconexion_agotada',
      `Reconexion de OBS agotada tras ${state.obs.reconnectAttempts} intento(s)`, { attempts: state.obs.reconnectAttempts }
    );
    clearObsReconnect(deps);
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, state.obs.reconnectAttempts), 30000);
  state.obs.reconnectAttempts++;
  bus.emit('canal:estado', { platform: 'obs', channel: null, state: 'reconectando', attempt: state.obs.reconnectAttempts, delayMs: delay });

  state.obs.reconnectTimer = setTimeout(async () => {
    state.obs.reconnectTimer = null;
    if (state.obs.intentionalClose || state.obs.ws) return;
    try {
      await require('./connect').connectObs(deps, state.obs.lastParams.port, state.obs.lastParams.password);
      logger.log(
        'info', 'canales', 'canales/obs/schedule-reconnect.js#scheduleObsReconnect', 'canales.obs.reconexion_exitosa',
        `Reconexion de OBS exitosa (intento ${state.obs.reconnectAttempts})`, { attempt: state.obs.reconnectAttempts }
      );
    } catch (error) {
      logger.log(
        'warn', 'canales', 'canales/obs/schedule-reconnect.js#scheduleObsReconnect', 'canales.obs.reconexion_fallida',
        `Fallo reconexion de OBS (intento ${state.obs.reconnectAttempts}): ${error.message}`,
        { attempt: state.obs.reconnectAttempts, error: error.message }
      );
      // El handler de 'close' ya programa el siguiente intento si corresponde;
      // si fallo antes de abrir (error de socket), se programa aca.
      if (!state.obs.reconnectTimer) scheduleObsReconnect(deps);
    }
  }, delay);
}

module.exports = { scheduleObsReconnect, clearObsReconnect };
