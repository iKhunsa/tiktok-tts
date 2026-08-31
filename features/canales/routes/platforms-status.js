'use strict';

function platformsStatus(state) {
  return (_req, res) => {
    res.json({
      twitch: state.twitchChannels.size > 0,
      youtube: state.youtubeChannels.size > 0,
      kick: state.kickChannels.size > 0,
      twitchChannels: Array.from(state.twitchChannels.keys()),
      youtubeChannels: Array.from(state.youtubeChannels.keys()),
      kickChannels: Array.from(state.kickChannels.keys()),
    });
  };
}

module.exports = { platformsStatus };
