'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { WATCHDOG_TIMEOUT_MS, armWatchdog, clearWatchdogTimer } = require('../features/canales/youtube/chat-watchdog');
const { createChannelState } = require('../features/canales/state/channel-maps');

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
