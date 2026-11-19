import { DEFAULTS_OVERLAYS } from '../../../../compartido/estilo/esquemas.js';
import { DEFAULTS_GIF, esCapaGif } from '../../../../compartido/estilo/campos-gif.js';
import { appSettings } from '../../../nucleo/estado/ajustes-app.js';

// Adaptador del inspector compartido: las escenas tienen ajustes completos, nunca heredan el catalogo.
let gancho = null;
export const usarAjustesPropios = (g) => { gancho = g; };
export const editandoEscena = () => gancho !== null;
const global = (id) => esCapaGif(id) ? appSettings.capasGif[id] : appSettings.overlays[id];

export function ajustesOverlay(id) {
  if (!gancho) return global(id);
  if (!gancho.leer(id)) gancho.guardar(id, globalThis.structuredClone(esCapaGif(id) ? { ...DEFAULTS_GIF, ...global(id) } : DEFAULTS_OVERLAYS[id]));
  return gancho.leer(id);
}

export const valorOverlay = (id, clave) => ajustesOverlay(id)?.[clave];

export function fijarValorOverlay(id, clave, valor) {
  if (gancho) gancho.guardar(id, { ...ajustesOverlay(id), [clave]: valor });
  else global(id)[clave] = valor;
}
