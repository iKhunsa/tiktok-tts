'use strict';

const { isActive } = require('./is-active');

function getEffective(state, key) {
  const v = state.viewers.get(key);
  if (!v) {
    return {
      exists: false,
      isFollower: false,
      isWhitelisted: false,
      isMuted: false,
      isBanned: false,
      muteUntil: 0,
      banUntil: 0,
    };
  }
  return {
    exists: true,
    isFollower: !!v.fol,
    isWhitelisted: !!v.wl,
    isMuted: isActive(v.mute),
    isBanned: isActive(v.ban),
    muteUntil: v.mute,
    banUntil: v.ban,
  };
}

module.exports = { getEffective };
