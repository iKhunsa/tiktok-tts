'use strict';

function getConfigSnapshot(bus) {
  let snapshot = null;
  bus.emit('config:get', (config) => { snapshot = config; });
  return snapshot || {};
}

/** Lee adminIdentities via el contrato de /configuracion (Fase 2), nunca el store directo. */
function isAdminIdentity(bus, platform, ...candidates) {
  const config = getConfigSnapshot(bus);
  const list = config.adminIdentities && config.adminIdentities[platform];
  if (!Array.isArray(list) || !list.length) return false;
  const wanted = list.map((s) => String(s).trim().toLowerCase());
  return candidates.some((c) => c && wanted.includes(String(c).trim().toLowerCase()));
}

module.exports = { isAdminIdentity };
