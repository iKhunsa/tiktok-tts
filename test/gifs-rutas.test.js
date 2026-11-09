const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Datos de la cuenta en una carpeta temporal: debe fijarse antes de cargar core/paths.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gifs-rutas-'));
process.env.TIKTOK_USER_DATA_PATH = tmp;
const express = require('express');
const dominio = require('../features/gifs');
const store = require('../features/gifs/store');

let servidor;
let base;
const logger = { log() {} };

before(async () => {
  const app = express();
  app.use(express.json());
  dominio.register({ app, logger });
  await new Promise((listo) => { servidor = app.listen(0, '127.0.0.1', listo); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => { servidor.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const pedir = async (metodo, ruta, cuerpo) => {
  const r = await fetch(base + ruta, { method: metodo, headers: { 'content-type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};

test('la biblioteca empieza vacia', async () => {
  const { status, json } = await pedir('GET', '/api/gifs');
  assert.equal(status, 200);
  assert.deepEqual(json, { items: [], carpetas: [] });
});

test('importar rechaza urls invalidas y privadas con un codigo traducible', async () => {
  assert.deepEqual((await pedir('POST', '/api/gifs/importar', { url: 'no-es-url' })).json, { error: 'url_invalida', codigo: 'url_invalida' });
  const privada = await pedir('POST', '/api/gifs/importar', { url: 'http://127.0.0.1:3000/api/gifs' });
  assert.equal(privada.status, 400);
  assert.equal(privada.json.codigo, 'url_privada');
  assert.equal((await pedir('POST', '/api/gifs/importar', {})).status, 400);
});

test('carpetas: crear, evitar repetidas, renombrar y borrar sin perder los GIFs', async () => {
  const a = await pedir('POST', '/api/gifs/carpetas', { nombre: '  Reacciones ' });
  assert.equal(a.json.carpeta.nombre, 'Reacciones');
  assert.equal((await pedir('POST', '/api/gifs/carpetas', { nombre: 'reacciones' })).status, 409);
  assert.equal((await pedir('POST', '/api/gifs/carpetas', { nombre: '   ' })).status, 400);
  assert.equal((await pedir('POST', '/api/gifs/carpetas', { nombre: 'x'.repeat(41) })).status, 400);

  // siembra dos GIFs: uno de archivo (con su fichero) y uno de enlace
  const db = store.cargar();
  fs.mkdirSync(store.archivosDir(), { recursive: true });
  fs.writeFileSync(path.join(store.archivosDir(), 'uno.gif'), 'GIF89a');
  db.items.push({ id: 'uno', nombre: 'Uno', modo: 'archivo', archivo: 'uno.gif', carpeta: null }, { id: 'dos', nombre: 'Dos', modo: 'enlace', url: 'https://media.giphy.com/d.gif', carpeta: null });
  store.guardar(db);

  const lista = (await pedir('GET', '/api/gifs')).json;
  assert.equal(lista.items.find((i) => i.id === 'uno').src, '/gifs/uno.gif');
  assert.equal(lista.items.find((i) => i.id === 'dos').src, 'https://media.giphy.com/d.gif');
  assert.equal((await fetch(`${base}/gifs/uno.gif`)).status, 200, 'el archivo se sirve');
  assert.equal((await fetch(`${base}/gifs/indice.json`)).status, 404, 'el indice no se sirve');

  const idCarpeta = a.json.carpeta.id;
  assert.equal((await pedir('PATCH', '/api/gifs/uno', { carpeta: idCarpeta })).json.item.carpeta, idCarpeta);
  assert.equal((await pedir('PATCH', '/api/gifs/uno', { carpeta: 'inexistente' })).status, 400);
  assert.equal((await pedir('PATCH', '/api/gifs/uno', { nombre: '  Perrito  ' })).json.item.nombre, 'Perrito');
  assert.equal((await pedir('PATCH', '/api/gifs/uno', { nombre: '' })).status, 400);
  assert.equal((await pedir('PATCH', '/api/gifs/nada', { nombre: 'x' })).status, 404);
  assert.equal((await pedir('PATCH', `/api/gifs/carpetas/${idCarpeta}`, { nombre: 'Memes' })).json.carpeta.nombre, 'Memes');

  assert.equal((await pedir('DELETE', `/api/gifs/carpetas/${idCarpeta}`)).status, 200);
  const tras = (await pedir('GET', '/api/gifs')).json;
  assert.equal(tras.carpetas.length, 0);
  assert.equal(tras.items.find((i) => i.id === 'uno').carpeta, null, 'el GIF vuelve a la biblioteca suelto');
});

test('borrar quita el GIF y su archivo', async () => {
  assert.equal((await pedir('DELETE', '/api/gifs/uno')).status, 200);
  assert.equal(fs.existsSync(path.join(store.archivosDir(), 'uno.gif')), false);
  assert.equal((await pedir('DELETE', '/api/gifs/uno')).status, 404);
  assert.equal((await pedir('GET', '/api/gifs')).json.items.length, 1);
});

test('subir acepta un GIF animado propio, evita el duplicado y rechaza lo que no es animado', async () => {
  // GIF89a de 1x1 con dos fotogramas.
  const cuadro = [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0x02, 0x02, 0x44, 0x01, 0x00];
  const gif = Buffer.from([...Buffer.from('GIF89a'), 1, 0, 1, 0, 0, 0, 0, ...cuadro, ...cuadro, 0x3b]);
  const enviar = async (...archivos) => {
    const formulario = new FormData();
    for (const [nombre, bytes] of archivos) formulario.append('archivos', new Blob([bytes]), nombre);
    const r = await fetch(`${base}/api/gifs/subir`, { method: 'POST', body: formulario });
    return r.json();
  };
  const primero = await enviar(['baile.gif', gif], ['texto.gif', Buffer.from('no soy un gif')]);
  assert.equal(primero.items.length, 1);
  assert.equal(primero.items[0].nombre, 'baile');
  assert.deepEqual(primero.rechazos, ['formato_incompatible']);
  const repetido = await enviar(['otra.gif', gif]);
  assert.deepEqual([repetido.items.length, repetido.duplicados], [0, 1]);
});

test('la biblioteca de sonidos acepta audio por los bytes, no mezcla GIFs y sirve el archivo', async () => {
  const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(40, 1)]);
  const gif = Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'latin1');
  const enviar = async (...archivos) => {
    const formulario = new FormData();
    for (const [nombre, bytes] of archivos) formulario.append('archivos', new Blob([bytes]), nombre);
    return (await fetch(`${base}/api/sonidos/subir`, { method: 'POST', body: formulario })).json();
  };
  const subido = await enviar(['vine boom.mp3', mp3], ['no-es-audio.gif', gif]);
  assert.equal(subido.items.length, 1);
  assert.deepEqual([subido.items[0].nombre, subido.items[0].tipo, subido.items[0].src.startsWith('/sonidos/')], ['vine boom', 'audio', true]);
  assert.deepEqual(subido.rechazos, ['formato_incompatible']);
  assert.equal((await enviar(['otra.mp3', mp3])).duplicados, 1);
  const lista = await (await fetch(`${base}/api/sonidos`)).json();
  assert.equal(lista.items.length, 1);
  const archivo = await fetch(base + lista.items[0].src);
  assert.equal(archivo.status, 200);
  // Las dos bibliotecas son independientes.
  assert.ok(!(await (await fetch(`${base}/api/gifs`)).json()).items.some((i) => i.tipo === 'audio'));
  assert.equal((await fetch(`${base}/api/sonidos/${lista.items[0].id}`, { method: 'DELETE' })).status, 200);
});
