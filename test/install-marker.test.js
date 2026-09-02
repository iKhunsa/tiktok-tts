'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { marcarInstalacion } = require('../electron-shell/install-marker');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'install-marker-'));
}

test('primera llamada de por vida: primera=true y escribe el archivo', () => {
  const dir = tmpDir();
  const r = marcarInstalacion(dir, '1.0.0', 'aptabase-instalacion.json');
  assert.equal(r.primera, true);
  assert.equal(r.actualizada, false);
  assert.equal(r.desde, null);
  assert.equal(typeof r.primeraVez, 'string');
  const guardado = JSON.parse(fs.readFileSync(path.join(dir, 'aptabase-instalacion.json'), 'utf8'));
  assert.equal(guardado.version, '1.0.0');
  assert.equal(guardado.primeraVez, r.primeraVez);
});

test('segunda llamada misma versión: primera=false, actualizada=false', () => {
  const dir = tmpDir();
  const a = marcarInstalacion(dir, '1.0.0', 'aptabase-instalacion.json');
  const b = marcarInstalacion(dir, '1.0.0', 'aptabase-instalacion.json');
  assert.equal(b.primera, false);
  assert.equal(b.actualizada, false);
  assert.equal(b.primeraVez, a.primeraVez, 'primeraVez se preserva entre runs');
});

test('cambio de versión: actualizada=true con desde', () => {
  const dir = tmpDir();
  marcarInstalacion(dir, '1.0.0', 'aptabase-instalacion.json');
  const r = marcarInstalacion(dir, '1.1.0', 'aptabase-instalacion.json');
  assert.equal(r.primera, false);
  assert.equal(r.actualizada, true);
  assert.equal(r.desde, '1.0.0');
});

test('archivo corrupto se trata como primera vez', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'x.json'), '{ no es json');
  const r = marcarInstalacion(dir, '2.0.0', 'x.json');
  assert.equal(r.primera, true);
});

test('archivos distintos no se pisan (glitchtip vs aptabase)', () => {
  const dir = tmpDir();
  marcarInstalacion(dir, '1.0.0', 'glitchtip-instalacion.json');
  const r = marcarInstalacion(dir, '1.0.0', 'aptabase-instalacion.json');
  assert.equal(r.primera, true, 'el de aptabase sigue siendo primera vez');
});
