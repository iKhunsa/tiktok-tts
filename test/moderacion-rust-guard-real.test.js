'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStubLogger } = require('./helpers/stub-logger');
const { createRustGuard } = require('../features/moderacion/rust-guard/create-rust-guard');
const { createRustReviewer } = require('../features/moderacion/rust-guard/review-with-rust');
const { loadEngine } = require('../features/moderacion/rust-guard/load-engine');

const PACKAGE_NAME = '@tiklivetts/rust-chat-guard';
const enginePackage = resolveEnginePackage();
const skip = enginePackage ? false : `${PACKAGE_NAME} no esta instalado; prueba real omitida`;

function resolveEnginePackage() {
  try {
    return require(PACKAGE_NAME);
  } catch {
    return null;
  }
}

function settings(overrides = {}) {
  return { enabled: true, mode: 'enforce', engineConfig: {}, blockedWords: [], ...overrides };
}

function jsVerdict(text, action = 'allow') {
  return { action, reasons: [], message: { text: { display: text, speech: text } } };
}

function createRealGuard() {
  const logger = createStubLogger();
  let engine;
  const rustGuard = createRustGuard({
    logger,
    loadEngine: (log, config) => {
      engine = loadEngine(log, config, () => enginePackage);
      return engine;
    },
  });
  return { logger, rustGuard, getEngine: () => engine };
}

const eventsOf = (logger) => logger.entries.map((entry) => entry.event);

test('adapter real: shadow, enforce y palabras del usuario', { skip }, () => {
  const { logger, rustGuard } = createRealGuard();
  const review = createRustReviewer({ rustGuard, logger });
  rustGuard.sync(settings({ mode: 'shadow', blockedWords: ['palabra-propia'] }));

  assert.equal(rustGuard.status().running, true);
  assert.equal(rustGuard.check('maricón').action, 'BLOCK');
  assert.equal(rustGuard.check('garchar').action, 'BLOCK');
  assert.equal(rustGuard.check('año').action, 'ALLOW');
  assert.equal(rustGuard.check('pvt').action, 'REVIEW');
  assert.equal(rustGuard.check('palabra-propia').action, 'BLOCK');

  const shadow = jsVerdict('maricón');
  // En shadow la decision no cambia; solo se anota `shadow` para el popup de "detectados".
  const reviewed = review(shadow);
  assert.equal(reviewed.action, shadow.action);
  assert.equal(reviewed.message, shadow.message);
  assert.deepEqual(reviewed.reasons, shadow.reasons);
  assert.equal(reviewed.shadow.category, 'discrimination');
  assert.ok(eventsOf(logger).includes('moderacion.rust.shadow_bloqueado'));

  rustGuard.sync(settings({ mode: 'enforce' }));
  assert.equal(review(jsVerdict('maricón')).action, 'drop');
  assert.equal(review(jsVerdict('pvt')).action, 'mute');
  assert.ok(eventsOf(logger).includes('moderacion.rust.bloqueado'));
  assert.ok(eventsOf(logger).includes('moderacion.rust.revision'));
  assert.equal(rustGuard.check('palabra-propia').action, 'ALLOW');
  rustGuard.stop();
});

test('adapter real: degrada fail-open, respeta kill switch y reinicia por cuenta', { skip }, () => {
  const { logger, rustGuard, getEngine } = createRealGuard();
  const review = createRustReviewer({ rustGuard, logger });
  rustGuard.sync(settings({ blockedWords: ['cuenta-a'] }));
  const firstEngine = getEngine();

  firstEngine.setKillSwitch(true);
  const original = jsVerdict('maricón');
  assert.equal(review(original), original);
  assert.ok(eventsOf(logger).includes('moderacion.rust.fallo_evaluacion'));

  rustGuard.sync(settings({ enabled: false }));
  assert.equal(rustGuard.isRunning(), false);
  assert.equal(review(jsVerdict('maricón')).action, 'allow');

  // El listener account:changed ejecuta esta misma secuencia: stop + sync.
  rustGuard.sync(settings({ blockedWords: ['cuenta-b'] }));
  const secondEngine = getEngine();
  assert.notEqual(secondEngine, firstEngine);
  assert.equal(rustGuard.check('cuenta-b').action, 'BLOCK');
  assert.equal(rustGuard.check('cuenta-a').action, 'ALLOW');
  rustGuard.stop();
});
