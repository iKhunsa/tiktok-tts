import { EVENTOS_ALERTA } from '../../../../compartido/eventos-alerta.js';
import { CHATS_POR_PLATAFORMA } from '../../../../compartido/estilo/esquemas.js';

/** Los 24 overlays por categoria. Textos: overlayCat.cat.<id>.titulo|desc. */
export const CATEGORIAS = [
  { id: 'chat', icono: 'chat', color: '#2f6fed', overlays: ['chat', 'chat-tiktok', 'chat-twitch', 'chat-youtube', 'chat-kick'] },
  { id: 'seguidores', icono: 'people', color: '#7c4dff', overlays: ['seguidores', 'social', 'nuevo-seguidor'] },
  { id: 'regalos', icono: 'card_giftcard', color: '#e6532e', overlays: ['alertas', 'donadores', 'bits', 'kicks', 'superchat', 'supersticker'] },
  { id: 'suscripciones', icono: 'card_membership', color: '#c23fb0', overlays: ['suscripcion', 'renovacion'] },
  { id: 'interacciones', icono: 'favorite', color: '#e0245e', overlays: ['likes', 'alertas-social', 'contador-likes', 'compartido'] },
  { id: 'audiencia', icono: 'groups', color: '#0e9f8a', overlays: ['viewers', 'entrada'] },
  { id: 'estado', icono: 'live_tv', color: '#d48a00', overlays: ['fin-directo'] },
  { id: 'resumen', icono: 'emoji_events', color: '#4b5563', overlays: ['creditos'] },
];

export const NOMBRES_PLATAFORMA = { tiktok: 'TikTok', twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick' };

export const PLATAFORMAS_OVERLAY = {
  chat: ['tiktok', 'twitch', 'youtube', 'kick'],
  'chat-tiktok': ['tiktok'],
  'chat-twitch': ['twitch'],
  'chat-youtube': ['youtube'],
  'chat-kick': ['kick'],
  seguidores: ['tiktok', 'twitch', 'kick'],
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
};

/** Tarjetas que se generan por JS; las otras 9 son markup estatico en index.html. */
export const OVERLAYS_GENERADOS = [
  ...Object.entries(EVENTOS_ALERTA).map(([id, { icono, pendiente }]) => ({ id, icono, pendiente: !!pendiente, medida: '440 × 130 px' })),
  { id: 'contador-likes', icono: 'favorite', pendiente: false, medida: '200 × 150 px' },
  ...Object.entries(CHATS_POR_PLATAFORMA).map(([id, plataforma]) => ({ id, icono: `${plataforma}-logo`, pendiente: false, personalizable: true, medida: '420 × 720 px' })),
];

export const FONDOS_DESTACADOS = [
  'linear-gradient(120deg, #173a8f, #2f6fed 55%, #58a6ff)',
  'linear-gradient(120deg, #7a1f10, #e6532e 55%, #ffb057)',
  'linear-gradient(120deg, #36207f, #7c4dff 55%, #c79bff)',
  'linear-gradient(120deg, #6d4a00, #d48a00 55%, #ffd23f)',
  'linear-gradient(120deg, #0b4f46, #0e9f8a 55%, #63e0c6)',
];

export const categoriaDe = (idOverlay) => CATEGORIAS.find((categoria) => categoria.overlays.includes(idOverlay));
