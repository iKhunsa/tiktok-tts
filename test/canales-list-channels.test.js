'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listChannels } = require('../features/canales/routes/list-channels');

test('listChannels solo expone TikTok conectado', () => {
  const state = {
    tiktokChannels: new Map([
      ['en-vivo', { techState: 'connected' }],
      ['offline', { techState: 'waiting_live' }],
      ['fallido', { techState: 'connecting' }],
    ]),
    twitchChannels: new Map(),
    youtubeChannels: new Map(),
    kickChannels: new Map(),
  };
  let body;

  listChannels(state)({}, { json: (data) => { body = data; } });

  assert.deepEqual(body.tiktok, ['en-vivo']);
});
