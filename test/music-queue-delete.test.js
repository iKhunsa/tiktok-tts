'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createMusicState } = require('../features/sonido/musica/state');
const { removeQueueItem, clearQueue } = require('../features/sonido/musica/routes/queue-delete');
const { handleMusicRequest } = require('../features/sonido/musica/handle-request');

function setup(queue = []) {
  const broadcasts = [];
  const bus = {
    emit(event, ...args) {
      if (event === 'config:get') {
        args[0]({ musicEnabled: true, musicVolume: 0.5, playlistEnabled: false, playlistShuffle: false });
      } else if (event === 'ws:broadcast') {
        broadcasts.push(args[0]);
      }
    },
  };
  const musicState = createMusicState();
  musicState.queue = queue;
  return { deps: { musicState, bus }, broadcasts, musicState };
}

function response() {
  const out = { statusCode: 200, body: null };
  out.status = (statusCode) => { out.statusCode = statusCode; return out; };
  out.json = (body) => { out.body = body; return out; };
  return out;
}

test('DELETE /api/music/queue/:index quita el elemento real y sincroniza clientes', () => {
  const first = { videoId: 'aaaaaaaaaaa', title: 'Primera' };
  const second = { videoId: 'bbbbbbbbbbb', title: 'Segunda' };
  const { deps, broadcasts, musicState } = setup([first, second]);
  const res = response();

  removeQueueItem(deps)({ params: { index: '1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.removed, second);
  assert.deepEqual(musicState.queue, [first]);
  assert.deepEqual(res.body.queue, [first]);
  assert.deepEqual(broadcasts[0], { type: 'music-queue-updated', queue: [first] });
  assert.equal(broadcasts[1].type, 'music-state');
  assert.equal(broadcasts[1].queueLength, 1);
});

test('DELETE /api/music/queue/:index rechaza indices ambiguos o fuera de rango', () => {
  for (const index of ['-1', '1.5', '1x', '', '9007199254740992']) {
    const { deps } = setup([{ title: 'Solo' }]);
    const res = response();
    removeQueueItem(deps)({ params: { index } }, res);
    assert.equal(res.statusCode, 400, index);
  }

  const { deps } = setup([{ title: 'Solo' }]);
  const res = response();
  removeQueueItem(deps)({ params: { index: '1' } }, res);
  assert.equal(res.statusCode, 404);
});

test('DELETE /api/music/queue vacia la cola e invalida resoluciones pendientes', () => {
  const { deps, broadcasts, musicState } = setup([{ title: 'Uno' }, { title: 'Dos' }]);
  const res = response();

  clearQueue(deps)({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.removedCount, 2);
  assert.deepEqual(musicState.queue, []);
  assert.equal(musicState.queueGeneration, 1);
  assert.deepEqual(broadcasts[0], { type: 'music-queue-updated', queue: [] });
});

test('vaciar la cola evita que una solicitud !p pendiente reaparezca al resolverse', async () => {
  const broadcasts = [];
  const musicState = createMusicState();
  let resolveInfo;
  const bus = {
    emit(event, ...args) {
      if (event === 'config:get') {
        args[0]({
          musicEnabled: true, musicUserCooldownMs: 0, musicMaxQueue: 10,
          musicBannedUsers: [], playlistEnabled: false, playlistShuffle: false, musicVolume: 0.5,
        });
      } else if (event === 'ws:broadcast') {
        broadcasts.push(args[0]);
      }
    },
  };
  const deps = {
    musicState,
    bus,
    logger: { log() {} },
    engine: {
      ensureReady: async () => {},
      getInfo: () => new Promise((resolve) => { resolveInfo = resolve; }),
    },
  };

  const pending = handleMusicRequest(deps)({
    query: 'abcdefghijk', user: 'Viewer', userId: 'u1', platform: 'tiktok',
  });
  while (!resolveInfo) await new Promise((resolve) => setTimeout(resolve, 0));

  clearQueue(deps)({}, response());
  resolveInfo({ videoId: 'abcdefghijk', title: 'No debe volver', channelName: '', thumbnail: '', duration: '' });
  await pending;

  assert.deepEqual(musicState.queue, []);
  assert.ok(broadcasts.some((entry) => entry.type === 'music-request-cancelled'));
  assert.ok(!broadcasts.some((entry) => entry.type === 'music-queued'));
});
