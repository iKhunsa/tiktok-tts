'use strict';

function getStatus(state) {
  return { ...state.status };
}

function emitStatus(state, level, error = null) {
  state.status = { state: level, version: state.status.version, error };
  try {
    if (state.onStatus) state.onStatus(state.status);
  } catch (_) { /* best-effort */ }
}

module.exports = { getStatus, emitStatus };
