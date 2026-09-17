'use strict';

const fs = require('fs');

function sleep(ms) {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Windows can briefly report ENOTDIR while security software is inspecting a
 * newly-created directory. Retrying the same mkdir is safer than assuming a
 * failed existsSync means the directory is actually absent.
 */
function ensureDirSync(dir, { retries = 4, delayMs = 25 } = {}) {
  let originalError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return;
    } catch (error) {
      originalError ||= error;
      if (fs.existsSync(dir)) return;
      if (attempt < retries) sleep(delayMs);
    }
  }

  throw originalError;
}

module.exports = { ensureDirSync };
