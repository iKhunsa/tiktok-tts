'use strict';

// DELETE /api/auth/account: el proxy solo cierra sesion y borra los datos
// locales de la cuenta si servicio-cuentas confirma el borrado (mockeado).

const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-eliminar-'));
process.env.TIKTOK_USER_DATA_PATH = TMP;
after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* noop */ } });

const estado = require('../features/auth/estado-sesion');
const rutas = require('../features/auth/routes');
const { safeAccountId } = require('../core/account-data-path');

const USUARIO = { id: 'u1', email: 'streamer@ejemplo.com' };
const RUTA = '/api/auth/account';

let eventos;
let cambios;
const logger = { log: (...args) => eventos.push(args[3]) };

function montarConCliente(cliente) {
  const handlers = {};
  const app = { delete: (ruta, ...fns) => { handlers[ruta] = fns[fns.length - 1]; }, post() {}, get() {}, patch() {} };
  const refresh = { emitirCambio: (antes, despues) => cambios.push({ antes, despues }) };
  rutas.montar({ app, cliente, logger, subscriptionsEnabled: () => true, refresh });
  return handlers[RUTA];
}

function responder() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function eliminar(handler, body) {
  const res = responder();
  await handler({ body }, res);
  return res;
}

function carpetaLocalDeU1() {
  const dir = path.join(TMP, 'accounts', safeAccountId(USUARIO.id));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'config.json'), '{}');
  return dir;
}

beforeEach(() => {
  eventos = [];
  cambios = [];
  estado.cerrar(logger);
  eventos = [];
  estado.aplicar({ token: 't-abc', session: { user: USUARIO, plan: 'pro' } }, logger);
});

test('backend ok: cierra sesion, borra datos locales y emite el cambio de cuenta', async () => {
  const dir = carpetaLocalDeU1();
  const llamadas = [];
  const handler = montarConCliente({
    eliminarCuenta: async (token, body) => { llamadas.push({ token, body }); return { ok: true, status: 200, body: { ok: true } }; },
  });

  const res = await eliminar(handler, { password: 'secreta123' });

  assert.deepEqual(llamadas, [{ token: 't-abc', body: { password: 'secreta123' } }]);
  assert.equal(res.body.signedIn, false);
  assert.equal(estado.getToken(), null);
  assert.equal(fs.existsSync(dir), false);
  assert.equal(cambios.length, 1);
  assert.equal(cambios[0].antes.user.id, 'u1');
  assert.equal(cambios[0].despues.signedIn, false);
  assert.ok(eventos.includes('auth.cuenta.eliminada'));
});

test('backend rechaza (contrasena incorrecta): mantiene sesion y datos locales', async () => {
  const dir = carpetaLocalDeU1();
  const handler = montarConCliente({
    eliminarCuenta: async () => ({ ok: false, status: 403, body: { error: 'x', errorKey: 'errors.wrongPassword' } }),
  });

  const res = await eliminar(handler, { password: 'mala' });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.errorKey, 'errors.wrongPassword');
  assert.equal(estado.getToken(), 't-abc');
  assert.equal(fs.existsSync(dir), true);
  assert.equal(cambios.length, 0);
  assert.ok(!eventos.includes('auth.cuenta.eliminada'));
});

test('servicio caido (status 0): 502, no cierra sesion ni borra datos', async () => {
  const dir = carpetaLocalDeU1();
  const handler = montarConCliente({ eliminarCuenta: async () => ({ ok: false, status: 0, body: null }) });

  const res = await eliminar(handler, { password: 'secreta123' });

  assert.equal(res.statusCode, 502);
  assert.equal(estado.getToken(), 't-abc');
  assert.equal(fs.existsSync(dir), true);
});

test('sin contrasena: 400 y ni siquiera llama al servicio', async () => {
  let llamado = false;
  const handler = montarConCliente({ eliminarCuenta: async () => { llamado = true; return { ok: true }; } });

  const res = await eliminar(handler, {});

  assert.equal(res.statusCode, 400);
  assert.equal(llamado, false);
  assert.equal(estado.getToken(), 't-abc');
});

test('sin sesion: 401', async () => {
  estado.cerrar(logger);
  const handler = montarConCliente({ eliminarCuenta: async () => ({ ok: true }) });

  const res = await eliminar(handler, { password: 'secreta123' });

  assert.equal(res.statusCode, 401);
});

