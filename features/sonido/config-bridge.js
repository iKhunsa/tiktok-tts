'use strict';

// /sonido no importa /configuracion directo — lee/escribe via el contrato
// sincrono del bus (config:get / config:patch, Fase 2). getConfigSnapshot es
// el compartido de core; patchConfig es propio de /sonido (unico que escribe).

const { getConfigSnapshot } = require('../../core/config-snapshot');

function patchConfig(bus, patch) {
  let result = null;
  bus.emit('config:patch', patch, (r) => { result = r; });
  return result || { rejected: [], keysChanged: [], changed: false };
}

module.exports = { getConfigSnapshot, patchConfig };
