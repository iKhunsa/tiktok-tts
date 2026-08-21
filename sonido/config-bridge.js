'use strict';

// /sonido no importa /configuracion directo — lee/escribe via el contrato
// sincrono del bus (config:get / config:patch, Fase 2).

function getConfigSnapshot(bus) {
  let snapshot = null;
  bus.emit('config:get', (config) => { snapshot = config; });
  return snapshot || {};
}

function patchConfig(bus, patch) {
  let result = null;
  bus.emit('config:patch', patch, (r) => { result = r; });
  return result || { rejected: [], keysChanged: [], changed: false };
}

module.exports = { getConfigSnapshot, patchConfig };
