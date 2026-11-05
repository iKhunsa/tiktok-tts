'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

process.env.TIKTOK_USER_DATA_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'epik-'));
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'epik-home-'));
process.env.USERPROFILE = HOME; // os.homedir() -> Descargas de prueba
process.env.HOME = HOME;
const accountData = require('../core/account-data-path');
const store = require('../features/epik/store');
const { FAMILIAS } = store;
const { politicaEpik } = require('../features/epik/content-policy');

// ZIP minimo (deflate) para armar paquetes de prueba; el crc no lo revisa el lector.
function zip(archivos) {
  const partes = [];
  const centrales = [];
  let offset = 0;
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const datos = Buffer.from(contenido);
    const comprimido = zlib.deflateRawSync(datos);
    const n = Buffer.from(nombre);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(comprimido.length, 18); local.writeUInt32LE(datos.length, 22); local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(comprimido.length, 20); central.writeUInt32LE(datos.length, 24); central.writeUInt16LE(n.length, 28); central.writeUInt32LE(offset, 42);
    partes.push(local, n, comprimido);
    centrales.push(central, n);
    offset += 30 + n.length + comprimido.length;
  }
  const dir = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(Object.keys(archivos).length, 10); fin.writeUInt32LE(dir.length, 12); fin.writeUInt32LE(offset, 16);
  return Buffer.concat([...partes, dir, fin]);
}

const manifest = (extra = {}) => JSON.stringify({
  formato: 'epik', sdk: 1, id: 'mi-diseno', overlay: 'musica', nombre: 'Mi diseño', version: '1.0.0',
  medida: { ancho: 440, alto: 150 }, campos: [{ clave: 'colorFondo', tipo: 'color', etiqueta: 'Fondo', def: '#112233', extra: 'fuera' }],
  desconocida: true, ...extra,
});
const propios = (overlay) => store.listar(overlay).filter((epik) => !epik.integrado);
const paquete = (extra, mas = {}) => zip({ 'manifest.json': manifest(extra), 'index.html': '<script src="epik.js"></script>', 'epik.js': '', ...mas });

test.beforeEach(() => accountData.setActiveAccount(`cuenta-${Math.random()}`));

test('importa un .epik: lo lista, extrae sus archivos y guarda el manifest limpio', () => {
  const { epik, actualizado } = store.importar(paquete(), 'musica');
  assert.equal(actualizado, false);
  assert.equal(epik.id, 'mi-diseno');
  assert.deepEqual(propios('musica').map(({ id }) => id), ['mi-diseno']);
  assert.deepEqual(propios('chat'), []); // otra familia no lo ve
  const guardado = JSON.parse(fs.readFileSync(store.rutaArchivo('mi-diseno', 'manifest.json'), 'utf8'));
  assert.equal(guardado.desconocida, undefined);
  assert.equal(guardado.campos[0].extra, undefined);
  assert.ok(fs.existsSync(store.rutaArchivo('mi-diseno', 'index.html')));
});

test('el mismo id actualiza: conserva la fecha de importacion y anota la version anterior', () => {
  const primera = store.importar(paquete(), 'musica').epik;
  const segunda = store.importar(paquete({ version: '1.1.0' }), 'musica');
  assert.equal(segunda.actualizado, true);
  assert.equal(segunda.epik.importado, primera.importado);
  assert.equal(segunda.epik.versionAnterior, '1.0.0');
  assert.equal(propios().length, 1);
});

test('soltado en el overlay equivocado: 409 con el overlay real del archivo', () => {
  assert.throws(() => store.importar(paquete(), 'no-existe'), (error) => error.status === 409 && error.extra.overlay === 'musica' && error.errorKey === 'errors.epikOtroOverlay');
});

test('familia que todavia no acepta .epik: 422', () => {
  assert.throws(() => store.importar(paquete({ overlay: 'no-existe' })), (error) => error.status === 422 && error.extra.overlay === 'no-existe');
});

test('un .epik sirve en todos los overlays de su familia', () => {
  for (const [familia, overlays] of Object.entries(store.FAMILIAS)) {
    const id = `fam-${familia}`;
    store.importar(paquete({ id, overlay: familia }), overlays[overlays.length - 1]);
    for (const overlay of overlays) assert.ok(store.listar(overlay).some((epik) => epik.id === id), `${id} en ${overlay}`);
  }
});

test('rechaza rutas peligrosas, extensiones raras y archivos que no son zip', () => {
  assert.throws(() => store.importar(paquete({}, { '../fuera.html': 'x' })), (error) => error.status === 400);
  assert.throws(() => store.importar(paquete({}, { 'virus.exe': 'x' })), (error) => error.status === 400);
  assert.throws(() => store.importar(Buffer.from('hola')), (error) => error.status === 400);
  assert.throws(() => store.importar(paquete({ campos: [{ clave: 'x', tipo: 'numero', etiqueta: 'X', min: 5, max: 1, def: 3 }] })), (error) => error.status === 400);
});

test('acepta el zip con todo dentro de una carpeta (comprimieron la carpeta)', () => {
  const dentro = zip({ 'mi-diseno/manifest.json': manifest(), 'mi-diseno/index.html': '<p>', 'mi-diseno/epik.js': '' });
  assert.equal(store.importar(dentro, 'musica').epik.id, 'mi-diseno');
});

test('rutaArchivo no se sale de la carpeta del paquete; eliminar lo borra', () => {
  store.importar(paquete(), 'musica');
  assert.equal(store.rutaArchivo('mi-diseno', '../../registro.json'), null);
  assert.equal(store.rutaArchivo('../x', 'index.html'), null);
  store.eliminar('mi-diseno');
  assert.deepEqual(propios(), []);
  assert.throws(() => store.eliminar('mi-diseno'), (error) => error.status === 404);
});

test('la CSP aisla el diseno: sandbox y sin red', () => {
  const csp = politicaEpik('localhost:3000');
  assert.match(csp, /sandbox allow-scripts/);
  assert.match(csp, /connect-src 'none'/);
  assert.doesNotMatch(politicaEpik('evil.com"; script-src *'), /evil/);
});

test('la plantilla de la app se instala sola, no se elimina ni se pisa, y se descarga a Descargas', () => {
  const plantilla = store.listar().find(({ id }) => id === 'plantilla-musica');
  assert.ok(plantilla?.integrado);
  assert.throws(() => store.eliminar('plantilla-musica'), (error) => error.status === 403 && error.errorKey === 'errors.epikIntegrado');
  assert.throws(() => store.importar(paquete({ id: 'plantilla-musica' }), 'musica'), (error) => error.status === 403);
  const primera = store.descargarIntegrado('plantilla-musica');
  const segunda = store.descargarIntegrado('plantilla-musica');
  assert.equal(path.dirname(primera), path.join(HOME, 'Downloads'));
  assert.notEqual(primera, segunda); // no pisa la descarga anterior
  assert.throws(() => store.descargarIntegrado('mi-diseno'), (error) => error.status === 404);
});

test('cada familia trae su plantilla integrada, instalada en sus overlays', () => {
  for (const [familia, overlays] of Object.entries(FAMILIAS)) {
    const plantilla = store.listar(overlays[0]).find(({ id }) => id === `plantilla-${familia}`);
    assert.ok(plantilla?.integrado, `falta epik/plantilla-${familia}.epik`);
    assert.equal(plantilla.overlay, familia);
  }
});

test('las etiquetas de los campos aceptan traducciones por idioma', () => {
  const campos = [{ clave: 'nieve', tipo: 'bool', def: true, etiqueta: { es: 'Nieve', en: 'Snow' }, ayuda: { es: 'Copos' } }];
  const { epik } = store.importar(paquete({ campos }), 'musica');
  assert.deepEqual(epik.campos[0].etiqueta, { es: 'Nieve', en: 'Snow' });
  assert.throws(() => store.importar(paquete({ campos: [{ ...campos[0], etiqueta: { espanol: 'x' } }] })), (error) => error.status === 400);
});
