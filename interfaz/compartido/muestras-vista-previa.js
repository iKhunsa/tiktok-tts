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
  { type: 'chat', platform: 'twitch', user: 'kiko_gamer', comment: 'llevo toda la semana esperando este directo, ojala hoy juegues hasta tarde porque manana no trabajo' },
  { type: 'chat', platform: 'youtube', user: 'mia.live', comment: 'te sigo desde hace casi dos anos y solo queria darte las gracias por todo lo que haces, tus directos me acompanan cuando vuelvo del trabajo, conoci gente increible en esta comunidad y cada vez que te veo mejorar me dan ganas de seguir intentando mis propias cosas' },
];

const NOMBRES_RANKING = ['luna_vibes', 'pixel_fox', 'nova_star', 'sam.plays', 'kiko_gamer', 'mia.live', 'dario_tv', 'ana_rose', 'lucho99', 'zoe_music'];
const conValores = (campo, valores) => NOMBRES_RANKING.map((user, i) => ({ user, [campo]: valores[i] }));

export const MUESTRA_LIKES = conValores('totalLikes', [4820, 3910, 3275, 2140, 1688, 1204, 960, 742, 515, 388]);
export const MUESTRA_DONADORES = conValores('totalCoins', [8800, 5200, 3100, 2450, 1800, 1250, 990, 640, 420, 250]);
export const MUESTRA_VIEWERS = 1284;

// Las alertas se muestran fijas (una sola tarjeta) solo como guia visual en la vista previa.
// El nombre del regalo existe en gifts/ para que salga su imagen real.
export const MUESTRA_REGALO = { type: 'gift', giftName: 'Corona de TikTok', user: 'luna_vibes', repeatCount: 3 };
export const MUESTRA_ALERTA_SOCIAL = { type: 'follow', platform: 'tiktok', user: 'luna_vibes' };

export const MUESTRA_MUSICA = { title: 'Bohemian Rhapsody', channelName: 'Queen', requestedBy: 'luna_vibes' };

export const MUESTRA_SEGUIDORES = { sesion: 37, base: 12400 };

export const MUESTRA_SOCIAL = {
  seguidores: ['luna_vibes', 'pixel_fox', 'nova_star', 'sam.plays', 'kiko_gamer'],
  compartidos: ['mia.live', 'dario_tv', 'ana_rose'],
  plataformas: [null, 'twitch', 'kick', 'youtube', null],
};

export const MUESTRA_CREDITOS = {
  donantes: [
    { user: 'luna_vibes', giftName: 'Corona de TikTok', count: 3 },
    { user: 'pixel_fox', giftName: 'TikTok', count: 5 },
    { user: 'nova_star', giftName: 'Corona de TikTok', count: 1 },
  ],
  donantesPlataformas: [
    { user: 'kiko_gamer', giftName: 'cheer', kind: 'cheer', platform: 'twitch', amount: 500, count: 1 },
    { user: 'mia.live', giftName: 'kicksgift', kind: 'kicksgift', platform: 'kick', amount: 100, count: 1 },
  ],
  seguidores: [{ user: 'sam.plays' }, { user: 'kiko_gamer', platform: 'twitch' }, { user: 'mia.live', platform: 'kick' }],
  compartidos: [{ user: 'dario_tv' }, { user: 'ana_rose' }],
};
