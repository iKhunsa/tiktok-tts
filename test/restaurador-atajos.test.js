'use strict';

// interfaz/src/.../restaurador-atajos.js y tecla-de-atajo.js son modulos ESM sin dependencias de la app.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (...partes) => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', ...partes)).href);
const cargarRestaurador = () => cargar('vistas', 'principal', 'overlays-catalogo', 'restaurador-atajos.js');

// Puente falso con el proceso principal: guarda lo registrado y permite hacer fallar atajos.
function crearPuente({ fallan = new Set() } = {}) {
  const registrados = new Map();
  const llamadas = [];
  return {
    registrados, llamadas, fallan,
    api: {
      registerSceneShortcut: async (id, atajo) => {
        llamadas.push(['registrar', id, atajo]);
        if (fallan.has(atajo)) return { ok: false, error: 'conflict' };
        registrados.set(id, atajo);
        return { ok: true, shortcut: atajo };
      },
      unregisterSceneShortcut: async (id) => { llamadas.push(['quitar', id]); registrados.delete(id); },
    },
  };
}

const escenas = (...pares) => pares.map(([id, shortcut]) => ({ id, shortcut }));

test('los atajos guardados se registran cuando llegan los ajustes de la cuenta, aunque la pagina haya arrancado sin ellos', async () => {
  const { crearRestaurador } = await cargarRestaurador();
  const puente = crearPuente();
  let ajustes = escenas(['a', null]); // arranque: cuenta anonima, sin atajos
  const restaurar = crearRestaurador({ leerEscenas: () => ajustes, leerApi: () => puente.api, avisarFallo: () => assert.fail('no debia avisar'), esperarMs: 0 });
  await restaurar();
  assert.deepEqual([...puente.registrados], []);
  ajustes = escenas(['a', 'Ctrl+Q'], ['b', 'Ctrl+W'], ['c', null]); // llegan los ajustes de la cuenta
  await restaurar();
  assert.deepEqual([...puente.registrados], [['a', 'Ctrl+Q'], ['b', 'Ctrl+W']]);
});

test('un atajo que falla se reintenta una vez y, si sigue fallando, se avisa una sola vez', async () => {
  const { crearRestaurador } = await cargarRestaurador();
  const puente = crearPuente({ fallan: new Set(['Ctrl+Q']) });
  const avisos = [];
  const restaurar = crearRestaurador({ leerEscenas: () => escenas(['a', 'Ctrl+Q'], ['b', 'Ctrl+W']), leerApi: () => puente.api, avisarFallo: (escena, resultado) => avisos.push([escena.id, resultado.error]), esperarMs: 0 });
  await restaurar();
  assert.deepEqual(avisos, [['a', 'conflict']]);
  assert.equal(puente.llamadas.filter(([, id]) => id === 'a').length, 2); // intento + reintento
  assert.equal(puente.registrados.get('b'), 'Ctrl+W');
});

test('un fallo pasajero se resuelve en el reintento y no avisa', async () => {
  const { crearRestaurador } = await cargarRestaurador();
  const puente = crearPuente({ fallan: new Set(['Ctrl+Q']) });
  const restaurar = crearRestaurador({ leerEscenas: () => escenas(['a', 'Ctrl+Q']), leerApi: () => puente.api, avisarFallo: () => assert.fail('no debia avisar'), esperarMs: 5 });
  const pasada = restaurar();
  puente.fallan.delete('Ctrl+Q'); // la otra app suelta la tecla antes del reintento
  await pasada;
  assert.equal(puente.registrados.get('a'), 'Ctrl+Q');
});

test('al cambiar de cuenta se sueltan los atajos de escenas que ya no estan', async () => {
  const { crearRestaurador } = await cargarRestaurador();
  const puente = crearPuente();
  let ajustes = escenas(['a', 'Ctrl+Q'], ['b', 'Ctrl+W']);
  const restaurar = crearRestaurador({ leerEscenas: () => ajustes, leerApi: () => puente.api, avisarFallo: () => {}, esperarMs: 0 });
  await restaurar();
  ajustes = escenas(['b', 'Ctrl+W']);
  await restaurar();
  assert.deepEqual([...puente.registrados], [['b', 'Ctrl+W']]);
});

test('llamadas superpuestas no se pisan: una pasada pide otra al terminar', async () => {
  const { crearRestaurador } = await cargarRestaurador();
  const puente = crearPuente();
  let ajustes = escenas(['a', 'Ctrl+Q']);
  const restaurar = crearRestaurador({ leerEscenas: () => ajustes, leerApi: () => puente.api, avisarFallo: () => {}, esperarMs: 0 });
  const primera = restaurar();
  ajustes = escenas(['a', 'Ctrl+Q'], ['b', 'Ctrl+W']); // llegan los ajustes mientras la primera pasada corre
  const segunda = restaurar();
  assert.equal(segunda, primera);
  await primera;
  await new Promise((resolver) => { setTimeout(resolver, 20); });
  assert.deepEqual([...puente.registrados], [['a', 'Ctrl+Q'], ['b', 'Ctrl+W']]);
});

test('fuera de Electron no hace nada', async () => {
  const { crearRestaurador } = await cargarRestaurador();
  const restaurar = crearRestaurador({ leerEscenas: () => escenas(['a', 'Ctrl+Q']), leerApi: () => undefined, avisarFallo: () => assert.fail('no debia avisar') });
  await restaurar();
});

test('el atajo se captura con la tecla fisica: Shift+1 es "1", no "!"', async () => {
  const { teclaDeAtajo } = await cargar('nucleo', 'teclado', 'tecla-de-atajo.js');
  assert.equal(teclaDeAtajo({ key: '!', code: 'Digit1' }), '1');
  assert.equal(teclaDeAtajo({ key: '@', code: 'Digit2' }), '2');
  assert.equal(teclaDeAtajo({ key: '3', code: 'Numpad3' }), '3');
  assert.equal(teclaDeAtajo({ key: 'q', code: 'KeyQ' }), 'Q');
  assert.equal(teclaDeAtajo({ key: 'F5', code: 'F5' }), 'F5');
  assert.equal(teclaDeAtajo({ key: 'Control', code: 'ControlLeft' }), 'CONTROL');
});
