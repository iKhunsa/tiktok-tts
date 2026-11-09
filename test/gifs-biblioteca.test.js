const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Todo va a carpetas temporales: nunca se toca la biblioteca real de la cuenta.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gifs-test-'));
const { sniff } = require('../features/gifs/sniff');
const { validarUrl, esIpPrivada } = require('../features/gifs/validar-url');
const { esEnlacePersistente } = require('../features/gifs/proveedores');
const { descargar } = require('../features/gifs/descargar');
const { importar } = require('../features/gifs/importar');
const { verificarEnlaces } = require('../features/gifs/verificar-enlaces');

// ── bytes de ejemplo ────────────────────────────────────────────────────────
// GIF de 1x1 con N fotogramas (cada uno: descriptor de imagen + 1 byte LZW + subbloque vacio).
function gif(fotogramas) {
  const cabecera = Buffer.from('GIF89a', 'latin1');
  const pantalla = Buffer.from([1, 0, 1, 0, 0x00, 0, 0]);
  const cuadro = Buffer.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 0]);
  return Buffer.concat([cabecera, pantalla, ...Array(fotogramas).fill(cuadro), Buffer.from([0x3b])]);
}
function webp(animado) {
  const b = Buffer.alloc(40);
  b.write('RIFF', 0, 'latin1'); b.write('WEBP', 8, 'latin1'); b.write('VP8X', 12, 'latin1');
  b[20] = animado ? 0x02 : 0;
  b.writeUIntLE(319, 24, 3); b.writeUIntLE(199, 27, 3);
  return b;
}
function png(animado) {
  const trozo = (tipo, datos) => {
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
    return Buffer.concat([largo, Buffer.from(tipo, 'latin1'), datos, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(10, 0); ihdr.writeUInt32BE(20, 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), trozo('IHDR', ihdr),
    ...(animado ? [trozo('acTL', Buffer.alloc(8))] : []), trozo('IDAT', Buffer.alloc(2)), trozo('IEND', Buffer.alloc(0)),
  ]);
}

test('sniff distingue animados de fijos por los bytes, no por la extension', () => {
  assert.deepEqual(sniff(gif(3)), { tipo: 'gif', ext: 'gif', mime: 'image/gif', animado: true, ancho: 1, alto: 1 });
  assert.equal(sniff(gif(1)).animado, false);
  assert.equal(sniff(webp(true)).animado, true);
  assert.equal(sniff(webp(false)).animado, false);
  assert.equal(sniff(webp(true)).ancho, 320);
  assert.equal(sniff(png(true)).animado, true);
  assert.equal(sniff(png(false)).animado, false);
  assert.equal(sniff(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypmp42'), Buffer.alloc(8)])).tipo, 'video');
  assert.equal(sniff(Buffer.from('<html>no soy una imagen</html>')), null);
  assert.equal(sniff(Buffer.alloc(3)), null);
});

test('validarUrl acepta solo http(s) publicas y rechaza la red interna', async () => {
  const publico = async () => [{ address: '151.101.1.1' }];
  assert.equal(await validarUrl('https://media.giphy.com/a.gif#x', { resolver: publico }), 'https://media.giphy.com/a.gif');
  for (const mala of ['ftp://x.com/a.gif', 'javascript:alert(1)', 'no es una url', '', null, `https://x.com/${'a'.repeat(2100)}`, 'https://u:p@x.com/a.gif']) {
    await assert.rejects(() => validarUrl(mala, { resolver: publico }), { codigo: 'url_invalida' }, String(mala).slice(0, 30));
  }
  for (const privada of ['http://localhost:3000/a.gif', 'http://127.0.0.1/a.gif', 'http://192.168.1.5/a.gif', 'http://[::1]/a.gif', 'http://10.0.0.1/a.gif']) {
    await assert.rejects(() => validarUrl(privada, { resolver: publico }), { codigo: 'url_privada' }, privada);
  }
  // un nombre publico que resuelve a una IP interna (DNS rebinding) tambien se rechaza
  await assert.rejects(() => validarUrl('https://truco.example/a.gif', { resolver: async () => [{ address: '192.168.0.1' }] }), { codigo: 'url_privada' });
  assert.equal(esIpPrivada('172.20.0.1'), true);
  assert.equal(esIpPrivada('172.32.0.1'), false);
  assert.equal(esIpPrivada('::ffff:10.0.0.1'), true);
});

test('solo los proveedores permanentes se guardan como enlace', () => {
  assert.equal(esEnlacePersistente('https://media2.giphy.com/media/x/giphy.gif'), true);
  assert.equal(esEnlacePersistente('https://media.tenor.com/x.gif'), true);
  assert.equal(esEnlacePersistente('https://i.imgur.com/x.gif'), true);
  assert.equal(esEnlacePersistente('https://otro-sitio.com/x.gif'), false);
  assert.equal(esEnlacePersistente('https://giphy.com.malo.com/x.gif'), false);
});

const respuesta = (cuerpo, { status = 200, cabeceras = {} } = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: (nombre) => cabeceras[nombre.toLowerCase()] ?? null },
  body: (async function* generar() { yield cuerpo; }()),
});
const validarSiempre = async (url) => url;

test('descargar sigue redirecciones validando cada destino y no elude restricciones', async () => {
  const saltos = [];
  const ok = await descargar('https://a.com/x', {
    validar: async (url) => { saltos.push(url); return url; },
    fetchFn: async (url) => (url.endsWith('/x') ? respuesta(Buffer.alloc(0), { status: 302, cabeceras: { location: '/y' } }) : respuesta(gif(2))),
  });
  assert.equal(ok.url, 'https://a.com/y');
  assert.deepEqual(saltos, ['https://a.com/x', 'https://a.com/y']);

  for (const [status, codigo] of [[403, 'sitio_restringe'], [429, 'sitio_restringe'], [404, 'enlace_caducado'], [500, 'descarga_fallida']]) {
    await assert.rejects(() => descargar('https://a.com/x', { validar: validarSiempre, fetchFn: async () => respuesta(Buffer.alloc(1), { status }) }), { codigo });
  }
  await assert.rejects(() => descargar('https://a.com/x', {
    validar: validarSiempre, fetchFn: async () => respuesta(Buffer.alloc(1), { cabeceras: { 'content-length': String(99 * 1024 * 1024) } }),
  }), { codigo: 'muy_grande' });
  await assert.rejects(() => descargar('https://a.com/x', {
    validar: validarSiempre, fetchFn: async () => respuesta(Buffer.alloc(1), { status: 302, cabeceras: { location: '/x' } }),
  }), { codigo: 'demasiadas_redirecciones' });
  // una redireccion hacia la red interna se corta en la validacion del destino
  await assert.rejects(() => descargar('https://a.com/x', {
    validar: async (url) => { if (url.includes('127.0.0.1')) throw Object.assign(new Error('x'), { codigo: 'url_privada' }); return url; },
    fetchFn: async () => respuesta(Buffer.alloc(1), { status: 302, cabeceras: { location: 'http://127.0.0.1/secreto' } }),
  }), { codigo: 'url_privada' });
});

// Almacen en memoria para probar la importacion sin tocar el disco de la cuenta.
function almacenTemporal() {
  const dir = fs.mkdtempSync(path.join(tmp, 'a-'));
  let db = { items: [], carpetas: [] };
  return {
    cargar: () => JSON.parse(JSON.stringify(db)), guardar: (nuevo) => { db = JSON.parse(JSON.stringify(nuevo)); },
    archivosDir: () => dir, conSrc: (i) => i, dir,
  };
}
const descarga = (bytes) => async (url) => ({ url, bytes });
const publica = validarSiempre;

test('importar guarda enlace o archivo segun el proveedor, y evita duplicados', async () => {
  const store = almacenTemporal();
  const a = await importar({ url: 'https://media.giphy.com/media/abc/giphy.gif', titulo: '  Gato   bailando  ' }, { store, descargarFn: descarga(gif(4)), validar: publica });
  assert.equal(a.duplicado, false);
  assert.equal(a.item.modo, 'enlace');
  assert.equal(a.item.nombre, 'Gato bailando');
  assert.equal(a.item.archivo, undefined);
  assert.equal(a.item.dominio, 'media.giphy.com');
  assert.equal(fs.readdirSync(store.dir).length, 0, 'un enlace no copia el archivo');

  const mismaUrl = await importar({ url: 'https://media.giphy.com/media/abc/giphy.gif' }, { store, descargarFn: async () => { throw new Error('no debe descargar'); }, validar: publica });
  assert.equal(mismaUrl.duplicado, true);

  const b = await importar({ url: 'https://sitio-raro.com/img/perrito.gif' }, { store, descargarFn: descarga(gif(5)), validar: publica });
  assert.equal(b.item.modo, 'archivo');
  assert.equal(b.item.nombre, 'perrito');
  assert.deepEqual(fs.readFileSync(path.join(store.dir, b.item.archivo)), gif(5));

  const mismoContenido = await importar({ url: 'https://otro-sitio.com/copia.gif' }, { store, descargarFn: descarga(gif(5)), validar: publica });
  assert.equal(mismoContenido.duplicado, true);
  assert.equal(mismoContenido.item.id, b.item.id);
  assert.equal(store.cargar().items.length, 2);
});

test('importar rechaza lo que no es un medio animado', async () => {
  const store = almacenTemporal();
  const intenta = (bytes) => importar({ url: 'https://x.com/a.gif' }, { store, descargarFn: descarga(bytes), validar: publica });
  await assert.rejects(() => intenta(gif(1)), { codigo: 'no_animado' });
  await assert.rejects(() => intenta(webp(false)), { codigo: 'no_animado' });
  await assert.rejects(() => intenta(Buffer.from('<html>captcha</html>')), { codigo: 'formato_incompatible' });
  assert.equal(store.cargar().items.length, 0);
});

test('verificarEnlaces marca caducados los enlaces rotos y respeta los fallos pasajeros', async () => {
  const AHORA = 3_000_000_000;
  const store = almacenTemporal();
  const alta = (id, url) => ({ id, modo: 'enlace', url, estado: 'ok', verificado: 0 });
  store.guardar({ items: [alta('ok', 'https://giphy.com/ok.gif'), alta('roto', 'https://giphy.com/roto.gif'), alta('fijo', 'https://giphy.com/fijo.gif'), alta('red', 'https://giphy.com/red.gif'),
    { id: 'archivo', modo: 'archivo', estado: 'ok', verificado: 0 }, { id: 'reciente', modo: 'enlace', url: 'https://giphy.com/r.gif', estado: 'ok', verificado: AHORA - 1000 }], carpetas: [] });
  const descargarFn = async (url) => {
    if (url.includes('roto')) throw Object.assign(new Error('x'), { codigo: 'enlace_caducado' });
    if (url.includes('red')) throw Object.assign(new Error('x'), { codigo: 'tiempo_agotado' });
    return { url, bytes: url.includes('fijo') ? gif(1) : gif(3) };
  };
  const revisados = await verificarEnlaces({ store }, { descargarFn, ahora: AHORA });
  const estado = Object.fromEntries(store.cargar().items.map((i) => [i.id, i.estado]));
  assert.equal(revisados, 4, 'revisa los 4 enlaces sin verificar en 24 h (ni el de archivo ni el reciente)');
  assert.deepEqual(estado, { ok: 'ok', roto: 'caducado', fijo: 'caducado', red: 'ok', archivo: 'ok', reciente: 'ok' });
});
