const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = resolve(__dirname, '..');
const importar = (ruta) => import(pathToFileURL(resolve(raiz, ruta)).href);
const leer = (ruta) => readFileSync(resolve(raiz, ruta), 'utf8');
const CAMPOS = 'interfaz/src/vistas/principal/campos-overlay';
const CHATS = ['chat', 'chat-tiktok', 'chat-twitch', 'chat-youtube', 'chat-kick'];
const BASICOS = ['escala', 'fuente', 'tamano', 'bg', 'maxmsgs', 'mostrarAvatares'];

test('el modo basico solo existe en los 5 chats y muestra los 6 campos acordados', async () => {
  const { BASICOS_POR_OVERLAY, tieneModos } = await importar(`${CAMPOS}/modos.js`);
  assert.deepEqual(Object.keys(BASICOS_POR_OVERLAY), CHATS);
  const { ESQUEMAS } = await importar('interfaz/compartido/estilo/esquemas.js');
  for (const id of CHATS) {
    assert.deepEqual(BASICOS_POR_OVERLAY[id], BASICOS, id);
    const claves = ESQUEMAS[id].map(({ clave }) => clave);
    for (const clave of BASICOS) assert.ok(claves.includes(clave), `${id} sin ${clave}`);
  }
  for (const id of Object.keys(ESQUEMAS).filter((otro) => !CHATS.includes(otro))) assert.equal(tieneModos(id), false, id);
});

test('cada clave visible del esquema de chat sigue montada en alguna categoria (nada se pierde por el modo basico)', async () => {
  const { ESQUEMAS } = await importar('interfaz/compartido/estilo/esquemas.js');
  const { CATEGORIAS, categoriaDe } = await importar(`${CAMPOS}/categorias.js`);
  for (const id of CHATS) {
    const visibles = ESQUEMAS[id].filter(({ ui, grupo }) => ui !== 'oculto' && grupo !== 'skin');
    for (const campo of visibles) assert.ok(CATEGORIAS.includes(categoriaDe(campo)?.categoria), `${id}.${campo.clave} sin categoria`);
  }
});

test('el modo se lee con basico por defecto y no falla sin almacenamiento', async () => {
  const { leerModo, guardarModo } = await importar(`${CAMPOS}/modos.js`);
  assert.equal(leerModo(), 'basico'); // en Node no hay localStorage: se traga el error
  assert.doesNotThrow(() => guardarModo('avanzado'));
  const memoria = new Map();
  global.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) };
  try {
    assert.equal(leerModo(), 'basico');
    guardarModo('avanzado');
    assert.equal(leerModo(), 'avanzado');
    memoria.set('ovlModoEditor', 'cualquier-cosa');
    assert.equal(leerModo(), 'basico');
  } finally {
    delete global.localStorage;
  }
});

test('el editor unificado recupera la disposicion clasica y los acordeones son solo de la tarjeta', () => {
  const editor = leer('interfaz/src/vistas/principal/overlays-catalogo/editor-canvas.js');
  assert.match(editor, /fijarDisposicion\(id, 'clasico'\)/);
  assert.match(editor, /fijarDisposicion\(seleccionado, 'tarjeta'\)/);
  const montar = leer(`${CAMPOS}/montar.js`);
  assert.match(montar, /dataset\.disposicion !== 'clasico'/);
  const css = leer('interfaz/src/estilos/campos-overlay.css');
  assert.doesNotMatch(css, /^\.ovl-inspector > \.cfg-(acordeon|personalizar)/m, 'los estilos de acordeones se acotan a la tarjeta');
});
