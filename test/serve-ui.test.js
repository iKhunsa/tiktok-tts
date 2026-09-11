'use strict';

// Regresion del bug "Cannot GET /" en la app empaquetada (v1.8.0-v1.8.3):
// core/app.js servia interfaz/dist con una ruta relativa a core/ (dentro del
// asar, inexistente en el installer) en vez de resolver contra RESOURCE_BASE.
//
// Simula el layout que deja el instalador NSIS: <resources>/public/ (ahi copia
// extraResources el output de vite build) y NINGUN interfaz/dist. Se hace ANTES
// de requerir el kernel — `node --test` corre cada archivo en su propio proceso,
// asi que core/paths.js lee este env al cargarse por primera vez.

const os = require('os');
const fs = require('fs');
const path = require('path');

const RES = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-pkg-res-'));
fs.mkdirSync(path.join(RES, 'public', 'assets'), { recursive: true });
fs.writeFileSync(
  path.join(RES, 'public', 'index.html'),
  '<!doctype html><title>TikTok TTS</title><main data-marker="SERVE_UI_FIXTURE"></main>',
);
fs.writeFileSync(path.join(RES, 'public', 'advanced.html'), '<!doctype html><title>avanzada</title>');
fs.writeFileSync(path.join(RES, 'public', 'overlay-chat.html'), '<!doctype html><title>overlay</title>');
fs.writeFileSync(path.join(RES, 'public', 'assets', 'mobile-abc123.js'), 'export const x = 1;\n');

process.env.TIKTOK_RESOURCES_PATH = RES;
process.env.TIKTOK_USER_DATA_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-pkg-usr-'));

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createApp } = require('../core/app');

const server = http.createServer(createApp()).listen(0);
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

test('GET / sirve el index.html de public/ (layout empaquetado)', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.match(r.body, /SERVE_UI_FIXTURE/);
  assert.doesNotMatch(r.body, /Cannot GET/);
});

test('GET /advanced.html y /overlay-*.html se sirven', async () => {
  assert.equal((await get('/advanced.html')).status, 200);
  assert.equal((await get('/overlay-chat.html')).status, 200);
});

test('los assets hasheados del panel movil se sirven', async () => {
  assert.equal((await get('/assets/mobile-abc123.js')).status, 200);
});
