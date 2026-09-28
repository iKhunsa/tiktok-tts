'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRegistryStore } = require('../features/moderacion/persistence/create-registry-store');

function temporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tts-mod-registry-'));
}

function logger() {
  return { log() {} };
}

test('v1 moderation.json migrates to v2 without losing a ban', () => {
  const dataDir = temporaryDirectory();
  fs.writeFileSync(path.join(dataDir, 'moderation.json'), JSON.stringify({ version: 1, viewers: { 'tiktok:1': { p: 'tiktok', uid: '1', nick: 'Viewer', ban: -1, first: 1, last: 2 } } }));
  const store = createRegistryStore({ dataDir, logger: logger() });
  assert.equal(fs.existsSync(path.join(dataDir, 'moderation.v1.json')), true);
  assert.equal(store.toDTO('tiktok:id:1').isBanned, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'moderation.json'), 'utf8')).version, 2);
  store.shutdown();
});

test('follower whitelist can be removed', () => {
  const store = createRegistryStore({ dataDir: temporaryDirectory(), logger: logger() });
  const target = { platform: 'twitch', userId: 'viewer', nick: 'Viewer' };
  store.setWhitelist(target, true);
  assert.equal(store.setWhitelist(target, false).isWhitelisted, false);
  store.shutdown();
});
