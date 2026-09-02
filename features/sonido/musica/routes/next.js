'use strict';

const { advanceMusicQueue } = require('../advance-queue');

function next(deps) {
  return (_req, res) => {
    advanceMusicQueue(deps);
    res.json({ ok: true, current: deps.musicState.currentTrack });
  };
}

module.exports = { next };
