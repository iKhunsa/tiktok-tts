'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { WATCHDOG_TIMEOUT_MS, armWatchdog, clearWatchdogTimer, nextConfirmBackoffMs } = require('../features/canales/youtube/chat-watchdog');
const { createChannelState } = require('../features/canales/state/channel-maps');
const { createStubLogger } = require('./helpers/stub-logger');

test('el watchdog de YouTube tolera >= 8 min de silencio de chat', () => {
  assert.ok(WATCHDOG_TIMEOUT_MS >= 8 * 60 * 1000, `timeout ${WATCHDOG_TIMEOUT_MS} < 8 min`);
});

test('armWatchdog dispara onStale al vencer el timeout (conexion muerta se sigue detectando)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const state = { youtubeWatchdogTimers: new Map() };
  let stale = 0;
  const target = { key: 'uc-1' };

  armWatchdog({ state }, target, () => { stale += 1; });
  t.mock.timers.tick(WATCHDOG_TIMEOUT_MS - 1);
  assert.equal(stale, 0);
  t.mock.timers.tick(1);
  assert.equal(stale, 1);

  clearWatchdogTimer(state.youtubeWatchdogTimers, target.key);
});

test('re-armar el watchdog en cada chat impide el onStale de un stream lento', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const state = { youtubeWatchdogTimers: new Map() };
  let stale = 0;
  const target = { key: 'uc-2' };
  const onStale = () => { stale += 1; };

  // Chat cada ~5 min: siempre por debajo del timeout, nunca dispara.
  armWatchdog({ state }, target, onStale);
  for (let i = 0; i < 6; i += 1) {
    t.mock.timers.tick(5 * 60 * 1000);
    armWatchdog({ state }, target, onStale);
  }
  assert.equal(stale, 0);
  clearWatchdogTimer(state.youtubeWatchdogTimers, target.key);
});

test('youtubeSeenIds existe como segunda capa de dedup (sin ventana de tiempo, huecos largos)', () => {
  // Restaurado: el gate central (emit-chat-message.js) tiene ventana de 10min,
  // pero youtube-chat re-scrapea la pagina del live en cada reconexion y puede
  // reentregar backlog mas viejo que eso. youtubeSeenIds (cap de conteo, sin
  // ventana) es la defensa que sobrevive huecos largos, igual que kickSeenIds.
  const state = createChannelState();
  assert.ok(state.youtubeSeenIds instanceof Map);
});

test('nextConfirmBackoffMs duplica hasta el tope, nunca lo pasa', () => {
  const { CONFIRM_BACKOFF_CAP_MS } = require('../features/canales/youtube/chat-watchdog');
  let ms = WATCHDOG_TIMEOUT_MS;
  ms = nextConfirmBackoffMs(ms);
  assert.equal(ms, WATCHDOG_TIMEOUT_MS * 2);
  ms = nextConfirmBackoffMs(ms);
  assert.equal(ms, WATCHDOG_TIMEOUT_MS * 4);
  ms = nextConfirmBackoffMs(ms);
  assert.equal(ms, CONFIRM_BACKOFF_CAP_MS);
  ms = nextConfirmBackoffMs(ms);
  assert.equal(ms, CONFIRM_BACKOFF_CAP_MS, 'no pasa el tope aunque se llame de nuevo');
});

// --- Tests de integracion de connectYoutube con la confirmacion activa ---
//
// Stub de 'youtube-chat' y 'youtube-chat/dist/requests' via require.cache,
// mismo patron que test/canales-twitch-connect.test.js con tmi.js:
// connect-youtube.js hace ambos require lazily dentro de la funcion, asi que
// basta con sembrar la cache antes de requerir el modulo bajo prueba.

const YOUTUBE_CHAT_PATH = require.resolve('youtube-chat');
const REQUESTS_PATH = require.resolve('youtube-chat/dist/requests');
const CONNECT_YOUTUBE_PATH = require.resolve('../features/canales/youtube/connect-youtube');
const CHANNEL_ID = 'UCabcdefghijklmnopqrstuv'; // matches /^UC[a-zA-Z0-9_-]{20,}$/

async function withStubYoutube({ startResult = true, fetchLivePageImpl } = {}, run) {
  const prevYC = require.cache[YOUTUBE_CHAT_PATH];
  const prevReq = require.cache[REQUESTS_PATH];
  const instances = [];
  class FakeLiveChat extends EventEmitter {
    constructor(opts) { super(); this.opts = opts; instances.push(this); }
    start() { return Promise.resolve(startResult); }
    stop() { /* stopYoutubeChat ya envuelve esto en try/catch, no hace falta emitir nada */ }
  }
  require.cache[YOUTUBE_CHAT_PATH] = {
    id: YOUTUBE_CHAT_PATH, filename: YOUTUBE_CHAT_PATH, loaded: true,
    exports: { LiveChat: FakeLiveChat },
  };
  require.cache[REQUESTS_PATH] = {
    id: REQUESTS_PATH, filename: REQUESTS_PATH, loaded: true,
    exports: { fetchLivePage: fetchLivePageImpl || (() => Promise.resolve({})) },
  };
  delete require.cache[CONNECT_YOUTUBE_PATH];
  try {
    const { connectYoutube } = require(CONNECT_YOUTUBE_PATH);
    return await run(connectYoutube, { instances });
  } finally {
    if (prevYC) require.cache[YOUTUBE_CHAT_PATH] = prevYC; else delete require.cache[YOUTUBE_CHAT_PATH];
    if (prevReq) require.cache[REQUESTS_PATH] = prevReq; else delete require.cache[REQUESTS_PATH];
    delete require.cache[CONNECT_YOUTUBE_PATH];
  }
}

function deps() {
  const state = createChannelState();
  return { state, bus: new EventEmitter(), logger: createStubLogger() };
}

// Deja correr los .then/.catch encolados por la confirmacion async antes de
// seguir aserteando (setTimeout esta mockeado, las promesas no).
async function flushMicrotasks(times = 10) {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}

test('chat activo y frecuente: el watchdog nunca dispara onStale', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  await withStubYoutube({}, async (connectYoutube, { instances }) => {
    const d = deps();
    await connectYoutube(d, CHANNEL_ID);

    for (let i = 0; i < 6; i += 1) {
      t.mock.timers.tick(5 * 60 * 1000);
      instances[0].emit('chat', { id: `msg-${i}` });
      await flushMicrotasks();
    }

    assert.equal(
      d.logger.entries.some((e) => e.event === 'canales.youtube.chat_estancado'),
      false,
      'chat frecuente no debe disparar chat_estancado'
    );
    assert.equal(d.state.youtubeChannels.get(CHANNEL_ID), instances[0], 'sigue siendo la misma conexion');
  });
});

test('silencio de 8+ min pero la pagina live confirma que el stream sigue sano: NO reconecta', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let fetchLivePageCalls = 0;
  await withStubYoutube({
    fetchLivePageImpl: (opts) => { fetchLivePageCalls += 1; return Promise.resolve({ liveId: 'x', apiKey: 'k', clientVersion: 'v', continuation: 'c', ...opts }); },
  }, async (connectYoutube, { instances }) => {
    const d = deps();
    await connectYoutube(d, CHANNEL_ID);

    t.mock.timers.tick(WATCHDOG_TIMEOUT_MS);
    await flushMicrotasks();

    assert.equal(fetchLivePageCalls, 1, 'la confirmacion activa se disparo una vez');
    assert.equal(d.state.youtubeChannels.get(CHANNEL_ID), instances[0], 'sigue siendo la misma conexion, no se reconecto');
    assert.equal(
      d.logger.entries.some((e) => e.event === 'canales.youtube.chat_estancado'),
      false,
      'silencio sano no debe promoverse a chat_estancado'
    );
    const sano = d.logger.entries.find((e) => e.event === 'canales.youtube.chat_silencio_confirmado_sano');
    assert.ok(sano, 'se loguea el silencio confirmado sano');
    assert.equal(sano.level, 'info', 'silencio sano es info, no warning');
    assert.equal(sano.data.confirmado, true);
    assert.equal(sano.data.channel, CHANNEL_ID);
    assert.ok(sano.data.msSinceLastMessage >= WATCHDOG_TIMEOUT_MS);

    assert.equal(
      d.logger.entries.some((e) => e.event === 'canales.youtube.reconectando'),
      false,
      'no se agenda reconexion'
    );
  });
});

test('silencio de 8+ min y la confirmacion falla (stream ya no en vivo): SI reconecta', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  await withStubYoutube({
    fetchLivePageImpl: () => Promise.reject(new Error('Live Stream was not found')),
  }, async (connectYoutube, { instances }) => {
    const d = deps();
    await connectYoutube(d, CHANNEL_ID);

    t.mock.timers.tick(WATCHDOG_TIMEOUT_MS);
    await flushMicrotasks();

    const estancado = d.logger.entries.find((e) => e.event === 'canales.youtube.chat_estancado');
    assert.ok(estancado, 'se loguea chat_estancado cuando la confirmacion falla');
    assert.equal(estancado.level, 'warn');
    assert.equal(estancado.data.confirmado, false);
    assert.equal(estancado.data.motivo, 'Live Stream was not found');
    assert.equal(estancado.data.channel, CHANNEL_ID);

    assert.equal(d.state.youtubeChannels.has(CHANNEL_ID), false, 'la conexion vieja se desconecto');
    assert.ok(d.state.youtubeReconnectTimers.has(CHANNEL_ID), 'se agendo la reconexion');

    const reconectando = d.logger.entries.find((e) => e.event === 'canales.youtube.reconectando');
    assert.ok(reconectando, 'se loguea el intento de reconexion');
    assert.equal(reconectando.data.motivo, 'stale-confirmado');
  });
});

test("liveChat.on('error') sigue reconectando directo, sin pasar por la confirmacion", async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let fetchLivePageCalls = 0;
  await withStubYoutube({
    fetchLivePageImpl: () => { fetchLivePageCalls += 1; return Promise.resolve({}); },
  }, async (connectYoutube, { instances }) => {
    const d = deps();
    await connectYoutube(d, CHANNEL_ID);

    instances[0].emit('error', new Error('boom de parseChatData'));
    await flushMicrotasks();

    assert.equal(fetchLivePageCalls, 0, "'error' no invoca la confirmacion activa, reconecta directo");
    const errLog = d.logger.entries.find((e) => e.event === 'canales.youtube.error');
    assert.ok(errLog, 'se loguea canales.youtube.error como antes');
    assert.equal(d.state.youtubeChannels.has(CHANNEL_ID), false, 'la conexion vieja se desconecto');
    assert.ok(d.state.youtubeReconnectTimers.has(CHANNEL_ID), 'se agendo la reconexion');
  });
});
