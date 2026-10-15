'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { hasAcceptedTerms, ACCEPTANCE_FILE } = require('../electron-shell/terms-acceptance');

function dirWith(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terms-'));
  if (content !== undefined) fs.writeFileSync(path.join(dir, ACCEPTANCE_FILE), content);
  return dir;
}

const check = (userDataDir) => hasAcceptedTerms({ isPackaged: true, userDataDir });
const valid = JSON.stringify({ version: '2.0', fecha: '2026-10-03T10:00:00' });

test('dev (no empaquetada) siempre true, aunque no haya archivo', () => {
  assert.equal(hasAcceptedTerms({ isPackaged: false, userDataDir: dirWith() }), true);
});

test('empaquetada con archivo valido -> true (caso a: el instalador lo reescribe al actualizar)', () => {
  assert.equal(check(dirWith(valid)), true);
});

test('empaquetada sin archivo -> false (caso b: instalacion silenciosa /S)', () => {
  assert.equal(check(dirWith()), false);
});

test('archivo vacio o corrupto -> false (caso c)', () => {
  assert.equal(check(dirWith('')), false);
  assert.equal(check(dirWith('{no es json')), false);
  assert.equal(check(dirWith('null')), false);
});

test('campos ausentes, vacios o de tipo incorrecto -> false', () => {
  for (const rec of [
    { fecha: 'x' }, { version: '2.0' }, { version: '', fecha: 'x' },
    { version: '2.0', fecha: '  ' }, { version: 2, fecha: 'x' }, { version: '2.0', fecha: 5 },
  ]) assert.equal(check(dirWith(JSON.stringify(rec))), false, JSON.stringify(rec));
});

test('carpeta de datos inexistente -> false (caso d: portable/zip)', () => {
  assert.equal(check(path.join(os.tmpdir(), 'no-existe-' + Date.now())), false);
});

test('nunca lanza aunque fs falle', () => {
  const fsRoto = { readFileSync() { throw new Error('EACCES'); } };
  assert.equal(hasAcceptedTerms({ isPackaged: true, userDataDir: 'x', fs: fsRoto }), false);
});

test('modulos de analitica sin init: enabled=false y shutdown/attach no fallan (casos f, g)', async () => {
  const aptabase = require('../electron-shell/aptabase');
  const glitchtip = require('../electron-shell/glitchtip');
  const telemetry = require('../features/telemetria/runtime');
  assert.equal(aptabase.enabled || glitchtip.enabled || telemetry.enabled, false);
  assert.doesNotThrow(() => { aptabase.attach({ on() {} }); glitchtip.attach({ on() {} }); });
  await telemetry.shutdown({ timeoutMs: 10 });
});
