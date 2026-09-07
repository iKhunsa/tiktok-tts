'use strict';

const { patchConfig, getConfigSnapshot } = require('../../config-bridge');
const { advanceMusicQueue } = require('../advance-queue');
const { musicBroadcastState } = require('../broadcast-state');

const ALLOWED_KEYS = [
  'musicEnabled', 'musicUserCooldownMs', 'musicMaxQueue', 'musicBannedUsers',
  'musicVolume', 'playlistEnabled', 'playlistShuffle',
];

function configPatch(deps) {
  return (req, res) => {
    const { bus, musicState } = deps;
    const patch = {};
    for (const k of ALLOWED_KEYS) {
      if (k in (req.body || {})) patch[k] = req.body[k];
    }
    const result = patchConfig(bus, patch);
    if (result.rejected.length) return res.status(400).json({ error: 'Valores inválidos', rejected: result.rejected });

    if ('playlistEnabled' in patch) {
      const config = getConfigSnapshot(bus);
      if (config.playlistEnabled && !musicState.currentTrack) advanceMusicQueue(deps);
    }
    musicBroadcastState(deps);
    res.json({ ok: true });
  };
}

module.exports = { configPatch };
