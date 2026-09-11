'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { claveCache } = require('../features/sonido/tts/fetch-audio');

test('claveCache es determinista para el mismo input', () => {
  const a = claveCache('hola mundo', 'es', false);
  const b = claveCache('hola mundo', 'es', false);
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{40}$/); // sha1 hex
});

test('claveCache varía por texto, idioma y slow', () => {
  const base = claveCache('hola', 'es', false);
  assert.notEqual(base, claveCache('hola!', 'es', false));
  assert.notEqual(base, claveCache('hola', 'en', false));
  assert.notEqual(base, claveCache('hola', 'es', true));
});
