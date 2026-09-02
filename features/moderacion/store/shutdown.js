'use strict';

const { flush } = require('./flush');

function shutdown(state) {
  if (state.sweepTimer) clearInterval(state.sweepTimer);
  flush(state);
}

module.exports = { shutdown };
