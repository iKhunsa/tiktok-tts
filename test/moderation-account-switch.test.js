'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createModerationStore } = require('../features/moderacion/store/create-store');

test('moderacion A -> B -> A hace flush y no cruza escrituras diferidas', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiklivetts-mod-'));
  const a = path.join(root, 'a');
  const b = path.join(root, 'b');
  fs.mkdirSync(a); fs.mkdirSync(b);
  const store = createModerationStore({ dataDir: a, logger: { log() {} } });
  store.touch({ platform: 'tiktok', userId: 'a', nick: 'A' });
  store.switchDataDir(b);
  assert.equal(store.size, 0);
  store.touch({ platform: 'tiktok', userId: 'b', nick: 'B' });
  store.switchDataDir(a);
  assert.equal(store.size, 1);
  assert.equal(store.get('tiktok:a').nick, 'A');
  store.shutdown();
  fs.rmSync(root, { recursive: true, force: true });
});
