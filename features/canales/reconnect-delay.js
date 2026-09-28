'use strict';

const { MAX_RECONNECT_ATTEMPTS } = require('./state/channel-maps');

function reconnectDelayMs(attempt) {
  return attempt < MAX_RECONNECT_ATTEMPTS ? 1000 * (2 ** attempt) : 30000;
}

module.exports = { reconnectDelayMs };
