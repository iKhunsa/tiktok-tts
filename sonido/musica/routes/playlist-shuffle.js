'use strict';

const { getConfigSnapshot, patchConfig } = require('../../config-bridge');
const { musicBroadcastState } = require('../broadcast-state');

function playlistShuffle(deps) {
  return (_req, res) => {
    const { bus } = deps;
    const config = getConfigSnapshot(bus);
    patchConfig(bus, { playlistShuffle: !config.playlistShuffle });
    musicBroadcastState(deps);
    const after = getConfigSnapshot(bus);
    res.json({ ok: true, shuffle: after.playlistShuffle });
  };
}

module.exports = { playlistShuffle };
