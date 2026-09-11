'use strict';

function createTtsRateLimiterState() {
  return { requestTimes: [] };
}

function isTTSRateLimited(state, config) {
  if (!config.rateLimitEnabled) return false;
  const now = Date.now();
  while (state.requestTimes.length && state.requestTimes[0] < now - config.TTS_RATE_WINDOW_MS) {
    state.requestTimes.shift();
  }
  if (state.requestTimes.length >= config.TTS_RATE_LIMIT_MAX) return true;
  state.requestTimes.push(now);
  return false;
}

module.exports = { createTtsRateLimiterState, isTTSRateLimited };
