'use strict';

const { isActive } = require('./is-active');

function stats(state) {
  const out = {
    total: state.viewers.size,
    followers: 0,
    others: 0,
    muted: 0,
    banned: 0,
    byPlatform: { tiktok: 0, twitch: 0, youtube: 0, kick: 0 },
  };
  for (const v of state.viewers.values()) {
    if (v.fol || v.wl) out.followers++; else out.others++;
    if (isActive(v.mute)) out.muted++;
    if (isActive(v.ban)) out.banned++;
    if (out.byPlatform[v.p] !== undefined) out.byPlatform[v.p]++;
  }
  return out;
}

module.exports = { stats };
