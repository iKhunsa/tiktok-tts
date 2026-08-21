'use strict';

const { clearObsReconnect } = require('./schedule-reconnect');

function disconnectObs(deps) {
  const { state, bus, logger } = deps;
  state.obs.intentionalClose = true;
  clearObsReconnect(deps);
  if (state.obs.ws) {
    try { state.obs.ws.close(); } catch (_) { /* best-effort */ }
    state.obs.ws = null;
    logger.log('info', 'canales', 'canales/obs/disconnect.js#disconnectObs', 'canales.obs.desconectado', 'OBS desconectado manualmente', {});
    bus.emit('canal:estado', { platform: 'obs', channel: null, state: 'desconectado' });
  }
}

module.exports = { disconnectObs };
