'use strict';

// live-status/check-live.js: despacho por plataforma y, sobre todo, que un
// fallo NUNCA se confunda con "offline" (le cortaria el en-vivo a un streamer
// por un problema de red o de la API).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkLive } = require('../features/canales/live-status/check-live');

const deps = (o) => ({
  twitchEnVivo: async () => null,
  kickEnVivo: async () => null,
  youtubeEnVivo: async () => null,
  ...o,
});

test('twitch: pasa el login y devuelve el booleano', async () => {
  let recibido;
  const d = deps({ twitchEnVivo: async (login) => { recibido = login; return true; } });
  assert.equal(await checkLive('twitch', 'ana', d), true);
  assert.equal(recibido, 'ana');
  assert.equal(await checkLive('twitch', 'ana', deps({ twitchEnVivo: async () => false })), false);
});

test('kick: devuelve isLive', async () => {
  assert.equal(await checkLive('kick', 'bob', deps({ kickEnVivo: async () => true })), true);
  assert.equal(await checkLive('kick', 'bob', deps({ kickEnVivo: async () => false })), false);
});

test('youtube: devuelve lo que diga su chequeo', async () => {
  assert.equal(await checkLive('youtube', '@c', deps({ youtubeEnVivo: async () => true })), true);
  assert.equal(await checkLive('youtube', '@c', deps({ youtubeEnVivo: async () => false })), false);
});

test('si la consulta lanza (red caida, API 5xx...) -> null, NO false', async () => {
  const falla = async () => { throw new Error('ECONNRESET'); };
  assert.equal(await checkLive('twitch', 'a', deps({ twitchEnVivo: falla })), null);
  assert.equal(await checkLive('kick', 'a', deps({ kickEnVivo: falla })), null);
  assert.equal(await checkLive('youtube', 'a', deps({ youtubeEnVivo: falla })), null);
});

test('una respuesta que no es booleana -> null', async () => {
  assert.equal(await checkLive('twitch', 'a', deps({ twitchEnVivo: async () => 'yes' })), null);
  assert.equal(await checkLive('kick', 'a', deps({ kickEnVivo: async () => undefined })), null);
});

test('plataforma desconocida (tiktok) -> null', async () => {
  assert.equal(await checkLive('tiktok', 'a', deps({})), null);
});

test('contrato por defecto (sin servicio de cuentas): twitch da null, no false', async () => {
  const contrato = require('../core/contracts/live-check');
  assert.equal(await contrato.twitchEnVivo('ana'), null);
});
