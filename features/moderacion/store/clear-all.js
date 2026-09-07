'use strict';

const { markDirty } = require('./flush');

function clearAll(state) {
  const n = state.viewers.size;
  state.viewers.clear();
  if (n) markDirty(state);
  return n;
}

module.exports = { clearAll };
