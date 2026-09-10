'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  WATCHDOG_TIMEOUT_MS,
  armKickWatchdog,
  clearKickWatchdog,
} = require('../features/canales/kick/stale-watchdog');

// connect-kick.js llama armKickWatchdog() en CADA frame del socket Pusher
// (subscription_succeeded, pusher:pong del ping cada 100s, chat), no solo en
// CHAT_MESSAGE_EVENT. Estos tests fijan ese contrato: cualquier frame re-arma;
// solo el silencio total de frames dispara la reconexion.

test('el watchdog de Kick sigue disparando si NO llega ningun frame (socket muerto)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const state = { kickWatchdogTimers: new Map() };
  let stale = 0;

  armKickWatchdog({ state }, 'canal', () => { stale += 1; });
  t.mock.timers.tick(WATCHDOG_TIMEOUT_MS - 1);
  assert.equal(stale, 0);
  t.mock.timers.tick(1);
  assert.equal(stale, 1);

  clearKickWatchdog(state.kickWatchdogTimers, 'canal');
});

test('frames que NO son chat (pong del ping cada 100s) re-arman el watchdog: canal tranquilo no dispara', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const state = { kickWatchdogTimers: new Map() };
  let stale = 0;
  const onStale = () => { stale += 1; };

  // Simula 30 min de canal sin chat pero con el ping de Pusher entrando cada
  // 100s (el unico frame). Cada frame re-arma → nunca vence el timeout de 5 min.
  armKickWatchdog({ state }, 'canal', onStale);
  for (let i = 0; i < 18; i += 1) {
    t.mock.timers.tick(100 * 1000);
    armKickWatchdog({ state }, 'canal', onStale);
  }
  assert.equal(stale, 0);

  clearKickWatchdog(state.kickWatchdogTimers, 'canal');
});
