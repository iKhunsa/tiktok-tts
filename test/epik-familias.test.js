'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('url');
const path = require('path');
const { FAMILIAS } = require('../features/epik/validate-manifest');

const importar = (ruta) => import(pathToFileURL(path.join(__dirname, '..', ruta)).href);

// El servidor decide que familias se importan; el overlay necesita `aceptaEpik` en su skin para mostrarlas.
test('cada overlay de una familia .epik acepta skins epik y viceversa', async () => {
  const { ESQUEMAS } = await importar('interfaz/compartido/estilo/esquemas.js');
  const conEpik = Object.keys(ESQUEMAS).filter((id) => ESQUEMAS[id].find((campo) => campo.clave === 'skin')?.aceptaEpik).sort();
  assert.deepEqual(conEpik, Object.values(FAMILIAS).flat().sort());
});

test('la familia alerta cubre todas las alertas de evento', async () => {
  const { EVENTOS_ALERTA } = await importar('interfaz/compartido/eventos-alerta.js');
  for (const id of Object.keys(EVENTOS_ALERTA)) assert.ok(FAMILIAS.alerta.includes(id), `${id} falta en FAMILIAS.alerta`);
});
