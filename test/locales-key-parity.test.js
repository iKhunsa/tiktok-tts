'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readLocales } = require('./helpers/read-locales');

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

test('es.json (fallback universal de i18n) tiene las mismas claves que los otros locales', () => {
  const locales = readLocales();
  const spanishLocale = locales.find(({ file }) => file === 'es.json');
  assert.ok(spanishLocale, 'debe existir es.json');

  const es = flatten(spanishLocale.data);
  const esKeys = new Set(Object.keys(es));

  for (const { file, data: locale } of locales) {
    if (file === 'es.json') continue;
    const data = flatten(locale);
    const dataKeys = new Set(Object.keys(data));

    const faltanEnEs = [...dataKeys].filter((k) => !esKeys.has(k));
    const faltanEnOtro = [...esKeys].filter((k) => !dataKeys.has(k));

    assert.deepEqual(faltanEnEs, [], `${file} tiene claves que es.json no tiene (fallback universal quedaria incompleto): ${faltanEnEs.join(', ')}`);
    assert.deepEqual(faltanEnOtro, [], `es.json tiene claves que ${file} no tiene: ${faltanEnOtro.join(', ')}`);
  }
});
