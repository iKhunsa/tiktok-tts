'use strict';

/**
 * Interfaz del contrato sincrono/async inyectado por main.js (proceso
 * Electron) para que /canales pueda abrir/cerrar la ventana oculta de
 * captura de Kick sin importar nada de electron-shell/ directo (regla dura:
 * un dominio nunca importa el modulo interno de otro). Analogo a
 * obs-replay.js y moderacion-policy.js. Lanza si se llama antes de que
 * main.js lo inyecte.
 */
const kickBrowserContract = {
  openCapture: (_slug) => {
    throw new Error('kickBrowser.openCapture no implementado todavia (se inyecta desde main.js)');
  },
  closeCapture: (_slug) => {
    throw new Error('kickBrowser.closeCapture no implementado todavia (se inyecta desde main.js)');
  },
  closeAll: () => {
    throw new Error('kickBrowser.closeAll no implementado todavia (se inyecta desde main.js)');
  },
};

module.exports = kickBrowserContract;
