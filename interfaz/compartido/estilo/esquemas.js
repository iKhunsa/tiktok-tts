import { camposAnimacion, camposChat } from './campos-chat.js';
import { camposRanking } from './campos-ranking.js';
import { camposOverlayFijo } from './campos-overlay-fijo.js';
import { camposMusica } from './campos-musica.js';
import { valoresPorDefecto } from './query.js';
import { EVENTOS_ALERTA } from '../eventos-alerta.js';

const colorAcento = { clave: 'color', param: 'color', tipo: 'color', def: '#FFBB00', etiqueta: 'colorAcento', grupo: 'base' };
const opacidadFondo = (def) => ({ clave: 'bg', param: 'bg', tipo: 'numero', def, min: 0.3, max: 1, step: 0.05, ui: 'rango', porcentaje: true, etiqueta: 'opacidadFondo', grupo: 'base' });
// Las alertas entran desde arriba y salen hacia arriba, como hacian antes de poder elegirlo.
const ANIMACION_ALERTA = camposAnimacion({ entrada: 'slide-down', salida: 'sale-arriba', msEntrada: 350, msSalida: 300 });
// Icono del evento o foto de quien lo dispara, con el icono en la esquina. `icono` nombra la primera opcion.
const campoImagenAlerta = (icono) => ({ clave: 'imagenAlerta', param: 'img', tipo: 'opcion', def: icono, opciones: [icono, 'perfil'], opcionesTraducidas: [icono, 'perfil'], ui: 'botones', grupo: 'base' });
const esquemaAlerta = ({ duracion = 4000 }) => [
  { clave: 'dur', param: 'dur', tipo: 'numero', def: duracion, min: 1000, max: 12000, step: 500, segundos: true, etiqueta: 'duracion', grupo: 'base' },
  campoImagenAlerta('icono'),
  colorAcento,
  opacidadFondo(0.9),
  ...camposOverlayFijo({ texto: true }),
  ...ANIMACION_ALERTA,
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
const BASE = {
  chat: camposChat(),
  likes: camposRanking({ colorValor: '#ffffff' }),
  donadores: camposRanking({ colorValor: '#ffd23f' }),
  seguidores: [
    { clave: 'goal', param: 'goal', tipo: 'texto', def: '', etiqueta: 'meta', grupo: 'base' },
    colorAcento,
    opacidadFondo(0.8),
    ...camposOverlayFijo({ texto: false }),
  ],
  viewers: [
    { ...colorAcento, def: '#F0213A' },
    opacidadFondo(0.8),
    ...camposOverlayFijo({ texto: false }),
  ],
  alertas: [
    { clave: 'dur', param: 'dur', tipo: 'numero', def: 4000, min: 1000, max: 12000, step: 500, segundos: true, etiqueta: 'duracion', grupo: 'base' },
    campoImagenAlerta('regalo'),
    colorAcento,
    opacidadFondo(0.9),
    ...camposOverlayFijo({ texto: true }),
    ...ANIMACION_ALERTA,
  ],
  creditos: [
    { clave: 'speed', param: 'speed', tipo: 'numero', def: 40, min: 10, max: 120, step: 5, etiqueta: 'vueltaCreditos', grupo: 'base' },
    colorAcento,
    opacidadFondo(0.85),
    ...camposOverlayFijo({ texto: true }),
  ],
  social: [
    { clave: 'layout', param: 'layout', tipo: 'opcion', def: 'cols', opciones: ['cols', 'rows'], opcionesTraducidas: ['cols', 'rows'], etiqueta: 'disposicion', grupo: 'base' },
    colorAcento,
    opacidadFondo(0.8),
    ...camposOverlayFijo({ texto: true }),
  ],
  'alertas-social': [campoImagenAlerta('icono'), colorAcento, opacidadFondo(0.9), ...camposOverlayFijo({ texto: true }), ...ANIMACION_ALERTA],
  'contador-likes': [{ ...colorAcento, def: '#FE2C55' }, opacidadFondo(0.8), ...camposOverlayFijo({ texto: false })],
  musica: [colorAcento, opacidadFondo(0.9), ...camposMusica(camposOverlayFijo({ texto: true }))],
  ...Object.fromEntries(Object.keys(CHATS_POR_PLATAFORMA).map((id) => [id, camposChatFijo()])),
  ...Object.fromEntries(Object.entries(EVENTOS_ALERTA).map(([id, alerta]) => [id, esquemaAlerta(alerta)])),
};

/**
 * Overlays que pueden mostrar un .epik (tienen anfitrion en compartido/epik/anfitrion-<familia>.js):
 * su skin acepta `epik:<id>`. Las familias que se pueden importar las decide el servidor (features/epik/);
 * test/epik-familias.test.js vigila que las dos listas coincidan.
 */
const CON_EPIK = new Set([
  'musica', 'likes', 'donadores', 'seguidores', 'viewers', 'contador-likes',
  'alertas', 'alertas-social', ...Object.keys(EVENTOS_ALERTA),
  'chat', ...Object.keys(CHATS_POR_PLATAFORMA),
  'creditos', 'social',
]);
const conEpik = (esquema) => esquema.map((campo) => (campo.clave === 'skin' ? { ...campo, aceptaEpik: true } : campo));

export const ESQUEMAS = Object.fromEntries(Object.entries(BASE).map(([id, esquema]) => [id, CON_EPIK.has(id) ? conEpik(esquema) : esquema]));

/** Defaults de cada overlay, derivados del esquema (nadie los repite a mano). */
export const DEFAULTS_OVERLAYS = Object.fromEntries(
  Object.entries(ESQUEMAS).map(([tipo, esquema]) => [tipo, valoresPorDefecto(esquema)]),
);
