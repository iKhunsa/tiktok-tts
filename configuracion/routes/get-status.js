'use strict';

/**
 * Healthcheck. Filtra adminIdentities de la config expuesta (lista de
 * usernames admin) — este endpoint es accesible desde el front, no debe
 * filtrar ese dato aunque config.json entero no se loguee (regla dura #5).
 */
function getStatus(configStore, { wss }) {
  return (_req, res) => {
    const { adminIdentities, ...safeConfig } = configStore.config;
    res.json({
      app: 'tiktok-tts',
      wsClients: wss ? wss.clients.size : 0,
      uptime: Math.floor(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      config: safeConfig,
      timestamp: new Date().toISOString(),
    });
  };
}

module.exports = { getStatus };
