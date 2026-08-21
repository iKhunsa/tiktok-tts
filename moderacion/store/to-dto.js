'use strict';

const { isActive } = require('./is-active');

function toDTO(state, key, v) {
  const viewer = v || state.viewers.get(key);
  if (!viewer) return null;
  return {
    key,
    platform: viewer.p,
    userId: viewer.uid,
    idKind: viewer.idk,
    nick: viewer.nick,
    firstSeen: viewer.first,
    lastSeen: viewer.last,
    messages: viewer.msgs,
    gifts: viewer.gifts,
    likes: viewer.likes,
    isFollower: !!viewer.fol,
    isWhitelisted: !!viewer.wl,
    followedAt: viewer.folAt,
    muteUntil: viewer.mute,
    banUntil: viewer.ban,
    isMuted: isActive(viewer.mute),
    isBanned: isActive(viewer.ban),
  };
}

module.exports = { toDTO };
