import { camposChat } from './campos-chat.js';
import { camposRanking } from './campos-ranking.js';
import { valoresPorDefecto } from './query.js';
import { EVENTOS_ALERTA } from '../eventos-alerta.js';

const colorAcento = { clave: 'color', param: 'color', tipo: 'color', def: '#FFBB00', etiqueta: 'colorAcento', grupo: 'base' };
const opacidadFondo = (def) => ({ clave: 'bg', param: 'bg', tipo: 'numero', def, min: 0.3, max: 1, step: 0.05, ui: 'rango', porcentaje: true, etiqueta: 'opacidadFondo', grupo: 'base' });
const esquemaAlerta = ({ duracion = 4000 }) => [
  { clave: 'dur', param: 'dur', tipo: 'numero', def: duracion, min: 1000, max: 12000, step: 500, etiqueta: 'duracion', grupo: 'base' },
  colorAcento,
  opacidadFondo(0.9),
];

/** Chats de una sola plataforma: misma pagina que el unificado, con la plataforma fija en la URL. */
export const CHATS_POR_PLATAFORMA = {
  'chat-tiktok': 'tiktok',
  'chat-twitch': 'twitch',
  'chat-youtube': 'youtube',
  'chat-kick': 'kick',
};
const camposChatFijo = () => camposChat().filter((campo) => campo.tipo !== 'plataformas');

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
  viewers: [
    { ...colorAcento, def: '#F0213A' },
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
  'contador-likes': [colorAcento, opacidadFondo(0.8)],
  ...Object.fromEntries(Object.keys(CHATS_POR_PLATAFORMA).map((id) => [id, camposChatFijo()])),
  ...Object.fromEntries(Object.entries(EVENTOS_ALERTA).map(([id, alerta]) => [id, esquemaAlerta(alerta)])),
};

/** Defaults de cada overlay, derivados del esquema (nadie los repite a mano). */
export const DEFAULTS_OVERLAYS = Object.fromEntries(
  Object.entries(ESQUEMAS).map(([tipo, esquema]) => [tipo, valoresPorDefecto(esquema)]),
);
