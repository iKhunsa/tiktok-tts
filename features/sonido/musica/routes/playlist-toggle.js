'use strict';

const { getConfigSnapshot } = require('../../config-bridge');
const { setPlaylistEnabled } = require('../set-playlist-enabled');

function playlistToggle(deps) {
  return (req, res) => {
    // Con { enabled } en el body el estado es explicito (checkbox de la UI);
    // sin body invierte (retrocompat con clientes que solo hacen flip).
    const explicit = req.body && typeof req.body.enabled === 'boolean';
    const config = getConfigSnapshot(deps.bus);
    setPlaylistEnabled(deps, explicit ? req.body.enabled : !config.playlistEnabled);
    const after = getConfigSnapshot(deps.bus);
    res.json({ ok: true, enabled: after.playlistEnabled });
  };
}

module.exports = { playlistToggle };
