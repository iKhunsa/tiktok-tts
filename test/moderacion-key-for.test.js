'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { viewerKey } = require('@tiklivetts/chat-guard');

test('viewerKey keeps stable ids and marks handle-only identities', () => {
  assert.equal(viewerKey({ platform: 'tiktok', id: '123', handle: 'Viewer' }), 'tiktok:id:123');
  assert.equal(viewerKey({ platform: 'twitch', id: '', handle: 'Viewer' }), 'twitch:name:viewer');
});
