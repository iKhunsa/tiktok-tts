'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createOverlayState } = require('../features/overlay/state/overlay-state');
const { addDonor, addFollower, addSharer, creditsToJSON } = require('../features/overlay/state/credits');
const { resetOverlayState } = require('../features/overlay/state/reset');

test('creditos: agrega por usuario, mantiene shape y orden por recencia', () => {
  const { credits } = createOverlayState();
  addDonor(credits, { platform: 'tiktok', userId: 'a', user: 'Ana', giftName: 'Rose', count: 2 });
  addDonor(credits, { platform: 'tiktok', userId: 'a', user: 'Ana', giftName: 'Rose', count: 3 });
  addDonor(credits, { platform: 'tiktok', userId: 'a', user: 'Ana', giftName: 'Lion', count: 1 });
  addFollower(credits, { platform: 'twitch', userId: 'b', user: 'Bob' });
  addFollower(credits, { platform: 'tiktok', userId: 'a', user: 'Ana' });
  addFollower(credits, { platform: 'twitch', userId: 'b', user: 'Bob' });
  addSharer(credits, { platform: 'tiktok', user: 'Cy' });
  addSharer(credits, { platform: 'tiktok', user: 'Cy' });

  const j = creditsToJSON(credits);
  assert.deepStrictEqual(j.donors, [
    { user: 'Ana', giftName: 'Rose', count: 5 },
    { user: 'Ana', giftName: 'Lion', count: 1 },
  ]);
  assert.deepStrictEqual(j.followers.map((f) => f.user), ['Ana', 'Bob']); // Bob repite -> al final
  assert.strictEqual(j.sharers.length, 1);
  assert.strictEqual(j.sharers[0].count, 2);
});

test('creditos: resetOverlayState los vacia', () => {
  const state = createOverlayState();
  addFollower(state.credits, { platform: 'tiktok', userId: 'a', user: 'Ana' });
  resetOverlayState(state);
  assert.deepStrictEqual(creditsToJSON(state.credits), { donors: [], followers: [], sharers: [] });
});
