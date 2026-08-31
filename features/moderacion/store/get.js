'use strict';

function get(state, key) {
  return state.viewers.get(key) || null;
}

module.exports = { get };
