'use strict';

const estado = require('./estado-sesion');

// Implementacion del contrato core/contracts/entitlements.js#check.
// subscriptionsEnabled off -> todo desbloqueado. On -> mira la sesion.
// Cualquier throw lo atrapa el contrato y devuelve false (bloquea).

function crearCheck(subscriptionsEnabled) {
  return function check(featureId) {
    if (!subscriptionsEnabled()) return true;
    const s = estado.getSesion();
    if (!s.signedIn) return false;
    return s.entitlements.includes(featureId);
  };
}

module.exports = { crearCheck };
