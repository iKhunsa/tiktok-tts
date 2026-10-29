'use strict';

const { getConfigSnapshot } = require('./config-snapshot');

/** Lee adminIdentities via el contrato de /configuracion (Fase 2), nunca el store directo. */
function isAdminIdentity(bus, platform, ...candidates) {
  const config = getConfigSnapshot(bus);
  const list = config.adminIdentities && config.adminIdentities[platform];
  if (!Array.isArray(list) || !list.length) return false;
  const wanted = list.map(normalizar);
  return candidates.some((c) => c && wanted.includes(normalizar(c)));
}

// YouTube manda el autor como "@Handle"; la lista se escribe con o sin "@".
const normalizar = (s) => String(s).trim().replace(/^@+/, '').toLowerCase();

module.exports = { isAdminIdentity };
