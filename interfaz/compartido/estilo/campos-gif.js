import { camposMover } from './campos-alineacion.js';
import { construirQuery, valoresPorDefecto } from './query.js';

/**
 * Esquema de una capa GIF del editor de canvas: un GIF o foto libre (overlay-gif.html). Cada GIF de la
 * biblioteca es su propia capa, con id `gif:<id del GIF>`; su `src` viaja aparte (no es un ajuste).
 * Tamano es una fraccion del ancho de la fuente de OBS (1 = 20 %), asi se ve igual en cualquier resolucion.
 */
export const ESQUEMA_GIF = [
  { clave: 'escala', param: 'zoom', tipo: 'numero', def: 1, min: 0.1, max: 2, step: 0.05, ui: 'rango', porcentaje: true, grupo: 'base' },
  { clave: 'opacidad', param: 'op', tipo: 'numero', def: 1, min: 0.1, max: 1, step: 0.05, ui: 'rango', porcentaje: true, etiqueta: 'opacidadFondo', grupo: 'base' },
  ...camposMover(),
];

export const DEFAULTS_GIF = valoresPorDefecto(ESQUEMA_GIF);

/** Las capas GIF se llaman `gif:<id del GIF>`; el id sale del servidor, asi que se acepta solo lo que parece uno. */
export const esCapaGif = (id) => typeof id === 'string' && /^gif:[a-z0-9-]{1,32}$/i.test(id);

/** URL de la fuente de navegador de OBS de una capa GIF: el `src` va aparte, no es un ajuste. */
export function urlCapaGif(origen, cfg) {
  const query = construirQuery(ESQUEMA_GIF, cfg);
  return `${origen}/overlay-gif.html?src=${encodeURIComponent(cfg.src)}${query ? `&${query}` : ''}`;
}
