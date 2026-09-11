'use strict';

/**
 * Cachea si subscriptionsEnabled esta prendido, en vez de un bus.emit('config:get')
 * sincrono en cada uso. Compartido por features/auth/index.js y
 * core/guard-suscripcion.js (regla de modularidad: 2+ consumidores que cruzan
 * un limite de dominio -> core/<nombre>.js).
 *
 * `eager` (default true): lee la config apenas se crea el cache. Poné
 * `eager: false` si el caller corre ANTES de que features/configuracion se
 * registre y empiece a escuchar 'config:get' (ej. createApp(bus) en
 * core/app.js) — ahi la primera lectura se difiere al primer isEnabled(),
 * momento en el que todos los dominios ya estan registrados.
 */
function crearSubsEnabledCache(bus, { domain = 'core', eager = true } = {}) {
  let subsOn = false;
  let inicializado = false;
  const leerConfig = () => {
    bus.emit('config:get', (c) => { subsOn = !!(c && c.subscriptionsEnabled === true); });
    inicializado = true;
  };
  if (eager) leerConfig();
  bus.on('config:actualizado', ({ keysChanged } = {}) => {
    if (!keysChanged || keysChanged.includes('subscriptionsEnabled')) leerConfig();
  }, domain);

  return function isEnabled() {
    if (!inicializado) leerConfig();
    return subsOn;
  };
}

module.exports = { crearSubsEnabledCache };
