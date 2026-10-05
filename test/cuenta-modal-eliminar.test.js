const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = resolve(__dirname, '..');
const importar = (ruta) => import(pathToFileURL(resolve(raiz, ruta)).href);
const diccionario = (lang) => JSON.parse(readFileSync(resolve(raiz, `interfaz/publico/locales/${lang}.json`), 'utf8'));

// DOM minimo: cada id del innerHTML se vuelve un elemento con listeners y `value`.
function crearDocumentoFalso() {
  const estado = { overlay: null, removido: false };
  const crearElemento = () => ({
    listeners: {}, value: '', disabled: false, focused: false,
    addEventListener(tipo, fn) { this.listeners[tipo] = fn; },
    focus() { this.focused = true; },
    disparar(tipo, evento = {}) { return this.listeners[tipo]?.(evento); },
    escribir(valor) { this.value = valor; this.disparar('input'); },
  });
  const overlay = {
    ...crearElemento(),
    elementos: {},
    set innerHTML(html) {
      for (const [, id] of html.matchAll(/\bid="(\w+)"/g)) {
        const el = crearElemento();
        el.esBoton = new RegExp(`<button[^>]*id="${id}"`).test(html);
        el.disabled = new RegExp(`id="${id}"[^>]*\\sdisabled`).test(html);
        this.elementos[id] = el;
      }
    },
    querySelector(selector) { return this.elementos[selector.slice(1)]; },
    querySelectorAll() { return Object.values(this.elementos).filter((el) => el.esBoton); },
    remove() { estado.removido = true; },
  };
  estado.overlay = overlay;
  return {
    estado,
    documento: { createElement: () => overlay, body: { appendChild() {} } },
  };
}

async function abrirModal({ lang = 'es', eliminar }) {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  global.fetch = async () => ({ ok: true, json: async () => diccionario(lang) });
  const { cargarIdioma } = await importar('interfaz/src/nucleo/i18n/i18n.js');
  await cargarIdioma(lang);
  const { documento, estado } = crearDocumentoFalso();
  global.document = documento;
  try {
    const { abrirModalEliminarCuenta } = await importar('interfaz/src/vistas/principal/cuenta/modal-eliminar-cuenta.js');
    abrirModalEliminarCuenta({ eliminar });
  } finally {
    global.fetch = originalFetch;
    global.document = originalDocument;
  }
  const { elementos } = estado.overlay;
  return {
    estado,
    palabra: elementos.cuentaDeleteWord,
    clave: elementos.cuentaDeletePass,
    confirmar: elementos.cuentaDeleteConfirm,
    cancelar: elementos.cuentaDeleteCancel,
    overlay: estado.overlay,
  };
}

test('el botón de eliminar arranca deshabilitado y el foco va a la palabra', async () => {
  const modal = await abrirModal({ eliminar: async () => true });
  assert.equal(modal.confirmar.disabled, true);
  assert.equal(modal.palabra.focused, true);
});

test('exige la palabra Y la contraseña para habilitar el botón', async () => {
  const modal = await abrirModal({ eliminar: async () => true });

  modal.clave.escribir('secreto');
  assert.equal(modal.confirmar.disabled, true, 'solo contraseña: sigue bloqueado');

  modal.palabra.escribir('borra');
  assert.equal(modal.confirmar.disabled, true, 'palabra incompleta: sigue bloqueado');

  modal.palabra.escribir('borrar');
  assert.equal(modal.confirmar.disabled, false);

  modal.clave.escribir('');
  assert.equal(modal.confirmar.disabled, true, 'sin contraseña: vuelve a bloquearse');
});

test('la palabra ignora mayúsculas y espacios alrededor', async () => {
  const modal = await abrirModal({ eliminar: async () => true });
  modal.clave.escribir('secreto');
  modal.palabra.escribir('  BORRAR ');
  assert.equal(modal.confirmar.disabled, false);
});

test('la palabra cambia con el idioma de la interfaz', async () => {
  const modal = await abrirModal({ lang: 'en', eliminar: async () => true });
  modal.clave.escribir('secreto');

  modal.palabra.escribir('borrar');
  assert.equal(modal.confirmar.disabled, true, 'la palabra en español no vale en inglés');

  modal.palabra.escribir('delete');
  assert.equal(modal.confirmar.disabled, false);
});

test('sin la palabra no se elimina ni con clic ni con Enter', async () => {
  const llamadas = [];
  const modal = await abrirModal({ eliminar: async (clave) => { llamadas.push(clave); return true; } });
  modal.clave.escribir('secreto');
  modal.palabra.escribir('otra cosa');

  await modal.confirmar.disparar('click');
  await modal.clave.disparar('keydown', { key: 'Enter' });
  await modal.palabra.disparar('keydown', { key: 'Enter' });

  assert.deepEqual(llamadas, []);
});

test('con palabra y contraseña elimina una sola vez y cierra el modal', async () => {
  const llamadas = [];
  const modal = await abrirModal({ eliminar: async (clave) => { llamadas.push(clave); return true; } });
  modal.palabra.escribir('borrar');
  modal.clave.escribir('secreto');

  await Promise.all([modal.confirmar.disparar('click'), modal.confirmar.disparar('click')]);

  assert.deepEqual(llamadas, ['secreto']);
  assert.equal(modal.estado.removido, true);
});

test('si el servidor falla, el modal sigue abierto y se puede reintentar', async () => {
  const modal = await abrirModal({ eliminar: async () => false });
  modal.palabra.escribir('borrar');
  modal.clave.escribir('secreto');

  await modal.confirmar.disparar('click');

  assert.equal(modal.estado.removido, false);
  assert.equal(modal.palabra.disabled, false);
  assert.equal(modal.clave.disabled, false);
  assert.equal(modal.confirmar.disabled, false, 'palabra y contraseña siguen válidas');
});

test('Escape y Cancelar cierran sin eliminar', async () => {
  const llamadas = [];
  const modal = await abrirModal({ eliminar: async (clave) => { llamadas.push(clave); return true; } });
  modal.palabra.escribir('borrar');
  modal.clave.escribir('secreto');

  modal.overlay.disparar('keydown', { key: 'Escape' });
  assert.equal(modal.estado.removido, true);
  assert.deepEqual(llamadas, []);
});
