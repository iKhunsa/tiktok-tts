'use strict';

const { cleanTiktokUsername } = require('../tiktok/clean-username');
const { cleanupAfterLastTikTokChannel } = require('../tiktok/cleanup-after-last-channel');
const { broadcastChannels } = require('../broadcast-channels');

/** POST /api/disconnect — { username } desconecta un canal; sin body desconecta todos. */
function disconnect(deps) {
  return (req, res) => {
    const { state, bus } = deps;
    const { username } = req.body || {};

    if (username) {
      const cleanUsername = cleanTiktokUsername(username);
      const entry = state.tiktokChannels.get(cleanUsername);
      if (entry) {
        if (entry.timer) clearTimeout(entry.timer);
        entry.conn.removeAllListeners();
        try { entry.conn.disconnect(); } catch (_) { /* best-effort */ }
        state.tiktokChannels.delete(cleanUsername);
      }
      broadcastChannels(deps);
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
      broadcastChannels(deps);
    }

    res.json({ success: true });
  };
}

module.exports = { disconnect };
