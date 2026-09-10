'use strict';

// Cubre 3 hallazgos de hardening:
//  - apply-patch: un patch {"__proto__":...} ya no tira TypeError ni contamina.
//  - set_config (MCP): las llaves de gate de seguridad se rechazan del cable MCP.
//  - block-word: una palabra solo-whitespace se rechaza con 400, no mete "" al Set.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hardening-test-'));
process.env.TIKTOK_USER_DATA_PATH = TMP;
process.env.CUENTAS_URL = '';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { applyConfigPatch } = require('../features/configuracion/apply-patch');
const { blockWord } = require('../features/moderacion/routes/block-word');
const { createBlockedMatchersState, getBlockedMatchers } = require('../features/moderacion/filters/blocked-matchers');
const { createStubLogger } = require('./helpers/stub-logger');

test('applyConfigPatch: patch con __proto__/constructor no lanza y no contamina', () => {
  const config = { musicEnabled: true };
  const res = applyConfigPatch(config, JSON.parse('{"__proto__":{"pwned":1},"constructor":1,"musicEnabled":false}'));
  assert.equal(config.musicEnabled, false);
  assert.deepEqual(res.keysChanged, ['musicEnabled']);
  assert.equal({}.pwned, undefined, 'Object.prototype intacto');
});

test('block-word: palabra solo-whitespace -> 400, no se agrega "" al Set', () => {
  const state = createBlockedMatchersState();
  const logger = createStubLogger();
  const handler = blockWord({ blockedMatchersState: state, logger });

  let code = 200; let body = null;
  const res = { status(c) { code = c; return this; }, json(b) { body = b; } };
  handler({ body: { word: '   ' } }, res);

  assert.equal(code, 400);
  assert.equal(body.errorKey, 'errors.textRequired');
  assert.equal(state.blockedWords.size, 0, 'no se metio "" al Set');

  // y una regex de matchers vacia (no una que matchee todo)
  assert.deepEqual(getBlockedMatchers(state), { re1: null, re2: null });
});

test('block-word: palabra real se agrega trimmeada y en minuscula', () => {
  const state = createBlockedMatchersState();
  const handler = blockWord({ blockedMatchersState: state, logger: createStubLogger() });
  let body = null;
  handler({ body: { word: '  SpAm  ' } }, { status() { return this; }, json(b) { body = b; } });
  assert.deepEqual(body.words, ['spam']);
});

test('refresh.tick: logout durante el await descarta el resultado stale', async () => {
  const estado = require('../features/auth/estado-sesion');
  const { crearRefresh } = require('../features/auth/refresh');
  const log = createStubLogger();

  estado.aplicar({
    token: 'tok-viejo',
    session: { user: { id: 'u1', email: 'a@b.c' }, plan: 'pro', entitlements: ['bot-musical'] },
  }, log);

  let release;
  const cliente = {
    session: () => new Promise((r) => {
      release = () => r({ ok: true, status: 200, body: { user: { id: 'u1', email: 'a@b.c' }, plan: 'pro', entitlements: ['bot-musical'] } });
    }),
  };
  const refresh = crearRefresh({ cliente, bus: new EventEmitter(), logger: log });

  const p = refresh.tick();
  await new Promise((r) => setTimeout(r, 0));
  estado.cerrar(log);       // el usuario cierra sesion mientras session() esta pendiente
  release();
  await p;

  assert.equal(estado.getSesion().signedIn, false, 'la sesion stale no se re-aplico');
  assert.equal(estado.getToken(), null);
});

// --- set_config gate: requiere boot del server ---
const { bootServer } = require('./helpers/boot-server');
const srv = bootServer();
after(() => {
  srv.close();
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* noop */ }
});
const registry = require('../core/contracts/mcp-registry');

test('set_config (MCP): rechaza subscriptionsEnabled / mcp*ToolsEnabled / mcpEnabled', async () => {
  const out = await registry.callTool('set_config', {
    patch: {
      subscriptionsEnabled: false,
      mcpEnabled: false,
      mcpDevToolsEnabled: true,
      mcpDestructiveToolsEnabled: true,
      musicEnabled: false,
    },
  });
  assert.equal(out.ok, true, 'el handler no lanza');
  assert.deepEqual(
    out.result.blocked.slice().sort(),
    ['mcpDestructiveToolsEnabled', 'mcpDevToolsEnabled', 'mcpEnabled', 'subscriptionsEnabled'],
  );
  assert.deepEqual(out.result.keysChanged, ['musicEnabled'], 'solo la clave publica se aplico');
});
