/**
 * Datos de ejemplo para la vista previa de los overlays (ver vista-previa.js).
 * Son nombres y mensajes ficticios, como el contenido de un chat real: no pasan por i18n.
 */
export const MUESTRA_CHAT = [
  { type: 'chat', platform: 'tiktok', user: 'luna_vibes', comment: 'hola a todos, que buen stream' },
  { type: 'chat', platform: 'twitch', user: 'pixel_fox', comment: 'gg, esa jugada estuvo increible' },
  { type: 'chat', platform: 'youtube', user: 'mod_carlos', comment: 'recuerden respetar las reglas del chat', isModerator: true },
  { type: 'chat', platform: 'kick', user: 'nova_star', comment: 'ya me suscribi, vamos con todo', isSubscriber: true },
  { type: 'chat', platform: 'tiktok', user: 'sam.plays', comment: 'primera vez por aqui, me encanta' },
];

const NOMBRES_RANKING = ['luna_vibes', 'pixel_fox', 'nova_star', 'sam.plays', 'kiko_gamer', 'mia.live', 'dario_tv', 'ana_rose', 'lucho99', 'zoe_music'];
const conValores = (campo, valores) => NOMBRES_RANKING.map((user, i) => ({ user, [campo]: valores[i] }));

export const MUESTRA_LIKES = conValores('totalLikes', [4820, 3910, 3275, 2140, 1688, 1204, 960, 742, 515, 388]);
export const MUESTRA_DONADORES = conValores('totalCoins', [8800, 5200, 3100, 2450, 1800, 1250, 990, 640, 420, 250]);
export const MUESTRA_VIEWERS = 1284;

// Nombres que existen en gifts/ para que la tarjeta muestre la imagen real del regalo.
export const MUESTRA_REGALOS = [
  { type: 'gift', giftName: 'Corona de TikTok', user: 'luna_vibes', repeatCount: 3 },
  { type: 'gift', giftName: 'TikTok', user: 'pixel_fox', repeatCount: 1 },
];

export const MUESTRA_ALERTAS_SOCIAL = [
  { type: 'follow', platform: 'tiktok', user: 'luna_vibes' },
  { type: 'share', platform: 'tiktok', user: 'pixel_fox' },
  { type: 'follow', platform: 'twitch', user: 'nova_star' },
  { type: 'share', platform: 'kick', user: 'sam.plays' },
];

export const MUESTRA_SEGUIDORES = { sesion: 37, base: 12400 };

export const MUESTRA_SOCIAL = {
  seguidores: ['luna_vibes', 'pixel_fox', 'nova_star', 'sam.plays', 'kiko_gamer'],
  compartidos: ['mia.live', 'dario_tv', 'ana_rose'],
};

export const MUESTRA_CREDITOS = {
  donantes: [
    { user: 'luna_vibes', giftName: 'Corona de TikTok', count: 3 },
    { user: 'pixel_fox', giftName: 'TikTok', count: 5 },
    { user: 'nova_star', giftName: 'Corona de TikTok', count: 1 },
  ],
  seguidores: [{ user: 'sam.plays' }, { user: 'kiko_gamer' }, { user: 'mia.live' }],
  compartidos: [{ user: 'dario_tv' }, { user: 'ana_rose' }],
};
