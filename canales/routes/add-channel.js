'use strict';

const { connectTiktokChannel } = require('../tiktok/connect-tiktok-channel');
const { cleanTwitchChannel } = require('../twitch/clean-channel');
const { connectTwitch } = require('../twitch/connect-twitch');
const { normalizeYoutubeInput } = require('../youtube/parse-target');
const { connectYoutube } = require('../youtube/connect-youtube');
const { broadcastChannels } = require('../broadcast-channels');

function addChannel(deps) {
  return async (req, res) => {
    const { platform, channel, token } = req.body || {};
    if (!platform || !channel) return res.status(400).json({ error: 'Se requiere platform y channel' });
    try {
      if (platform === 'tiktok') {
        const cleanUsername = await connectTiktokChannel(deps, channel);
        broadcastChannels(deps);
        return res.json({ success: true, channel: cleanUsername });
      }
      if (platform === 'twitch') {
        const twitchChannel = cleanTwitchChannel(channel);
        await connectTwitch(deps, twitchChannel, token || null);
        broadcastChannels(deps);
        return res.json({ success: true, channel: twitchChannel });
      }
      if (platform === 'youtube') {
        const ytInput = normalizeYoutubeInput(channel);
        await connectYoutube(deps, ytInput);
        broadcastChannels(deps);
        return res.json({ success: true, channel: ytInput });
      }
      return res.status(400).json({ error: 'Plataforma no soportada' });
    } catch (err) {
      deps.logger.log(
        'error', 'canales', 'canales/routes/add-channel.js#addChannel', 'canales.conexion.fallida',
        `Error al agregar canal ${platform}: ${err.message}`, { platform, channel, error: err.message, stack: err.stack }
      );
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  };
}

module.exports = { addChannel };
