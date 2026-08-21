'use strict';

function shutdown(state) {
  for (const child of state.liveChildren) {
    try { child.kill(); } catch (_) { /* best-effort */ }
  }
  state.liveChildren.clear();
}

module.exports = { shutdown };
