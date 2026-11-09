// Dónde está el usuario en la app (vista, editor de canvas, sección, capa, escena, página del buscador de GIF).
// Se guarda en cada cambio, en sessionStorage: sobrevive a cualquier recarga de la ventana (botón de la barra,
// Ctrl+R) pero no al cierre de la app, que siempre arranca en el chat. Es estado de interfaz, no de la cuenta.
const CLAVE = 'tikliveTTS_estadoUi';

export function leerEstadoUi() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE)) || {}; } catch (_) { return {}; }
}

/** Mezcla `parcial` con lo ya guardado. Sin sessionStorage disponible no hace nada. */
export function guardarEstadoUi(parcial) {
  try { sessionStorage.setItem(CLAVE, JSON.stringify({ ...leerEstadoUi(), ...parcial })); } catch (_) { /* best-effort */ }
}
