'use strict';

const { connectPlatformChannel } = require('../connect-impl');
const { tiktokConnectErrorMessage } = require('../tiktok/tiktok-connect-error-message');

function platformsConnect(deps) {
  return async (req, res) => {
    const { platform, channel } = req.body || {};
    try {
      const { channel: clean } = await connectPlatformChannel(deps, { platform, channel });
      res.json({ success: true, channel: clean });
    } catch (err) {
      if (err.statusCode === 400) return res.status(400).json({ error: err.message });
      deps.logger.log(
        'error', 'canales', 'canales/routes/platforms-connect.js#platformsConnect', 'canales.conexion.fallida',
        `Error al conectar plataforma ${platform}: ${err.message}`, { platform, channel, error: err.message, code: err.code, stack: err.stack }
      );
      const body = platform === 'tiktok' ? tiktokConnectErrorMessage(err) : { error: err.message };
      res.status(err.statusCode || 500).json(body);
    }
  };
}

module.exports = { platformsConnect };
