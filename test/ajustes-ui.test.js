const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Datos de la cuenta en una carpeta temporal: debe fijarse antes de cargar core/paths.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajustes-ui-'));
process.env.TIKTOK_USER_DATA_PATH = tmp;
const express = require('express');
const { getAjustesUi, putAjustesUi } = require('../features/configuracion/routes/ajustes-ui');

let servidor;
let base;
const logger = { log() {} };

before(async () => {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.get('/api/ajustes-ui', getAjustesUi({ logger }));
  app.put('/api/ajustes-ui', putAjustesUi({ logger }));
  await new Promise((listo) => { servidor = app.listen(0, '127.0.0.1', listo); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => { servidor.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const pedir = async (metodo, cuerpo) => {
  const r = await fetch(`${base}/api/ajustes-ui`, { method: metodo, headers: { 'content-type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { status: r.status, json: await r.json() };
};

test('sin respaldo devuelve datos nulos; tras guardar devuelve lo mismo, tambien con mas de 100 KB', async () => {
  assert.deepEqual((await pedir('GET')).json, { guardado: 0, datos: null });
  const datos = { escenas: [{ nombre: 'A', ids: ['alertas'], nombres: {} }], relleno: 'x'.repeat(200 * 1024) };
  assert.equal((await pedir('PUT', { guardado: 123, datos })).status, 200);
  assert.deepEqual((await pedir('GET')).json, { guardado: 123, datos });
});

test('rechaza un respaldo sin marca de tiempo o sin objeto de datos', async () => {
  assert.equal((await pedir('PUT', { datos: {} })).status, 400);
  assert.equal((await pedir('PUT', { guardado: 1, datos: [1] })).status, 400);
  assert.equal((await pedir('PUT', { guardado: 1, datos: 'texto' })).status, 400);
});
