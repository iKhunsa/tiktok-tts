'use strict';

const { createHash } = require('node:crypto');
const { getConfigSnapshot } = require('./config-snapshot');

/** Politica de reproduccion de la cuenta activa; no acepta licencias desde el renderer. */
function overlayAccess(bus) {
  let sesion;
  bus.emit('auth:get', (s) => { sesion = s; });
  const activo = getConfigSnapshot(bus).subscriptionsEnabled === true;
  const pro = !activo || !!(sesion?.signedIn && sesion.plan === 'pro' && (!sesion.expiresAt || Date.parse(sesion.expiresAt) > Date.now()));
  return {
    pro,
    adquiridas: sesion?.signedIn ? (sesion.entitlements || []).filter((id) => typeof id === 'string' && id.startsWith('skin:')) : [],
    licencias: sesion?.signedIn ? sesion.licenciasSkins || {} : {},
    cuenta: createHash('sha256').update(String(sesion?.user?.id || 'anonymous')).digest('hex').slice(0, 16),
  };
}

module.exports = { overlayAccess };
