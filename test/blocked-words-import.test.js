'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseImportList } = require('../features/moderacion/routes/blocked-words-import');

test('importar: solo acepta una lista JSON de textos', () => {
  assert.deepEqual(parseImportList('[" Uno ", "dos"]'), ['uno', 'dos']);
  assert.deepEqual(parseImportList('\uFEFF["x"]'), ['x']);
  for (const bad of ['uno\ndos', '{"a":1}', '[1, 2]', '["a"', '"a"']) assert.equal(parseImportList(bad), null, bad);
});
