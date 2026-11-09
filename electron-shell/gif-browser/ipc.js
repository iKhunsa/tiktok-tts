'use strict';

const { ipcMain } = require('electron');

// Canales gifbrowser:* — mismo idioma que electron-shell/portal-view/ipc.js. Los dos ultimos
// ('textos', 'importar') los llama el selector de GIFs desde la pagina; el controlador comprueba que
// el emisor sea la pestana propia.
const CANALES_RENDERER = {
  'gifbrowser:open': (c, _e, datos) => c.abrir(datos || {}),
  'gifbrowser:bounds': (c, _e, { bounds }) => c.setBounds(bounds),
  'gifbrowser:hide': (c) => c.ocultar(),
  'gifbrowser:close': (c) => c.cerrar(),
  'gifbrowser:navigate': (c, _e, { input }) => c.navegar(input),
  'gifbrowser:back': (c) => c.atras(),
  'gifbrowser:forward': (c) => c.adelante(),
  'gifbrowser:reload': (c) => c.recargar(),
  'gifbrowser:state': (c) => c.getState(),
  'gifbrowser:textos': (c, e) => c.getTextos(e),
  'gifbrowser:importar': (c, e, datos) => c.importar(e, datos),
  'gifbrowser:volumen': (c, e, datos) => c.setVolumen(e, datos?.volumen),
};

function attachGifBrowserIpc({ controller }) {
  for (const [canal, manejar] of Object.entries(CANALES_RENDERER)) {
    ipcMain.handle(canal, (evento, datos) => manejar(controller, evento, datos));
  }
  return {
    dispose() {
      for (const canal of Object.keys(CANALES_RENDERER)) ipcMain.removeHandler(canal);
    },
  };
}

module.exports = { attachGifBrowserIpc };
