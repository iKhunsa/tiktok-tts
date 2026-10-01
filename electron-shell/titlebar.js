'use strict';

// Alto de la barra de título propia. Tiene que coincidir con --titlebar-h en
// interfaz/src/estilos/index-legacy.css (el HTML la dibuja, Electron solo
// pinta los botones nativos min/max/cerrar encima, a su derecha).
const TITLEBAR_HEIGHT_PX = 36;

// Mismos valores que --bg y --text-secondary de la UI.
const TITLEBAR_OVERLAY = { color: '#171717', symbolColor: '#b4b4b4', height: TITLEBAR_HEIGHT_PX };

// Con un modal abierto el scrim (rgba(0,0,0,.8)) no alcanza a los botones
// nativos: se pintan por encima de la página. Se les baja el contraste a mano
// para que se mezclen con el fondo oscurecido: bg al 20% de brillo.
const TITLEBAR_OVERLAY_DIMMED = { color: '#050505', symbolColor: '#2e2e2e', height: TITLEBAR_HEIGHT_PX };

const TITLEBAR_WINDOW_OPTIONS = { titleBarStyle: 'hidden', titleBarOverlay: TITLEBAR_OVERLAY };

module.exports = { TITLEBAR_HEIGHT_PX, TITLEBAR_OVERLAY, TITLEBAR_OVERLAY_DIMMED, TITLEBAR_WINDOW_OPTIONS };
