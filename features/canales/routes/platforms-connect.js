'use strict';

const { connectPlatformChannel } = require('../connect-impl');

function platformsConnect(deps) {
  return async (req, res) => {
    const { platform, channel, token } = req.body || {};
    try {
      const { channel: clean } = await connectPlatformChannel(deps, { platform, channel, token });
      res.json({ success: true, channel: clean });
    } catch (err) {
      if (err.statusCode === 400) return res.status(400).json({ error: err.message });
      deps.logger.log(
        'error', 'canales', 'canales/routes/platforms-connect.js#platformsConnect', 'canales.conexion.fallida',
        `Error al conectar plataforma ${platform}: ${err.message}`, { platform, channel, error: err.message, stack: err.stack }
      );
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  };
}

module.exports = { platformsConnect };
