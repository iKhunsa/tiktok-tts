'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { CHAT_GUARD_LOCALES, CHAT_GUARD_LEVELS } = require('../core/chat-guard-options');

const FOLDER = path.join(__dirname, '..', 'interfaz', 'src', 'vistas', 'principal', 'moderacion-contenido');
const front = (file) => import(pathToFileURL(path.join(FOLDER, file)).href);
const store = async (initial) => (await import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', 'nucleo', 'estado', 'crear-almacen.js')).href)).crearAlmacen(initial);

const jsonResponse = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('opciones del frontend espejan las del backend', async () => {
  const options = await front('chat-guard-options.js');
  assert.deepEqual(options.LOCALES.map((locale) => locale.code), CHAT_GUARD_LOCALES);
  assert.deepEqual(options.LEVELS, CHAT_GUARD_LEVELS);
});

test('cliente: exito devuelve { ok, data, errorKey: "" }', async () => {
  const { createChatGuardApi } = await front('chat-guard-api.js');
  const api = createChatGuardApi(async () => jsonResponse(200, { state: 'ok' }));
  assert.deepEqual(await api.getStatus(), { ok: true, data: { state: 'ok' }, errorKey: '' });
});

test('cliente: error HTTP conserva el errorKey del backend', async () => {
  const { createChatGuardApi } = await front('chat-guard-api.js');
  const api = createChatGuardApi(async () => jsonResponse(409, { errorKey: 'errors.chatGuardWordConflict' }));
  assert.deepEqual(await api.addAllowedWord('x'), { ok: false, data: { errorKey: 'errors.chatGuardWordConflict' }, errorKey: 'errors.chatGuardWordConflict' });
});

test('cliente: nunca lanza (red caida, JSON roto, error sin errorKey)', async () => {
  const { createChatGuardApi } = await front('chat-guard-api.js');
  const down = createChatGuardApi(async () => { throw new Error('offline'); });
  assert.deepEqual(await down.getStatus(), { ok: false, data: {}, errorKey: 'errors.chatGuardUnavailable' });
  const broken = createChatGuardApi(async () => ({ ok: false, status: 500, json: async () => { throw new Error('html'); } }));
  assert.deepEqual(await broken.patchConfig({}), { ok: false, data: {}, errorKey: 'errors.chatGuardUnavailable' });
});

test('cliente: DELETE y POST envian la palabra en el body JSON', async () => {
  const { createChatGuardApi } = await front('chat-guard-api.js');
  const calls = [];
  const api = createChatGuardApi(async (url, init) => { calls.push([init.method, url, init.body]); return jsonResponse(200, {}); });
  await api.addBlockedWord('a');
  await api.removeAllowedWord('b');
  assert.deepEqual(calls, [
    ['POST', '/api/block-word', '{"word":"a"}'],
    ['DELETE', '/api/chat-guard/allowed-words', '{"word":"b"}'],
  ]);
});

test('reglas de palabra: vacia, larga, frase en permitidas, duplicada y en conflicto', async () => {
  const { findWordProblem, normalizeWord } = await front('word-rules.js');
  const words = { blocked: ['malo'], allowed: ['bueno'] };
  const problem = (word, list) => findWordProblem({ word: normalizeWord(word), list, words });
  assert.equal(problem('  ', 'blocked').key, 'chatGuard.words.empty');
  assert.equal(problem('x'.repeat(41), 'blocked').key, 'chatGuard.words.tooLong');
  assert.equal(problem('dos palabras', 'allowed').key, 'errors.chatGuardAllowedSingleWord');
  assert.equal(problem('dos palabras', 'blocked'), null);
  assert.equal(problem('MALO', 'blocked').key, 'chatGuard.words.duplicate');
  assert.deepEqual(problem('malo', 'allowed'), { key: 'chatGuard.words.conflict', otherListKey: 'chatGuard.words.listBlocked' });
  assert.equal(problem('nuevo', 'allowed'), null);
});

test('listas de palabras: abre el popup sin chips permanentes', async () => {
  const i18n = await import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', 'nucleo', 'i18n', 'i18n.js')).href);
  const source = fs.readFileSync(path.join(FOLDER, 'word-lists.js'), 'utf8');
  const popupFolder = path.join(__dirname, '..', 'interfaz', 'src', 'vistas', 'principal', 'moderacion-popup');
  const popup = fs.readFileSync(path.join(popupFolder, 'index.js'), 'utf8');
  const wordsTab = fs.readFileSync(path.join(popupFolder, 'tab-words.js'), 'utf8');
  assert.match(source, /openModerationPopup\('words'\)/);
  assert.doesNotMatch(source, /cg-chips/);
  assert.match(popup, /id: 'allowedWords'/, 'el modal incluye una pestaña para palabras permitidas');
  assert.match(popup, /allowedWords: 'modPopup.tab.allowedWords'/);
  assert.match(wordsTab, /chatGuardApi\.getStatus\(\)/, 'el popup también carga las palabras permitidas');
  assert.match(wordsTab, /chatGuardApi\.removeAllowedWord/, 'las palabras permitidas conservan la acción de quitar');

  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse(200, require('../interfaz/publico/locales/es.json'));
  try {
    await i18n.cargarIdioma('es');
    assert.equal(i18n.t('chatGuard.words.emptyBlocked'), require('../interfaz/publico/locales/es.json').chatGuard.words.emptyBlocked);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

function fakeApi(overrides = {}) {
  const ok = (data) => ({ ok: true, data, errorKey: '' });
  const status = { state: 'ok', enabled: true, mode: 'shadow', level: 'balanced', langs: [...CHAT_GUARD_LOCALES], custom: { tricks: true, similar: false }, allowedWords: [] };
  return {
    getStatus: async () => ok(status),
    getBlockedWords: async () => ok({ words: ['zeta', 'alfa'] }),
    patchConfig: async () => ok({}),
    addBlockedWord: async (word) => ok({ words: [word] }),
    removeBlockedWord: async () => ok({ words: [] }),
    addAllowedWord: async (word) => ok({ allowedWords: [word] }),
    removeAllowedWord: async () => ok({ allowedWords: [] }),
    ...overrides,
  };
}

async function setup(apiOverrides) {
  const { createActions, initialState } = await front('chat-guard-actions.js');
  const notified = [];
  const s = await store(initialState());
  const actions = createActions({ store: s, api: fakeApi(apiOverrides), notify: (key) => notified.push(key) });
  await actions.load();
  return { s, actions, notified };
}

test('acciones: load deja el panel listo con palabras ordenadas', async () => {
  const { s } = await setup();
  assert.equal(s.getState().phase, 'ready');
  assert.deepEqual(s.getState().words.blocked, ['alfa', 'zeta']);
});

test('acciones: si el estado no carga, phase error con errorKey', async () => {
  const { s } = await setup({ getStatus: async () => ({ ok: false, data: {}, errorKey: 'errors.chatGuardUnavailable' }) });
  assert.deepEqual([s.getState().phase, s.getState().loadErrorKey], ['error', 'errors.chatGuardUnavailable']);
});

test('acciones: un refresco fallido con datos ya pintados no esconde el panel', async () => {
  let down = false;
  const { s, actions } = await setup({
    getStatus: async () => (down ? { ok: false, data: {}, errorKey: 'errors.chatGuardUnavailable' } : { ok: true, errorKey: '', data: { enabled: true, allowedWords: [] } }),
  });
  down = true;
  await actions.load();
  assert.equal(s.getState().phase, 'ready');
});

test('acciones: guardado optimista aplica el valor y revierte con aviso si falla', async () => {
  const { s, actions, notified } = await setup({ patchConfig: async () => ({ ok: false, data: {}, errorKey: 'errors.invalidConfig' }) });
  const saving = actions.setMode('enforce');
  assert.equal(s.getState().status.mode, 'enforce');
  await saving;
  assert.equal(s.getState().status.mode, 'shadow');
  assert.deepEqual(notified, ['errors.invalidConfig']);
});

test('acciones: setLevel envia el nivel y anuncia el cambio', async () => {
  const sent = [];
  const { s, actions } = await setup({ patchConfig: async (patch) => { sent.push(patch); return { ok: true, data: {}, errorKey: '' }; } });
  await actions.setLevel('strict', 'chatGuard.level.strict');
  assert.deepEqual(sent, [{ chatGuardLevel: 'strict' }]);
  assert.equal(s.getState().announce.key, 'chatGuard.announce.levelChanged');
});

test('acciones: no se puede desmarcar el ultimo idioma', async () => {
  const sent = [];
  const { s, actions } = await setup({
    getStatus: async () => ({ ok: true, errorKey: '', data: { enabled: true, mode: 'shadow', level: 'soft', langs: ['es'], custom: {}, allowedWords: [] } }),
    patchConfig: async (patch) => { sent.push(patch); return { ok: true, data: {}, errorKey: '' }; },
  });
  assert.equal(await actions.setLanguage('es', false), false);
  assert.equal(s.getState().langProblem, true);
  assert.deepEqual(sent, []);
  await actions.setLanguage('en', true);
  assert.deepEqual(sent, [{ chatGuardLangs: ['es', 'en'] }]);
  assert.equal(s.getState().langProblem, false);
});

test('acciones: idiomas se envian en el orden canonico', async () => {
  const sent = [];
  const { actions } = await setup({ patchConfig: async (patch) => { sent.push(patch); return { ok: true, data: {}, errorKey: '' }; } });
  await actions.setLanguage('es_419', false);
  assert.deepEqual(sent[0].chatGuardLangs, CHAT_GUARD_LOCALES.filter((code) => code !== 'es_419'));
});

test('acciones: addWord valida local, no llama a la API y deja el aviso', async () => {
  let calls = 0;
  const { s, actions } = await setup({ addBlockedWord: async () => { calls += 1; return { ok: true, data: { words: [] }, errorKey: '' }; } });
  assert.equal(await actions.addWord('blocked', '   '), false);
  assert.equal(s.getState().wordProblem.key, 'chatGuard.words.empty');
  assert.equal(await actions.addWord('blocked', 'ZETA'), false);
  assert.equal(s.getState().wordProblem.key, 'chatGuard.words.duplicate');
  assert.equal(calls, 0);
});

test('acciones: addWord guarda la lista del servidor y limpia el aviso; el error del servidor se muestra', async () => {
  const { s, actions } = await setup();
  assert.equal(await actions.addWord('allowed', ' Hola '), true);
  assert.deepEqual(s.getState().words.allowed, ['hola']);
  assert.equal(s.getState().wordProblem, null);
  const rejected = await setup({ addAllowedWord: async () => ({ ok: false, data: {}, errorKey: 'errors.chatGuardWordConflict' }) });
  assert.equal(await rejected.actions.addWord('allowed', 'nueva'), false);
  assert.equal(rejected.s.getState().wordProblem.key, 'errors.chatGuardWordConflict');
});

test('acciones: removeWord actualiza la lista y avisa si falla', async () => {
  const { s, actions } = await setup();
  assert.equal(await actions.removeWord('blocked', 'alfa'), true);
  assert.deepEqual(s.getState().words.blocked, []);
  const failing = await setup({ removeBlockedWord: async () => ({ ok: false, data: {}, errorKey: 'errors.chatGuardUnavailable' }) });
  assert.equal(await failing.actions.removeWord('blocked', 'alfa'), false);
  assert.deepEqual(failing.notified, ['errors.chatGuardUnavailable']);
  assert.deepEqual(failing.s.getState().words.blocked, ['alfa', 'zeta']);
});

test('acciones: exporta la pestaña activa', async () => {
  const { actions } = await setup({ exportBlockedWords: async () => ({ ok: true, data: ['alfa'], errorKey: '' }) });
  assert.deepEqual(await actions.exportWords('blocked'), ['alfa']);
  assert.deepEqual(await actions.exportWords('allowed'), []);
});

test('acciones: la respuesta del servidor reemplaza el estado y provoca un nuevo render', async () => {
  const { s, actions } = await setup({ addBlockedWord: async () => ({ ok: true, data: { words: ['zeta', 'alfa', 'nuevo'] }, errorKey: '' }) });
  const renders = [];
  s.subscribe((state) => renders.push([...state.words.blocked]));
  await actions.addWord('blocked', 'nuevo');
  assert.deepEqual(s.getState().words.blocked, ['alfa', 'nuevo', 'zeta']);
  assert.ok(renders.some((words) => words.join(',') === 'alfa,nuevo,zeta'));
});

test('i18n: toda clave chatGuard.* / errors.chatGuard* usada en el panel existe en es.json', () => {
  const es = require('../interfaz/publico/locales/es.json');
  const lookup = (key) => key.split('.').reduce((node, part) => (node ? node[part] : undefined), es);
  const used = new Set();
  for (const file of fs.readdirSync(FOLDER)) {
    const source = fs.readFileSync(path.join(FOLDER, file), 'utf8');
    for (const match of source.matchAll(/['"`]((?:chatGuard\.|errors\.chatGuard)[\w.]*)['"`]/g)) used.add(match[1]);
    for (const match of source.matchAll(/data-i18n(?:-placeholder)?="((?:chatGuard)[\w.]*)"/g)) used.add(match[1]);
  }
  const options = fs.readFileSync(path.join(FOLDER, 'chat-guard-options.js'), 'utf8');
  for (const match of options.matchAll(/labelKey: '([\w.]+)'/g)) used.add(match[1]);
  // Claves armadas con plantilla (`chatGuard.level.${level}`, `chatGuard.mode.${mode}`, ...).
  for (const level of CHAT_GUARD_LEVELS) { used.add(`chatGuard.level.${level}`); used.add(`chatGuard.level.${level}Desc`); }
  for (const mode of ['shadow', 'enforce']) { used.add(`chatGuard.mode.${mode}`); used.add(`chatGuard.mode.${mode}Desc`); }
  for (const option of ['tricks', 'similar']) { used.add(`chatGuard.custom.${option}`); used.add(`chatGuard.custom.${option}Hint`); }
  for (const list of ['blocked', 'allowed']) { used.add(`chatGuard.words.${list}Tab`); used.add(`chatGuard.words.${list}Help`); }
  const missing = [...used].filter((key) => typeof lookup(key) !== 'string');
  assert.deepEqual(missing, []);
});
