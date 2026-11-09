'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { postClientLog } = require('../features/configuracion/routes/post-client-log');

function llamar(body) {
  const logs = [];
  const res = { json: (x) => { res.cuerpo = x; return res; }, status: (c) => { res.codigo = c; return res; } };
  postClientLog({ log: (...a) => logs.push(a) })({ body }, res);
  return { logs, res };
}

test('ruido del navegador (ResizeObserver, Script error.) no se registra', () => {
  assert.equal(llamar({ message: 'ResizeObserver loop completed with undelivered notifications.' }).logs.length, 0);
  assert.equal(llamar({ message: 'Script error.' }).logs.length, 0);
});

test('error de ventana sin evento sigue yendo como log_cliente.recibido (issue)', () => {
  const { logs } = llamar({ message: 'x is not defined', stack: 's' });
  assert.equal(logs[0][0], 'error');
  assert.equal(logs[0][3], 'configuracion.log_cliente.recibido');
});

test('evento de interfaz valido respeta el nivel; warn no sube a GlitchTip', () => {
  const warn = llamar({ message: 'm', evento: 'interfaz.overlay.epik_ilegible', nivel: 'warn', detalle: { id: 'a', n: 1, o: { x: 1 } } }).logs[0];
  assert.equal(warn[0], 'warn');
  assert.equal(warn[1], 'interfaz');
  assert.deepEqual(warn[5].o, undefined); // objetos anidados descartados
  assert.equal(llamar({ message: 'm', evento: 'interfaz.editor.ajustes_corruptos' }).logs[0][0], 'error');
});

test('evento con nombre fuera del patron se trata como error de ventana', () => {
  assert.equal(llamar({ message: 'm', evento: 'core.http.puerto_en_uso' }).logs[0][3], 'configuracion.log_cliente.recibido');
});
