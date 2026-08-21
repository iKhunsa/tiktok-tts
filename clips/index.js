'use strict';

const obsReplayContract = require('../core/contracts/obs-replay');
const { markClip } = require('./mark-clip');

module.exports = {
  name: 'clips',

  register({ bus, logger }) {
    // Clips no conoce el protocolo OBS WS — solo pide "guarda replay" via el
    // contrato sincrono inyectado por /canales (Fase 6); necesita saber
    // exito/fallo porque el usuario percibe el fallo desde el atajo de
    // teclado, no desde OBS internamente.
    bus.on('clips:marcar', (payload) => {
      const origen = (payload && payload.origen) || 'desconocido';
      try {
        obsReplayContract.saveReplay();
        logger.log(
          'info', 'clips', 'clips/index.js#register', 'clips.marcado.exitoso',
          `Clip marcado exitosamente (origen: ${origen})`, { origen }
        );
      } catch (error) {
        logger.log(
          'error', 'clips', 'clips/index.js#register', 'clips.marcado.fallido',
          `No se pudo marcar el clip (origen: ${origen}): ${error.message}`, { origen, error: error.message, stack: error.stack }
        );
      }
    }, 'clips');

    // Comando movil markClip (Fase 8) dispara el mismo flujo.
    bus.on('movil:comando', (cmd) => {
      if (!cmd || cmd.action !== 'markClip') return;
      markClip({ bus, logger }, 'mobile');
    }, 'clips');

    return { rutas: 0, listeners: 2 };
  },
};
