'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStubLogger } = require('./helpers/stub-logger');
const { localesForVoice } = require('../core/chat-guard-voice-languages');
const { CHAT_GUARD_LOCALES, SPANISH_LOCALES, LEGACY_DEFAULT_LANGS } = require('../core/chat-guard-options');
const { GOOGLE_TTS_LANGS } = require('../core/contracts/idioma-datos');
const { normalizeStoredConfig } = require('../features/configuracion/store');
const { createRustGuard } = require('../features/moderacion/rust-guard/create-rust-guard');
const { buildRustConfig } = require('../features/moderacion/rust-guard/build-rust-config');

test('cada voz del TTS tiene idiomas del filtro conocidos e incluye ingles', () => {
  for (const voice of GOOGLE_TTS_LANGS) {
    const locales = localesForVoice(voice);
    assert.ok(locales.includes('en'), `${voice} sin ingles`);
    assert.ok(locales.every((locale) => CHAT_GUARD_LOCALES.includes(locale)), `${voice} con locale desconocido`);
    assert.equal(new Set(locales).size, locales.length, `${voice} con duplicados`);
  }
  assert.deepEqual(localesForVoice('es-MX'), [...SPANISH_LOCALES, 'en']);
  assert.deepEqual(localesForVoice('pt-PT'), ['pt', 'pt_br', 'en']);
  assert.deepEqual(localesForVoice('zh-CN'), ['zh', 'en']);
  assert.deepEqual(localesForVoice('en-GB'), ['en']);
});

test('una voz desconocida cae en espanol mas ingles, nunca en error', () => {
  assert.deepEqual(localesForVoice('xx-YY'), [...SPANISH_LOCALES, 'en']);
  assert.deepEqual(localesForVoice(undefined), [...SPANISH_LOCALES, 'en']);
});

test('migracion: lista por defecto antigua -> automatico; lista elegida a mano -> se respeta', () => {
  assert.equal(normalizeStoredConfig({ chatGuardLangs: [...LEGACY_DEFAULT_LANGS].reverse() }).chatGuardLangsAuto, true);
  assert.equal(normalizeStoredConfig({ chatGuardLangs: ['es', 'en'] }).chatGuardLangsAuto, false);
  assert.equal(normalizeStoredConfig({ chatGuardLangs: ['es'], chatGuardLangsAuto: true }).chatGuardLangsAuto, true);
  assert.equal('chatGuardLangsAuto' in normalizeStoredConfig({ ttsVoiceLang: 'fr' }), false);
});

function fakeEngine(supported) {
  const calls = [];
  return {
    calls,
    getStatus: () => ({ running: true, versions: { engine: '0', dictionary: '0' }, ...(supported ? { languages: supported } : {}) }),
    updateConfig: (config) => {
      const unknown = (config.languages || []).filter((locale) => supported && !supported.includes(locale));
      if (unknown.length) throw new Error(`idioma no soportado: ${unknown[0]}`);
      calls.push(config);
    },
    addBlockedWords() {}, removeBlockedWord() {}, addAllowedWords() {}, removeAllowedWord() {}, stop() {},
    check: () => ({ action: 'ALLOW' }),
  };
}

function guardWith(engine) {
  const logger = createStubLogger();
  const constructed = [];
  const guard = createRustGuard({ logger, loadEngine: (_logger, config) => { constructed.push(config); return engine; } });
  return { guard, logger, constructed };
}

function settingsFor(config) {
  const bus = { emit: (event, reply) => { if (event === 'config:get') reply({ rustGuardEnabled: true, ...config }); } };
  return buildRustConfig({ bus, blockedWords: new Set() });
}

test('el motor arranca sin languages y aplica solo los idiomas que soporta', () => {
  const engine = fakeEngine(['es', 'en']);
  const { guard, logger, constructed } = guardWith(engine);
  guard.sync(settingsFor({ ttsVoiceLang: 'fr' }));
  assert.equal('languages' in constructed[0], false, 'el constructor nunca recibe idiomas');
  assert.deepEqual(engine.calls.at(-1).languages, ['en']);
  assert.deepEqual(guard.status().effectiveLangs, ['en']);
  assert.deepEqual(guard.status().supportedLangs, ['es', 'en']);
  const warnings = logger.entries.filter((entry) => entry.event === 'moderacion.rust.idioma_no_soportado');
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0].data.missing, ['fr']);
  assert.equal(guard.status().state, 'ok', 'un idioma no soportado no deja el motor en error');
});

test('cambiar la voz reconfigura el motor en caliente y el aviso no se repite', () => {
  const engine = fakeEngine(['es', 'es_419', 'es_ar', 'es_cl', 'es_co', 'es_ec', 'es_mx', 'es_pe', 'es_ve', 'en', 'fr']);
  const { guard, logger } = guardWith(engine);
  guard.sync(settingsFor({ ttsVoiceLang: 'es-MX' }));
  assert.deepEqual(engine.calls.at(-1).languages, [...SPANISH_LOCALES, 'en']);
  guard.sync(settingsFor({ ttsVoiceLang: 'fr' }));
  assert.deepEqual(engine.calls.at(-1).languages, ['fr', 'en']);
  guard.sync(settingsFor({ ttsVoiceLang: 'ja' }));
  guard.sync(settingsFor({ ttsVoiceLang: 'ja' }));
  assert.deepEqual(engine.calls.at(-1).languages, ['en']);
  assert.equal(logger.entries.filter((entry) => entry.event === 'moderacion.rust.idioma_no_soportado').length, 1);
});

test('modo manual: se respeta la lista elegida, recortada a lo soportado', () => {
  const engine = fakeEngine(['es', 'en']);
  const { guard } = guardWith(engine);
  guard.sync(settingsFor({ chatGuardLangsAuto: false, chatGuardLangs: ['es', 'fr'] }));
  assert.deepEqual(engine.calls.at(-1).languages, ['es']);
});

test('motor que no expone sus idiomas: se le deja usar los suyos sin filtrar', () => {
  const engine = fakeEngine(null);
  const { guard } = guardWith(engine);
  guard.sync(settingsFor({ ttsVoiceLang: 'fr' }));
  assert.equal('languages' in engine.calls.at(-1), false);
});
