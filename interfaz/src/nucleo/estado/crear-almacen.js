/**
 * Mini-store generico, sin dependencias externas ni framework. Cada almacen
 * del nucleo (config, plataformas, etc.) se construye con crearAlmacen() y
 * expone getState/setState/subscribe. Los modulos de render/ y los overlays
 * vanilla se suscriben directo, sin pasar por ningun gancho de framework.
 *
 * @template T
 * @param {T} estadoInicial
 */
export function crearAlmacen(estadoInicial) {
  let estado = estadoInicial;
  const listeners = new Set();

  function getState() {
    return estado;
  }

  function setState(parcial) {
    const siguiente = typeof parcial === 'function' ? parcial(estado) : parcial;
    estado = { ...estado, ...siguiente };
    for (const listener of listeners) listener(estado);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}
