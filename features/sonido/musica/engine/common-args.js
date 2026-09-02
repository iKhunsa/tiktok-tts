'use strict';

function commonArgs(state) {
  return ['--no-warnings', '--socket-timeout', '10', ...(state.jsRuntimeArgs || [])];
}

module.exports = { commonArgs };
