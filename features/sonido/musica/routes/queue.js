'use strict';

const { currentProgress } = require('./progress');
const { upcomingTracks } = require('../upcoming');

// Cola de la app y Siguientes del overlay: alcanza para una playlist entera.
const MAX_PROXIMAS = 50;

function queue(deps) {
  const { musicState } = deps;
  return (_req, res) => {
    res.json({ current: musicState.currentTrack, queue: musicState.queue, playlistActive: musicState.playlistActive, progress: currentProgress(musicState), upcoming: upcomingTracks(deps, MAX_PROXIMAS) });
  };
}

module.exports = { queue };
