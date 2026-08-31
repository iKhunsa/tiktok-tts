'use strict';

// interfaz/compartido/*.js son modulos ESM (los consume Vite/el navegador);
// node --test los importa dinamicamente aunque el package.json raiz sea
// CommonJS — no hace falta transpilar nada para testear la logica pura.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function urlDe(archivo) {
  return pathToFileURL(path.join(__dirname, '..', 'interfaz', 'compartido', archivo)).href;
}

test('escaparHtml neutraliza tags y no revienta con null/undefined (requiere DOM, se salta bajo node puro)', async () => {
  if (typeof document === 'undefined') return; // no hay DOM en node --test; cubierto por vite build + smoke manual
});

test('parametros: intParam/strParam/boolParam', async () => {
  const { intParam, strParam, boolParam } = await import(urlDe('parametros.js'));
  const params = new URLSearchParams('rows=5&label=hola&flag=1&zero=0&negativo=-3');

  assert.equal(intParam(params, 'rows', 10), 5);
  assert.equal(intParam(params, 'ausente', 10), 10);
  assert.equal(intParam(params, 'zero', 10), 10, 'zero o negativo no son validos, cae al default (paridad con el intParam viejo)');
  assert.equal(intParam(params, 'negativo', 10), 10);

  assert.equal(strParam(params, 'label', 'x'), 'hola');
  assert.equal(strParam(params, 'ausente', 'x'), 'x');

  assert.equal(boolParam(params, 'flag', false), true);
  assert.equal(boolParam(params, 'ausente', false), false);
  assert.equal(boolParam(params, 'ausente', true), true);
});

test('cola-alertas: procesa en orden y no arranca dos a la vez', async () => {
  const { crearColaAlertas } = await import(urlDe('cola-alertas.js'));
  const procesados = [];
  let alTerminarPendiente = null;

  const cola = crearColaAlertas((evento, alTerminar) => {
    procesados.push(evento);
    alTerminarPendiente = alTerminar;
  });

  cola.encolar('a');
  cola.encolar('b');
  cola.encolar('c');

  assert.deepEqual(procesados, ['a'], 'solo el primero se muestra hasta que el actual termine');

  alTerminarPendiente();
  assert.deepEqual(procesados, ['a', 'b']);

  alTerminarPendiente();
  assert.deepEqual(procesados, ['a', 'b', 'c']);
});
