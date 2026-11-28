import { get, set } from './datos-por-cuenta.js';

// Overlays comprados en la ventana de temporada, por cuenta. `COMPRADOS` es el historial; `POR_APLICAR` es la cola que la
// ventana principal recoge para sumarlos a las favoritas (ella es la unica que escribe los ajustes).
const COMPRADOS = 'overlaysComprados';
export const CLAVE_POR_APLICAR = 'overlaysPorAplicar';

function leer(clave) {
  try {
    const lista = JSON.parse(get(clave));
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}
const anadir = (clave, skin) => set(clave, JSON.stringify([...new Set([...leer(clave), skin])]));

export const overlayComprado = (skin) => leer(COMPRADOS).includes(skin);
export const hayComprasPorAplicar = () => leer(CLAVE_POR_APLICAR).length > 0;

export function anotarCompra(skin) {
  anadir(COMPRADOS, skin);
  anadir(CLAVE_POR_APLICAR, skin);
}

/** Entrega la cola y la vacia. */
export function tomarComprasPorAplicar() {
  const compras = leer(CLAVE_POR_APLICAR);
  if (compras.length) set(CLAVE_POR_APLICAR, '[]');
  return compras;
}
