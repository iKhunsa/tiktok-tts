'use strict';

const { connectTiktokChannel } = require('../tiktok/connect-tiktok-channel');
const { tiktokConnectErrorMessage } = require('../tiktok/tiktok-connect-error-message');
const { broadcastChannels } = require('../broadcast-channels');

/** POST /api/connect — endpoint historico, solo TikTok, agrega canal sin reemplazar otros. */
function connect(deps) {
  return async (req, res) => {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: 'Se requiere el nombre de usuario' });
    try {
      const cleanUsername = await connectTiktokChannel(deps, username);
      broadcastChannels(deps);
      res.json({ success: true, username: cleanUsername });
    } catch (err) {
      const { error, errorKey } = tiktokConnectErrorMessage(err);
      res.status(err.statusCode || 500).json({ error, errorKey });
    }
  };
}

module.exports = { connect };
