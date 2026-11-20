import { mostrarGuiaTemporada } from './guia.js';

let ventana = null;
let vigia = null;

/**
 * Abre la ventana de la temporada (o la enfoca si ya esta abierta). En Electron el proceso principal le da el tamano de
 * la ventana de la app sin maximizar (electron-shell/window.js); en un navegador se abre como pestana.
 */
export function abrirVentanaTemporada(temporada) {
  if (ventana && !ventana.closed) { ventana.focus(); return; }
  ventana = window.open(`/temporada.html?e=${encodeURIComponent(temporada.id)}`, `temporada-${temporada.id}`);
  // Al cerrarse (X, Esc o el sistema) la primera vez, una guia senala desde donde volver a abrirla.
  clearInterval(vigia);
  vigia = setInterval(() => {
    if (ventana && !ventana.closed) return;
    clearInterval(vigia);
    mostrarGuiaTemporada(temporada);
  }, 400);
}
