'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { extractAuthorMeta } = require('../features/chat/author-meta/extract-author-meta');

const NO_META = { avatar: '', isModerator: false, isSubscriber: false };

test('tiktok: avatar de la libreria y club de fans como suscriptor', () => {
  const meta = extractAuthorMeta('tiktok', { avatarUrl: 'https://cdn/a.jpeg', isFanClubMember: true });
  assert.deepStrictEqual(meta, { avatar: 'https://cdn/a.jpeg', isModerator: false, isSubscriber: true });
});

test('twitch: moderador y suscriptor desde tags; sin avatar', () => {
  assert.deepStrictEqual(
    extractAuthorMeta('twitch', { tags: { mod: true, subscriber: '1' } }),
    { avatar: '', isModerator: true, isSubscriber: true },
  );
  assert.deepStrictEqual(
    extractAuthorMeta('twitch', { tags: { badges: { broadcaster: '1' } } }),
    { avatar: '', isModerator: true, isSubscriber: false },
  );
});

test('youtube: miniatura del autor, moderador y miembro', () => {
  const raw = { author: { thumbnail: { url: 'https://yt/a.png' } }, isModerator: true, isMembership: true };
  assert.deepStrictEqual(extractAuthorMeta('youtube', raw), { avatar: 'https://yt/a.png', isModerator: true, isSubscriber: true });
});

test('kick: roles ya resueltos por el parser del evento', () => {
  assert.deepStrictEqual(
    extractAuthorMeta('kick', { isModerator: false, isSubscriber: true }),
    { avatar: '', isModerator: false, isSubscriber: true },
  );
});

test('plataforma desconocida o raw ausente: sin metadatos, nunca null', () => {
  assert.deepStrictEqual(extractAuthorMeta('otra', {}), NO_META);
  assert.deepStrictEqual(extractAuthorMeta('tiktok', undefined), NO_META);
});

test('raw malformado no lanza', () => {
  assert.deepStrictEqual(extractAuthorMeta('twitch', { tags: { badges: null } }), { avatar: '', isModerator: false, isSubscriber: false });
});
