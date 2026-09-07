'use strict';

const DUP_WINDOW_MS = 45000;
const DUP_MAX_HISTORY = 5;

function createDuplicateTrackerState() {
  return { userRecentMessages: new Map() };
}

function isDuplicateRecent(state, userKey, norm) {
  const now = Date.now();
  let history = state.userRecentMessages.get(userKey);
  if (!history) { history = []; state.userRecentMessages.set(userKey, history); }
  while (history.length && history[0].ts < now - DUP_WINDOW_MS) history.shift();
  const isDup = history.some((h) => h.norm === norm);
  history.push({ norm, ts: now });
  if (history.length > DUP_MAX_HISTORY) history.shift();
  return isDup;
}

/** Barrido periodico: borra usuarios inactivos para no acumular memoria indefinidamente. */
function sweepDuplicateTracker(state) {
  const cutoff = Date.now() - DUP_WINDOW_MS;
  for (const [key, history] of state.userRecentMessages) {
    if (!history.length || history[history.length - 1].ts < cutoff) state.userRecentMessages.delete(key);
  }
}

module.exports = { createDuplicateTrackerState, isDuplicateRecent, sweepDuplicateTracker, DUP_WINDOW_MS };
