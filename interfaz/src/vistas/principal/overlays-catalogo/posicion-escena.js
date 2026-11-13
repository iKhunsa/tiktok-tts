import { appSettings } from '../../../nucleo/estado/ajustes-app.js';

// Mientras el editor de canvas esta abierto, TODO ajuste de una capa (color, skin, texto, posicion, tamano...) es
// propio de la escena activa, no global: asi cada escena puede ser unica sin pisar como se ve ese overlay en las
// demas escenas ni en su tarjeta individual (fuera del editor, sin escena activa, sigue yendo al ajuste global).
let gancho = null; // { leer(id) => overrides|undefined, guardar(id, parcial) }: lo presta el editor de canvas mientras esta abierto.
export const usarAjustesPropios = (g) => { gancho = g; };

/** Valor de un campo tal como se usa ahora: el de la escena activa si el editor esta abierto, si no el global. */
export function valorOverlay(id, clave) {
  const propio = gancho?.leer(id);
  return propio && clave in propio ? propio[clave] : appSettings.overlays[id][clave];
}

/** Guarda un campo: con el editor abierto va a la escena activa; si no, al ajuste global de siempre. */
export function fijarValorOverlay(id, clave, valor) {
  if (gancho) gancho.guardar(id, { [clave]: valor });
  else appSettings.overlays[id][clave] = valor;
}

/** Objeto completo "tal como se ve ahora": el global con los overrides de la escena activa encima. */
export function ajustesOverlay(id) {
  const propio = gancho?.leer(id);
  return propio ? { ...appSettings.overlays[id], ...propio } : appSettings.overlays[id];
}
