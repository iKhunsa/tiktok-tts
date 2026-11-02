/**
 * Alertas de overlay-evento.html: cada una se queda con un tipo de evento del
 * WS. Las que llevan `pendiente` esperan un dato que el backend aun no manda:
 *   renovacion  -> { type: 'gift', kind: 'sub', renovacion: true } (hoy Twitch manda 'sub' sin distinguir)
 *   fin-directo -> { type: 'stream-end', platform }
 * Son datos puros: los comparten el overlay, el configurador y los tests.
 */
import { NIVELES_CHEER, NIVELES_KICKS } from './recurso-plataforma.js';

const usuario = 'luna_vibes';

// Niveles que el configurador deja probar en la vista previa (`muestras`; `inicial` es el de `muestra`).
// Super Chat: bandas de color de YouTube. En directo el color lo envia YouTube con cada evento.
const NIVELES_SUPER_CHAT = [
  { etiqueta: '$1', amount: '$1.00', color: '#1565C0' },
  { etiqueta: '$2', amount: '$2.00', color: '#00B8D4' },
  { etiqueta: '$5', amount: '$5.00', color: '#00BFA5' },
  { etiqueta: '$10', amount: '$10.00', color: '#FFB300' },
  { etiqueta: '$20', amount: '$20.00', color: '#E65100' },
  { etiqueta: '$50', amount: '$50.00', color: '#C2185B' },
  { etiqueta: '$100', amount: '$100.00', color: '#D00000' },
];
const porCantidad = (cantidades) => cantidades.map((amount) => ({ etiqueta: String(amount), amount }));

export const EVENTOS_ALERTA = {
  'nuevo-seguidor': {
    icono: 'person_add',
    coincide: (d) => d.type === 'follow',
    muestra: { type: 'follow', platform: 'tiktok', user: usuario },
  },
  compartido: {
    icono: 'share',
    coincide: (d) => d.type === 'share',
    muestra: { type: 'share', platform: 'tiktok', user: usuario },
  },
  entrada: {
    icono: 'login',
    duracion: 2500,
    maxPendientes: 3, // en un directo grande entran decenas por segundo: la cola no puede crecer sin fin
    coincide: (d) => d.type === 'join',
    muestra: { type: 'join', platform: 'tiktok', user: usuario },
  },
  bits: {
    icono: 'flash_on',
    coincide: (d) => d.type === 'gift' && d.kind === 'cheer',
    insignia: (d) => d.amount,
    muestra: { type: 'gift', kind: 'cheer', platform: 'twitch', user: usuario, amount: 500 },
    muestras: porCantidad(NIVELES_CHEER),
    inicial: 1,
  },
  kicks: {
    icono: 'monetization_on',
    coincide: (d) => d.type === 'gift' && d.kind === 'kicksgift',
    insignia: (d) => d.amount,
    muestra: { type: 'gift', kind: 'kicksgift', platform: 'kick', user: usuario, amount: 100 },
    muestras: porCantidad(NIVELES_KICKS),
    inicial: NIVELES_KICKS.indexOf(100),
  },
  superchat: {
    icono: 'attach_money',
    coincide: (d) => d.type === 'superchat' && !d.sticker,
    insignia: (d) => d.amount,
    muestra: { type: 'superchat', platform: 'youtube', user: usuario, amount: '$10.00', color: '#FFB300' },
    muestras: NIVELES_SUPER_CHAT,
    inicial: 3,
  },
  supersticker: {
    icono: 'sticky_note_2',
    coincide: (d) => d.type === 'superchat' && !!d.sticker,
    insignia: (d) => d.amount,
    muestra: { type: 'superchat', platform: 'youtube', user: usuario, amount: '$5.00', color: '#00BFA5', sticker: 'icons/youtube-logo.svg' },
    muestras: NIVELES_SUPER_CHAT,
    inicial: 2,
  },
  suscripcion: {
    icono: 'card_membership',
    coincide: (d) => d.type === 'gift' && d.kind === 'sub' && !d.renovacion,
    muestra: { type: 'gift', kind: 'sub', platform: 'twitch', user: usuario },
  },
  renovacion: {
    icono: 'autorenew',
    pendiente: true,
    coincide: (d) => d.type === 'gift' && d.kind === 'sub' && d.renovacion === true,
    muestra: { type: 'gift', kind: 'sub', renovacion: true, platform: 'twitch', user: usuario },
  },
  'fin-directo': {
    icono: 'tv_off',
    pendiente: true,
    sinUsuario: true,
    coincide: (d) => d.type === 'stream-end',
    muestra: { type: 'stream-end', platform: 'tiktok' },
  },
};
