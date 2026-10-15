'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { testChat } = require('../features/chat/routes/test-chat');

function simulate(body) {
  const emitted = [];
  const bus = { emit: (event, payload) => { if (event === 'canal:mensaje-crudo') emitted.push(payload); } };
  const logger = { log: () => {} };
  const res = { status: () => res, json: () => res };
  testChat({ bus, logger })({ body }, res);
  return emitted[0];
}

function sourceMessageId({ platform, raw }) {
  if (platform === 'tiktok') return raw.msgId;
  if (platform === 'twitch') return raw.tags.id;
  return raw.id;
}

for (const platform of ['tiktok', 'twitch', 'youtube', 'kick']) {
  test(`${platform}: cada simulación lleva un id de mensaje propio`, () => {
    const body = { platform, user: 'Ana', userId: 'ana', comment: 'hola' };

    const first = sourceMessageId(simulate(body));
    const second = sourceMessageId(simulate(body));

    assert.ok(first);
    assert.notEqual(first, second);
  });
}
