'use strict';

const { totalViewerCount } = require('./total-viewer-count');

function setViewerCount(state, { platform, channel, viewerCount }) {
  const count = Number(viewerCount);
  if (!platform || !channel || !Number.isFinite(count)) return null;

  state.viewerCountByChannel.set(`${platform}:${channel}`, Math.max(0, count));
  return totalViewerCount(state.viewerCountByChannel);
}

module.exports = { setViewerCount };
