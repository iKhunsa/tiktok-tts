'use strict';

/** Publica el listado actual de canales conectados por plataforma al bus. */
function broadcastChannels(deps) {
  const { state, bus } = deps;
  bus.emit('canal:estado', {
    platform: null,
    channel: null,
    state: 'lista-canales',
    tiktok: Array.from(state.tiktokChannels.keys()),
    twitch: Array.from(state.twitchChannels.keys()),
    youtube: Array.from(state.youtubeChannels.keys()),
    kick: Array.from(state.kickChannels.keys()),
  });
}

module.exports = { broadcastChannels };
