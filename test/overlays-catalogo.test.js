const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = resolve(__dirname, '..');
const importar = (ruta) => import(pathToFileURL(resolve(raiz, ruta)).href);
const hojas = (objeto) => Object.values(objeto).flatMap((v) => (typeof v === 'object' ? hojas(v) : [v]));

test('los 24 overlays estan en una sola categoria, con esquema y plataformas', async () => {
  const { CATEGORIAS, PLATAFORMAS_OVERLAY } = await importar('interfaz/src/vistas/principal/overlays-catalogo/catalogo.js');
  const { ESQUEMAS } = await importar('interfaz/compartido/estilo/esquemas.js');
  const ids = CATEGORIAS.flatMap((categoria) => categoria.overlays);
  assert.equal(ids.length, 24);
  assert.equal(new Set(ids).size, 24, 'un overlay repetido en dos categorias');
  for (const id of ids) {
    assert.ok(ESQUEMAS[id], `${id} sin esquema`);
    assert.ok(PLATAFORMAS_OVERLAY[id].length, `${id} sin plataformas`);
    for (const plataforma of PLATAFORMAS_OVERLAY[id]) {
      assert.ok(existsSync(resolve(raiz, `interfaz/publico/icons/${plataforma}-logo.svg`)), `falta el logo de ${plataforma}`);
    }
  }
});

test('cada overlay generado tiene icono servido y texto en los 10 idiomas', async () => {
  const { OVERLAYS_GENERADOS, CATEGORIAS } = await importar('interfaz/src/vistas/principal/overlays-catalogo/catalogo.js');
  const { EVENTOS_ALERTA } = await importar('interfaz/compartido/eventos-alerta.js');
  for (const { icono } of [...OVERLAYS_GENERADOS, ...CATEGORIAS]) {
    assert.ok(existsSync(resolve(raiz, `interfaz/publico/icons/${icono}.svg`)), `falta el icono ${icono}`);
  }
  for (const lang of ['es', 'en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru']) {
    const { overlayCat, overlayCfg } = JSON.parse(readFileSync(resolve(raiz, `interfaz/publico/locales/${lang}.json`), 'utf8').replace(/^﻿/, ''));
    assert.ok(overlayCfg.campo.duracion, `${lang}: sin campo.duracion`);
    for (const { id } of OVERLAYS_GENERADOS) assert.ok(overlayCat.ov[id].titulo && overlayCat.ov[id].desc, `${lang}: ${id}`);
    for (const id of Object.keys(EVENTOS_ALERTA)) assert.ok(overlayCat.alerta[id], `${lang}: alerta ${id}`);
    for (const { id } of CATEGORIAS) assert.ok(overlayCat.cat[id].titulo && overlayCat.cat[id].desc, `${lang}: categoria ${id}`);
    assert.ok(hojas(overlayCat).every(Boolean));
  }
});

test('cada evento dispara solo la alerta que le toca', async () => {
  const { EVENTOS_ALERTA } = await importar('interfaz/compartido/eventos-alerta.js');
  const quienCoincide = (evento) => Object.keys(EVENTOS_ALERTA).filter((id) => EVENTOS_ALERTA[id].coincide(evento));
  assert.deepEqual(quienCoincide({ type: 'follow' }), ['nuevo-seguidor']);
  assert.deepEqual(quienCoincide({ type: 'share' }), ['compartido']);
  assert.deepEqual(quienCoincide({ type: 'join' }), ['entrada']);
  assert.deepEqual(quienCoincide({ type: 'gift', kind: 'cheer' }), ['bits']);
  assert.deepEqual(quienCoincide({ type: 'gift', kind: 'kicksgift' }), ['kicks']);
  assert.deepEqual(quienCoincide({ type: 'gift', kind: 'sub' }), ['suscripcion']);
  assert.deepEqual(quienCoincide({ type: 'gift', kind: 'sub', renovacion: true }), ['renovacion']);
  assert.deepEqual(quienCoincide({ type: 'superchat', sticker: null }), ['superchat']);
  assert.deepEqual(quienCoincide({ type: 'superchat', sticker: 'https://x/y.png' }), ['supersticker']);
  assert.deepEqual(quienCoincide({ type: 'stream-end' }), ['fin-directo']);
  assert.deepEqual(quienCoincide({ type: 'gift', giftName: 'Rosa' }), [], 'un regalo de TikTok no es una alerta de evento');
  for (const [id, alerta] of Object.entries(EVENTOS_ALERTA)) {
    assert.ok(alerta.coincide(alerta.muestra), `la muestra de ${id} no dispara su propia alerta`);
  }
});

test('la cola descarta eventos pasado el tope y sigue mostrando los demas', async () => {
  const { crearColaAlertas } = await importar('interfaz/compartido/cola-alertas.js');
  const mostrados = [];
  let terminar;
  const cola = crearColaAlertas((evento, alTerminar) => { mostrados.push(evento); terminar = alTerminar; }, { maxPendientes: 2 });
  [1, 2, 3, 4, 5].forEach(cola.encolar);
  [1, 2].forEach(() => terminar());
  assert.deepEqual(mostrados, [1, 2, 3]);
});
