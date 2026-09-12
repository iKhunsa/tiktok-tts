'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const { patch, HEX_COLOR } = require('../features/sonido/soundpad/routes/patch');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'soundpad-color-test-'));
const configPath = path.join(tmp, 'sounds-config.json');

after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function handlerDeps() {
  fs.writeFileSync(configPath, JSON.stringify([{ id: 's1', name: 'Sonido', color: '#3ecf8e' }]));
  return {
    soundsConfigPath: configPath,
    logger: { log() {} },
    bus: { emit() {} },
  };
}

function response() {
  const out = { statusCode: 200, body: null };
  out.status = (code) => { out.statusCode = code; return out; };
  out.json = (body) => { out.body = body; return out; };
  return out;
}

test('soundpad: solo admite colores hexadecimales de seis digitos', () => {
  assert.equal(HEX_COLOR.test('#3ecf8e'), true);
  assert.equal(HEX_COLOR.test('#ABCDEF'), true);
  assert.equal(HEX_COLOR.test('red'), false);
  assert.equal(HEX_COLOR.test('#fff'), false);
  assert.equal(HEX_COLOR.test('#fff; background:url(javascript:alert(1))'), false);
});

test('PATCH soundpad rechaza un color que pueda inyectarse en style y no persiste cambios', () => {
  const deps = handlerDeps();
  const res = response();

  patch(deps)({ params: { id: 's1' }, body: { color: '#fff; background:url(javascript:alert(1))' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8'))[0].color, '#3ecf8e');
});

test('PATCH soundpad conserva un color valido en formato canonico', () => {
  const deps = handlerDeps();
  const res = response();

  patch(deps)({ params: { id: 's1' }, body: { color: '#ABCDEF' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.color, '#abcdef');
});
