'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listViewers } = require('../features/moderacion/persistence/list-viewers');

const V = [
  { nick: 'bob', platform: 'tiktok', isMuted: true, lastSeen: 1 },
  { nick: 'Ana', platform: 'kick', isBanned: true, lastSeen: 3 },
  { nick: 'carl', platform: 'kick', lastSeen: 2 },
];
const nicks = (q) => listViewers(V, q).items.map((v) => v.nick).join();

test('filtra por estado', () => {
  assert.equal(nicks({ state: 'muted' }), 'bob');
  assert.equal(nicks({ state: 'banned' }), 'Ana');
  assert.equal(nicks({ state: 'clean' }), 'carl');
  assert.equal(nicks({ state: 'punished' }), 'Ana,bob');
});

test('ordena por actividad reciente por defecto y por nombre (asc) con sort=nick', () => {
  assert.equal(nicks({}), 'Ana,carl,bob');
  assert.equal(nicks({ sort: 'nick' }), 'Ana,bob,carl');
  assert.equal(nicks({ sort: 'nick', dir: 'desc' }), 'carl,bob,Ana');
});
