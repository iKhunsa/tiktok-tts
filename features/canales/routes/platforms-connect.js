'use strict';

const { connectTiktokChannel } = require('../tiktok/connect-tiktok-channel');
const { cleanTwitchChannel } = require('../twitch/clean-channel');
const { connectTwitch } = require('../twitch/connect-twitch');
const { normalizeYoutubeInput } = require('../youtube/parse-target');
const { connectYoutube } = require('../youtube/connect-youtube');
const { cleanKickSlug } = require('../kick/clean-slug');
const { connectKick } = require('../kick/connect-kick');
const { broadcastChannels } = require('../broadcast-channels');

function platformsConnect(deps) {
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
      if (platform === 'kick') {
        const slug = await connectKick(deps, cleanKickSlug(channel));
        broadcastChannels(deps);
        return res.json({ success: true, channel: slug });
      }
      return res.status(400).json({ error: 'Plataforma no soportada' });
    } catch (err) {
      deps.logger.log(
        'error', 'canales', 'canales/routes/platforms-connect.js#platformsConnect', 'canales.conexion.fallida',
        `Error al conectar plataforma ${platform}: ${err.message}`, { platform, channel, error: err.message, stack: err.stack }
      );
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  };
}

module.exports = { platformsConnect };
