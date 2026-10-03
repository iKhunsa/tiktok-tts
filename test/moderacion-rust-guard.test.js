'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStubLogger } = require('./helpers/stub-logger');
const { createRustGuard } = require('../features/moderacion/rust-guard/create-rust-guard');
const { createRustReviewer } = require('../features/moderacion/rust-guard/review-with-rust');
const { hardenVerdict } = require('../features/moderacion/rust-guard/map-rust-result');
const { loadEngine } = require('../features/moderacion/rust-guard/load-engine');
const { buildRustConfig } = require('../features/moderacion/rust-guard/build-rust-config');

function rustVerdict(action, extra = {}) {
  return { action, category: 'insulto', matchType: 'exact', confidence: 1, ...extra };
}

function createFakeEngine({ check = () => rustVerdict('ALLOW'), apiVersion = 1 } = {}) {
  const calls = [];
  const record = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls,
    start: record('start'),
    stop: record('stop'),
    updateConfig: record('updateConfig'),
    addBlockedWords: record('addBlockedWords'),
    removeBlockedWord: record('removeBlockedWord'),
    check: (text) => { calls.push(['check', text]); return check(text); },
    getStatus: () => ({ running: true, apiVersion, versions: { engine: '0.1.0' } }),
  };
}

function settings(overrides = {}) {
  return { enabled: true, mode: 'enforce', engineConfig: {}, blockedWords: [], ...overrides };
}

function jsVerdict(action = 'allow') {
  return { action, reasons: [], message: { text: { display: 'hola', speech: 'hola' } } };
}

function setup({ engine = createFakeEngine(), mode = 'enforce' } = {}) {
  const logger = createStubLogger();
  const rustGuard = createRustGuard({ logger, loadEngine: () => engine });
  rustGuard.sync(settings({ mode }));
  return { logger, rustGuard, engine, review: createRustReviewer({ rustGuard, logger }) };
}

const eventsOf = (logger) => logger.entries.map((entry) => entry.event);

test('hardenVerdict endurece allow->mute con REVIEW y allow->drop con BLOCK', () => {
  assert.equal(hardenVerdict(jsVerdict('allow'), rustVerdict('REVIEW')).action, 'mute');
  assert.equal(hardenVerdict(jsVerdict('allow'), rustVerdict('BLOCK')).action, 'drop');
  assert.deepEqual(hardenVerdict(jsVerdict('allow'), rustVerdict('BLOCK')).reasons, ['rust:insulto']);
});

test('hardenVerdict nunca relaja un veredicto del guard JS', () => {
  const muted = jsVerdict('mute');
  assert.equal(hardenVerdict(muted, rustVerdict('ALLOW')), muted);
  assert.equal(hardenVerdict(muted, rustVerdict('REVIEW')), muted);
  assert.equal(hardenVerdict(muted, rustVerdict('BLOCK')).action, 'drop');
});

test('enforce: BLOCK de Rust descarta el mensaje y lo registra', () => {
  const engine = createFakeEngine({ check: () => rustVerdict('BLOCK') });
  const { review, logger } = setup({ engine });
  assert.equal(review(jsVerdict('allow')).action, 'drop');
  assert.deepEqual(eventsOf(logger), ['moderacion.rust.iniciado', 'moderacion.rust.bloqueado']);
});

test('enforce: REVIEW de Rust silencia el TTS (mute)', () => {
  const engine = createFakeEngine({ check: () => rustVerdict('REVIEW') });
  const { review, logger } = setup({ engine });
  assert.equal(review(jsVerdict('allow')).action, 'mute');
  assert.ok(eventsOf(logger).includes('moderacion.rust.revision'));
});

test('shadow: registra la discrepancia pero no cambia el veredicto', () => {
  const engine = createFakeEngine({ check: () => rustVerdict('BLOCK') });
  const { review, logger } = setup({ engine, mode: 'shadow' });
  const original = jsVerdict('allow');
  const result = review(original);
  // Solo se anota `shadow` (para el popup de moderacion); accion y razones intactas.
  assert.deepEqual(result, { ...original, shadow: { category: result.shadow.category } });
  assert.ok(eventsOf(logger).includes('moderacion.rust.shadow_bloqueado'));
});

test('shadow: el log de discrepancia no incluye texto ni nick', () => {
  const engine = createFakeEngine({ check: () => rustVerdict('BLOCK') });
  const { review, logger } = setup({ engine, mode: 'shadow' });
  review(jsVerdict('allow'));
  const entry = logger.entries.find((e) => e.event === 'moderacion.rust.shadow_bloqueado');
  assert.deepEqual(Object.keys(entry.data).sort(), ['category', 'jsAction', 'matchType', 'rustAction']);
});

test('un drop del guard JS no consulta a Rust', () => {
  const { review, engine } = setup();
  review(jsVerdict('drop'));
  assert.equal(engine.calls.some(([name]) => name === 'check'), false);
});

test('fail-open: si check lanza, se conserva el veredicto JS y queda log error', () => {
  const engine = createFakeEngine({ check: () => { throw new Error('boom'); } });
  const { review, logger } = setup({ engine });
  const original = jsVerdict('allow');
  assert.equal(review(original), original);
  const failure = logger.entries.find((e) => e.event === 'moderacion.rust.fallo_evaluacion');
  assert.equal(failure.level, 'error');
  assert.equal(failure.data.cause, 'boom');
});

test('fail-open: veredicto degradado del motor se registra y no aplica', () => {
  const engine = createFakeEngine({ check: () => rustVerdict('ALLOW', { degraded: 'Panic' }) });
  const { review, logger } = setup({ engine });
  const original = jsVerdict('allow');
  assert.equal(review(original), original);
  assert.ok(eventsOf(logger).includes('moderacion.rust.fallo_evaluacion'));
});

test('fail-open: el log de fallo se limita a uno por minuto', () => {
  const engine = createFakeEngine({ check: () => { throw new Error('boom'); } });
  const { review, logger } = setup({ engine });
  for (let i = 0; i < 5; i++) review(jsVerdict('allow'));
  assert.equal(eventsOf(logger).filter((e) => e === 'moderacion.rust.fallo_evaluacion').length, 1);
});

test('kill switch: enabled=false detiene el motor y deja de consultarlo', () => {
  const { rustGuard, engine, review } = setup();
  rustGuard.sync(settings({ enabled: false }));
  assert.equal(rustGuard.isRunning(), false);
  assert.ok(engine.calls.some(([name]) => name === 'stop'));
  const original = jsVerdict('allow');
  assert.equal(review(original), original);
});

test('con la bandera apagada nunca se carga el motor', () => {
  let loads = 0;
  const rustGuard = createRustGuard({ logger: createStubLogger(), loadEngine: () => { loads++; return null; } });
  rustGuard.sync(settings({ enabled: false }));
  assert.equal(loads, 0);
});

test('hot-swap: stop + sync arranca otro motor con la config de la cuenta nueva', () => {
  const engines = [createFakeEngine(), createFakeEngine()];
  const rustGuard = createRustGuard({ logger: createStubLogger(), loadEngine: () => engines.shift() });
  rustGuard.sync(settings({ blockedWords: ['a'] }));
  rustGuard.stop();
  rustGuard.sync(settings({ mode: 'shadow', blockedWords: ['b'] }));
  assert.equal(rustGuard.mode(), 'shadow');
  assert.deepEqual(engines, []);
  assert.equal(rustGuard.status().running, true);
});

test('palabras bloqueadas: sync agrega las nuevas y quita las eliminadas', () => {
  const engine = createFakeEngine();
  const { rustGuard } = setup({ engine });
  rustGuard.sync(settings({ blockedWords: ['uno', 'dos'] }));
  rustGuard.sync(settings({ blockedWords: ['dos', 'tres'] }));
  const wordCalls = engine.calls.filter(([name]) => /BlockedWord/.test(name));
  assert.deepEqual(wordCalls, [
    ['addBlockedWords', ['uno', 'dos']],
    ['addBlockedWords', ['tres']],
    ['removeBlockedWord', 'uno'],
  ]);
});

test('paquete ausente: loadEngine devuelve null con log no_disponible', () => {
  const logger = createStubLogger();
  const engine = loadEngine(logger, {}, () => { throw new Error('Cannot find module'); });
  assert.equal(engine, null);
  assert.equal(logger.entries[0].event, 'moderacion.rust.no_disponible');
  assert.equal(logger.entries[0].level, 'warn');
});

test('paquete ausente: la app queda sin motor y el veredicto JS pasa intacto', () => {
  const logger = createStubLogger();
  const rustGuard = createRustGuard({ logger, loadEngine: () => loadEngine(logger, {}, () => { throw new Error('x'); }) });
  rustGuard.sync(settings());
  const original = jsVerdict('allow');
  assert.equal(createRustReviewer({ rustGuard, logger })(original), original);
  assert.equal(rustGuard.status().running, false);
});

test('apiVersion incompatible: loadEngine devuelve null con log', () => {
  const logger = createStubLogger();
  const incompatible = { ChatGuard: function ChatGuard() { return createFakeEngine({ apiVersion: 2 }); } };
  assert.equal(loadEngine(logger, {}, () => incompatible), null);
  assert.match(logger.entries[0].data.cause, /apiVersion 2/);
});

test('loadEngine compatible construye, arranca y devuelve el motor', () => {
  const engine = createFakeEngine();
  const enginePackage = { ChatGuard: function ChatGuard() { return engine; } };
  assert.equal(loadEngine(createStubLogger(), {}, () => enginePackage), engine);
  assert.deepEqual(engine.calls, [['start']]);
});

function busWith(config) {
  return { emit: (event, respond) => { if (event === 'config:get') respond(config); } };
}

test('buildRustConfig: por defecto apagado y en shadow', () => {
  const result = buildRustConfig({ bus: busWith({}), blockedWords: new Set(['x']) });
  assert.deepEqual(result, {
    enabled: false, mode: 'shadow', engineConfig: { preset: 'balanced' }, blockedWords: ['x'], allowedWords: [],
  });
});

test('buildRustConfig: respeta enabled y enforce; un modo invalido cae a shadow', () => {
  const on = buildRustConfig({ bus: busWith({ rustGuardEnabled: true, rustGuardMode: 'enforce' }), blockedWords: new Set() });
  assert.deepEqual([on.enabled, on.mode], [true, 'enforce']);
  const bad = buildRustConfig({ bus: busWith({ rustGuardEnabled: true, rustGuardMode: 'otro' }), blockedWords: new Set() });
  assert.equal(bad.mode, 'shadow');
});

test('config: validators y defaults de las claves nuevas', () => {
  const { CONFIG_VALIDATORS } = require('../features/configuracion/validators');
  const { DEFAULT_CONFIG } = require('../features/configuracion/default-config');
  assert.equal(DEFAULT_CONFIG.rustGuardEnabled, false);
  assert.equal(DEFAULT_CONFIG.rustGuardMode, 'shadow');
  assert.equal(CONFIG_VALIDATORS.rustGuardEnabled('si'), false);
  assert.equal(CONFIG_VALIDATORS.rustGuardMode('enforce'), true);
  assert.equal(CONFIG_VALIDATORS.rustGuardMode('otro'), false);
});
