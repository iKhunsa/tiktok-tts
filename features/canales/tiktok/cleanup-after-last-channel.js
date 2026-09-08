'use strict';

const { broadcastChannels } = require('../broadcast-channels');

/** Aviso de "sin canales activos" — /overlay y /sonido reaccionan a esto en fases posteriores. */
function cleanupAfterLastTikTokChannel(deps) {
  const { state, bus } = deps;
  if (state.tiktokChannels.size === 0) {
    bus.emit('canal:estado', { platform: 'tiktok', channel: null, state: 'sin-canales' });
    // Senal real de fin de sesion cross-plataforma (total 0) — resetea el aviso
    // del creador (features/chat/) y para el scheduler de promo (features/promo/).
    broadcastChannels(deps);
  }
}

module.exports = { cleanupAfterLastTikTokChannel };
