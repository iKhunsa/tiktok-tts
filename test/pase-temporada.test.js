'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = path.join(__dirname, '..', 'interfaz');

test('Pass: cada mision tiene recompensa, textos e icono, y el total es el anunciado', async () => {
  const { MISIONES, sumarRecompensas } = await import(pathToFileURL(path.join(raiz, 'src', 'vistas', 'temporada', 'misiones.js')).href);
  const textos = require('../interfaz/publico/locales/es.json').temporada.pase.misiones;

  assert.deepEqual(MISIONES.map((mision) => mision.monedas), [50, 50, 50, 100, 200, 100, 100, 200, 100]);
  assert.equal(sumarRecompensas(MISIONES), 950);
  for (const { id } of MISIONES) {
    assert.ok(textos[id]?.titulo && textos[id]?.descripcion, `sin textos: ${id}`);
    assert.ok(fs.existsSync(path.join(raiz, 'publico', 'img', 'eventos', 'winter', 'misiones', `${id}.webp`)), `sin icono: ${id}`);
  }
});
