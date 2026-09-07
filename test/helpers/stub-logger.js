'use strict';

function createStubLogger() {
  const entries = [];
  return {
    entries,
    log: (level, domain, source, event, message, data) => {
      entries.push({ level, domain, source, event, message, data });
    },
  };
}

module.exports = { createStubLogger };
