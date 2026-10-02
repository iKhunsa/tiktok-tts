'use strict';

const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const test = require('node:test');

const extractor = () => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', 'vistas', 'principal', 'novedades', 'extraer-id-youtube.js')).href);

test('extrae el id de enlaces watch, youtu.be y embed', async () => {
  const { extraerIdYoutube } = await extractor();

  assert.equal(extraerIdYoutube('https://www.youtube.com/watch?v=JBLPEXGKRlM'), 'JBLPEXGKRlM');
  assert.equal(extraerIdYoutube('https://youtu.be/JBLPEXGKRlM'), 'JBLPEXGKRlM');
  assert.equal(extraerIdYoutube('https://www.youtube.com/embed/JBLPEXGKRlM'), 'JBLPEXGKRlM');
});

test('rechaza lo que no es un video de YouTube válido', async () => {
  const { extraerIdYoutube } = await extractor();

  assert.equal(extraerIdYoutube('no es una url'), null);
  assert.equal(extraerIdYoutube('https://example.com/watch?v=JBLPEXGKRlM'), null);
  assert.equal(extraerIdYoutube('https://www.youtube.com/watch?v=corto'), null);
  assert.equal(extraerIdYoutube('https://www.youtube.com/watch'), null);
});
