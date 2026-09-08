'use strict';

// features/auth/ sin CUENTAS_URL configurada: no-op, no rompe el boot, y el
// contrato entitlements respeta subscriptionsEnabled (default false = todo libre).
//
// Aisla DATA_BASE en un tmpdir para no tocar el config.json real del repo.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-test-'));
process.env.TIKTOK_USER_DATA_PATH = TMP;
delete process.env.CUENTAS_URL;

const { bootServer } = require('./helpers/boot-server');
const srv = bootServer();
after(() => {
  srv.close();
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { /* noop */ }
});

const entitlements = require('../core/contracts/entitlements');
const registry = require('../core/contracts/mcp-registry');

test('el dominio auth boota sin CUENTAS_URL (no-op) y no tumba el server', () => {
  assert.ok(srv.port, 'el server arranco');
});

test('auth:get devuelve la sesion vacia', () => {
  let sesion;
  srv.bus.emit('auth:get', (s) => { sesion = s; });
  assert.equal(sesion.signedIn, false);
  assert.equal(sesion.plan, 'free');
  assert.deepEqual(sesion.entitlements, []);
});

test('entitlements.check: subscriptionsEnabled=false -> todo desbloqueado', () => {
  assert.equal(entitlements.check('bot-musical'), true);
  assert.equal(entitlements.check('lo-que-sea'), true);
});

test('entitlements.check: subscriptionsEnabled=true + sin sesion -> bloquea', () => {
  // config:patch propaga config:actualizado sincronicamente -> el snapshot de auth se actualiza.
  srv.bus.emit('config:patch', { subscriptionsEnabled: true });
  assert.equal(entitlements.check('bot-musical'), false);
  srv.bus.emit('config:patch', { subscriptionsEnabled: false });
  assert.equal(entitlements.check('bot-musical'), true);
});

test('rutas /api/auth/* devuelven 404 en no-op (sin servicio)', async () => {
  const res = await fetch(`http://127.0.0.1:${srv.port}/api/auth/session`);
  assert.equal(res.status, 404);
});

test('MCP: tools auth_status/auth_logout + state provider auth', () => {
  const names = new Set(registry.listTools().map((t) => t.name));
  assert.ok(names.has('auth_status'));
  assert.ok(names.has('auth_logout'));
  const st = registry.collectState();
  assert.ok(st.auth && st.auth.plan === 'free');
});

test('gating: subscriptionsEnabled=true + sin sesion -> rutas Pro dan 403', async () => {
  srv.bus.emit('config:patch', { subscriptionsEnabled: true });
  const base = `http://127.0.0.1:${srv.port}`;
  const post = (p) => fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });

  const soundpad = await fetch(`${base}/api/soundpad/upload`, { method: 'POST' });
  assert.equal(soundpad.status, 403, 'soundpad upload gateado');

  const musicSkip = await post('/api/music/skip');
  assert.equal(musicSkip.status, 403, 'music skip gateado');

  const mobile = await fetch(`${base}/mobile`);
  assert.equal(mobile.status, 403, 'panel movil gateado');

  srv.bus.emit('config:patch', { subscriptionsEnabled: false });
  const soundpadOff = await fetch(`${base}/api/soundpad/upload`, { method: 'POST' });
  assert.notEqual(soundpadOff.status, 403, 'con flag off, no gatea');
});
