'use strict';

const { openExternalSafe } = require('../open-external');

// setWindowOpenHandler + will-navigate para el webContents de una pestana de
// PortalView. http(s) -> pide una tab interna nueva (el caller decide si hay
// cupo, via onRequestNewTab); cualquier otro esquema (mailto:, tel:, custom
// schemes) -> navegador externo del sistema. Nunca se ejecuta con privilegios
// de la app — mismo criterio que la ventana de checkout de Polar en
// electron-shell/window.js.
function attachPopupHandling(webContents, { onRequestNewTab }) {
  webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) onRequestNewTab(url);
    else openExternalSafe(url);
    return { action: 'deny' };
  });

  // Defensa en profundidad: la propia pagina (o un redirect) intentando
  // navegar el top-level de la pestana a un esquema peligroso (javascript:,
  // file:, etc.) tambien va al negador — nunca bloquea navegacion http(s)
  // normal dentro de la misma pestana.
  webContents.on('will-navigate', (event, url) => {
    if (!isHttpUrl(url)) {
      event.preventDefault();
      openExternalSafe(url);
    }
  });
}

function isHttpUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch (_) {
    return false;
  }
}

module.exports = { attachPopupHandling };
