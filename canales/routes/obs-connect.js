'use strict';

const { connectObs } = require('../obs/connect');
const { clearObsReconnect } = require('../obs/schedule-reconnect');

function obsConnect(deps) {
  return async (req, res) => {
    const { state, logger } = deps;
    const { port = 4455, password = '' } = req.body || {};

    state.obs.intentionalClose = true; // cierre del socket previo no debe reintentar
    clearObsReconnect(deps);
    if (state.obs.ws) {
      try { state.obs.ws.close(); } catch (_) { /* best-effort */ }
      state.obs.ws = null;
    }
    state.obs.intentionalClose = false;

    try {
      await connectObs(deps, port, password);
      res.json({ success: true });
    } catch (err) {
      logger.log(
        'warn', 'canales', 'canales/routes/obs-connect.js#obsConnect', 'canales.obs.conexion_fallida',
        `No se pudo conectar a OBS en el puerto ${port}: ${err.message}`, { port, error: err.message }
      );
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { obsConnect };
