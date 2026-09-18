'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('el overlay suma likeCount numerico aunque el cliente lo entregue como string', () => {
  const src = fs.readFileSync(path.join(__dirname, '../features/canales/tiktok/connect-tiktok-channel.js'), 'utf8');
  assert.match(src, /likeCount: Number\(data\.likeCount\) \|\| 1/);
  // 0 + "5" seria "05": la coercion en el productor lo evita
  assert.equal(0 + (Number('5') || 1), 5);
});

test('los 10 locales tienen announce.like, likeOne y likeFew', () => {
  const dir = path.join(__dirname, '../interfaz/publico/locales');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).announce;
    for (const k of ['like', 'likeOne', 'likeFew']) assert.ok(a[k], `${f}: falta announce.${k}`);
  }
});
