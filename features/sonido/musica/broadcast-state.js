'use strict';

const { getConfigSnapshot } = require('../config-bridge');

/**
 * /movil (Fase 8) refleja este estado via bus.on('sonido:musica-estado')
 * en vez de que /sonido toque mobileState directo.
 */
function musicBroadcastState(deps) {
  const { musicState, bus } = deps;
  const config = getConfigSnapshot(bus);
  const payload = {
    enabled: config.musicEnabled,
    current: musicState.currentTrack,
    queueLength: musicState.queue.length,
    volume: config.musicVolume,
    playlistEnabled: config.playlistEnabled,
    playlistActive: musicState.playlistActive,
    playlistIndex: musicState.playlistIndex,
    playlistTotal: musicState.playlistResolved.length,
  };
  bus.emit('sonido:musica-estado', payload);
  bus.emit('ws:broadcast', { type: 'music-state', ...payload });
}

module.exports = { musicBroadcastState };
