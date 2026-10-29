'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { allowAdmin } = require('../features/moderacion/allow-admin');

const message = { author: { handle: 'soykurorai' }, text: { display: 'aaaa', speech: 'abcdef' } };

test('allowAdmin: el admin pasa aunque una regla de contenido lo haya bloqueado', () => {
  const out = allowAdmin({ action: 'drop', reasons: ['repeated-char'], advisories: [], message }, 3);
  assert.equal(out.action, 'allow');
  assert.deepEqual(out.reasons, []);
  assert.equal(out.message.text.speech, 'abc');
});

test('allowAdmin: una reentrega duplicada se sigue descartando', () => {
  const verdict = { action: 'drop', reasons: ['duplicate-redelivery'], advisories: [], message };
  assert.equal(allowAdmin(verdict, 200), verdict);
});
