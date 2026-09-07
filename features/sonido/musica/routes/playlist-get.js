'use strict';

const { getConfigSnapshot } = require('../../config-bridge');

function playlistGet(deps) {
  return (_req, res) => {
    const { musicState, bus } = deps;
    const config = getConfigSnapshot(bus);
    res.json({
      playlist: musicState.playlistResolved,
      raw: config.streamerPlaylist,
      index: musicState.playlistIndex,
      shuffle: config.playlistShuffle,
      enabled: config.playlistEnabled,
    });
  };
}

module.exports = { playlistGet };
