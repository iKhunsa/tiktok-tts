'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LOCALES_DIR = path.join(__dirname, '..', 'interfaz', 'publico', 'locales');

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
  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(files.includes('es.json'), 'debe existir es.json');

  const es = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'es.json'), 'utf8')));
  const esKeys = new Set(Object.keys(es));

  for (const file of files) {
    if (file === 'es.json') continue;
    const data = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8')));
    const dataKeys = new Set(Object.keys(data));

    const faltanEnEs = [...dataKeys].filter((k) => !esKeys.has(k));
    const faltanEnOtro = [...esKeys].filter((k) => !dataKeys.has(k));

    assert.deepEqual(faltanEnEs, [], `${file} tiene claves que es.json no tiene (fallback universal quedaria incompleto): ${faltanEnEs.join(', ')}`);
    assert.deepEqual(faltanEnOtro, [], `es.json tiene claves que ${file} no tiene: ${faltanEnOtro.join(', ')}`);
  }
});
