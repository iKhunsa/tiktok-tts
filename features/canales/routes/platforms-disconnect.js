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

function platformsDisconnect(deps) {
  return async (req, res) => {
    const { state, bus, logger } = deps;
    const { platform, channel } = req.body || {};
    try {
      if (platform === 'tiktok') {
        if (channel) {
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
        } else {
          for (const key of state.tiktokChannels.keys()) clearWatchdog(state, `tiktok:${key}`);
          for (const entry of state.tiktokChannels.values()) {
            if (entry.timer) clearTimeout(entry.timer);
            teardownConn(entry);
          }
          state.tiktokChannels.clear();
          cleanupAfterLastTikTokChannel(deps);
        }
      } else if (platform === 'twitch') {
        if (channel) {
          const twitchChannel = cleanTwitchChannel(channel);
          await disconnectTwitch(deps, twitchChannel);
        } else {
          for (const ch of Array.from(state.twitchReconnectDesired)) await disconnectTwitch(deps, ch);
        }
        bus.emit('canal:estado', { platform: 'twitch', channel: channel ? cleanTwitchChannel(channel) : null, state: 'desconectado' });
      } else if (platform === 'youtube') {
        if (channel) {
          const ytChannel = normalizeYoutubeInput(channel);
          disconnectYoutube(deps, ytChannel);
        } else {
          for (const ch of Array.from(state.youtubeReconnectDesired)) disconnectYoutube(deps, ch);
        }
        bus.emit('canal:estado', { platform: 'youtube', channel: channel ? normalizeYoutubeInput(channel) : null, state: 'desconectado' });
      } else if (platform === 'kick') {
        if (channel) {
          const slug = cleanKickSlug(channel);
          disconnectKick(deps, slug);
        } else {
          for (const slug of Array.from(state.kickReconnectDesired)) disconnectKick(deps, slug);
        }
        bus.emit('canal:estado', { platform: 'kick', channel: channel ? cleanKickSlug(channel) : null, state: 'desconectado' });
      }
      broadcastChannels(deps);
      res.json({ success: true });
    } catch (err) {
      logger.log(
        'error', 'canales', 'canales/routes/platforms-disconnect.js#platformsDisconnect', 'canales.desconexion.fallida',
        `Error al desconectar plataforma ${platform}: ${err.message}`, { platform, channel, error: err.message, stack: err.stack }
      );
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { platformsDisconnect };
