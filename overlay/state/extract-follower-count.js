'use strict';

function extractFollowerCount(roomInfo) {
  try {
    const owner = roomInfo && roomInfo.owner;
    const fi = owner && (owner.follow_info || owner.followInfo);
    const count = fi && (fi.follower_count || fi.followerCount || fi.fan_count || fi.fanCount);
    if (typeof count === 'number' && count > 0) return count;
  } catch (_) { /* best-effort */ }
  return 0;
}

module.exports = { extractFollowerCount };
