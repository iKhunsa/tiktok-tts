import { camposChat } from './campos-chat.js';
import { camposRanking } from './campos-ranking.js';
import { valoresPorDefecto } from './query.js';

const colorAcento = { clave: 'color', param: 'color', tipo: 'color', def: '#FFBB00', grupo: 'base' };
const opacidadFondo = (def) => ({ clave: 'bg', param: 'bg', tipo: 'numero', def, min: 0.3, max: 1, step: 0.05, ui: 'rango', grupo: 'base' });

/**
 * Esquema de cada overlay: unica fuente de sus campos, defaults y nombres de
 * param en la URL. Los overlays de ajustes simples (los 5 de abajo) se
 * describen igual para compartir construirQuery()/leerConfig().
 */
export const ESQUEMAS = {
  chat: camposChat(),
  likes: camposRanking({ colorValor: '#ffffff' }),
  donadores: camposRanking({ colorValor: '#ffd23f' }),
  seguidores: [
    { clave: 'goal', param: 'goal', tipo: 'texto', def: '', grupo: 'base' },
    colorAcento,
    opacidadFondo(0.8),
  ],
  alertas: [
    { clave: 'dur', param: 'dur', tipo: 'numero', def: 4000, grupo: 'base' },
    colorAcento,
    opacidadFondo(0.9),
  ],
  creditos: [
    { clave: 'speed', param: 'speed', tipo: 'numero', def: 40, grupo: 'base' },
    colorAcento,
    opacidadFondo(0.85),
  ],
  social: [
    { clave: 'layout', param: 'layout', tipo: 'texto', def: 'cols', grupo: 'base' },
    colorAcento,
    opacidadFondo(0.8),
  ],
  'alertas-social': [colorAcento, opacidadFondo(0.9)],
};

/** Defaults de cada overlay, derivados del esquema (nadie los repite a mano). */
export const DEFAULTS_OVERLAYS = Object.fromEntries(
  Object.entries(ESQUEMAS).map(([tipo, esquema]) => [tipo, valoresPorDefecto(esquema)]),
);
