'use strict';

// compartido/transiciones-escena.js es ESM sin DOM al importarlo: node --test lo carga dinamicamente.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = path.join(__dirname, '..', 'interfaz');
const cargar = (archivo = 'transiciones-escena.js') => import(pathToFileURL(path.join(raiz, 'compartido', archivo)).href);
const idiomas = fs.readdirSync(path.join(raiz, 'publico', 'locales')).filter((archivo) => archivo.endsWith('.json'));

test('hay 20 transiciones de movimiento y cada una oculta solo propiedades que sabemos hacer visibles', async () => {
  const { TRANSICIONES, TIPOS_MOVIMIENTO, visibleDe } = await cargar();
  assert.equal(TIPOS_MOVIMIENTO.length, 20);
  for (const [tipo, { salida, entrada }] of Object.entries(TRANSICIONES)) {
    for (const oculto of [salida, entrada ?? salida]) {
      const visible = visibleDe(oculto);
      assert.deepEqual(Object.keys(visible), Object.keys(oculto), tipo);
      assert.ok(Object.values(visible).every((valor) => valor !== undefined), `${tipo}: propiedad sin estado visible`);
    }
  }
});

test('cada transicion tiene nombre en todos los idiomas', async () => {
  const { TIPOS_TRANSICION } = await cargar();
  for (const archivo of idiomas) {
    const editor = JSON.parse(fs.readFileSync(path.join(raiz, 'publico', 'locales', archivo), 'utf8')).overlayCat.editor;
    for (const clave of ['transicionesTitulo', 'transicionTipo', 'transicionNinguna', 'transicionDuracion', 'transicionProbar', 'transicionAyuda', ...TIPOS_TRANSICION.map((tipo) => `transicion_${tipo}`)]) {
      assert.ok(editor[clave], `${archivo}: falta ${clave}`);
    }
  }
});

test('hay 34 mascaras estilo OBS y cada una recorre todo el rango de 0 a 1', async () => {
  const { MASCARAS, TIPOS_MASCARA, campoDeMascara } = await cargar('mascaras-transicion.js');
  assert.equal(TIPOS_MASCARA.length, 34);
  for (const tipo of Object.keys(MASCARAS)) {
    const campo = campoDeMascara(tipo, 64, 36);
    assert.ok(campo.every((valor) => valor >= 0 && valor <= 1), `${tipo}: valores fuera de [0, 1]`);
    assert.ok(Math.min(...campo) <= 0.15, `${tipo}: no empieza cerca de 0 (la transicion tendria tiempo muerto al inicio)`);
    assert.ok(Math.max(...campo) >= 0.85, `${tipo}: no termina cerca de 1 (tiempo muerto al final)`);
  }
});

test('todos los tipos de transicion estan en los idiomas', async () => {
  const { TIPOS_TRANSICION } = await cargar();
  assert.equal(TIPOS_TRANSICION.length, 56);
});
