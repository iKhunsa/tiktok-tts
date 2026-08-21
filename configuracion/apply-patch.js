'use strict';

const { CONFIG_VALIDATORS } = require('./validators');

/**
 * Misma logica que applyConfigPatch (backend-viejo/server.js:670): valida
 * cada clave del patch contra CONFIG_VALIDATORS, junta las rechazadas,
 * aplica solo las validas. Muta `config` en el lugar.
 */
function applyConfigPatch(config, input = {}) {
  const rejected = [];
  const keysChanged = [];
  for (const [k, v] of Object.entries(input)) {
    if (!(k in CONFIG_VALIDATORS)) continue;
    if (!CONFIG_VALIDATORS[k](v)) {
      rejected.push(k);
      continue;
    }
    if (config[k] !== v) {
      config[k] = v;
      keysChanged.push(k);
    }
  }
  return { rejected, keysChanged, changed: keysChanged.length > 0 };
}

module.exports = { applyConfigPatch };
