'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

test('creditos-agregados: agrega por usuario, acepta eventos y entradas agregadas', async () => {
  const { crearCreditos } = await import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'compartido', 'creditos-agregados.js')));
  const c = crearCreditos();
  c.agregarDonante({ user: 'ana', giftName: 'Rose', count: 2 });
  c.agregarDonante({ user: 'ana', giftName: 'Rose', count: 3 });
  c.agregarDonante({ user: 'ana', giftName: 'Lion' });
  c.cargar({ donors: [{ user: 'bob', gifts: [{ giftName: 'Rose', count: 4 }] }], followers: [{ user: 'x' }, { user: 'x' }] });
  assert.strictEqual(c.donors.length, 2);
  assert.strictEqual(c.donors[0].regalos.get('Rose'), 5);
  assert.strictEqual(c.donors[0].regalos.get('Lion'), 1);
  assert.strictEqual(c.donors[1].regalos.get('Rose'), 4);
  assert.strictEqual(c.followers.length, 1);
  c.vaciar();
  assert.strictEqual(c.donors.length, 0);
});
