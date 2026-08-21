'use strict';

const { cleanTiktokUsername } = require('../tiktok/clean-username');
const { cleanupAfterLastTikTokChannel } = require('../tiktok/cleanup-after-last-channel');
const { cleanTwitchChannel } = require('../twitch/clean-channel');
const { clearReconnectTimer: clearTwitchReconnectTimer } = require('../twitch/connect-twitch');
const { normalizeYoutubeInput } = require('../youtube/parse-target');
const { clearReconnectTimer: clearYoutubeReconnectTimer } = require('../youtube/connect-youtube');
const { stopYoutubeChat } = require('../youtube/stop-chat');
const { broadcastChannels } = require('../broadcast-channels');

function removeChannel(deps) {
  return async (req, res) => {
    const { state, bus, logger } = deps;
    const { platform, channel } = req.body || {};
    if (!platform || !channel) return res.status(400).json({ error: 'Se requiere platform y channel' });
    try {
      if (platform === 'tiktok') {
        const cleanUsername = cleanTiktokUsername(channel);
        const entry = state.tiktokChannels.get(cleanUsername);
        if (entry) {
          if (entry.timer) clearTimeout(entry.timer);
          entry.conn.removeAllListeners();
          try { entry.conn.disconnect(); } catch (_) { /* best-effort */ }
          state.tiktokChannels.delete(cleanUsername);
        }
        if (state.tiktokChannels.size === 0) cleanupAfterLastTikTokChannel(deps);
        else bus.emit('canal:estado', { platform: 'tiktok', channel: cleanUsername, state: 'desconectado' });
      } else if (platform === 'twitch') {
        const twitchChannel = cleanTwitchChannel(channel);
        clearTwitchReconnectTimer(state.twitchReconnectTimers, twitchChannel);
        const c = state.twitchChannels.get(twitchChannel);
        if (c) { c._intentionalDisconnect = true; try { await c.disconnect(); } catch (_) { /* best-effort */ } state.twitchChannels.delete(twitchChannel); }
        bus.emit('canal:estado', { platform: 'twitch', channel: twitchChannel, state: 'desconectado' });
      } else if (platform === 'youtube') {
        const ytChannel = normalizeYoutubeInput(channel);
        clearYoutubeReconnectTimer(state.youtubeReconnectTimers, ytChannel);
        const c = state.youtubeChannels.get(ytChannel);
        if (c) { stopYoutubeChat(c, 'disconnect'); state.youtubeChannels.delete(ytChannel); }
        state.youtubeSeenIds.delete(ytChannel);
        bus.emit('canal:estado', { platform: 'youtube', channel: ytChannel, state: 'desconectado' });
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
