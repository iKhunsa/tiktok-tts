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

test('moderation actions persist immediately', () => {
  const dataDir = temporaryDirectory();
  const store = createRegistryStore({ dataDir, logger: logger() });
  const target = { platform: 'twitch', userId: 'viewer', nick: 'Viewer' };

  store.setBan(target, -1);

  const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'moderation.json'), 'utf8'));
  assert.equal(saved.viewers['twitch:id:viewer'].bannedUntil, -1);
  store.shutdown();
});

test('migrated viewer without first timestamp can be removed', () => {
  const dataDir = temporaryDirectory();
  fs.writeFileSync(
    path.join(dataDir, 'moderation.json'),
    JSON.stringify({ version: 1, viewers: { 'tiktok:1': { p: 'tiktok', uid: '1', nick: 'Viewer' } } })
  );
  const store = createRegistryStore({ dataDir, logger: logger() });

  assert.equal(store.remove('tiktok:id:1'), true);
  assert.equal(store.list().total, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dataDir, 'moderation.json'), 'utf8')).viewers, {});
  store.shutdown();
});
