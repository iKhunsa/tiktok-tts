'use strict';

function listChannels(state) {
  return (_req, res) => {
    res.json({
      tiktok: Array.from(state.tiktokChannels.entries())
        .filter(([, entry]) => entry.techState === 'connected')
        .map(([channel]) => channel),
      twitch: Array.from(state.twitchChannels.keys()),
      youtube: Array.from(state.youtubeChannels.keys()),
      kick: Array.from(state.kickChannels.keys()),
    });
  };
}

module.exports = { listChannels };
