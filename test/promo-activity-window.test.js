'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularIntervaloMinutos } = require('../features/promo/activity-window');

test('sin mensajes usa el intervalo maximo', () => {
  assert.equal(calcularIntervaloMinutos(0), 90);
});

test('actividad alta respeta el intervalo minimo', () => {
  assert.equal(calcularIntervaloMinutos(100), 10);
});

test('una tasa normal conserva el intervalo base', () => {
  assert.equal(calcularIntervaloMinutos(1), 30);
});
