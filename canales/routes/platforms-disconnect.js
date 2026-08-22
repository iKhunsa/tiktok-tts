'use strict';

const { cleanTiktokUsername } = require('../tiktok/clean-username');
const { cleanupAfterLastTikTokChannel } = require('../tiktok/cleanup-after-last-channel');
const { cleanTwitchChannel } = require('../twitch/clean-channel');
const { clearReconnectTimer: clearTwitchReconnectTimer } = require('../twitch/connect-twitch');
const { normalizeYoutubeInput } = require('../youtube/parse-target');
const { clearReconnectTimer: clearYoutubeReconnectTimer, clearWatchdogTimer: clearYoutubeWatchdogTimer } = require('../youtube/connect-youtube');
const { stopYoutubeChat } = require('../youtube/stop-chat');
const { broadcastChannels } = require('../broadcast-channels');

function platformsDisconnect(deps) {
  return async (req, res) => {
    const { state, bus, logger } = deps;
    const { platform, channel } = req.body || {};
    try {
      if (platform === 'tiktok') {
        if (channel) {
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
        } else {
          for (const entry of state.tiktokChannels.values()) {
            if (entry.timer) clearTimeout(entry.timer);
            entry.conn.removeAllListeners();
            try { entry.conn.disconnect(); } catch (_) { /* best-effort */ }
          }
          state.tiktokChannels.clear();
          cleanupAfterLastTikTokChannel(deps);
        }
      } else if (platform === 'twitch') {
        if (channel) {
          const twitchChannel = cleanTwitchChannel(channel);
          clearTwitchReconnectTimer(state.twitchReconnectTimers, twitchChannel);
          const c = state.twitchChannels.get(twitchChannel);
          if (c) { c._intentionalDisconnect = true; try { await c.disconnect(); } catch (_) { /* best-effort */ } state.twitchChannels.delete(twitchChannel); }
        } else {
          for (const ch of state.twitchReconnectTimers.keys()) clearTwitchReconnectTimer(state.twitchReconnectTimers, ch);
          for (const c of state.twitchChannels.values()) { c._intentionalDisconnect = true; try { await c.disconnect(); } catch (_) { /* best-effort */ } }
          state.twitchChannels.clear();
        }
        bus.emit('canal:estado', { platform: 'twitch', channel: channel ? cleanTwitchChannel(channel) : null, state: 'desconectado' });
      } else if (platform === 'youtube') {
        if (channel) {
          const ytChannel = normalizeYoutubeInput(channel);
          clearYoutubeReconnectTimer(state.youtubeReconnectTimers, ytChannel);
          clearYoutubeWatchdogTimer(state.youtubeWatchdogTimers, ytChannel);
          const c = state.youtubeChannels.get(ytChannel);
          if (c) { stopYoutubeChat(c, 'disconnect'); state.youtubeChannels.delete(ytChannel); }
          state.youtubeSeenIds.delete(ytChannel);
        } else {
          for (const ch of state.youtubeReconnectTimers.keys()) clearYoutubeReconnectTimer(state.youtubeReconnectTimers, ch);
          for (const ch of state.youtubeWatchdogTimers.keys()) clearYoutubeWatchdogTimer(state.youtubeWatchdogTimers, ch);
          for (const c of state.youtubeChannels.values()) stopYoutubeChat(c, 'disconnect');
          state.youtubeChannels.clear();
          state.youtubeSeenIds.clear();
        }
        bus.emit('canal:estado', { platform: 'youtube', channel: channel ? normalizeYoutubeInput(channel) : null, state: 'desconectado' });
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
