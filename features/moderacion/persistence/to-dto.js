'use strict';

function toDto(registry, key) {
  const viewer = registry.statusOf(key);
  return {
    key,
    platform: viewer.platform,
    userId: viewer.idKind === 'id' ? viewer.subjectId : null,
    idKind: viewer.idKind,
    nick: viewer.displayName || (viewer.idKind === 'name' ? viewer.subjectId : ''),
    firstSeen: viewer.firstSeenAt,
    lastSeen: viewer.lastSeenAt,
    isFollower: viewer.isFollower,
    isWhitelisted: viewer.isWhitelisted,
    followedAt: viewer.followedAt || null,
    muteUntil: viewer.mutedUntil,
    banUntil: viewer.bannedUntil,
    isMuted: viewer.mutedUntil !== null,
    isBanned: viewer.bannedUntil !== null,
  };
}

module.exports = { toDto };
