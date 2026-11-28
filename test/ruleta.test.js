'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (...ruta) => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', ...ruta)).href);

test('anguloFinal: la casilla ganadora queda centrada bajo el indicador tras girar hacia delante', async () => {
  const { anguloFinal } = await cargar('componentes', 'ruleta', 'geometria.js');
  for (const total of [4, 7, 14]) {
    for (let indice = 0; indice < total; indice++) {
      const destino = anguloFinal(123.4, indice, total, 6);
      const desvio = (destino + indice * (360 / total)) % 360;
      assert.ok(Math.min(desvio, 360 - desvio) < 1e-6, `casilla ${indice}/${total}`);
      assert.ok(destino >= 123.4 + 6 * 360);
    }
  }
});

test('casillaBajoIndicador: coincide con la casilla elegida al terminar el giro', async () => {
  const { anguloFinal, casillaBajoIndicador } = await cargar('componentes', 'ruleta', 'geometria.js');
  for (let indice = 0; indice < 14; indice++) {
    assert.equal(casillaBajoIndicador(anguloFinal(-31, indice, 14, 6), 14), indice);
  }
});

test('repartirCasillas: todos los premios aparecen y el destacado una sola vez', async () => {
  const { repartirCasillas } = await cargar('componentes', 'ruleta', 'geometria.js');
  const { PREMIOS } = await cargar('vistas', 'temporada', 'premios.js');
  const ids = repartirCasillas(PREMIOS, 14).map((premio) => premio.id);

  assert.equal(ids.length, 14);
  assert.equal(new Set(ids).size, PREMIOS.length);
  assert.equal(ids.filter((id) => id === 'ultimatePro').length, 1);
  assert.throws(() => repartirCasillas(PREMIOS, 3), RangeError);
});

test('sortearPremio: respeta los pesos en los extremos', async () => {
  const { sortearPremio } = await cargar('vistas', 'temporada', 'sortear-premio.js');
  const premios = [{ id: 'a', peso: 3 }, { id: 'b', peso: 1 }];

  assert.equal(await sortearPremio(premios, () => 0), 'a');
  assert.equal(await sortearPremio(premios, () => 0.749), 'a');
  assert.equal(await sortearPremio(premios, () => 0.75), 'b');
  assert.equal(await sortearPremio(premios, () => 0.9999), 'b');
});

test('Mystery Ball: las probabilidades suman 100 y cada premio tiene textos', async () => {
  const { PREMIOS_MISTERIOSOS } = await cargar('vistas', 'temporada', 'premios-misteriosos.js');
  const textos = require('../interfaz/publico/locales/es.json').temporada.mysteryBall;

  assert.equal(PREMIOS_MISTERIOSOS.reduce((suma, premio) => suma + premio.peso, 0), 100);
  for (const { id, rareza } of PREMIOS_MISTERIOSOS) assert.ok(textos[id]?.nombre && textos.rareza[rareza], id);
});

test('premioEnOrden: recorre cada lista en orden y vuelve a empezar', async () => {
  const { premioEnOrden } = await cargar('vistas', 'temporada', 'premio-en-orden.js');
  const uno = [{ id: 'a' }, { id: 'b' }];
  const otro = [{ id: 'x' }, { id: 'y' }];
  const salidas = [];
  for (const lista of [uno, uno, otro, uno]) salidas.push(await premioEnOrden(lista));

  assert.deepEqual(salidas, ['a', 'b', 'x', 'a']);
});
