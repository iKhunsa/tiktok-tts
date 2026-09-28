'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRegistryStore } = require('../features/moderacion/persistence/create-registry-store');

test('switching accounts flushes and reloads the registry', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-account-switch-'));
  const first = path.join(root, 'first');
  const second = path.join(root, 'second');
  fs.mkdirSync(first);
  fs.mkdirSync(second);
  const store = createRegistryStore({ dataDir: first, logger: { log() {} } });
  store.touch({ platform: 'tiktok', userId: 'first', nick: 'First' });
  store.switchDataDir(second);
  assert.equal(store.stats().total, 0);
  store.touch({ platform: 'tiktok', userId: 'second', nick: 'Second' });
  store.switchDataDir(first);
  assert.equal(store.stats().total, 1);
  assert.equal(store.toDTO('tiktok:id:first').nick, 'First');
  store.shutdown();
  fs.rmSync(root, { recursive: true, force: true });
});
