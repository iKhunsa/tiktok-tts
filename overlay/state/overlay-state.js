'use strict';

function createOverlayState() {
  return {
    followCount: 0,
    // Suma de las bases de followers de TODOS los canales TikTok conectados.
    // Se recomputa desde followerBaseByChannel; nunca se sobrescribe con el
    // valor de un solo canal (multi-canal: estrategia agregada).
    baseFollowerCount: 0,
    followerBaseByChannel: new Map(), // username -> base follower count
    // Espejo local de los canales TikTok activos (via canal:estado de
    // /canales) — /overlay no puede leer el Map privado de /canales.
    activeTiktokChannels: new Set(),
    topLikers: new Map(),
    sharers: [],
    credits: {
      donors: [],
      followers: [],
      sharers: [],
    },
    followerRefreshTimer: null,
  };
}

module.exports = { createOverlayState };
