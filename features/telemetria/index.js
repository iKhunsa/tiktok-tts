'use strict';

// Registro del dominio: engancha los conectores al bus (Fase 1) de una vez,
// aunque la telemetria todavia no este inicializada — track() es un no-op
// barato mientras runtime.enabled sea false, asi que enganchar temprano es
// seguro y evita que /electron-shell tenga que coordinar el orden.
const { track, creatorCache, markPlatform, platformsUsed } = require('./runtime');
const connectors = require('./connectors');

module.exports = {
  name: 'telemetria',

  register({ bus, logger }) {
    let attached = 0;
    for (const connector of connectors) {
      try {
        connector.attach(bus, track, { creatorCache, platformsUsed, markPlatform });
        attached++;
      } catch (error) {
        logger.log(
          'error', 'telemetria', 'telemetria/index.js#register', 'telemetria.conector.enganche_fallido',
          `Conector ${connector.name} fallo al engancharse: ${error.message}`, { conector: connector.name, error: error.message, stack: error.stack }
        );
      }
    }
    return { rutas: 0, listeners: attached };
  },
};
