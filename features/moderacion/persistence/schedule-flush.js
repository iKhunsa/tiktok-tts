'use strict';

const DEBOUNCE_MS = 15000;
const MAX_DELAY_MS = 60000;

function scheduleFlush(state, flush) {
  state.dirty = true;
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(flush, DEBOUNCE_MS);
  if (state.debounceTimer.unref) state.debounceTimer.unref();
  if (!state.maximumTimer) {
    state.maximumTimer = setTimeout(flush, MAX_DELAY_MS);
    if (state.maximumTimer.unref) state.maximumTimer.unref();
  }
}

module.exports = { scheduleFlush };
