'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createModerationStore } = require('../moderacion/store/create-store');
const { createStubLogger } = require('./helpers/stub-logger');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tts-mod-store-'));
}

test('setBan + getEffective refleja ban activo', () => {
  const dataDir = makeTmpDir();
  const store = createModerationStore({ dataDir, logger: createStubLogger() });
  const key = store.keyFor('tiktok', '1', 'Foo');
  store.touch({ platform: 'tiktok', userId: '1', nick: 'Foo' });
  store.setBan({ key }, -1);
  const eff = store.getEffective(key);
  assert.equal(eff.isBanned, true);
  store.shutdown();
});

test('flush escribe moderation.json atomico (tmp desaparece, archivo final existe)', () => {
  const dataDir = makeTmpDir();
  const store = createModerationStore({ dataDir, logger: createStubLogger() });
  const key = store.keyFor('twitch', '2', 'Bar');
  store.touch({ platform: 'twitch', userId: '2', nick: 'Bar' });
  store.flush();
  assert.equal(fs.existsSync(store.filePath), true);
  assert.equal(fs.existsSync(`${store.filePath}.tmp`), false);
  const saved = JSON.parse(fs.readFileSync(store.filePath, 'utf8'));
  assert.ok(saved.viewers[key]);
  store.shutdown();
});

test('clearPunishments limpia mute y ban sin borrar el viewer', () => {
  const dataDir = makeTmpDir();
  const store = createModerationStore({ dataDir, logger: createStubLogger() });
  const key = store.keyFor('tiktok', '3', 'Baz');
  store.touch({ platform: 'tiktok', userId: '3', nick: 'Baz' });
  store.setMute({ key }, -1);
  store.setBan({ key }, -1);
  store.clearPunishments({ key });
  const eff = store.getEffective(key);
  assert.equal(eff.isMuted, false);
  assert.equal(eff.isBanned, false);
  assert.ok(store.get(key));
  store.shutdown();
});

test('load recupera datos guardados previamente (sobrevive reinicio)', () => {
  const dataDir = makeTmpDir();
  const logger = createStubLogger();
  const store1 = createModerationStore({ dataDir, logger });
  const key = store1.keyFor('youtube', '4', 'Qux');
  store1.touch({ platform: 'youtube', userId: '4', nick: 'Qux' });
  store1.flush();
  store1.shutdown();

  const store2 = createModerationStore({ dataDir, logger });
  assert.ok(store2.get(key));
  store2.shutdown();
});
