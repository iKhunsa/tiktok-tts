'use strict';

// Núcleo de "conectar/desconectar un canal", compartido por la ruta HTTP
// (routes/platforms-connect.js, routes/platforms-disconnect.js) y la tool MCP.
// Sin req/res: recibe datos planos, devuelve datos planos o lanza (con
// `statusCode` cuando aplica).

const { connectTiktokChannel } = require('./tiktok/connect-tiktok-channel');
const { cleanTwitchChannel } = require('./twitch/clean-channel');
const { connectTwitch } = require('./twitch/connect-twitch');
const { normalizeYoutubeInput } = require('./youtube/parse-target');
const { connectYoutube } = require('./youtube/connect-youtube');
const { cleanKickSlug } = require('./kick/clean-slug');
const { connectKick } = require('./kick/connect-kick');
const { broadcastChannels } = require('./broadcast-channels');

const PLATAFORMAS = new Set(['tiktok', 'twitch', 'youtube', 'kick']);

/**
 * @returns {Promise<{ platform:string, channel:string }>}
 * @throws  Error (con `statusCode` opcional)
 */
async function connectPlatformChannel(deps, { platform, channel, token }) {
  if (!platform || !channel) {
    const e = new Error('Se requiere platform y channel'); e.statusCode = 400; throw e;
  }
  if (!PLATAFORMAS.has(platform)) {
    const e = new Error('Plataforma no soportada'); e.statusCode = 400; throw e;
  }

  let clean;
  if (platform === 'tiktok') clean = await connectTiktokChannel(deps, channel);
  else if (platform === 'twitch') { clean = cleanTwitchChannel(channel); await connectTwitch(deps, clean, token || null); }
  else if (platform === 'youtube') { clean = normalizeYoutubeInput(channel); await connectYoutube(deps, clean); }
  else if (platform === 'kick') clean = await connectKick(deps, cleanKickSlug(channel));

  broadcastChannels(deps);
  return { platform, channel: clean };
}

module.exports = { connectPlatformChannel, PLATAFORMAS };
