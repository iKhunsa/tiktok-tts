'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { extraerRegalo } = require('../features/overlay/extract-gift');

test('extraerRegalo: TikTok conserva el shape de siempre (giftName real, sin kind)', () => {
  const raw = { uniqueId: 'u1', nickname: 'Ana', avatarUrl: 'http://a', giftName: 'Rose', giftId: 5, giftPictureUrl: 'http://g', groupCount: 3, diamondCount: 10 };
  assert.deepStrictEqual(extraerRegalo('tiktok', raw), {
    userId: 'u1', nickname: 'Ana', avatar: 'http://a',
    giftName: 'Rose', giftId: 5, giftPictureUrl: 'http://g',
    kind: null, amount: 0, repeatCount: 3, diamondCount: 10,
  });
});

test('extraerRegalo: TikTok sin groupCount/diamondCount cae a los defaults de siempre', () => {
  const raw = { uniqueId: 'u1', nickname: 'Ana', giftName: 'Rose' };
  const info = extraerRegalo('tiktok', raw);
  assert.strictEqual(info.repeatCount, 1);
  assert.strictEqual(info.diamondCount, 0);
});

test('extraerRegalo: Twitch cheer -> kind "cheer", amount = bits, sin giftName', () => {
  const raw = { kind: 'cheer', tags: { bits: '250', 'display-name': 'Fulano', 'user-id': '99' } };
  assert.deepStrictEqual(extraerRegalo('twitch', raw), {
    userId: '99', nickname: 'Fulano', avatar: null,
    giftName: null, giftId: null, giftPictureUrl: null,
    kind: 'cheer', amount: 250, repeatCount: 1, diamondCount: 0,
  });
});

test('extraerRegalo: Twitch sub -> kind "sub", amount 0', () => {
  const raw = { kind: 'sub', username: 'mengano', userstate: { 'display-name': 'Mengano', 'user-id': '77' } };
  assert.deepStrictEqual(extraerRegalo('twitch', raw), {
    userId: '77', nickname: 'Mengano', avatar: null,
    giftName: null, giftId: null, giftPictureUrl: null,
    kind: 'sub', amount: 0, repeatCount: 1, diamondCount: 0,
  });
});

test('extraerRegalo: Twitch cheer sin display-name cae al username de los tags', () => {
  const raw = { kind: 'cheer', tags: { bits: '10', username: 'soloUsername' } };
  const info = extraerRegalo('twitch', raw);
  assert.strictEqual(info.nickname, 'soloUsername');
});

test('extraerRegalo: Kick kicks.gifted -> kind "kicksgift", amount = gift.amount', () => {
  const raw = { sender: { user_id: 123, username: 'kickuser' }, gift: { amount: 50, name: 'Kicks', type: 'kicks' } };
  assert.deepStrictEqual(extraerRegalo('kick', raw), {
    userId: '123', nickname: 'kickuser', avatar: null,
    giftName: null, giftId: null, giftPictureUrl: null,
    kind: 'kicksgift', amount: 50, repeatCount: 1, diamondCount: 0,
  });
});

test('extraerRegalo: plataforma desconocida -> null (el handler debe ignorarla)', () => {
  assert.strictEqual(extraerRegalo('youtube', {}), null);
  assert.strictEqual(extraerRegalo('lo-que-sea', {}), null);
});
