'use strict';

// Bug 10 — un valor no-string que llega a la sintesis TTS no debe producir
// "text should be a string" de google-tts-api ni tocar la red.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchTtsAudio } = require('../features/sonido/tts/fetch-audio');

const logs = [];
const logger = { log: (nivel, dom, origen, evento, msg, meta) => logs.push({ nivel, evento, meta }) };

test('undefined / null / numero -> rechaza EMPTY_INPUT sin llamar a Google, con warn', async () => {
  for (const valor of [undefined, null, 123, {}]) {
    logs.length = 0;
    await assert.rejects(
      fetchTtsAudio({ text: valor, logger }),
      (e) => e.code === 'EMPTY_INPUT'
    );
    assert.equal(logs.length, 1);
    assert.equal(logs[0].nivel, 'warn');
    assert.equal(logs[0].evento, 'sonido.tts.texto_invalido');
    assert.equal(logs[0].meta.tipo, valor === null ? 'null' : typeof valor);
  }
});

test('string vacio / solo espacios -> no sintetiza, log debug, sin warn', async () => {
  logs.length = 0;
  await assert.rejects(fetchTtsAudio({ text: '   ', logger }), (e) => e.code === 'EMPTY_INPUT');
  assert.equal(logs.length, 1);
  assert.equal(logs[0].nivel, 'debug');
});
