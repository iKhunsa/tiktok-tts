/**
 * Alertas de overlay-evento.html: cada una se queda con un tipo de evento del
 * WS. Las que llevan `pendiente` esperan un dato que el backend aun no manda:
 *   renovacion  -> { type: 'gift', kind: 'sub', renovacion: true } (hoy Twitch manda 'sub' sin distinguir)
 *   fin-directo -> { type: 'stream-end', platform }
 * Son datos puros: los comparten el overlay, el configurador y los tests.
 */
const usuario = 'luna_vibes';

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
  },
  kicks: {
    icono: 'monetization_on',
    coincide: (d) => d.type === 'gift' && d.kind === 'kicksgift',
    insignia: (d) => d.amount,
    muestra: { type: 'gift', kind: 'kicksgift', platform: 'kick', user: usuario, amount: 100 },
  },
  superchat: {
    icono: 'attach_money',
    coincide: (d) => d.type === 'superchat' && !d.sticker,
    insignia: (d) => d.amount,
    muestra: { type: 'superchat', platform: 'youtube', user: usuario, amount: '$10.00' },
  },
  supersticker: {
    icono: 'sticky_note_2',
    coincide: (d) => d.type === 'superchat' && !!d.sticker,
    insignia: (d) => d.amount,
    muestra: { type: 'superchat', platform: 'youtube', user: usuario, amount: '$5.00', sticker: '/gifts/001_Rosa.png' },
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
