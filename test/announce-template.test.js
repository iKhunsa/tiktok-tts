'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CONFIG_VALIDATORS } = require('../features/configuracion/validators');

const load = () => import('../interfaz/src/nucleo/i18n/plantilla-anuncio.js');
const std = () => 'ESTANDAR';

test('plantilla valida sustituye variables', async () => {
  const { resolverAnuncio } = await load();
  assert.equal(resolverAnuncio({ join: '{usuario} cayo a la fiesta' }, 'join', { usuario: 'Ana' }, std), 'Ana cayo a la fiesta');
  assert.equal(resolverAnuncio({ gift: '{usuario} manda {cantidad} {regalo}' }, 'gift', { usuario: 'A', cantidad: 2, regalo: 'Rosa' }, std), 'A manda 2 Rosa');
});

test('frase simple: antepone usuario y agrega datos del evento', async () => {
  const { resolverAnuncio } = await load();
  assert.equal(resolverAnuncio({ join: 'cayo a la fiesta' }, 'join', { usuario: 'Ana' }, std), 'Ana cayo a la fiesta');
  assert.equal(resolverAnuncio({ gift: 'se la comio' }, 'gift', { usuario: 'Ana', cantidad: 2, regalo: 'Rosa' }, std), 'Ana se la comio, 2 Rosa');
  assert.equal(resolverAnuncio({ gift: 'se la comio' }, 'giftUsd', { usuario: 'Ana', cantidad: 2, regalo: 'Rosa', monto: 1 }, std), 'Ana se la comio, 2 Rosa 1 USD');
  assert.equal(resolverAnuncio({ like: 'lo da todo' }, 'like', { usuario: 'Ana', cantidad: 15 }, std), 'Ana lo da todo, 15');
  assert.equal(resolverAnuncio({ join: 'hola' }, 'join', {}, std), 'ESTANDAR');
});

test('vacia, ausente, invalida o con variable ajena -> texto estandar', async () => {
  const { resolverAnuncio } = await load();
  const v = { usuario: 'Ana' };
  for (const tpl of [undefined, '', '   ', '{monto} hola', '{usuario {x', 'hola }', '{nada}']) {
    assert.equal(resolverAnuncio({ join: tpl }, 'join', v, std), 'ESTANDAR', String(tpl));
  }
  assert.equal(resolverAnuncio(null, 'join', v, std), 'ESTANDAR');
  assert.equal(resolverAnuncio({ x: 'a' }, 'evento-raro', v, std), 'ESTANDAR');
  assert.equal(resolverAnuncio({ like: '{usuario} x{cantidad}' }, 'like', v, std), 'ESTANDAR'); // falta dato
});

test('sanea y limita longitud', async () => {
  const { sanearPlantilla, ANUNCIO_MAX_LEN } = await load();
  assert.equal(sanearPlantilla('a\n\tb'), 'a b');
  assert.equal(sanearPlantilla('x'.repeat(500)).length, ANUNCIO_MAX_LEN);
});

test('validador de config acepta solo eventos conocidos y strings cortos', () => {
  const ok = CONFIG_VALIDATORS.announceTemplates;
  assert.ok(ok({}));
  assert.ok(ok({ join: '{usuario} hola' }));
  assert.ok(!ok({ otro: 'x' }));
  assert.ok(!ok({ join: 5 }));
  assert.ok(!ok({ join: 'x'.repeat(121) }));
  assert.ok(!ok(['join']));
  assert.ok(!ok(null));
});
