'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rawCommentText } = require('../features/chat/raw-comment-text');
const { parseCommand } = require('../features/bot/parse-command');

const URL = 'https://youtu.be/Uoox9fpmDP0?si=bHQveBSqofB1bJk0';

test('rawCommentText conserva la URL en las 4 plataformas', () => {
  assert.equal(rawCommentText('tiktok', { comment: `!p ${URL}` }), `!p ${URL}`);
  assert.equal(rawCommentText('twitch', { message: `!p ${URL}` }), `!p ${URL}`);
  assert.equal(rawCommentText('kick', { content: `!p ${URL}` }), `!p ${URL}`);
  assert.equal(rawCommentText('youtube', { message: [{ text: '!p ' }, { text: URL }] }), `!p ${URL}`);
  assert.equal(rawCommentText('youtube', {}), '');
});

test('!p con link llega entero al parser', () => {
  assert.deepEqual(parseCommand(rawCommentText('tiktok', { comment: `!p ${URL}` })), { comando: 'play', args: URL });
});
