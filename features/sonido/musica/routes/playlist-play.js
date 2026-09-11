'use strict';

const { getConfigSnapshot, patchConfig } = require('../../config-bridge');
const { advanceMusicQueue } = require('../advance-queue');
const { musicBroadcastState } = require('../broadcast-state');

// Botón "Reproducir" de la card de playlist: fuerza el arranque desde el
// primer tema. Si hay un !p del chat sonando no lo corta — la playlist
// retoma sola cuando termina la cola.
function playlistPlay(deps) {
  return (_req, res) => {
    const { musicState, bus } = deps;

    if (!musicState.playlistResolved.length) {
      return res.status(400).json({ error: 'playlist vacía', errorKey: 'errors.playlistEmpty' });
    }

    const config = getConfigSnapshot(bus);
    if (!config.playlistEnabled) patchConfig(bus, { playlistEnabled: true });

    const cur = musicState.currentTrack;
    if (cur && cur.platform !== 'playlist') {
      // Hay una petición del chat sonando: no interrumpir, solo asegurar que
      // la playlist quede habilitada para cuando la cola se vacíe.
      musicBroadcastState(deps);
      return res.json({ ok: true, deferred: true });
    }

    musicState.playlistIndex = 0;
    musicState.currentTrack = null;
    bus.emit('ws:broadcast', { type: 'music-skip' });
    advanceMusicQueue(deps);
    res.json({ ok: true, current: musicState.currentTrack });
  };
}

module.exports = { playlistPlay };
