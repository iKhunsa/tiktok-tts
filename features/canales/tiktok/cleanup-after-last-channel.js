'use strict';

/** Aviso de "sin canales activos" — /overlay y /sonido reaccionan a esto en fases posteriores. */
function cleanupAfterLastTikTokChannel(deps) {
  const { state, bus } = deps;
  if (state.tiktokChannels.size === 0) {
    bus.emit('canal:estado', { platform: 'tiktok', channel: null, state: 'sin-canales' });
  }
}

module.exports = { cleanupAfterLastTikTokChannel };
