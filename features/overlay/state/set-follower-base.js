'use strict';

const { recomputeFollowerBase } = require('./recompute-follower-base');

function setFollowerBaseForChannel(deps, channel, count) {
  if (!(typeof count === 'number' && count > 0)) return;
  deps.state.followerBaseByChannel.set(channel, count);
  recomputeFollowerBase(deps);
}

module.exports = { setFollowerBaseForChannel };
