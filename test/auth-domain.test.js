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

test('subscriptionsEnabled=true + sin sesion: /api/* exige login; whitelist abierta', async () => {
  srv.bus.emit('config:patch', { subscriptionsEnabled: true });
  const base = `http://127.0.0.1:${srv.port}`;
  const post = (p) => fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });

  // El guard corre antes que gateMusica/gateSoundpad -> sin sesion es 401, no 403.
  assert.equal((await post('/api/tts')).status, 401, 'tts exige login');
  assert.equal((await post('/api/music/skip')).status, 401, 'music skip exige login');
  assert.equal((await fetch(`${base}/api/soundpad/upload`, { method: 'POST' })).status, 401, 'soundpad exige login');
  assert.equal((await fetch(`${base}/api/voices`)).status, 401, 'voices exige login');

  assert.equal((await fetch(`${base}/api/config`)).status, 200, 'config abierta');
  assert.equal((await fetch(`${base}/api/overlay-stats`)).status, 200, 'overlay-stats abierta (OBS)');
  assert.equal((await fetch(`${base}/api/gifts-list`)).status, 200, 'gifts-list abierta (OBS)');
  assert.equal((await fetch(`${base}/api/status`)).status, 200, 'status abierta');
  assert.equal((await fetch(`${base}/api/mcp/info`)).status, 200, 'mcp/info abierta');
  assert.equal((await post('/api/report-bug')).status, 400, 'report-bug pasa el guard (400 = validacion del handler)');
  assert.equal((await fetch(`${base}/api/auth/session`)).status, 404, 'auth/* pasa el guard (404 = no-op del dominio)');
  assert.equal((await fetch(`${base}/overlay-alertas.html`)).status, 200, 'overlay estatico abierto');
  assert.equal((await fetch(`${base}/mobile`)).status, 403, 'panel movil = 403 (gatePro, no el guard)');

  srv.bus.emit('config:patch', { subscriptionsEnabled: false });
  assert.notEqual((await post('/api/tts')).status, 401, 'con flag off, no exige login');
  assert.notEqual((await fetch(`${base}/api/soundpad/upload`, { method: 'POST' })).status, 401, 'con flag off, no exige login');
});
