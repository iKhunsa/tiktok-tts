'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findMojibake } = require('../core/find-mojibake');
const { readLocales } = require('./helpers/read-locales');

test('findMojibake detecta secuencias UTF-8 interpretadas como cp1252', () => {
  const cases = [
    ['MÃ³vil', 'Ã³'],
    ['ConfiguraciÃ³n', 'Ã³'],
    ['â€”', 'â€”'],
    ['ðŸ˜€', 'ðŸ˜€'],
  ];

  for (const [text, sample] of cases) {
    assert.deepEqual(findMojibake(text), [{ sample, index: text.indexOf(sample) }], text);
  }
});

test('findMojibake ignora texto Unicode legítimo', () => {
  const cases = ['Móvil', 'NÃO', 'São Paulo', '日本語', 'Привет', '—'];

  for (const text of cases) assert.deepEqual(findMojibake(text), [], text);
});

test('los archivos de idioma no contienen mojibake', () => {
  const failures = readLocales().flatMap(({ file, text }) => findMojibake(text).map(({ sample, index }) => {
    const line = text.slice(0, index).split('\n').length;
    return `${file}:${line} ${JSON.stringify(sample)}`;
  }));

  assert.deepEqual(failures, [], `Mojibake detectado:\n${failures.join('\n')}`);
});
