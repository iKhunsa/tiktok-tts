'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const overlay = require('../features/overlay');

function registerOverlay() {
  const listeners = new Map();
  const broadcasts = [];
  const bus = {
    on(event, handler) {
      listeners.set(event, [...(listeners.get(event) || []), handler]);
    },
    emit(event, payload) {
      if (event === 'ws:broadcast') broadcasts.push(payload);
      for (const handler of listeners.get(event) || []) handler(payload);
    },
  };
  const app = { use() {}, get() {}, post() {} };
  overlay.register({ app, bus, logger: { log() {} } });
  return { bus, broadcasts };
}

// mcp-registry.js es un singleton append-only (ver CLAUDE.md) — un solo
// register() por proceso, igual que test/overlay-viewers.test.js.
const context = registerOverlay();

function resetOverlay() {
  context.broadcasts.length = 0;
}

test('canal:gift de Twitch (cheer) llega al broadcast con kind/amount, sin usdValue (no se valoriza fuera de TikTok)', () => {
  const { bus, broadcasts } = context;
  resetOverlay();
  bus.emit('canal:gift', { platform: 'twitch', channel: 'kintsu99', raw: { kind: 'cheer', tags: { bits: '100', 'display-name': 'Fulano', 'user-id': '1' } } });

  assert.strictEqual(broadcasts.length, 1);
  const g = broadcasts[0];
  assert.strictEqual(g.type, 'gift');
  assert.strictEqual(g.platform, 'twitch');
  assert.strictEqual(g.kind, 'cheer');
  assert.strictEqual(g.amount, 100);
  assert.strictEqual(g.giftName, null);
  assert.strictEqual(g.usdValue, null);
});

test('plataforma:evento de Kick: kicks.gifted se remapea a canal:gift', () => {
  const { bus, broadcasts } = context;
  resetOverlay();
  bus.emit('plataforma:evento', {
    plataforma: 'kick', tipo: 'kicks.gifted',
    datos: { sender: { user_id: 55, username: 'kickuser' }, gift: { amount: 20 } },
  });

  assert.strictEqual(broadcasts.length, 1);
  const g = broadcasts[0];
  assert.strictEqual(g.type, 'gift');
  assert.strictEqual(g.platform, 'kick');
  assert.strictEqual(g.kind, 'kicksgift');
  assert.strictEqual(g.amount, 20);
  assert.strictEqual(g.user, 'kickuser');
});

test('plataforma:evento de Kick: channel.followed se remapea a canal:follow', () => {
  const { bus, broadcasts } = context;
  resetOverlay();
  bus.emit('plataforma:evento', {
    plataforma: 'kick', tipo: 'channel.followed',
    datos: { follower: { user_id: 7, username: 'nuevoFan' } },
  });

  assert.strictEqual(broadcasts.length, 1);
  const f = broadcasts[0];
  assert.strictEqual(f.type, 'follow');
  assert.strictEqual(f.platform, 'kick');
  assert.strictEqual(f.user, 'nuevoFan');
  assert.strictEqual(f.userId, '7');
});

test('plataforma:evento de otra plataforma o tipo desconocido no hace nada', () => {
  const { bus, broadcasts } = context;
  resetOverlay();
  bus.emit('plataforma:evento', { plataforma: 'twitch', tipo: 'channel.cheer', datos: {} });
  bus.emit('plataforma:evento', { plataforma: 'kick', tipo: 'channel.subscription.new', datos: {} });
  assert.strictEqual(broadcasts.length, 0);
});
