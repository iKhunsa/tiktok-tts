'use strict';

// Bug 04: el scheduler de promo no debe reiniciar la cuenta [15, 45, 60] en una
// reconexion transitoria (caida total y vuelta en < 5 min). Solo una sesion
// genuinamente nueva (sin canales > 5 min) reinicia.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const entitlements = require('../core/contracts/entitlements');

// check('sin-promos') -> false => los avisos SUENAN (aislar el test del gate Pro).
entitlements.provide(() => false);

const MIN = 60 * 1000;

function freshPromo() {
  delete require.cache[require.resolve('../features/promo/index.js')];
  delete require.cache[require.resolve('../features/promo/session-scheduler')];
  return require('../features/promo/index.js');
}

function makeHarness() {
  const listeners = {};
  const fired = [];
  const bus = {
    emit(event, payload) { (listeners[event] || []).forEach((fn) => fn(payload)); },
    on(event, fn) { (listeners[event] = listeners[event] || []).push(fn); },
  };
  const logger = {
    log(level, domain, loc, event) { if (event === 'promo.autopromocion.disparada') fired.push(Date.now()); },
  };
  return { bus, logger, fired };
}

const lista = (n) => ({
  state: 'lista-canales',
  tiktok: Array.from({ length: n }, (_, i) => `c${i}`),
  twitch: [], youtube: [], kick: [],
});

test('reconexion en < 5 min NO reinicia el schedule (primer aviso sigue a los 15 min del connect original)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const promo = freshPromo();
  const { bus, logger, fired } = makeHarness();
  promo.register({ bus, logger });

  bus.emit('canal:estado', lista(1));        // t=0  conecta
  t.mock.timers.tick(10 * MIN);              // t=10 caida total
  bus.emit('canal:estado', lista(0));
  t.mock.timers.tick(2 * MIN);               // t=12 reconecta (dentro de la gracia)
  bus.emit('canal:estado', lista(1));

  t.mock.timers.tick(2 * MIN);               // t=14
  assert.equal(fired.length, 0, 'aun no: el schedule original va a los 15 min');
  t.mock.timers.tick(1 * MIN + 1000);        // t=15
  assert.equal(fired.length, 1, 'disparo a los 15 del connect original, no reiniciado a 12+15');

  promo.shutdown();
});

test('caida total > 5 min SI reinicia el schedule (sesion nueva)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const promo = freshPromo();
  const { bus, logger, fired } = makeHarness();
  promo.register({ bus, logger });

  bus.emit('canal:estado', lista(1));        // t=0  conecta
  t.mock.timers.tick(5 * MIN);               // t=5  caida total
  bus.emit('canal:estado', lista(0));
  t.mock.timers.tick(7 * MIN);               // t=12 la gracia (5 min) se cumplio en t=10 -> stop()

  assert.equal(fired.length, 0, 'el schedule original (aviso a los 15) fue cancelado por el stop()');

  bus.emit('canal:estado', lista(1));        // t=12 reconecta = sesion nueva
  t.mock.timers.tick(14 * MIN + 1000);       // t=26
  assert.equal(fired.length, 0, 'todavia no: cuenta [15..] arranca desde la reconexion');
  t.mock.timers.tick(1 * MIN);               // t=27 (= 12 + 15)
  assert.equal(fired.length, 1, 'primer aviso 15 min despues de la sesion nueva');

  promo.shutdown();
});

test('cadencia en estado estable intacta: 15 -> 45 -> 60 -> 90 -> 90', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const promo = freshPromo();
  const { bus, logger, fired } = makeHarness();
  promo.register({ bus, logger });

  bus.emit('canal:estado', lista(2));        // conecta, nunca se cae

  t.mock.timers.tick(15 * MIN + 1000);
  assert.equal(fired.length, 1, '15 min');
  t.mock.timers.tick(45 * MIN);
  assert.equal(fired.length, 2, '+45 min');
  t.mock.timers.tick(60 * MIN);
  assert.equal(fired.length, 3, '+60 min');
  t.mock.timers.tick(90 * MIN);
  assert.equal(fired.length, 4, '+90 min (repeat)');
  t.mock.timers.tick(90 * MIN);
  assert.equal(fired.length, 5, '+90 min (repeat)');

  promo.shutdown();
});

test('sumar un canal a una sesion viva no reinicia ni arma gracia', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const promo = freshPromo();
  const { bus, logger, fired } = makeHarness();
  promo.register({ bus, logger });

  bus.emit('canal:estado', lista(1));        // t=0
  t.mock.timers.tick(10 * MIN);
  bus.emit('canal:estado', lista(2));        // t=10 suma Twitch/otro TikTok
  t.mock.timers.tick(5 * MIN + 1000);        // t=15
  assert.equal(fired.length, 1, 'aviso a los 15 del connect original, sin reinicio');

  promo.shutdown();
});
