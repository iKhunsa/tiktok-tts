'use strict';

const PLATFORMS = ['tiktok', 'twitch', 'youtube', 'kick'];

function viewerStats(viewers) {
  const stats = { total: viewers.length, followers: 0, others: 0, muted: 0, banned: 0, byPlatform: Object.fromEntries(PLATFORMS.map((platform) => [platform, 0])) };
  for (const viewer of viewers) {
    if (viewer.isFollower || viewer.isWhitelisted) stats.followers += 1;
    else stats.others += 1;
    if (viewer.isMuted) stats.muted += 1;
    if (viewer.isBanned) stats.banned += 1;
    if (stats.byPlatform[viewer.platform] !== undefined) stats.byPlatform[viewer.platform] += 1;
  }
  return stats;
}

module.exports = { viewerStats };
