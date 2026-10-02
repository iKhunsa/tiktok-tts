'use strict';

const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const test = require('node:test');

const parser = () => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', 'vistas', 'principal', 'novedades', 'parse-changelog.js')).href);

test('changelog conserva una sección de videos de YouTube', async () => {
  const { parsearChangelog } = await parser();
  const [version] = parsearChangelog('## [1.0.0] — 2026-01-01\n\n### Videos de YouTube\n- [Tutorial](https://youtu.be/demo)');

  assert.deepEqual(version.secciones, [{ titulo: 'Videos de YouTube', items: ['[Tutorial](https://youtu.be/demo)'] }]);
});
