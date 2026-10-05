'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStubLogger } = require('./helpers/stub-logger');
const { loadBlockedWordsFromFile, saveBlockedWordsToFile, parseWords } = require('../features/moderacion/filters/blocked-words-file');

function files() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blocked-words-'));
  return { dir, file: path.join(dir, 'blocked-words.json'), legacyFile: path.join(dir, 'blocked-words.md'), defaultFile: path.join(dir, 'default.md') };
}

test('migra una vez el .md de la cuenta a JSON sin borrar el respaldo', () => {
  const f = files();
  fs.writeFileSync(f.legacyFile, '# lista\n- Uno\n* DOS\n');
  const words = new Set();
  loadBlockedWordsFromFile(words, createStubLogger(), f);
  assert.deepEqual([...words].sort(), ['dos', 'uno']);
  assert.ok(fs.existsSync(f.legacyFile));
  assert.deepEqual(JSON.parse(fs.readFileSync(f.file, 'utf8')), ['dos', 'uno']);
  fs.writeFileSync(f.legacyFile, '- tres\n');
  const second = new Set();
  loadBlockedWordsFromFile(second, createStubLogger(), f);
  assert.deepEqual([...second], ['dos', 'uno']);
});

test('cuenta nueva migra la semilla y JSON corrupto no impide arrancar', () => {
  const f = files();
  fs.writeFileSync(f.defaultFile, '- semilla\n');
  const words = new Set();
  loadBlockedWordsFromFile(words, createStubLogger(), f);
  assert.deepEqual([...words], ['semilla']);
  fs.writeFileSync(f.file, '{ roto');
  const recovered = new Set();
  loadBlockedWordsFromFile(recovered, createStubLogger(), f);
  assert.deepEqual([...recovered], []);
  assert.ok(fs.readdirSync(f.dir).some((name) => name.startsWith('blocked-words.json.corrupt-')));
});

test('acepta JSON y líneas .md/.txt y escribe de forma atómica', () => {
  const f = files();
  assert.deepEqual(parseWords('[" Uno ", "dos"]'), ['uno', 'dos']);
  assert.deepEqual(parseWords('- uno\ndos'), ['uno', 'dos']);
  assert.equal(saveBlockedWordsToFile(new Set(['b', 'a']), createStubLogger(), f.file), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(f.file, 'utf8')), ['a', 'b']);
  assert.equal(fs.existsSync(`${f.file}.tmp`), false);
});
