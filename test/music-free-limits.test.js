'use strict';

const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const entitlements = require('../core/contracts/entitlements');
const { createMusicState } = require('../features/sonido/musica/state');
const { handleMusicRequest } = require('../features/sonido/musica/handle-request');
const { watchLiveReset } = require('../features/sonido/musica/live-reset');
const { LIVE_RESET_GRACE_MS } = require('../features/sonido/musica/free-limits');

afterEach(() => entitlements.provide(null));

function setup() {
  const broadcasts = [];
  const handlers = {};
  const bus = {
    emit(event, ...args) {
      if (event === 'config:get') {
        args[0]({ musicEnabled: true, musicVolume: 0.5, musicMaxQueue: 10, musicUserCooldownMs: 0, musicBannedUsers: [], playlistEnabled: false });
      } else if (event === 'ws:broadcast') broadcasts.push(args[0]);
    },
    on(event, fn) { handlers[event] = fn; },
  };
  const musicState = createMusicState();
  const logger = { log() {} };
  const engine = { ensureReady: () => Promise.reject(new Error('sin motor')) };
  return { deps: { musicState, bus, logger, engine }, broadcasts, handlers, musicState };
}
const req = (n) => ({ query: `cancion ${n}`, user: `u${n}`, userId: `id${n}`, platform: 'tiktok' });

test('Free: con 20 solicitudes usadas bloquea y avisa music-limit-reached', async () => {
  entitlements.provide(() => false);
  const { deps, broadcasts, musicState } = setup();
  musicState.liveRequests = 20;
  await handleMusicRequest(deps)(req(1));
  assert.ok(broadcasts.some((b) => b.type === 'music-limit-reached' && b.limit === 20));
  assert.ok(!broadcasts.some((b) => b.type === 'music-request-pending'));
});

test('Free: la cola se topa en 5 aunque la config diga 10', async () => {
  entitlements.provide(() => false);
  const { deps, broadcasts, musicState } = setup();
  musicState.queue = [1, 2, 3, 4, 5].map((i) => ({ videoId: `v${i}` }));
  await handleMusicRequest(deps)(req(1));
  assert.ok(!broadcasts.some((b) => b.type === 'music-request-pending'));
});

test('Free: solicitud fallida devuelve la cuota; Pro no cuenta', async () => {
  entitlements.provide(() => false);
  let ctx = setup();
  await handleMusicRequest(ctx.deps)(req(1));
  assert.equal(ctx.musicState.liveRequests, 0); // fallo del motor -> reembolso
  assert.ok(ctx.broadcasts.some((b) => b.type === 'music-request-failed'));

  entitlements.provide(() => true);
  ctx = setup();
  ctx.musicState.liveRequests = 99;
  await handleMusicRequest(ctx.deps)(req(2));
  assert.ok(ctx.broadcasts.some((b) => b.type === 'music-request-pending'));
  assert.equal(ctx.musicState.liveRequests, 99);
});

test('Reinicio: solo tras la gracia sin canales; reconectar a tiempo conserva el contador', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { deps, handlers, musicState } = setup();
    watchLiveReset(deps);
    musicState.liveRequests = 7;
    const lista = (n) => handlers['canal:estado']({ state: 'lista-canales', tiktok: Array(n).fill('x'), twitch: [], youtube: [], kick: [] });

    lista(0);
    mock.timers.tick(LIVE_RESET_GRACE_MS - 1000);
    lista(1); // reconexion breve
    mock.timers.tick(LIVE_RESET_GRACE_MS);
    assert.equal(musicState.liveRequests, 7);

    lista(0);
    mock.timers.tick(LIVE_RESET_GRACE_MS);
    assert.equal(musicState.liveRequests, 0);
  } finally { mock.timers.reset(); }
});
