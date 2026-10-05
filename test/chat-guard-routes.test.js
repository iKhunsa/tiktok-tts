'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.TIKTOK_USER_DATA_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-guard-routes-'));

const { createStubLogger } = require('./helpers/stub-logger');
const { createRustGuard } = require('../features/moderacion/rust-guard/create-rust-guard');
const { allowWord } = require('../features/moderacion/routes/chat-guard-allow-word');
const { disallowWord } = require('../features/moderacion/routes/chat-guard-disallow-word');
const { describeChatGuard } = require('../features/moderacion/routes/chat-guard-status');

function fakeRes() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function fakeEngine({ check = () => ({ action: 'ALLOW' }) } = {}) {
  const calls = [];
  const record = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls,
    start: record('start'),
    stop: record('stop'),
    updateConfig: record('updateConfig'),
    addBlockedWords: record('addBlockedWords'),
    removeBlockedWord: record('removeBlockedWord'),
    addAllowedWords: record('addAllowedWords'),
    removeAllowedWord: record('removeAllowedWord'),
    check,
    getStatus: () => ({ running: true, apiVersion: 1, versions: { engine: '0.3.1', dictionary: '2026-09-30' } }),
  };
}

function setup({ engine = fakeEngine(), config = { rustGuardEnabled: true, rustGuardMode: 'shadow' } } = {}) {
  const logger = createStubLogger();
  const rustGuard = createRustGuard({ logger, loadEngine: () => engine });
  const allowedWords = new Set();
  const blockedWords = new Set(['malo']);
  const bus = { emit: (event, respond) => { if (event === 'config:get') respond(config); } };
  const reconfigure = () => rustGuard.sync({
    enabled: config.rustGuardEnabled, mode: 'shadow', engineConfig: {},
    blockedWords: [...blockedWords], allowedWords: [...allowedWords],
  });
  reconfigure();
  return { logger, engine, rustGuard, allowedWords, blockedWords, bus, reconfigure };
}

const post = (handler, word) => {
  const res = fakeRes();
  handler({ body: { word } }, res);
  return res;
};
const lastCall = (engine, name) => engine.calls.filter(([n]) => n === name).at(-1);

test('allow-word agrega normalizado y lo sincroniza con el motor', () => {
  const ctx = setup();
  const res = post(allowWord(ctx), '  Hola ');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.allowedWords, ['hola']);
  assert.deepEqual(lastCall(ctx.engine, 'addAllowedWords'), ['addAllowedWords', ['hola']]);
});

test('allow-word rechaza vacia, larga, con espacios y en conflicto con bloqueadas', () => {
  const ctx = setup();
  const cases = [
    ['  ', 400, 'errors.chatGuardInvalidWord'],
    ['x'.repeat(41), 400, 'errors.chatGuardInvalidWord'],
    ['dos palabras', 400, 'errors.chatGuardAllowedSingleWord'],
    ['MALO', 409, 'errors.chatGuardWordConflict'],
  ];
  for (const [word, status, errorKey] of cases) {
    const res = post(allowWord(ctx), word);
    assert.deepEqual([res.statusCode, res.body.errorKey], [status, errorKey], word);
  }
  assert.equal(ctx.allowedWords.size, 0);
});

test('disallow-word quita la palabra y avisa al motor', () => {
  const ctx = setup();
  post(allowWord(ctx), 'hola');
  const res = post(disallowWord(ctx), 'HOLA');
  assert.deepEqual(res.body.allowedWords, []);
  assert.deepEqual(lastCall(ctx.engine, 'removeAllowedWord'), ['removeAllowedWord', 'hola']);
});

test('estado: ok con motor vivo, con versiones y lista permitida', () => {
  const ctx = setup({ config: { rustGuardEnabled: true, rustGuardMode: 'enforce', chatGuardLevel: 'strict', chatGuardLangs: ['es'] } });
  post(allowWord(ctx), 'hola');
  assert.deepEqual(describeChatGuard(ctx), {
    state: 'ok', enabled: true, mode: 'enforce', level: 'strict', langs: ['es'], custom: undefined, blockedWordsTelemetryEnabled: false,
    engineVersion: '0.3.1', dictionaryVersion: '2026-09-30', blockedCount: 1, allowedWords: ['hola'],
  });
});

test('estado: off cuando esta apagado', () => {
  const ctx = setup({ config: { rustGuardEnabled: false } });
  assert.equal(describeChatGuard(ctx).state, 'off');
});

test('estado: unavailable cuando esta encendido pero falta el paquete (la app sigue)', () => {
  const rustGuard = createRustGuard({ logger: createStubLogger(), loadEngine: () => null });
  rustGuard.sync({ enabled: true, mode: 'shadow', engineConfig: {}, blockedWords: [], allowedWords: [] });
  assert.equal(rustGuard.status().state, 'unavailable');
  assert.equal(rustGuard.check('hola'), null);
});

test('estado: error cuando el motor falla al evaluar y vuelve a ok al recuperarse', () => {
  let fail = true;
  const engine = fakeEngine({ check: () => { if (fail) throw new Error('boom'); return { action: 'ALLOW' }; } });
  const ctx = setup({ engine });
  ctx.rustGuard.check('hola');
  assert.equal(ctx.rustGuard.status().state, 'error');
  fail = false;
  ctx.rustGuard.check('hola');
  assert.equal(ctx.rustGuard.status().state, 'ok');
});
