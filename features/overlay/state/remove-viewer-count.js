'use strict';

const { totalViewerCount } = require('./total-viewer-count');

function removeViewerCount(state, { platform, channel }) {
  if (channel) state.viewerCountByChannel.delete(`${platform}:${channel}`);
  else if (platform) {
    for (const key of state.viewerCountByChannel.keys()) {
      if (key.startsWith(`${platform}:`)) state.viewerCountByChannel.delete(key);
    }
  }
  return totalViewerCount(state.viewerCountByChannel);
}

module.exports = { removeViewerCount };
