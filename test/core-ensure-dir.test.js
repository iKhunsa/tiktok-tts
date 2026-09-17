'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ensureDirSync } = require('../core/ensure-dir');

test('ensureDirSync retries a transient mkdir failure', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tts-dir-')), 'nested');
  const mkdirSync = fs.mkdirSync;
  let calls = 0;
  fs.mkdirSync = (...args) => {
    calls += 1;
    if (calls === 1) {
      const error = new Error('ENOTDIR transient');
      error.code = 'ENOTDIR';
      throw error;
    }
    return mkdirSync(...args);
  };

  try {
    ensureDirSync(dir, { retries: 1, delayMs: 0 });
  } finally {
    fs.mkdirSync = mkdirSync;
  }

  assert.equal(calls, 2);
  assert.equal(fs.statSync(dir).isDirectory(), true);
});
