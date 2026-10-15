'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CONFIG_VALIDATORS } = require('../features/configuracion/validators');
const { DEFAULT_CONFIG } = require('../features/configuracion/default-config');
const { createChatGuard, createViewerRegistry } = require('@tiklivetts/chat-guard');
const { describeModeration } = require('../features/chat/describe-moderation');

test('gibberishMode: default enforce y solo acepta off | shadow | enforce', () => {
  assert.equal(DEFAULT_CONFIG.gibberishMode, 'enforce');
  const valid = CONFIG_VALIDATORS.gibberishMode;
  ['off', 'shadow', 'enforce'].forEach((mode) => assert.equal(valid(mode), true));
  [true, 'on', '', null, undefined].forEach((mode) => assert.equal(valid(mode), false));
});

test('describeModeration: gibberish se reporta como texto-sin-sentido', () => {
  assert.deepEqual(describeModeration(['gibberish']), { origen: 'texto-sin-sentido', motivo: 'gibberish' });
});

test('el guard real no lee al tercer mensaje sin sentido y nunca silencia al usuario', () => {
  const registry = createViewerRegistry();
  const guard = createChatGuard({ registry, rules: { gibberishMode: 'enforce' } });
  const send = (comment, msgId) => guard.review({
    platform: 'tiktok',
    raw: { uniqueId: 'u1', nickname: 'U1', comment, msgId, createTime: String(Date.now()) },
  });

  const actions = ['trydoijgfkmsdfgkldfsgl;l;g,fdg', 'ghflfglhlfglh;fglh', 'a;s;d;f;g;h;j;k;l', 'hola a todos'].map((text, i) => send(text, `m${i}`));
  assert.deepEqual(actions.map((verdict) => verdict.action), ['allow', 'allow', 'mute', 'allow']);
  assert.deepEqual(actions[2].reasons, ['gibberish']);
  assert.equal(registry.statusOf('tiktok:id:u1').isMuted || false, false);
});
