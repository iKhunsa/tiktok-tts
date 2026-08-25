'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { messageMatchesVoiceScript } = require('../idioma/message-matches-voice-script');

test('texto latino con voz latina coincide', () => {
  assert.equal(messageMatchesVoiceScript('hola que tal', 'es-MX'), true);
});

test('texto cirilico con voz rusa coincide', () => {
  assert.equal(messageMatchesVoiceScript('привет', 'ru'), true);
});

test('texto cirilico con voz latina no coincide', () => {
  assert.equal(messageMatchesVoiceScript('привет', 'en'), false);
});

test('texto sin letras siempre coincide (emojis, numeros)', () => {
  assert.equal(messageMatchesVoiceScript('123 :) 🎉', 'ja'), true);
});

test('voz desconocida cae a es-MX (latin)', () => {
  assert.equal(messageMatchesVoiceScript('hola', 'voz-inexistente'), true);
  assert.equal(messageMatchesVoiceScript('привет', 'voz-inexistente'), false);
});
