'use strict';

// Logica pura de interfaz/src/componentes/eventos (sin DOM, como
// interfaz-compartido.test.js): eleccion de evento por fecha y keyframes de sprites.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const modulo = (rel) => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', 'componentes', 'eventos', rel)).href);

const evento = (id, desde, hasta) => ({ id, ventana: { desde, hasta } });
const dia = (mes, d) => new Date(2026, mes - 1, d);

test('elegirEvento: respeta la ventana MM-DD incluyendo los bordes', async () => {
  const { elegirEvento } = await modulo('catalogo.js');
  const lista = [evento('halloween', '10-01', '11-02')];

  assert.equal(elegirEvento(lista, dia(10, 1))?.id, 'halloween');
  assert.equal(elegirEvento(lista, dia(11, 2))?.id, 'halloween');
  assert.equal(elegirEvento(lista, dia(9, 30)), null);
  assert.equal(elegirEvento(lista, dia(11, 3)), null);
});

test('elegirEvento: ventana que cruza fin de ano', async () => {
  const { elegirEvento } = await modulo('catalogo.js');
  const lista = [evento('navidad', '12-20', '01-06')];

  assert.equal(elegirEvento(lista, dia(12, 25))?.id, 'navidad');
  assert.equal(elegirEvento(lista, dia(1, 3))?.id, 'navidad');
  assert.equal(elegirEvento(lista, dia(6, 15)), null);
});

test('elegirEvento: un id forzado ignora la fecha y un id desconocido da null', async () => {
  const { elegirEvento } = await modulo('catalogo.js');
  const lista = [evento('halloween', '10-01', '11-02')];

  assert.equal(elegirEvento(lista, dia(3, 3), 'halloween')?.id, 'halloween');
  assert.equal(elegirEvento(lista, dia(10, 5), 'inexistente'), null);
});

test('generarKeyframes: 8 frames sobre 3x3 recorren las celdas en orden con la posicion en %', async () => {
  const { generarKeyframes } = await modulo('hoja-sprite.js');
  const css = generarKeyframes('bat', { cols: 3, rows: 3, frames: 8 });

  assert.match(css, /^@keyframes bat-frames/);
  assert.match(css, /0% \{ background-position: 0% 0%; \}/);
  assert.match(css, /12\.5% \{ background-position: 50% 0%; \}/);
  assert.match(css, /87\.5% \{ background-position: 50% 100%; \}/);
  assert.equal(css.match(/background-position/g).length, 8);
});

test('generarKeyframes: 4x2 salta de fila en la 5ta celda y respeta `orden`', async () => {
  const { generarKeyframes } = await modulo('hoja-sprite.js');

  assert.match(generarKeyframes('g', { cols: 4, rows: 2, frames: 8 }), /50% \{ background-position: 0% 100%; \}/);
  const reordenado = generarKeyframes('g', { cols: 4, rows: 2, frames: 8, orden: [0, 1, 2, 1] });
  assert.equal(reordenado.match(/background-position/g).length, 4);
  assert.match(reordenado, /75% \{ background-position: 33\.33/);
});

test('generarParvada: mitad por lado, rangos respetados y tamanos multiplos de 16', async () => {
  const { generarParvada } = await import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', 'componentes', 'eventos', 'halloween', 'parvada.js')).href);
  let semilla = 7;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
  const parvada = generarParvada(azar, 24);

  assert.equal(parvada.length, 24);
  assert.equal(parvada.filter((b) => b.dx < 0).length, 12, 'mitad hacia la izquierda');
  assert.equal(parvada.filter((b) => b.dx > 0).length, 12, 'mitad hacia la derecha');
  for (const b of parvada) {
    assert.ok([16, 32, 48].includes(b.ancho));
    assert.ok(b.dy < 0 && b.dy >= -85, 'sube hacia arriba');
    assert.ok(b.delay + b.dur <= 4, 'termina antes de los 5 s del evento');
  }
  assert.notDeepEqual(generarParvada(azar, 4), generarParvada(azar, 4), 'dos parvadas difieren (aleatoriedad)');
});
