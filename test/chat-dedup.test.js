'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createChatGuard, createViewerRegistry } = require('@tiklivetts/chat-guard');

function guard() {
  return createChatGuard({ registry: createViewerRegistry(), rules: { maxDisplayLength: 300, maxSpeechLength: 500, floodWindowMs: 45000, floodMinLength: 4, duplicateWindowMs: 6 * 60 * 60 * 1000, nonFollowersSpeak: true } });
}

test('redelivery with the same platform message id is dropped', () => {
  const review = guard().review;
  const input = { platform: 'tiktok', raw: { uniqueId: 'viewer', nickname: 'Viewer', comment: 'hola', msgId: 'same' } };
  assert.equal(review(input).action, 'allow');
  assert.deepEqual(review(input).reasons, ['duplicate-redelivery']);
});

test('repeated words are collapsed for every platform', () => {
  const samples = [
    { platform: 'tiktok', raw: { uniqueId: 'a', nickname: 'a', comment: 'hola hola hola hola', msgId: '1' } },
    { platform: 'twitch', raw: { tags: { id: '2', 'user-id': 'a', username: 'a' }, message: 'hola hola hola hola' } },
    { platform: 'youtube', raw: { id: '3', author: { channelId: 'a', name: 'a' }, message: [{ text: 'hola hola hola hola' }] } },
    { platform: 'kick', raw: { id: '4', userId: 'a', username: 'a', content: 'hola hola hola hola' } },
  ];
  for (const input of samples) assert.equal(guard().review(input).message.text.speech, 'hola hola');
});
