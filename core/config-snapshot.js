'use strict';

// Lee la config actual del dominio /configuracion via bus (sincrono: el
// listener responde inline). Antes estaba copiado en 5 dominios.
function getConfigSnapshot(bus) {
  let snapshot = null;
  bus.emit('config:get', (config) => { snapshot = config; });
  return snapshot || {};
}

module.exports = { getConfigSnapshot };
