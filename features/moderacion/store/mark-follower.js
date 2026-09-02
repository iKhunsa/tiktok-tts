'use strict';

const { ensure } = require('./ensure');
const { markDirty } = require('./flush');

function markFollower(state, { platform, userId, nick, manual = false }) {
  const { viewer } = ensure(state, { platform, userId, nick });
  const t = Date.now();
  viewer.last = t;
  if (nick) viewer.nick = String(nick);
  if (!viewer.fol) {
    viewer.fol = true;
    viewer.folAt = t;
  }
  if (manual) viewer.wl = true;
  markDirty(state);
  return viewer;
}

module.exports = { markFollower };
