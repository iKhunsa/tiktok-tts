'use strict';

function listChannels(state) {
  return (_req, res) => {
    res.json({
      tiktok: Array.from(state.tiktokChannels.keys()),
      twitch: Array.from(state.twitchChannels.keys()),
      youtube: Array.from(state.youtubeChannels.keys()),
      kick: Array.from(state.kickChannels),
    });
  };
}

module.exports = { listChannels };
