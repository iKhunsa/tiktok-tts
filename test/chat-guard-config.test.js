'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CONFIG_VALIDATORS } = require('../features/configuracion/validators');
const { DEFAULT_CONFIG } = require('../features/configuracion/default-config');
const { CHAT_GUARD_LOCALES } = require('../core/chat-guard-options');
const { buildRustConfig } = require('../features/moderacion/rust-guard/build-rust-config');

const busWith = (config) => ({ emit: (event, respond) => { if (event === 'config:get') respond(config); } });
const engineConfigOf = (config) => buildRustConfig({ bus: busWith(config), blockedWords: new Set() }).engineConfig;

test('defaults: nivel equilibrado y todos los idiomas activos', () => {
  assert.equal(DEFAULT_CONFIG.chatGuardLevel, 'balanced');
  assert.deepEqual(DEFAULT_CONFIG.chatGuardLangs, CHAT_GUARD_LOCALES);
  assert.equal(CONFIG_VALIDATORS.chatGuardLangs(DEFAULT_CONFIG.chatGuardLangs), true);
  assert.equal(DEFAULT_CONFIG.blockedWordsTelemetryDisabled, false);
  assert.equal(CONFIG_VALIDATORS.blockedWordsTelemetryDisabled(true), true);
  assert.equal('blockedWordsTelemetryEnabled' in DEFAULT_CONFIG, false);
});

test('validador chatGuardLevel: solo los 4 niveles', () => {
  for (const level of ['soft', 'balanced', 'strict', 'custom']) assert.equal(CONFIG_VALIDATORS.chatGuardLevel(level), true);
  for (const bad of ['SOFT', 'paranoid', '', null, 1]) assert.equal(CONFIG_VALIDATORS.chatGuardLevel(bad), false);
});

test('validador chatGuardLangs: no vacio, sin duplicados, solo locales conocidos', () => {
  assert.equal(CONFIG_VALIDATORS.chatGuardLangs(['es', 'en']), true);
  assert.equal(CONFIG_VALIDATORS.chatGuardLangs([]), false);
  assert.equal(CONFIG_VALIDATORS.chatGuardLangs(['es', 'es']), false);
  assert.equal(CONFIG_VALIDATORS.chatGuardLangs(['fr', 'zh']), true);
  assert.equal(CONFIG_VALIDATORS.chatGuardLangs(['xx']), false);
  assert.equal(CONFIG_VALIDATORS.chatGuardLangs('es'), false);
});

test('validador chatGuardCustom: exactamente tricks y similar booleanos', () => {
  assert.equal(CONFIG_VALIDATORS.chatGuardCustom({ tricks: true, similar: false }), true);
  assert.equal(CONFIG_VALIDATORS.chatGuardCustom({ tricks: true }), false);
  assert.equal(CONFIG_VALIDATORS.chatGuardCustom({ tricks: 1, similar: false }), false);
  assert.equal(CONFIG_VALIDATORS.chatGuardCustom({ tricks: true, similar: true, links: true }), false);
  assert.equal(CONFIG_VALIDATORS.chatGuardCustom(null), false);
});

test('buildRustConfig: en modo automatico los idiomas siguen a la voz del TTS mas ingles', () => {
  assert.deepEqual(engineConfigOf({ chatGuardLevel: 'strict', ttsVoiceLang: 'fr', chatGuardLangs: ['es'] }), { preset: 'strict', languages: ['fr', 'en'] });
});

test('buildRustConfig: en modo manual se envia la lista elegida', () => {
  assert.deepEqual(engineConfigOf({ chatGuardLevel: 'soft', chatGuardLangsAuto: false, chatGuardLangs: ['es', 'en'] }), { preset: 'soft', languages: ['es', 'en'] });
  assert.deepEqual(engineConfigOf({ chatGuardLangsAuto: false, chatGuardLangs: CHAT_GUARD_LOCALES }).languages, CHAT_GUARD_LOCALES);
});

test('buildRustConfig: nivel invalido cae a balanced', () => {
  assert.equal(engineConfigOf({ chatGuardLevel: 'raro' }).preset, 'balanced');
});

test('buildRustConfig custom: trucos y variantes parecidas mapean a opciones del motor', () => {
  const both = engineConfigOf({ chatGuardLevel: 'custom', chatGuardCustom: { tricks: true, similar: true } });
  assert.deepEqual(both.custom, { splitOnPunctuation: true, collapseRepeats: true, leetspeak: true, fuzzyThreshold: 0.95 });
  const none = engineConfigOf({ chatGuardLevel: 'custom', chatGuardCustom: { tricks: false, similar: false } });
  assert.deepEqual(none.custom, {});
});

test('buildRustConfig: las palabras permitidas viajan al motor', () => {
  const result = buildRustConfig({ bus: busWith({}), blockedWords: new Set(), allowedWords: new Set(['hola']) });
  assert.deepEqual(result.allowedWords, ['hola']);
});
