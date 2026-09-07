'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { staticRoot } = require('../core/static-root');

function tmpBase() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tts-static-root-'));
}

test('layout dev: si existe interfaz/dist lo usa (aunque tambien haya public/)', () => {
  const base = tmpBase();
  fs.mkdirSync(path.join(base, 'interfaz', 'dist'), { recursive: true });
  fs.mkdirSync(path.join(base, 'public'), { recursive: true });
  assert.equal(staticRoot(base), path.join(base, 'interfaz', 'dist'));
});

test('layout empaquetado: sin interfaz/dist cae a public/', () => {
  const base = tmpBase();
  fs.mkdirSync(path.join(base, 'public'), { recursive: true });
  assert.equal(staticRoot(base), path.join(base, 'public'));
});

test('ninguno de los dos existe: devuelve public/ igual (express.static hara 404, no crash)', () => {
  const base = tmpBase();
  assert.equal(staticRoot(base), path.join(base, 'public'));
});
