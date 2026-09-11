'use strict';

const { treeKill } = require('./tree-kill');

function shutdown(state) {
  for (const child of state.liveChildren) {
    treeKill(child);
  }
  state.liveChildren.clear();
}

module.exports = { shutdown };
