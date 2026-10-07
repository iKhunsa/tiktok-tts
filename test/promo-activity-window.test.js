'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registrarMensaje, personasDistintas, reiniciar } = require('../features/promo/activity-window');
const { registrarViewers, totalViewers, reiniciar: reiniciarViewers } = require('../features/promo/viewers-snapshot');
const { hayAudiencia } = require('../features/promo/audience-check');

const MIN = 60 * 1000;

function limpio(t) {
  t.mock.timers.enable({ apis: ['Date'] });
  reiniciar();
  reiniciarViewers();
}

test('una persona con muchos mensajes cuenta como una', (t) => {
  limpio(t);
  for (let i = 0; i < 100; i++) registrarMensaje('tiktok:a');
  assert.equal(personasDistintas(), 1);
});

test('una persona sale de la ventana a los 5 min', (t) => {
  limpio(t);
  registrarMensaje('tiktok:a');
  t.mock.timers.tick(4 * MIN);
  registrarMensaje('twitch:b');
  t.mock.timers.tick(2 * MIN);
  assert.equal(personasDistintas(), 1, 'solo queda la ultima');
});

test('reiniciar vacia la ventana', (t) => {
  limpio(t);
  registrarMensaje('tiktok:a');
  reiniciar();
  assert.equal(personasDistintas(), 0);
});

test('viewerCount: solo TikTok, suma canales y descarta datos viejos', (t) => {
  limpio(t);
  registrarViewers({ platform: 'tiktok', channel: 'a', viewerCount: 4 });
  registrarViewers({ platform: 'tiktok', channel: 'b', viewerCount: 3 });
  registrarViewers({ platform: 'twitch', channel: 'c', viewerCount: 50 });
  assert.equal(totalViewers(), 7);
  t.mock.timers.tick(4 * MIN);
  assert.equal(totalViewers(), 0, 'dato de mas de 3 min se ignora');
});

test('hayAudiencia: viewers > 5, o 5 personas, o ninguna', (t) => {
  limpio(t);
  assert.equal(hayAudiencia().ok, false);

  registrarViewers({ platform: 'tiktok', channel: 'a', viewerCount: 5 });
  assert.equal(hayAudiencia().ok, false, '5 no supera 5');
  registrarViewers({ platform: 'tiktok', channel: 'a', viewerCount: 6 });
  assert.equal(hayAudiencia().ok, true, 'solo viewers');

  reiniciarViewers();
  for (const id of ['a', 'b', 'c', 'd']) registrarMensaje(`youtube:${id}`);
  assert.equal(hayAudiencia().ok, false, '4 personas no alcanzan');
  registrarMensaje('youtube:e');
  assert.equal(hayAudiencia().ok, true, 'solo chat (viewerCount en TikTok bajo o ausente)');
});
