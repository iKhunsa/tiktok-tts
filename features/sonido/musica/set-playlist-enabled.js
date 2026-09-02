'use strict';

const { patchConfig } = require('../config-bridge');
const { advanceMusicQueue } = require('./advance-queue');
const { musicBroadcastState } = require('./broadcast-state');

function setPlaylistEnabled(deps, enabled) {
  const { musicState, bus } = deps;
  patchConfig(bus, { playlistEnabled: enabled });

  if (enabled) {
    // Arrancar de fondo solo si no hay nada sonando (las peticiones del chat
    // tienen prioridad; la playlist entra cuando la cola queda vacia).
    if (!musicState.currentTrack) advanceMusicQueue(deps);
  } else if (musicState.playlistActive) {
    musicState.currentTrack = null;
    musicState.playlistActive = false;
    bus.emit('ws:broadcast', { type: 'music-skip' });
    advanceMusicQueue(deps);
  }
  musicBroadcastState(deps);
}

module.exports = { setPlaylistEnabled };
