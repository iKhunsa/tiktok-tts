const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = resolve(__dirname, '..');
const importar = (ruta) => import(pathToFileURL(resolve(raiz, ruta)).href);
const leer = (ruta) => readFileSync(resolve(raiz, ruta), 'utf8');

// Los módulos de la cadena de imports tocan el DOM al cargarse: lo que no es el badge responde con un no-op.
const inerte = () => new Proxy(function () {}, { get: (_, p) => (p === Symbol.toPrimitive ? () => '' : inerte()), apply: () => inerte() });

async function pintarBadge(lang) {
  const originales = { document: global.document, window: global.window, fetch: global.fetch, localStorage: global.localStorage };
  const diccionario = JSON.parse(leer(`interfaz/publico/locales/${lang}.json`));
  const badge = { nodos: [], replaceChildren(...nodos) { this.nodos = nodos; } };
  global.window = {};
  global.localStorage = { getItem: () => lang, setItem() {} };
  global.fetch = async () => ({ ok: true, json: async () => diccionario });
  global.document = new Proxy({
    getElementById: (id) => (id === 'queueBadge' ? badge : inerte()),
    createTextNode: (texto) => ({ tipo: 'texto', texto }),
    createElement: () => ({ tipo: 'boton', dataset: {} }),
  }, { get: (t, p) => (p in t ? t[p] : inerte()) });
  try {
    const { cargarIdioma } = await importar('interfaz/src/nucleo/i18n/i18n.js');
    const { updateQueueBadge } = await importar('interfaz/src/nucleo/tts/cola-tts.js');
    updateQueueBadge(); // antes del idioma: queda con las claves, como en el bug
    const antes = badge.nodos.map((n) => n.texto ?? n.textContent).join('');
    await cargarIdioma(lang);
    updateQueueBadge();
    return { antes, despues: badge.nodos, texto: badge.nodos.map((n) => n.texto ?? n.textContent).join('') };
  } finally {
    Object.assign(global, originales);
  }
}

test('sin mensajes el badge dice "Cola de voz vacía · sin bloqueados" y sin enlaces', async () => {
  const { antes, despues, texto } = await pintarBadge('es');
  assert.match(antes, /queueBadge\./, 'sin idioma cargado se ven las claves (el bug a evitar tras recargar)');
  assert.equal(texto, 'Cola de voz vacía · sin bloqueados');
  assert.equal(despues.filter((n) => n.tipo === 'boton').length, 0, 'sin bloqueados no hay enlace a una lista vacía');
});

test('el estado vacío existe en los 10 idiomas', () => {
  for (const lang of ['es', 'en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru']) {
    const { queueBadge } = JSON.parse(leer(`interfaz/publico/locales/${lang}.json`));
    assert.ok(queueBadge.queueEmpty && queueBadge.blockedNone, `${lang}: faltan queueBadge.queueEmpty/blockedNone`);
  }
});

test('el badge se repinta al cargar o cambiar el idioma', () => {
  const fuente = leer('interfaz/src/vistas/principal/i18n-app.js');
  assert.match(fuente, /import \{ ttsPaused, updateQueueBadge \}/);
  assert.match(fuente, /safe\(updateQueueBadge\)/);
});
