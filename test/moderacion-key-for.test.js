'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { keyFor } = require('../moderacion/store/key-for');
const { parseKey } = require('../moderacion/store/parse-key');
const { isActive } = require('../moderacion/store/is-active');

test('keyFor usa id estable cuando existe', () => {
  assert.equal(keyFor('tiktok', '123', 'Foo'), 'tiktok:123');
});

test('keyFor cae a name: cuando no hay id', () => {
  assert.equal(keyFor('twitch', '', 'Foo'), 'twitch:name:foo');
});

test('keyFor acepta kick como plataforma', () => {
  assert.equal(keyFor('kick', '1', 'Foo'), 'kick:1');
});

test('keyFor normaliza plataforma desconocida a tiktok', () => {
  assert.equal(keyFor('mixer', '1', 'Foo'), 'tiktok:1');
});

test('keyFor sin id ni nick cae a anon', () => {
  assert.equal(keyFor('youtube', null, null), 'youtube:name:anon');
});

test('parseKey separa plataforma e id', () => {
  assert.deepEqual(parseKey('tiktok:123'), { platform: 'tiktok', id: '123', idKind: 'id' });
});

test('parseKey detecta idKind name', () => {
  assert.deepEqual(parseKey('twitch:name:foo'), { platform: 'twitch', id: 'foo', idKind: 'name' });
});

test('parseKey acepta kick', () => {
  assert.deepEqual(parseKey('kick:1'), { platform: 'kick', id: '1', idKind: 'id' });
});

test('parseKey rechaza plataforma invalida', () => {
  assert.equal(parseKey('mixer:1'), null);
});

test('parseKey rechaza formato sin dos puntos', () => {
  assert.equal(parseKey('sindostpuntos'), null);
});

test('parseKey y keyFor son inversas para ids', () => {
  const key = keyFor('tiktok', '999', 'x');
  assert.deepEqual(parseKey(key), { platform: 'tiktok', id: '999', idKind: 'id' });
});

test('isActive: -1 significa indefinido (siempre activo)', () => {
  assert.equal(isActive(-1), true);
});

test('isActive: 0 significa nunca activo', () => {
  assert.equal(isActive(0), false);
});

test('isActive: epoch futuro esta activo', () => {
  assert.equal(isActive(Date.now() + 60000), true);
});

test('isActive: epoch pasado no esta activo', () => {
  assert.equal(isActive(Date.now() - 60000), false);
});
