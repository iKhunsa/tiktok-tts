'use strict';

function totalViewerCount(viewerCountByChannel) {
  return [...viewerCountByChannel.values()].reduce((total, count) => total + count, 0);
}

module.exports = { totalViewerCount };
