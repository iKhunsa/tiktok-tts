'use strict';

const { cleanTiktokUsername } = require('../tiktok/clean-username');
const { cleanupAfterLastTikTokChannel } = require('../tiktok/cleanup-after-last-channel');
const { teardownConn } = require('../tiktok/connect-tiktok-channel');
const { cleanTwitchChannel } = require('../twitch/clean-channel');
const { disconnectTwitch } = require('../twitch/connect-twitch');
const { normalizeYoutubeInput } = require('../youtube/parse-target');
const { disconnectYoutube } = require('../youtube/connect-youtube');
const { cleanKickSlug } = require('../kick/clean-slug');
const { disconnectKick } = require('../kick/connect-kick');
const { broadcastChannels } = require('../broadcast-channels');
const { clearWatchdog } = require('../stale-watchdog');

function removeChannel(deps) {
  return async (req, res) => {
    const { state, bus, logger } = deps;
    const { platform, channel } = req.body || {};
    if (!platform || !channel) return res.status(400).json({ error: 'Se requiere platform y channel' });
    try {
      if (platform === 'tiktok') {
        const cleanUsername = cleanTiktokUsername(channel);
        clearWatchdog(state, `tiktok:${cleanUsername}`);
        const entry = state.tiktokChannels.get(cleanUsername);
        if (entry) {
          if (entry.timer) clearTimeout(entry.timer);
          teardownConn(entry);
          state.tiktokChannels.delete(cleanUsername);
        }
        if (state.tiktokChannels.size === 0) cleanupAfterLastTikTokChannel(deps);
        else bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'desconectado' });
      } else if (platform === 'twitch') {
        const twitchChannel = cleanTwitchChannel(channel);
        await disconnectTwitch(deps, twitchChannel);
        bus.emit('canal:estado', { platform: 'twitch', channel: twitchChannel, state: 'desconectado' });
      } else if (platform === 'youtube') {
        const ytChannel = normalizeYoutubeInput(channel);
        disconnectYoutube(deps, ytChannel);
        bus.emit('canal:estado', { platform: 'youtube', channel: ytChannel, state: 'desconectado' });
      } else if (platform === 'kick') {
        const slug = cleanKickSlug(channel);
        disconnectKick(deps, slug);
        bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'desconectado' });
      }
      broadcastChannels(deps);
      res.json({ success: true });
    } catch (err) {
      logger.log(
        'error', 'canales', 'canales/routes/remove-channel.js#removeChannel', 'canales.desconexion.fallida',
        `Error al quitar canal ${platform}: ${err.message}`, { platform, channel, error: err.message, stack: err.stack }
      );
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { removeChannel };
