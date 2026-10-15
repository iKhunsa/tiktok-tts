'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('stopAudio descarta handlers, pausa y vacía la fuente', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../interfaz/src/nucleo/tts/stop-audio.js'), 'utf8');
  const { stopAudio } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  const audio = { onended: () => {}, onerror: () => {}, pauseCalls: 0, pause() { this.pauseCalls++; }, src: 'blob:test' };

  stopAudio(audio);

  assert.equal(audio.onended, null);
  assert.equal(audio.onerror, null);
  assert.equal(audio.pauseCalls, 1);
  assert.equal(audio.src, '');
});
