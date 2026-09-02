/**
 * Fuente unica de los defaults de cada overlay. Antes vivian triplicados:
 * DEFAULT_SETTINGS.overlays en index.html, las comparaciones de omision en
 * buildOverlayUrl(), y el :root de cada overlay-*.html por separado.
 * Ahora el configurador de index.html y cada overlay importan de aca.
 */
export const DEFAULTS_OVERLAYS = {
  seguidores: { goal: '', color: '#FFBB00', bg: 0.80, bgimg: '' },
  likes: { rows: 10, color: '#FFBB00', bg: 0.80, bgimg: '' },
  alertas: { dur: 4000, color: '#FFBB00', bg: 0.90, bgimg: '' },
  creditos: { speed: 40, color: '#FFBB00', bg: 0.85, bgimg: '' },
  social: { layout: 'cols', color: '#FFBB00', bg: 0.80, bgimg: '' },
  'alertas-social': { color: '#FFBB00', bg: 0.90, bgimg: '' },
  chat: {
    color: '#FFBB00',
    bg: 0.82,
    bgimg: '',
    maxmsgs: 30,
    size: 14,
    usernames: true,
    platforms: { tiktok: true, twitch: true, youtube: true, kick: true },
  },
};
