'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findFavoriteByUrl, normalizeUrl } = require('../electron-shell/portal-view/favorites');

test('nombreAmigableDe elimina www y usa el primer label', async () => {
  const { nombreAmigableDe } = await import('../interfaz/src/vistas/principal/portal-view/nueva-pestana.js');
  assert.equal(nombreAmigableDe('www.google.com'), 'Google');
  assert.equal(nombreAmigableDe('tiklivetts.es'), 'Tiklivetts');
  assert.equal(nombreAmigableDe('github.com'), 'Github');
});

test('findFavoriteByUrl compara URLs normalizadas', () => {
  const favorites = [{ id: 'one', url: 'https://example.com' }];
  assert.equal(normalizeUrl('example.com'), 'https://example.com/');
  assert.equal(normalizeUrl('about:blank'), null);
  assert.equal(findFavoriteByUrl(favorites, normalizeUrl('https://example.com/'))?.id, 'one');
});
