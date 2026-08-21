'use strict';

const { markDirty } = require('./flush');

function remove(state, key) {
  const existed = state.viewers.delete(key);
  if (existed) markDirty(state);
  return existed;
}

module.exports = { remove };
