'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { markdownToPlainText } = require('../scripts/markdown-to-plain-text');
const { readDocumentVersion } = require('../scripts/read-document-version');

test('quita marcas de encabezado, negritas, cursivas y backticks', () => {
  const text = markdownToPlainText('# Título\n\n**Hola** *mundo* `x`');
  assert.equal(text, 'Título\r\n\r\nHola mundo x');
});

test('enlace web conserva la URL; enlace relativo deja solo el texto', () => {
  assert.equal(markdownToPlainText('[Polar](https://polar.sh)'), 'Polar (https://polar.sh)');
  assert.equal(markdownToPlainText('[Privacidad](politica-de-privacidad.md)'), 'Privacidad');
});

test('<url> pasa a url suelta', () => {
  assert.equal(markdownToPlainText('Sitio: <https://tiklivetts.es>'), 'Sitio: https://tiklivetts.es');
});

test('conserva numeracion y convierte viñetas y citas', () => {
  const text = markdownToPlainText('3.1. Punto\n\n- uno\n* dos\n> cita');
  assert.equal(text, '3.1. Punto\r\n\r\n- uno\r\n- dos\r\ncita');
});

test('tabla: omite separador y une celdas con barra', () => {
  const text = markdownToPlainText('| a | b |\n|---|---|\n| 1 | 2 |');
  assert.equal(text, 'a | b\r\n1 | 2');
});

test('regla horizontal pasa a linea de guiones y se colapsan lineas vacias', () => {
  const text = markdownToPlainText('uno\n\n\n\n---\n\ndos');
  assert.equal(text, `uno\r\n\r\n${'-'.repeat(60)}\r\n\r\ndos`);
});

test('lee la version del documento en español e inglés', () => {
  assert.equal(readDocumentVersion('**Versión del documento:** 2.0 · **Vigencia'), '2.0');
  assert.equal(readDocumentVersion('**Document version:** 3.1.2 · **Effective'), '3.1.2');
});

test('sin cabecera de version lanza error', () => {
  assert.throws(() => readDocumentVersion('# Sin version'), /Versión del documento/);
});
