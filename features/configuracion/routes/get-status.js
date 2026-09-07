'use strict';

/**
 * Healthcheck. Filtra adminIdentities de la config expuesta (lista de
 * usernames admin) — este endpoint es accesible desde el front, no debe
 * filtrar ese dato aunque config.json entero no se loguee (regla dura #5).
 * `connected` (usado por advanced.html) se pide a /canales via bus — este
 * dominio no puede tocar su Map de canales directo.
 */
function getStatus(configStore, { wss, bus }) {
  return (_req, res) => {
    const { adminIdentities, ...safeConfig } = configStore.config;
    let connected = false;
    if (bus) bus.emit('canales:tiktok-conectado', (v) => { connected = !!v; });

    res.json({
      app: 'tiktok-tts',
      connected,
      wsClients: wss ? wss.clients.size : 0,
      uptime: Math.floor(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      config: safeConfig,
      timestamp: new Date().toISOString(),
    });
  };
}

module.exports = { getStatus };
