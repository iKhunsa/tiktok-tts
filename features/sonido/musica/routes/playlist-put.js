'use strict';

const { resolveAndSavePlaylist } = require('../resolve-and-save-playlist');
const { isStringArray } = require('../../../configuracion/validators');

function playlistPut(deps) {
  return async (req, res, next) => {
    try {
      const { lines } = req.body || {};
      if (!isStringArray(lines)) return res.status(400).json({ error: 'lines debe ser array de texto' });
      await resolveAndSavePlaylist(deps, lines);
      res.json({ ok: true, count: deps.musicState.playlistResolved.length });
    } catch (err) {
      next(err); // → middleware de error global de core/app.js
    }
  };
}

module.exports = { playlistPut };
