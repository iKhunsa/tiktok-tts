'use strict';

// Planes mensuales/anuales: el proxy /api/auth/* reenvia el intervalo a
// servicio-cuentas (mockeado) y la sesion conserva subscription.interval/nextInterval.

const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-planes-'));
process.env.TIKTOK_USER_DATA_PATH = TMP;
after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* noop */ } });

const estado = require('../features/auth/estado-sesion');
const rutas = require('../features/auth/routes');

const logger = { log() {} };
const USUARIO = { id: 'u1', email: 'streamer@ejemplo.com' };

function crearAppFalsa() {
  const handlers = {};
  const registrar = (ruta, ...fns) => { handlers[ruta] = fns[fns.length - 1]; };
  return { post: registrar, get: registrar, patch: registrar, delete: registrar, handlers };
}

function crearRespuestaFalsa() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.end = () => res;
  return res;
}

function montarConCliente(cliente) {
  const app = crearAppFalsa();
  rutas.montar({ app, cliente, logger, subscriptionsEnabled: () => true, refresh: { emitirCambio() {} } });
  return app.handlers;
}

async function llamar(handlers, ruta, body) {
  const res = crearRespuestaFalsa();
  await handlers[ruta]({ body }, res);
  return res;
}

beforeEach(() => {
  estado.cerrar(logger);
  estado.aplicar({ token: 't-abc', session: { user: USUARIO, plan: 'pro' } }, logger);
});

test('checkout reenvia plan e intervalo mensual', async () => {
  const llamadas = [];
  const handlers = montarConCliente({
    checkout: async (token, body) => { llamadas.push({ token, body }); return { ok: true, body: { url: 'https://polar/x' } }; },
  });

  const res = await llamar(handlers, '/api/auth/checkout', { plan: 'sin-promos', intervalo: 'month' });

  assert.deepEqual(llamadas, [{ token: 't-abc', body: { plan: 'sin-promos', intervalo: 'month' } }]);
  assert.deepEqual(res.body, { url: 'https://polar/x' });
});

test('checkout sin intervalo o con valor invalido cae a anual', async () => {
  const intervalos = [];
  const handlers = montarConCliente({
    checkout: async (_t, body) => { intervalos.push(body.intervalo); return { ok: true, body: { url: 'u' } }; },
  });

  await llamar(handlers, '/api/auth/checkout', { plan: 'pro' });
  await llamar(handlers, '/api/auth/checkout', { plan: 'pro', intervalo: 'weekly' });

  assert.deepEqual(intervalos, ['year', 'year']);
});

test('change-interval llama al servicio y re-hidrata la sesion con nextInterval', async () => {
  const llamadas = [];
  const sesionServicio = {
    user: USUARIO, plan: 'pro', subscription: { interval: 'year', nextInterval: 'month' },
  };
  const handlers = montarConCliente({
    cambiarIntervalo: async (token, body) => { llamadas.push({ token, body }); return { ok: true, body: { ok: true, appliesAt: '2027-01-01T00:00:00Z' } }; },
    session: async () => ({ ok: true, body: sesionServicio }),
  });

  const res = await llamar(handlers, '/api/auth/subscription/change-interval', { intervalo: 'month' });

  assert.deepEqual(llamadas, [{ token: 't-abc', body: { intervalo: 'month' } }]);
  assert.deepEqual(res.body.subscription, { interval: 'year', nextInterval: 'month' });
});

test('change-interval propaga el 501 notImplemented sin tocar la sesion', async () => {
  const handlers = montarConCliente({
    cambiarIntervalo: async () => ({ ok: false, status: 501, body: { error: 'No soportado', errorKey: 'errors.notImplemented' } }),
  });

  const res = await llamar(handlers, '/api/auth/subscription/change-interval', { intervalo: 'month' });

  assert.equal(res.statusCode, 501);
  assert.equal(res.body.errorKey, 'errors.notImplemented');
});

test('change-interval rechaza intervalo invalido con 400 sin llamar al servicio', async () => {
  const handlers = montarConCliente({
    cambiarIntervalo: async () => { throw new Error('no debia llamarse'); },
  });

  const res = await llamar(handlers, '/api/auth/subscription/change-interval', { intervalo: 'daily' });

  assert.equal(res.statusCode, 400);
});

test('change-interval sin token responde 401', async () => {
  estado.cerrar(logger);
  const handlers = montarConCliente({});

  const res = await llamar(handlers, '/api/auth/subscription/change-interval', { intervalo: 'month' });

  assert.equal(res.statusCode, 401);
});

test('estado de sesion conserva subscription.interval y nextInterval', () => {
  const subscription = { interval: 'year', nextInterval: 'month', currentPeriodEnd: '2027-01-01T00:00:00Z' };

  estado.aplicar({ session: { user: USUARIO, plan: 'pro', subscription } }, logger);

  assert.deepEqual(estado.getSesion().subscription, subscription);
});
