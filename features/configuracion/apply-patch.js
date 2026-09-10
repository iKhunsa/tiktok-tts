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
    // hasOwnProperty, no `k in`: `in` es prototype-inclusive, entonces un patch
    // {"__proto__": {}} / {"constructor": ...} resolvia a Object.prototype y
    // llamarlo como validador tiraba TypeError.
    if (!Object.prototype.hasOwnProperty.call(CONFIG_VALIDATORS, k)) continue;
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
