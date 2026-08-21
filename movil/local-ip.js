'use strict';

const os = require('os');

// Heuristica best-effort: no hay forma fiable de saber cual interfaz es "la"
// LAN del usuario; se filtran virtuales y se priorizan los rangos domesticos
// tipicos (192.168.x, luego 10.x) sobre el resto.
function getLocalIPCandidates() {
  const VIRTUAL_SKIP = /virtual|vbox|vmnet|vmware|hyper.?v|vethernet|docker|loopback/i;
  const VIRTUAL_IP = /^192\.168\.(56|99)\./; // VirtualBox/Docker defaults
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const [name, ifaces] of Object.entries(nets)) {
    if (VIRTUAL_SKIP.test(name)) continue;
    for (const iface of ifaces) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (VIRTUAL_IP.test(iface.address)) continue;
      candidates.push(iface.address);
    }
  }
  const rank = (ip) => (/^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : 2);
  candidates.sort((a, b) => rank(a) - rank(b));
  return candidates;
}

function getLocalIP() {
  return getLocalIPCandidates()[0] || '127.0.0.1';
}

module.exports = { getLocalIPCandidates, getLocalIP };
