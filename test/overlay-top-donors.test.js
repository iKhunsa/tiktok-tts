'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createOverlayState } = require('../features/overlay/state/overlay-state');
const { addTopEntry } = require('../features/overlay/state/add-top-entry');
const { rankTop } = require('../features/overlay/state/rank-top');
const { resetOverlayState } = require('../features/overlay/state/reset');

test('top donadores: acumula coins por usuario, ordena desc y respeta n', () => {
  const { topDonors } = createOverlayState();
  addTopEntry(topDonors, 'totalCoins', { user: 'Ana', amount: 100 });
  addTopEntry(topDonors, 'totalCoins', { user: 'Bob', amount: 500 });
  addTopEntry(topDonors, 'totalCoins', { user: 'Ana', amount: 450 });
  addTopEntry(topDonors, 'totalCoins', { user: 'Cy', amount: 10 });

  assert.deepStrictEqual(
    rankTop(topDonors, 'totalCoins', 2).map(({ user, totalCoins }) => ({ user, totalCoins })),
    [{ user: 'Ana', totalCoins: 550 }, { user: 'Bob', totalCoins: 500 }],
  );
});

test('top: conserva el ultimo avatar conocido y no lo pisa con uno vacio', () => {
  const { topLikers } = createOverlayState();
  addTopEntry(topLikers, 'totalLikes', { user: 'Ana', amount: 1, avatar: 'https://cdn/ana.jpeg' });
  addTopEntry(topLikers, 'totalLikes', { user: 'Ana', amount: 1 });

  assert.strictEqual(topLikers.get('Ana').avatar, 'https://cdn/ana.jpeg');
});

test('top: usuario sin avatar queda con string vacio, no null', () => {
  const { topLikers } = createOverlayState();
  addTopEntry(topLikers, 'totalLikes', { user: 'Bob', amount: 3 });

  assert.strictEqual(topLikers.get('Bob').avatar, '');
});

test('top donadores: resetOverlayState lo vacia', () => {
  const state = createOverlayState();
  addTopEntry(state.topDonors, 'totalCoins', { user: 'Ana', amount: 1 });
  resetOverlayState(state);
  assert.strictEqual(state.topDonors.size, 0);
});
