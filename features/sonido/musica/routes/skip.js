'use strict';

const { advanceMusicQueue } = require('../advance-queue');

function skip(deps) {
  return (_req, res) => {
    deps.musicState.currentTrack = null;
    // music-skip solo detiene el audio local; el avance de la cola es server-side.
    deps.bus.emit('ws:broadcast', { type: 'music-skip' });
    advanceMusicQueue(deps);
    res.json({ ok: true });
  };
}

module.exports = { skip };
