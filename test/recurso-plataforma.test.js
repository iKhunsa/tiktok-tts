'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const cargar = () => import('../interfaz/compartido/recurso-plataforma.js');

test('Bits usa el cheermote de su nivel', async () => {
  const { recursoDeEvento } = await cargar();
  const nivel = (amount) => recursoDeEvento({ kind: 'cheer', platform: 'twitch', amount }).src.match(/animated\/(\d+)\//)[1];
  assert.deepEqual([0, 1, 99, 100, 999, 1000, 5000, 10000, 99999].map(nivel), ['1', '1', '1', '100', '100', '1000', '5000', '10000', '10000']);
});

test('Kicks usa el regalo de su nivel y sin cantidad conserva el logo', async () => {
  const { recursoDeEvento } = await cargar();
  const nivel = (amount) => recursoDeEvento({ kind: 'kicksgift', platform: 'kick', amount }).src.match(/gifts\/(\d+)-kick/)[1];
  assert.deepEqual([1, 49, 100, 499, 500, 1000, 5000, 10000, 99999].map(nivel), ['1', '10', '100', '100', '500', '1000', '5000', '10000', '50000']);
  assert.equal(recursoDeEvento({ kind: 'kicksgift', platform: 'kick', amount: 100 }).reserva, 'icons/kick-logo.svg');
  assert.equal(recursoDeEvento({ kind: 'kicksgift', platform: 'kick', amount: 0 }).src, 'icons/kick-logo.svg');
});

test('cada plataforma usa su propio recurso y TikTok conserva el suyo', async () => {
  const { recursoDeEvento } = await cargar();
  assert.equal(recursoDeEvento({ kind: 'kicksgift', platform: 'kick' }).src, 'icons/kick-logo.svg');
  assert.equal(recursoDeEvento({ kind: 'sub', platform: 'twitch' }).src, 'icons/twitch-logo.svg');
  assert.equal(recursoDeEvento({ type: 'superchat', platform: 'youtube' }).src, 'icons/youtube-logo.svg');
  assert.deepEqual(recursoDeEvento({ platform: 'youtube', sticker: 'https://x/s.png' }), { src: 'https://x/s.png', reserva: 'icons/youtube-logo.svg' });
  assert.equal(recursoDeEvento({ platform: 'tiktok' }), null);
});

test('el texto del regalo sale de kind, o del nombre real', async () => {
  const { etiquetaRegalo } = await cargar();
  const t = (clave, vars) => `${clave}:${vars ? Object.values(vars)[0] : ''}`;
  assert.equal(etiquetaRegalo(t, { kind: 'cheer', amount: 5 }), 'overlayStr.cheerBits:5');
  assert.equal(etiquetaRegalo(t, { kind: 'kicksgift', amount: 9 }), 'overlayStr.kicksGifted:9');
  assert.equal(etiquetaRegalo(t, { giftName: 'Rose' }), 'Rose');
});

test('si la imagen falla prueba la reserva y despues avisa', async () => {
  const { cargarRecurso } = await cargar();
  const imagen = {};
  let fallos = 0;
  cargarRecurso(imagen, { src: 'cdn.gif', reserva: 'logo.svg' }, () => { fallos += 1; });
  assert.equal(imagen.src, 'cdn.gif');
  imagen.onerror();
  assert.equal(imagen.src, 'logo.svg');
  assert.equal(fallos, 0);
  imagen.onerror();
  assert.equal(fallos, 1);
});

test('cada nivel de prueba de las alertas es valido y su inicial coincide con la muestra', async () => {
  const { EVENTOS_ALERTA } = await import('../interfaz/compartido/eventos-alerta.js');
  for (const id of ['bits', 'kicks', 'superchat', 'supersticker']) {
    const { muestras, inicial, muestra } = EVENTOS_ALERTA[id];
    assert.ok(muestras.every(({ etiqueta, amount }) => etiqueta && amount), id);
    assert.ok(muestras[inicial], id);
    if (id !== 'bits') assert.equal(muestras[inicial].amount, muestra.amount, id);
  }
});
