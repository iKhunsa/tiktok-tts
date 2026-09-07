'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bucket } = require('../electron-shell/bucket');

const B = [1, 10, 50, 200];

test('cero y negativos caen a "0"', () => {
  assert.equal(bucket(0, B), '0');
  assert.equal(bucket(-5, B), '0');
  assert.equal(bucket(NaN, B), '0');
  assert.equal(bucket(undefined, B), '0');
});

test('valor igual a un bound de ancho 1 se muestra suelto', () => {
  assert.equal(bucket(1, B), '1');
});

test('rangos intermedios (el 1 tiene bucket propio, luego 2-10, 11-50, ...)', () => {
  assert.equal(bucket(2, B), '2-10');
  assert.equal(bucket(3, B), '2-10');
  assert.equal(bucket(10, B), '2-10');
  assert.equal(bucket(11, B), '11-50');
  assert.equal(bucket(50, B), '11-50');
  assert.equal(bucket(51, B), '51-200');
  assert.equal(bucket(200, B), '51-200');
});

test('sobre el máximo', () => {
  assert.equal(bucket(201, B), '201+');
  assert.equal(bucket(99999, B), '201+');
});

test('otra escala (minutos de sesión)', () => {
  const M = [5, 30, 120, 480];
  assert.equal(bucket(2, M), '1-5');
  assert.equal(bucket(45, M), '31-120');
  assert.equal(bucket(1000, M), '481+');
});
