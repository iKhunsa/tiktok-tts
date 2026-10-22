/**
 * Esc cierra el popup de arriba de todo igual que su X: hace click en el boton
 * de cerrar del ultimo .modal-overlay.show visible. Los popups sin X (selector
 * de idioma) no se tocan: son obligatorios a proposito.
 *
 * Se anota el popup en captura y se cierra en burbuja: si un handler propio ya
 * lo cerro o freno el evento (ej. Esc que limpia un buscador), no se hace nada
 * y nunca se cierran dos popups apilados con un solo Esc.
 */
const CERRAR = '.modal-close, .mc-cerrar';

// El orden del DOM no es el visual (los popups estaticos van antes que los que
// se crean al vuelo): manda lo que el usuario ve encima en el centro de la ventana.
function popupDeArriba() {
  const encima = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.closest('.modal-overlay.show');
  if (encima) return encima;
  const abiertos = [...document.querySelectorAll('.modal-overlay.show')].filter((el) => window.getComputedStyle(el).display !== 'none');
  return abiertos.at(-1) || null;
}

export function iniciarCerrarConEscape() {
  let objetivo = null;
  window.addEventListener('keydown', (e) => {
    objetivo = e.key === 'Escape' ? popupDeArriba() : null;
  }, true);
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !objetivo) return;
    const popup = objetivo;
    objetivo = null;
    if (!popup.isConnected || !popup.classList.contains('show')) return;
    popup.querySelector(CERRAR)?.click();
  });
}
