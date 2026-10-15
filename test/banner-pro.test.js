const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = resolve(__dirname, '..');
const html = readFileSync(resolve(raiz, 'interfaz/index.html'), 'utf8');
const importar = (ruta) => import(pathToFileURL(resolve(raiz, ruta.split('?')[0])).href + (ruta.includes('?') ? `?${ruta.split('?')[1]}` : ''));

test('el banner va bajo la barra "Se lee" y antes del chat, oculto de inicio', () => {
  const toggles = html.indexOf('id="chatTogglesBox"');
  const banner = html.indexOf('id="proBanner"');
  const chat = html.indexOf('<div class="chat-section">');
  assert.ok(toggles !== -1 && banner > toggles && chat > banner, 'orden: toggles < banner < chat');
  assert.match(html, /id="proBanner" hidden>/);
  for (const id of ['proBannerOpen', 'proBannerClose']) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html.slice(banner, chat), /\sstyle="/);
});

test('las claves del banner existen en los 10 idiomas', () => {
  for (const lang of ['es', 'en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru']) {
    const { pro } = JSON.parse(readFileSync(resolve(raiz, `interfaz/publico/locales/${lang}.json`), 'utf8'));
    for (const key of ['bannerTitle', 'bannerSub', 'bannerBadge', 'bannerClose']) assert.ok(pro[key], `${lang}: falta pro.${key}`);
  }
});

// DOM mínimo: el banner con sus dos botones y un localStorage en memoria.
async function montar({ memoria = new Map(), version = 1 } = {}) {
  const botones = {};
  const crearBoton = () => ({ listeners: {}, addEventListener(tipo, fn) { this.listeners[tipo] = fn; }, click() { this.listeners.click(); } });
  const banner = {
    hidden: true,
    querySelector(selector) { return botones[selector] ||= crearBoton(); },
  };
  const originales = { document: global.document, localStorage: global.localStorage, window: global.window };
  global.window = {}; // datos-por-cuenta.js publica un puente en window al importarse
  // Los módulos de la cadena de imports tocan el DOM al cargarse: lo que no es el banner responde con un no-op.
  const inerte = () => new Proxy(function () {}, { get: (_, p) => (p === Symbol.toPrimitive ? () => '' : inerte()), apply: () => inerte() });
  global.document = new Proxy({ getElementById: (id) => (id === 'proBanner' ? banner : null) }, { get: (t, p) => (p in t ? t[p] : inerte()) });
  global.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)), removeItem: (k) => memoria.delete(k) };

  const { almacenSesion } = await importar('interfaz/src/nucleo/estado/sesion.js');
  const { iniciarBannerPro } = await importar(`interfaz/src/vistas/principal/banner-pro.js?v=${version}`);
  iniciarBannerPro();
  return {
    banner, botones, almacenSesion, memoria,
    restaurar() { global.document = originales.document; global.localStorage = originales.localStorage; global.window = originales.window; },
  };
}

test('solo se muestra con plan Free y cuentas activas', async () => {
  const m = await montar();
  try {
    m.almacenSesion.setState({ activo: false, plan: 'free', user: null });
    assert.equal(m.banner.hidden, true, 'cuentas apagadas: oculto');

    m.almacenSesion.setState({ activo: true, plan: 'free', user: { id: 'u1' } });
    assert.equal(m.banner.hidden, false, 'Free: visible');

    m.almacenSesion.setState({ plan: 'sin-promos' });
    assert.equal(m.banner.hidden, true, 'Sin Promos: oculto');

    m.almacenSesion.setState({ plan: 'pro' });
    assert.equal(m.banner.hidden, true, 'Pro: oculto');
  } finally { m.restaurar(); }
});

test('la X lo oculta mientras la app está abierta y no se guarda: al reabrir vuelve', async () => {
  const m = await montar();
  try {
    m.almacenSesion.setState({ activo: true, plan: 'free', user: { id: 'u2' } });
    assert.equal(m.banner.hidden, false);

    m.botones['#proBannerClose'].click();
    assert.equal(m.banner.hidden, true, 'cerrado en esta sesión');
    m.almacenSesion.setState({ plan: 'free' });
    assert.equal(m.banner.hidden, true, 'los cambios de sesión no lo reviven');
    assert.equal(m.memoria.size, 0, 'no escribe nada en el almacenamiento');

    // Reabrir la app = módulo y DOM nuevos, con el mismo almacenamiento.
    const reabierto = await montar({ memoria: m.memoria, version: 2 });
    reabierto.almacenSesion.setState({ activo: true, plan: 'free', user: { id: 'u2' } });
    assert.equal(reabierto.banner.hidden, false, 'al abrir la app de nuevo se ve otra vez');
    reabierto.restaurar();
  } finally { m.restaurar(); }
});
