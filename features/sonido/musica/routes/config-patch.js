'use strict';

const { patchConfig, getConfigSnapshot } = require('../../config-bridge');
const { advanceMusicQueue } = require('../advance-queue');
const { musicBroadcastState } = require('../broadcast-state');
const { isPro } = require('../free-limits');

const ALLOWED_KEYS = [
  'musicEnabled', 'musicUserCooldownMs', 'musicMaxQueue', 'musicBannedUsers',
  'musicVolume', 'playlistEnabled', 'playlistShuffle',
];

// Free solo toca lo basico; cooldown, cola maxima, baneos y playlist son Pro.
const FREE_KEYS = ['musicEnabled', 'musicVolume'];

function configPatch(deps) {
  return (req, res) => {
    const { bus, musicState } = deps;
    const patch = {};
    if (!isPro() && Object.keys(req.body || {}).some((k) => ALLOWED_KEYS.includes(k) && !FREE_KEYS.includes(k))) {
      return res.status(403).json({ error: 'Esta función requiere el plan Pro', errorKey: 'errors.proRequired' });
    }
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
