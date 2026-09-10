'use strict';

// GlitchTip #61: express.static reenvia al error handler global un ENOENT con
// statusCode 404 (archivo que existio para fs.stat pero fallo al abrir — TOCTOU
// con antivirus, o un index.html cacheado de una version vieja pidiendo un PNG
// que ya no existe). attachErrorHandler lo logueaba como core.ruta.excepcion
// -> un issue de GlitchTip por cada asset faltante, y respondia 500.
//
// Fix: errores de clase 4xx no son bugs de la app -> se responde con ese codigo
// y no se loguea. Solo 5xx / sin-status generan issue.

const os = require('os');
const fs = require('fs');
const path = require('path');

const RES = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-errh-res-'));
fs.mkdirSync(path.join(RES, 'public'), { recursive: true });
process.env.TIKTOK_RESOURCES_PATH = RES;
process.env.TIKTOK_USER_DATA_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-errh-usr-'));

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createApp, attachErrorHandler } = require('../core/app');
const { createStubLogger } = require('./helpers/stub-logger');

const logger = createStubLogger();
const app = createApp();

app.get('/boom-404', (_req, _res, next) => {
  const e = new Error("ENOENT: no such file or directory, open '/x/asset/ads/lateral.png'");
  e.statusCode = 404;
  next(e);
});
app.get('/boom-400', (_req, _res, next) => {
  const e = new Error('request aborted');
  e.status = 400;
  next(e);
});
app.get('/boom-500', (_req, _res, next) => { next(new Error('algo real reventó')); });

attachErrorHandler(app, logger);

const server = http.createServer(app).listen(0);
after(() => server.close());

function get(p) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${server.address().port}${p}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

test('un error 404 reenviado se responde 404 y NO se loguea como core.ruta.excepcion', async () => {
  const before = logger.entries.length;
  const r = await get('/boom-404');
  assert.equal(r.status, 404);
  assert.equal(
    logger.entries.slice(before).some((e) => e.event === 'core.ruta.excepcion'), false,
    'no genera issue por un asset faltante'
  );
});

test('un error 400 (request aborted) tampoco se loguea', async () => {
  const before = logger.entries.length;
  const r = await get('/boom-400');
  assert.equal(r.status, 400);
  assert.equal(logger.entries.slice(before).some((e) => e.event === 'core.ruta.excepcion'), false);
});

test('un error real (sin status / 5xx) SÍ se loguea y responde 500', async () => {
  const before = logger.entries.length;
  const r = await get('/boom-500');
  assert.equal(r.status, 500);
  const logged = logger.entries.slice(before).find((e) => e.event === 'core.ruta.excepcion');
  assert.ok(logged, 'se logueo el error real');
  assert.match(logged.message, /algo real reventó/);
});
