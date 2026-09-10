'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { advanceMusicQueue } = require('../features/sonido/musica/advance-queue');
const { createMusicState } = require('../features/sonido/musica/state');

function fakeDeps({ musicState, search, config }) {
  const broadcasts = [];
  const bus = {
    emit(event, ...args) {
      if (event === 'config:get') { args[0]({ playlistEnabled: true, playlistShuffle: false, ...config }); return; }
      if (event === 'ws:broadcast') { broadcasts.push(args[0]); return; }
      // sonido:musica-estado y otros: ignorar
    },
  };
  return {
    broadcasts,
    deps: {
      musicState,
      bus,
      logger: { log() {} },
      engine: { search, getInfo: async () => null },
      lazyRetryDelayMs: 0,
    },
  };
}

function waitFor(pred, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (pred()) return resolve();
      if (Date.now() - t0 > timeoutMs) return reject(new Error('timeout esperando condicion'));
      setTimeout(tick, 10);
    };
    tick();
  });
}

test('playlist entera irresoluble (yt-dlp nunca resuelve) frena en idle, no loopea', async () => {
  const musicState = createMusicState();
  musicState.playlistResolved = [
    { videoId: null, raw: 'tema uno' },
    { videoId: null, raw: 'tema dos' },
    { videoId: null, raw: 'tema tres' },
  ];
  let searchCalls = 0;
  const { broadcasts, deps } = fakeDeps({
    musicState,
    search: async () => { searchCalls++; throw new Error('rate limited'); },
  });

  advanceMusicQueue(deps);

  await waitFor(() => broadcasts.some((b) => b.type === 'music-idle'));
  // se dejó de intentar
  const callsAlIdle = searchCalls;
  await new Promise((r) => setTimeout(r, 100));

  assert.equal(musicState.currentTrack, null);
  assert.equal(musicState.playlistActive, false);
  assert.equal(searchCalls, callsAlIdle, 'no debe seguir spawneando resoluciones tras frenar');
  assert.ok(searchCalls <= musicState.playlistResolved.length + 1, 'acotado al tamaño de la playlist');
  assert.equal(musicState.playlistResolveFails, 0, 'contador reseteado al frenar');
});

test('una resolucion exitosa resetea el contador de fallos', async () => {
  const musicState = createMusicState();
  musicState.playlistResolved = [
    { videoId: null, raw: 'falla' },
    { videoId: null, raw: 'anda' },
  ];
  let n = 0;
  const { broadcasts, deps } = fakeDeps({
    musicState,
    search: async () => {
      n++;
      if (n === 1) throw new Error('transitorio');
      return { videoId: 'abc123', title: 'Anda', channelName: '', thumbnail: '', duration: '' };
    },
  });

  advanceMusicQueue(deps);

  await waitFor(() => broadcasts.some((b) => b.type === 'music-now-playing'));
  assert.equal(musicState.currentTrack.videoId, 'abc123');
  assert.equal(musicState.playlistResolveFails, 0);
});
