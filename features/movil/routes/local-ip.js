'use strict';

const { getLocalIPCandidates } = require('../local-ip');

function localIp(port) {
  return (_req, res) => {
    const ips = getLocalIPCandidates();
    // `ip` se mantiene por compatibilidad (el frontend lo consume); `ips` lista
    // todas las candidatas para entornos multi-interfaz.
    res.json({ ip: ips[0] || '127.0.0.1', ips, port: port || 3000 });
  };
}

module.exports = { localIp };
