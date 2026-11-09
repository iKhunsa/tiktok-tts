import { EVENTOS_ALERTA } from '../../../../compartido/eventos-alerta.js';
import { CHATS_POR_PLATAFORMA } from '../../../../compartido/estilo/esquemas.js';

/** Los 25 overlays por categoria. Textos: overlayCat.cat.<id>.titulo|desc. */
export const CATEGORIAS = [
  { id: 'chat', icono: 'chat', color: '#2f6fed', overlays: ['chat', 'chat-tiktok', 'chat-twitch', 'chat-youtube', 'chat-kick'] },
  { id: 'seguidores', icono: 'people', color: '#7c4dff', overlays: ['social', 'nuevo-seguidor'] },
  { id: 'regalos', icono: 'card_giftcard', color: '#e6532e', overlays: ['alertas', 'donadores', 'bits', 'kicks', 'superchat', 'supersticker'] },
  { id: 'suscripciones', icono: 'card_membership', color: '#c23fb0', overlays: ['suscripcion', 'renovacion'] },
  { id: 'interacciones', icono: 'favorite', color: '#e0245e', overlays: ['likes', 'alertas-social', 'contador-likes', 'compartido'] },
  { id: 'audiencia', icono: 'groups', color: '#0e9f8a', overlays: ['viewers', 'entrada'] },
  { id: 'musica', icono: 'music_note', color: '#d48a00', overlays: ['musica'] },
  { id: 'resumen', icono: 'emoji_events', color: '#4b5563', overlays: ['creditos', 'fin-directo'] },
  { id: 'teclado', icono: 'keyboard', color: '#38bdf8', overlays: ['teclado'] },
];

export const NOMBRES_PLATAFORMA = { tiktok: 'TikTok', twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick' };

export const PLATAFORMAS_OVERLAY = {
  chat: ['tiktok', 'twitch', 'youtube', 'kick'],
  'chat-tiktok': ['tiktok'],
  'chat-twitch': ['twitch'],
  'chat-youtube': ['youtube'],
  'chat-kick': ['kick'],
  social: ['tiktok'],
  'nuevo-seguidor': ['tiktok', 'twitch', 'kick'],
  alertas: ['tiktok'],
  donadores: ['tiktok'],
  bits: ['twitch'],
  kicks: ['kick'],
  superchat: ['youtube'],
  supersticker: ['youtube'],
  suscripcion: ['twitch'],
  renovacion: ['twitch'],
  likes: ['tiktok'],
  'alertas-social': ['tiktok'],
  'contador-likes': ['tiktok'],
  compartido: ['tiktok'],
  viewers: ['tiktok'],
  entrada: ['tiktok'],
  'fin-directo': ['tiktok'],
  creditos: ['tiktok', 'twitch', 'kick'],
  musica: ['tiktok', 'twitch', 'youtube', 'kick'],
  teclado: [],
};

/** Tarjetas que se generan por JS; las otras 9 son markup estatico en index.html. */
export const OVERLAYS_GENERADOS = [
  ...Object.entries(EVENTOS_ALERTA).map(([id, { icono, pendiente }]) => ({ id, icono, pendiente: !!pendiente, medida: '440 × 130 px' })),
  { id: 'contador-likes', icono: 'favorite', pendiente: false, medida: '360 × 110 px' },
  { id: 'musica', icono: 'music_note', pendiente: false, medida: '420 × 100 px' },
  ...Object.keys(CHATS_POR_PLATAFORMA).map((id) => ({ id, icono: 'chat', pendiente: false, medida: '420 × 720 px' })),
];

export const FONDOS_DESTACADOS = [
  'center / cover no-repeat url("img/destacado-michi-metro.png"), #0b4f46',
  'center / cover no-repeat url("img/destacado-2.png"), #111',
  'center / cover no-repeat url("img/destacado-3.png"), #111',
];

/** Enlace externo por indice de FONDOS_DESTACADOS (el slide abre la web). */
export const ENLACES_DESTACADOS = {
  1: 'https://streamer.epik.click/servicios/overlays-para-twitch',
};

export const categoriaDe = (idOverlay) => CATEGORIAS.find((categoria) => categoria.overlays.includes(idOverlay));
