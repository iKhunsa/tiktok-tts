'use strict';

const { connectTiktokChannel } = require('../tiktok/connect-tiktok-channel');
const { cleanTiktokUsername } = require('../tiktok/clean-username');
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
      const cleanUsername = cleanTiktokUsername(username);
      res.status(err.statusCode || 500).json({
        error: err.message.includes('LIVE')
          ? `@${cleanUsername} no está en vivo ahora mismo`
          : err.message.includes('not found')
            ? `Usuario @${cleanUsername} no encontrado`
            : `No se pudo conectar: ${err.message}`,
      });
    }
  };
}

module.exports = { connect };
