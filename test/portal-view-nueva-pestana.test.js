'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

test('nombreAmigableDe elimina www y usa el primer label', async () => {
  const { nombreAmigableDe } = await import('../interfaz/src/vistas/principal/portal-view/nueva-pestana.js');
  assert.equal(nombreAmigableDe('www.google.com'), 'Google');
  assert.equal(nombreAmigableDe('tiklivetts.es'), 'Tiklivetts');
  assert.equal(nombreAmigableDe('github.com'), 'Github');
});
