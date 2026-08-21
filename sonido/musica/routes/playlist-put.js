'use strict';

const { resolveAndSavePlaylist } = require('../resolve-and-save-playlist');

function playlistPut(deps) {
  return async (req, res) => {
    const { lines } = req.body || {};
    if (!Array.isArray(lines)) return res.status(400).json({ error: 'lines debe ser array' });
    resolveAndSavePlaylist(deps, lines);
    res.json({ ok: true, count: deps.musicState.playlistResolved.length });
  };
}

module.exports = { playlistPut };
