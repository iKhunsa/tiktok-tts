'use strict';

// Bug 02: watchdog de socket mudo compartido TikTok/Twitch. Arma, re-arma con
// actividad, dispara onStale solo tras el timeout sin actividad, no deja
// timers colgados (unref + clearWatchdog).

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { armWatchdog, clearWatchdog, WATCHDOG_TIMEOUT_MS } = require('../features/canales/stale-watchdog');

const makeState = () => ({ channelWatchdogTimers: new Map() });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('WATCHDOG_TIMEOUT_MS es 5 min (no 4)', () => {
  assert.equal(WATCHDOG_TIMEOUT_MS, 5 * 60 * 1000);
});

test('dispara onStale una sola vez tras el timeout sin actividad', async () => {
  const state = makeState();
  let fired = 0;
  armWatchdog(state, 'tiktok:a', 40, () => { fired++; });
  await wait(90);
  assert.equal(fired, 1);
});

test('re-armar con actividad pospone onStale', async () => {
  const state = makeState();
  let fired = 0;
  const onStale = () => { fired++; };
  armWatchdog(state, 'twitch:b', 60, onStale);
  await wait(40);
  armWatchdog(state, 'twitch:b', 60, onStale); // "llego un mensaje" -> re-arma
  await wait(40);
  assert.equal(fired, 0, 'no disparo: el re-arme reinicio la cuenta');
  await wait(40);
  assert.equal(fired, 1, 'disparo recien 60ms despues del ultimo re-arme');
  clearWatchdog(state, 'twitch:b');
});

test('clearWatchdog cancela el timer y limpia el Map', async () => {
  const state = makeState();
  let fired = 0;
  armWatchdog(state, 'tiktok:c', 20, () => { fired++; });
  clearWatchdog(state, 'tiktok:c');
  assert.equal(state.channelWatchdogTimers.size, 0);
  await wait(50);
  assert.equal(fired, 0);
});

test('el timer hace unref: no mantiene el proceso vivo', () => {
  const state = makeState();
  armWatchdog(state, 'tiktok:d', 10_000, () => {});
  const timer = state.channelWatchdogTimers.get('tiktok:d');
  assert.equal(typeof timer.hasRef === 'function' ? timer.hasRef() : true, false);
  clearWatchdog(state, 'tiktok:d');
});

test('re-armar reemplaza el timer viejo (no se acumulan)', () => {
  const state = makeState();
  armWatchdog(state, 'k', 1000, () => {});
  const first = state.channelWatchdogTimers.get('k');
  armWatchdog(state, 'k', 1000, () => {});
  assert.notEqual(state.channelWatchdogTimers.get('k'), first);
  assert.equal(state.channelWatchdogTimers.size, 1);
  clearWatchdog(state, 'k');
});
