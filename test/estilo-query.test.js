'use strict';

// interfaz/compartido/estilo/*.js son modulos ESM puros (sin DOM en query/esquemas);
// node --test los importa dinamicamente.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (archivo) => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'compartido', 'estilo', archivo)).href);

test('construirQuery: una config con todo en default produce una URL sin params', async () => {
  const { construirQuery, valoresPorDefecto } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');

  for (const [tipo, esquema] of Object.entries(ESQUEMAS)) {
    assert.equal(construirQuery(esquema, valoresPorDefecto(esquema)), '', `${tipo} no debe emitir defaults`);
  }
});

test('construirQuery: solo viaja lo que difiere del default, con los nombres de param historicos', async () => {
  const { construirQuery, valoresPorDefecto } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = { ...valoresPorDefecto(ESQUEMAS.likes), rows: 5, color: '#FF0000', bg: 0.5 };

  assert.equal(construirQuery(ESQUEMAS.likes, cfg), 'rows=5&color=FF0000&bg=0.5');
});

test('leerConfig: una URL vieja de Top Likers sigue funcionando', async () => {
  const { leerConfig } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = leerConfig(ESQUEMAS.likes, new URLSearchParams('rows=5&color=ff0000&bg=0.5'));

  assert.equal(cfg.rows, 5);
  assert.equal(cfg.color, '#ff0000');
  assert.equal(cfg.bg, 0.5);
  assert.equal(cfg.fuente, 'sistema', 'lo ausente cae al default');
});

test('leerConfig: valores invalidos caen al default en vez de romper el overlay', async () => {
  const { leerConfig } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = leerConfig(ESQUEMAS.chat, new URLSearchParams('size=abc&font=NoExiste&uc=zzz&anim=girar&v_c=nope'));

  assert.equal(cfg.tamano, 14);
  assert.equal(cfg.fuente, 'sistema');
  assert.equal(cfg.viewerColorUsuario, '#ffffff');
  assert.equal(cfg.animacionEntrada, 'slide-up');
});

test('round-trip del chat: construirQuery -> leerConfig devuelve la misma config', async () => {
  const { construirQuery, leerConfig, valoresPorDefecto } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = {
    ...valoresPorDefecto(ESQUEMAS.chat),
    fuente: 'Exo 2',
    tamano: 22,
    unaLinea: true,
    ocultarTras: 30,
    moderadorColorUsuario: '#112233',
    suscriptorResplandor: true,
    platforms: { tiktok: true, twitch: false, youtube: true, kick: false },
  };

  const params = new URLSearchParams(construirQuery(ESQUEMAS.chat, cfg));
  assert.deepEqual(leerConfig(ESQUEMAS.chat, params), cfg);
});

test('el chat conserva los params historicos: usernames=0 y platforms=lista', async () => {
  const { construirQuery, valoresPorDefecto } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = { ...valoresPorDefecto(ESQUEMAS.chat), usernames: false, platforms: { tiktok: true, twitch: true, youtube: false, kick: false } };

  assert.equal(construirQuery(ESQUEMAS.chat, cfg), 'usernames=0&platforms=tiktok%2Ctwitch');
});

test('ningun esquema repite un param ni una clave', async () => {
  const { ESQUEMAS } = await cargar('esquemas.js');

  for (const [tipo, esquema] of Object.entries(ESQUEMAS)) {
    const params = esquema.map((campo) => campo.param);
    const claves = esquema.map((campo) => campo.clave);
    assert.equal(new Set(params).size, params.length, `${tipo}: param duplicado`);
    assert.equal(new Set(claves).size, claves.length, `${tipo}: clave duplicada`);
  }
});

test('DEFAULTS_OVERLAYS conserva los defaults historicos de los overlays simples', async () => {
  const { DEFAULTS_OVERLAYS } = await cargar('esquemas.js');

  assert.deepEqual(DEFAULTS_OVERLAYS.seguidores, { goal: '', color: '#FFBB00', bg: 0.8 });
  assert.deepEqual(DEFAULTS_OVERLAYS.alertas, { dur: 4000, color: '#FFBB00', bg: 0.9 });
  assert.deepEqual(DEFAULTS_OVERLAYS['alertas-social'], { color: '#FFBB00', bg: 0.9 });
});
