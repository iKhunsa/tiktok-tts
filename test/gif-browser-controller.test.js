const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { EventEmitter } = require('node:events');

// `electron` solo existe dentro de la app: se simula lo minimo (sesion y vistas nativas) para probar el controlador.
const vistas = [];
class FakeWebContents extends EventEmitter {
  constructor() {
    super();
    this.urls = [];
    this.mainFrame = { id: 'principal' };
    this.navigationHistory = { canGoBack: () => false, canGoForward: () => false, goBack() {}, goForward() {} };
  }
  loadURL(url) { this.urls.push(url); }
  getURL() { return this.urls.at(-1) || ''; }
  setWindowOpenHandler(manejar) { this.abrirVentana = manejar; }
  isDestroyed() { return false; }
  close() { this.cerrada = true; }
  reload() { this.recargada = true; }
}
class FakeView {
  constructor(opciones) { this.opciones = opciones; this.webContents = new FakeWebContents(); vistas.push(this); }
  setBounds(bounds) { this.bounds = bounds; }
}
const cargaOriginal = Module._load;
Module._load = function cargar(peticion, ...resto) {
  if (peticion === 'electron') return { WebContentsView: FakeView, session: { fromPartition: () => ({ setPermissionRequestHandler() {}, setPermissionCheckHandler() {} }) }, shell: { openExternal: () => Promise.resolve() } };
  return cargaOriginal.call(this, peticion, ...resto);
};
const { createGifBrowserController } = require('../electron-shell/gif-browser/controller');
Module._load = cargaOriginal;

function crear({ fetchFn } = {}) {
  vistas.length = 0;
  const enviados = [];
  const hijos = new Set();
  const mainWindow = {
    isDestroyed: () => false,
    webContents: { send: (canal, datos) => enviados.push([canal, datos]) },
    contentView: { addChildView: (v) => hijos.add(v), removeChildView: (v) => hijos.delete(v) },
  };
  const controlador = createGifBrowserController({ mainWindow, port: 3000, fetchFn });
  return { controlador, enviados, hijos };
}
const evento = (vista, frame) => ({ sender: vista.webContents, senderFrame: frame ?? vista.webContents.mainFrame });

test('abrir coloca la vista nativa en el hueco que pide la UI y carga la pagina con el selector', () => {
  const { controlador, hijos } = crear();
  const r = controlador.abrir({ bounds: { x: 10.4, y: 20.6, width: 800.2, height: 500 }, url: 'giphy.com', textos: { agregar: 'Añadir' } });
  assert.equal(r.ok, true);
  const [vista] = vistas;
  assert.ok(hijos.has(vista), 'la vista se adjunta a la ventana');
  assert.deepEqual(vista.bounds, { x: 10, y: 21, width: 800, height: 500 });
  assert.equal(vista.webContents.urls[0], 'https://giphy.com/');
  assert.match(vista.opciones.webPreferences.preload, /picker-preload\.js$/, 'cada pagina carga el selector');
  assert.equal(vista.opciones.webPreferences.sandbox, true);
  assert.equal(vista.opciones.webPreferences.contextIsolation, true);
  assert.equal(vista.opciones.webPreferences.nodeIntegration, false);
  assert.deepEqual(controlador.getTextos(evento(vista)), { agregar: 'Añadir', modo: 'gif', volumen: 50 });
});

test('rechaza huecos y direcciones invalidas', () => {
  const { controlador } = crear();
  assert.equal(controlador.abrir({ bounds: { x: 'a', y: 0, width: 1, height: 1 } }).error, 'invalid_bounds');
  controlador.abrir({ bounds: { x: 0, y: 0, width: 100, height: 100 } });
  assert.equal(controlador.navegar('javascript:alert(1)').error, 'invalid_url');
  // file:// se reinterpreta como https://file/... (nunca se abre un archivo local): lo que importa es el esquema cargado
  controlador.navegar('file:///c:/secreto');
  assert.ok(vistas[0].webContents.urls.every((url) => /^https?:\/\//.test(url)), 'solo se cargan http(s)');
  assert.equal(controlador.navegar('   ').error, 'invalid_url');
});

test('ocultar quita la vista sin destruirla; mostrar la devuelve; cerrar libera la pestana', () => {
  const { controlador, hijos } = crear();
  controlador.abrir({ bounds: { x: 0, y: 0, width: 100, height: 100 }, url: 'https://tenor.com' });
  const [vista] = vistas;
  controlador.ocultar();
  assert.equal(hijos.has(vista), false);
  assert.equal(vista.webContents.cerrada, undefined, 'sigue viva con su pagina');
  controlador.setBounds({ x: 5, y: 5, width: 300, height: 200 });
  assert.ok(hijos.has(vista));
  assert.deepEqual(vista.bounds, { x: 5, y: 5, width: 300, height: 200 });
  controlador.cerrar();
  assert.equal(hijos.has(vista), false);
  assert.equal(vista.webContents.cerrada, true);
  assert.equal(controlador.getState().abierto, false);
});

test('una ventana nueva (target=_blank) se carga en la misma pestana', () => {
  const { controlador } = crear();
  controlador.abrir({ bounds: { x: 0, y: 0, width: 100, height: 100 }, url: 'https://giphy.com' });
  const [vista] = vistas;
  assert.deepEqual(vista.webContents.abrirVentana({ url: 'https://giphy.com/gifs/abc' }), { action: 'deny' });
  assert.equal(vistas.length, 1, 'no se crea otra pestana');
  assert.equal(vista.webContents.getURL(), 'https://giphy.com/gifs/abc');
});

test('importar solo acepta a la pagina principal de la pestana propia', async () => {
  let peticiones = 0;
  const { controlador } = crear({ fetchFn: async () => { peticiones += 1; return { ok: true, json: async () => ({ item: { id: 'x' }, duplicado: false }) }; } });
  controlador.abrir({ bounds: { x: 0, y: 0, width: 100, height: 100 }, url: 'https://giphy.com' });
  const [vista] = vistas;
  const datos = { url: 'https://media.giphy.com/a.gif', titulo: 'x', origen: 'https://giphy.com' };
  assert.equal((await controlador.importar({ sender: {}, senderFrame: {} }, datos)).codigo, 'no_autorizado', 'otro emisor');
  assert.equal((await controlador.importar(evento(vista, { id: 'subframe' }), datos)).codigo, 'no_autorizado', 'un subframe');
  assert.equal(peticiones, 0);
  assert.deepEqual(controlador.getTextos({ sender: {}, senderFrame: {} }), {}, 'los textos tampoco se entregan a extranos');
  assert.equal((await controlador.importar(evento(vista), { url: 'javascript:alert(1)' })).codigo, 'url_invalida');
  assert.equal((await controlador.importar(evento(vista), { url: 5 })).codigo, 'url_invalida');
  assert.equal(peticiones, 0);
});

test('importar entrega la URL al dominio gifs, avisa a la UI y traduce los errores', async () => {
  const llamadas = [];
  let respuesta = { ok: true, json: async () => ({ item: { id: 'g1' }, duplicado: true }) };
  const { controlador, enviados } = crear({ fetchFn: async (url, opciones) => { llamadas.push([url, JSON.parse(opciones.body)]); return respuesta; } });
  controlador.abrir({ bounds: { x: 0, y: 0, width: 100, height: 100 }, url: 'https://giphy.com' });
  const [vista] = vistas;
  const datos = { url: 'https://media.giphy.com/a.gif', titulo: 'Gato', origen: 'https://giphy.com/x', extra: 'ignorado' };
  assert.deepEqual(await controlador.importar(evento(vista), datos), { ok: true, duplicado: true });
  assert.equal(llamadas[0][0], 'http://127.0.0.1:3000/api/gifs/importar');
  assert.deepEqual(llamadas[0][1], { url: 'https://media.giphy.com/a.gif', titulo: 'Gato', origen: 'https://giphy.com/x' }, 'solo viajan los campos esperados');
  assert.deepEqual(enviados.at(-1), ['gifbrowser:importado', { item: { id: 'g1' }, duplicado: true, modo: 'gif' }]);

  respuesta = { ok: false, json: async () => ({ codigo: 'sitio_restringe' }) };
  assert.deepEqual(await controlador.importar(evento(vista), datos), { ok: false, codigo: 'sitio_restringe' });
  respuesta = { ok: false, json: async () => { throw new Error('no es json'); } };
  assert.equal((await controlador.importar(evento(vista), datos)).codigo, 'descarga_fallida');
});

test('solo se importa un GIF a la vez', async () => {
  let liberar;
  const { controlador } = crear({ fetchFn: () => new Promise((resolver) => { liberar = () => resolver({ ok: true, json: async () => ({ item: {}, duplicado: false }) }); }) });
  controlador.abrir({ bounds: { x: 0, y: 0, width: 100, height: 100 }, url: 'https://giphy.com' });
  const [vista] = vistas;
  const datos = { url: 'https://media.giphy.com/a.gif' };
  const primera = controlador.importar(evento(vista), datos);
  assert.equal((await controlador.importar(evento(vista), datos)).codigo, 'ocupado');
  liberar();
  assert.equal((await primera).ok, true);
  const tercera = controlador.importar(evento(vista), datos);
  liberar();
  assert.equal((await tercera).ok, true, 'libre otra vez al terminar');
});

test('en modo sonido la misma pestana va a su pagina, el selector recibe el modo y se importa a la biblioteca de sonidos', async () => {
  const llamadas = [];
  const { controlador, enviados } = crear({ fetchFn: async (url) => { llamadas.push(url); return { ok: true, json: async () => ({ item: { id: 's1' }, duplicado: false }) }; } });
  const hueco = { x: 0, y: 0, width: 100, height: 100 };
  controlador.abrir({ bounds: hueco, url: 'https://giphy.com' });
  const [vista] = vistas;
  controlador.abrir({ bounds: hueco, url: 'https://www.myinstants.com/en/index/us/', modo: 'sonido' });
  assert.equal(vista.webContents.urls.at(-1), 'https://www.myinstants.com/en/index/us/', 'cambiar de modo navega aunque la pestana ya exista');
  assert.equal(controlador.getTextos(evento(vista)).modo, 'sonido');
  assert.equal(controlador.getState().modo, 'sonido');
  const total = vista.webContents.urls.length;
  controlador.abrir({ bounds: hueco, url: 'https://otra.com', modo: 'sonido' });
  assert.equal(vista.webContents.urls.length, total, 'sin cambio de modo se retoma la pagina donde estaba');
  await controlador.importar(evento(vista), { url: 'https://www.myinstants.com/media/sounds/vine-boom.mp3' });
  assert.equal(llamadas[0], 'http://127.0.0.1:3000/api/sonidos/importar');
  assert.equal(enviados.at(-1)[1].modo, 'sonido');
});

test('el volumen de la ventana de sonidos viaja a la pagina, se limita a 0-100 y se avisa a la app solo si lo manda la pestana propia', () => {
  const { controlador, enviados } = crear();
  const hueco = { x: 0, y: 0, width: 100, height: 100 };
  controlador.abrir({ bounds: hueco, url: 'https://www.myinstants.com/', modo: 'sonido', textos: { volumen: 35 } });
  const [vista] = vistas;
  assert.equal(controlador.getTextos(evento(vista)).volumen, 35, 'el selector arranca con el volumen que guardo la app');
  assert.deepEqual(controlador.setVolumen(evento(vista), 250), { ok: true });
  assert.deepEqual(enviados.at(-1), ['gifbrowser:volumen', { volumen: 100 }], 'nunca pasa de 100');
  controlador.setVolumen(evento(vista), -5);
  assert.equal(controlador.getTextos(evento(vista)).volumen, 0);
  const antes = enviados.length;
  assert.deepEqual(controlador.setVolumen({ sender: {}, senderFrame: {} }, 10), { ok: false }, 'un extrano no cambia el volumen');
  assert.deepEqual(controlador.setVolumen(evento(vista), 'alto'), { ok: false });
  assert.equal(enviados.length, antes);
});
