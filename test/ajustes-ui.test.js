const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Datos de la cuenta en una carpeta temporal: debe fijarse antes de cargar core/paths.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ajustes-ui-'));
process.env.TIKTOK_USER_DATA_PATH = tmp;
const express = require('express');
const { getAjustesUi, putAjustesUi, getEscenaOverlay } = require('../features/configuracion/routes/ajustes-ui');

let conPro = false;
const bus = { emit(evento, responder) {
  if (evento === 'config:get') responder({ subscriptionsEnabled: true });
  if (evento === 'auth:get') responder({ signedIn: true, plan: conPro ? 'pro' : 'free' });
} };
let servidor;
let base;
const logger = { log() {} };

before(async () => {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.get('/api/overlays/escena', getEscenaOverlay({ bus }));
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


const SIN_TRANSICION = { tipo: 'ninguna', duracion: 600, invertir: false, color: '#000000', stinger: { src: '', punto: 50 } };

test('escenas OBS se bloquean al perder Pro sin borrar el respaldo y vuelven al renovar', async () => {
  const datos = { escenaActivaId: 'a', escenas: [{ id: 'a', urls: ['/overlay-chat.html?skin=terminal', 'https://externo/', '/overlay-escena.html?e=a'] }] };
  await pedir('PUT', { guardado: 234, datos });
  const escena = () => fetch(`${base}/api/overlays/escena?e=dinamica&v=2`);
  const sinBuild = async (respuesta) => { const json = await respuesta.json(); delete json.build; return json; };
  conPro = true;
  assert.deepEqual(await sinBuild(await escena()), { urls: ['/overlay-chat.html?skin=terminal'], escenaId: 'a', transicion: SIN_TRANSICION });
  conPro = false;
  assert.equal((await escena()).status, 403);
  assert.deepEqual((await pedir('GET')).json.datos, datos);
  conPro = true;
  assert.deepEqual(await sinBuild(await escena()), { urls: ['/overlay-chat.html?skin=terminal'], escenaId: 'a', transicion: SIN_TRANSICION });
});

test('la escena dinamica devuelve la transicion elegida y descarta valores raros', async () => {
  conPro = true;
  const leer = async (transicionEscena) => {
    await pedir('PUT', { guardado: 345, datos: { escenaActivaId: 'a', escenas: [{ id: 'a', urls: [] }], transicionEscena } });
    return (await (await fetch(`${base}/api/overlays/escena?e=dinamica&v=2`)).json()).transicion;
  };
  assert.deepEqual(await leer({ tipo: 'cortina-izquierda', duracion: 900 }), { ...SIN_TRANSICION, tipo: 'cortina-izquierda', duracion: 900 });
  assert.deepEqual(await leer({ tipo: '../x', duracion: 'mucho' }), SIN_TRANSICION);
  assert.deepEqual(await leer({ tipo: 'fundido', duracion: 99999 }), { ...SIN_TRANSICION, tipo: 'fundido', duracion: 3000 });
  assert.deepEqual(await leer({ tipo: 'stinger', invertir: true, color: '#ff0000', stinger: { src: '/imagenes/a.png', punto: 70 } }), { ...SIN_TRANSICION, tipo: 'stinger', invertir: true, color: '#ff0000', stinger: { src: '/imagenes/a.png', punto: 70 } });
  assert.deepEqual((await leer({ tipo: 'stinger', color: 'rojo', stinger: { src: 'javascript:alert(1)', punto: 500 } })), { ...SIN_TRANSICION, tipo: 'stinger', stinger: { src: '', punto: 90 } });
});

test('las paginas de escena anteriores (sin v=2) reciben una escena que las recarga', async () => {
  conPro = true;
  const respuesta = await fetch(`${base}/api/overlays/escena?e=dinamica`);
  assert.deepEqual(await respuesta.json(), { urls: ['/overlay-recarga.html'] });
});
