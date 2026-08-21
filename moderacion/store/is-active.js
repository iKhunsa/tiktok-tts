'use strict';

function isActive(until) {
  return until === -1 || (until > 0 && until > Date.now());
}

module.exports = { isActive };
