const CLAVE = 'eventoForzado';

/**
 * `?evento=<id>` fuerza un evento para probarlo. Se recuerda mientras la ventana siga abierta: el logo de la barra
 * lateral navega a "/" y, sin esto, recargar despues ya no lo mostraba.
 */
export function eventoDePrueba() {
  const pedido = new URLSearchParams(window.location.search).get('evento');
  if (pedido) window.sessionStorage.setItem(CLAVE, pedido);
  return pedido || window.sessionStorage.getItem(CLAVE);
}
