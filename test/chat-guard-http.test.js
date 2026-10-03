'use strict';

// Integracion: el server real (puerto efimero) con las rutas /api/chat-guard/* y las claves de config.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.TIKTOK_USER_DATA_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-guard-http-'));
process.env.CUENTAS_URL = '';
process.env.CONFIG_DEFAULTS_FILE = ''; // ignora el config-defaults.json bundleado (activa el muro de login)

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { bootServer } = require('./helpers/boot-server');
const mcpRegistry = require('../core/contracts/mcp-registry');

const srv = bootServer();
after(() => srv.close());

async function call(method, url, body) {
  const response = await fetch(`http://127.0.0.1:${srv.port}${url}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('GET /api/chat-guard/status: apagado por defecto, nivel equilibrado y todos los idiomas', async () => {
  const { status, body } = await call('GET', '/api/chat-guard/status');
  assert.equal(status, 200);
  assert.equal(body.state, 'off');
  assert.equal(body.enabled, false);
  assert.equal(body.mode, 'shadow');
  assert.equal(body.level, 'balanced');
  assert.equal(body.langs.length, 10);
  assert.deepEqual(body.allowedWords, []);
});

test('PATCH /api/config acepta nivel e idiomas validos y rechaza los invalidos con errorKey', async () => {
  const good = await call('PATCH', '/api/config', { chatGuardLevel: 'strict', chatGuardLangs: ['es', 'en'] });
  assert.equal(good.status, 200);
  const status = (await call('GET', '/api/chat-guard/status')).body;
  assert.deepEqual([status.level, status.langs], ['strict', ['es', 'en']]);
  const bad = await call('PATCH', '/api/config', { chatGuardLangs: [] });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.errorKey, 'errors.invalidConfig');
});

test('encendido sin el paquete nativo: la app sigue y el estado dice unavailable', async () => {
  await call('PATCH', '/api/config', { rustGuardEnabled: true });
  const { body } = await call('GET', '/api/chat-guard/status');
  assert.equal(body.enabled, true);
  assert.ok(['unavailable', 'ok'].includes(body.state), body.state);
  await call('PATCH', '/api/config', { rustGuardEnabled: false });
});

test('palabras permitidas: agregar, conflicto con bloqueadas, frase y quitar', async () => {
  const added = await call('POST', '/api/chat-guard/allowed-words', { word: ' Hola ' });
  assert.deepEqual([added.status, added.body.allowedWords], [200, ['hola']]);
  await call('POST', '/api/block-word', { word: 'maldita' });
  const conflict = await call('POST', '/api/chat-guard/allowed-words', { word: 'maldita' });
  assert.deepEqual([conflict.status, conflict.body.errorKey], [409, 'errors.chatGuardWordConflict']);
  const phrase = await call('POST', '/api/chat-guard/allowed-words', { word: 'dos palabras' });
  assert.deepEqual([phrase.status, phrase.body.errorKey], [400, 'errors.chatGuardAllowedSingleWord']);
  const status = (await call('GET', '/api/chat-guard/status')).body;
  assert.deepEqual(status.allowedWords, ['hola']);
  const removed = await call('DELETE', '/api/chat-guard/allowed-words', { word: 'HOLA' });
  assert.deepEqual(removed.body.allowedWords, []);
});

test('MCP: las tools de palabras permitidas estan registradas', () => {
  const names = mcpRegistry.listTools().map((tool) => tool.name);
  for (const name of ['moderation_get_rust_guard_status', 'chat_guard_allow_word', 'chat_guard_disallow_word']) {
    assert.ok(names.includes(name), name);
  }
});
